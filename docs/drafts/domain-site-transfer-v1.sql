-- DRAFT ONLY - issue #730, stage 5B. Do not apply to production.
-- Audited schema: 2026-10-30; source branch base bd59e6b.
-- This file deliberately lives outside supabase/migrations.
-- Requires review of registration compatibility, RLS integration, concurrency,
-- aliases and cache invalidation, plus the real React confirmation workflow.
-- PostgreSQL execution and browser E2E have NOT been tested.
-- The earlier 29 mock HTTP tests do not validate this SQL.
-- Proposed invariant: one site_domains record per site, pending included.
-- No cleanup/deletion: duplicate rows make index creation fail for review.
BEGIN;

CREATE UNIQUE INDEX site_domains_one_record_per_site_v1
  ON public.site_domains (site_id);

CREATE FUNCTION private.guard_domain_site_transfer_v1()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''
AS $guard$
DECLARE
  actor uuid := auth.uid();
  source_site public.sites%ROWTYPE;
  target_site public.sites%ROWTYPE;
BEGIN
  IF NEW.site_id IS NOT DISTINCT FROM OLD.site_id THEN RETURN NEW; END IF;
  IF actor IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'AUTH_REQUIRED';
  END IF;
  PERFORM s.id FROM public.sites s
    WHERE s.id IN (OLD.site_id, NEW.site_id)
    ORDER BY s.id FOR UPDATE NOWAIT;
  SELECT * INTO source_site FROM public.sites WHERE id = OLD.site_id;
  SELECT * INTO target_site FROM public.sites WHERE id = NEW.site_id;
  IF source_site.id IS NULL OR target_site.id IS NULL
     OR source_site.owner_id IS DISTINCT FROM actor
     OR target_site.owner_id IS DISTINCT FROM actor THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'BOTH_SITE_OWNERSHIP_REQUIRED';
  END IF;
  IF target_site.status <> 'active'::public.site_status THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'TARGET_SITE_INACTIVE';
  END IF;
  IF OLD.provider <> 'cloudflare-full-zone'
     OR OLD.status NOT IN ('pending'::public.domain_status,
                          'verifying'::public.domain_status,
                          'active'::public.domain_status) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'DOMAIN_STATE_NOT_TRANSFERABLE';
  END IF;
  IF (to_jsonb(NEW) - ARRAY['site_id', 'updated_at'])
       IS DISTINCT FROM (to_jsonb(OLD) - ARRAY['site_id', 'updated_at']) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'TRANSFER_MUST_PRESERVE_DOMAIN_FIELDS';
  END IF;
  IF source_site.custom_domain IS NOT NULL
     AND source_site.custom_domain IS DISTINCT FROM OLD.hostname THEN
    RAISE EXCEPTION USING ERRCODE = '40001', MESSAGE = 'SOURCE_MAPPING_INCONSISTENT';
  END IF;
  IF target_site.custom_domain IS NOT NULL
     OR EXISTS (SELECT 1 FROM public.site_domains d
                WHERE d.site_id = NEW.site_id AND d.id <> OLD.id) THEN
    RAISE EXCEPTION USING ERRCODE = '23505', MESSAGE = 'TARGET_HAS_DOMAIN';
  END IF;
  RETURN NEW;
END;
$guard$;

CREATE TRIGGER guard_domain_site_transfer_v1
BEFORE UPDATE OF site_id ON public.site_domains
FOR EACH ROW EXECUTE FUNCTION private.guard_domain_site_transfer_v1();

-- Keep the existing metadata/status trigger. Add the missing site_id event.
-- This follows the audited canonical rule: status active AND is_primary.
CREATE FUNCTION private.sync_transferred_domain_sites_v1()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''
AS $sync$
BEGIN
  IF NEW.site_id IS NOT DISTINCT FROM OLD.site_id THEN RETURN NEW; END IF;
  WITH desired AS (
    SELECT s.id,
      (SELECT d.hostname FROM public.site_domains d
       WHERE d.site_id = s.id AND d.status = 'active'::public.domain_status
         AND d.is_primary IS TRUE
       ORDER BY d.verified_at DESC NULLS LAST, d.updated_at DESC LIMIT 1) AS hostname
    FROM public.sites s WHERE s.id IN (OLD.site_id, NEW.site_id)
  )
  UPDATE public.sites s SET custom_domain = desired.hostname, updated_at = now()
    FROM desired WHERE s.id = desired.id
      AND s.custom_domain IS DISTINCT FROM desired.hostname;
  IF EXISTS (
    SELECT 1 FROM public.sites s
    WHERE s.id IN (OLD.site_id, NEW.site_id)
      AND s.custom_domain IS DISTINCT FROM (
        SELECT d.hostname FROM public.site_domains d
        WHERE d.site_id = s.id AND d.status = 'active'::public.domain_status
          AND d.is_primary IS TRUE
        ORDER BY d.verified_at DESC NULLS LAST, d.updated_at DESC LIMIT 1)
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'DOMAIN_SITE_SYNC_NOT_AUTHORIZED';
  END IF;
  RETURN NEW;
END;
$sync$;

CREATE TRIGGER sync_transferred_domain_sites_v1
AFTER UPDATE OF site_id ON public.site_domains
FOR EACH ROW EXECUTE FUNCTION private.sync_transferred_domain_sites_v1();

CREATE FUNCTION public.move_site_domain_v1(
  p_domain_id uuid, p_source_site_id uuid,
  p_target_site_id uuid, p_confirm_hostname text
)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER
SET search_path = '' SET lock_timeout = '2s'
AS $move$
DECLARE
  actor uuid := auth.uid();
  source_site public.sites%ROWTYPE;
  target_site public.sites%ROWTYPE;
  domain_row public.site_domains%ROWTYPE;
  expected_hostname text;
  changed integer;
BEGIN
  IF actor IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'AUTH_REQUIRED';
  END IF;
  IF p_domain_id IS NULL OR p_source_site_id IS NULL
     OR p_target_site_id IS NULL OR p_source_site_id = p_target_site_id
     OR p_confirm_hostname IS NULL OR btrim(p_confirm_hostname) = '' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_TRANSFER_CONFIRMATION';
  END IF;
  PERFORM s.id FROM public.sites s
    WHERE s.id IN (p_source_site_id, p_target_site_id)
    ORDER BY s.id FOR UPDATE NOWAIT;
  SELECT * INTO source_site FROM public.sites WHERE id = p_source_site_id;
  SELECT * INTO target_site FROM public.sites WHERE id = p_target_site_id;
  IF source_site.id IS NULL OR target_site.id IS NULL
     OR source_site.owner_id IS DISTINCT FROM actor
     OR target_site.owner_id IS DISTINCT FROM actor THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'BOTH_SITE_OWNERSHIP_REQUIRED';
  END IF;
  IF target_site.status <> 'active'::public.site_status THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'TARGET_SITE_INACTIVE';
  END IF;
  SELECT * INTO domain_row FROM public.site_domains
    WHERE id = p_domain_id FOR UPDATE NOWAIT;
  IF domain_row.id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'DOMAIN_NOT_ACCESSIBLE';
  END IF;
  IF domain_row.hostname IS DISTINCT FROM lower(btrim(p_confirm_hostname)) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'HOSTNAME_CONFIRMATION_MISMATCH';
  END IF;
  IF domain_row.provider <> 'cloudflare-full-zone'
     OR domain_row.status NOT IN ('pending'::public.domain_status,
                                 'verifying'::public.domain_status,
                                 'active'::public.domain_status) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'DOMAIN_STATE_NOT_TRANSFERABLE';
  END IF;
  expected_hostname := CASE
    WHEN domain_row.status = 'active'::public.domain_status
      AND domain_row.is_primary IS TRUE THEN domain_row.hostname ELSE NULL END;
  IF domain_row.site_id = p_target_site_id THEN
    IF source_site.custom_domain = domain_row.hostname
       OR target_site.custom_domain IS DISTINCT FROM expected_hostname THEN
      RAISE EXCEPTION USING ERRCODE = '40001', MESSAGE = 'DOMAIN_MAPPING_REQUIRES_RECONCILIATION';
    END IF;
    RETURN jsonb_build_object('status', 'already_at_target',
      'domainId', domain_row.id, 'hostname', domain_row.hostname,
      'sourceSiteId', source_site.id, 'targetSiteId', target_site.id,
      'changed', false);
  END IF;
  IF domain_row.site_id IS DISTINCT FROM p_source_site_id THEN
    RAISE EXCEPTION USING ERRCODE = '40001', MESSAGE = 'DOMAIN_SOURCE_CHANGED';
  END IF;
  UPDATE public.site_domains SET site_id = p_target_site_id
    WHERE id = p_domain_id AND site_id = p_source_site_id;
  GET DIAGNOSTICS changed = ROW_COUNT;
  IF changed <> 1 THEN
    RAISE EXCEPTION USING ERRCODE = '40001', MESSAGE = 'DOMAIN_TRANSFER_NOT_APPLIED';
  END IF;
  RETURN jsonb_build_object('status', 'moved',
    'domainId', domain_row.id, 'hostname', domain_row.hostname,
    'sourceSiteId', source_site.id, 'targetSiteId', target_site.id,
    'changed', true);
END;
$move$;

REVOKE ALL ON FUNCTION private.guard_domain_site_transfer_v1()
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION private.sync_transferred_domain_sites_v1()
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.move_site_domain_v1(uuid, uuid, uuid, text)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.move_site_domain_v1(uuid, uuid, uuid, text)
  TO authenticated;
COMMIT;

-- Activation gates: test on disposable PostgreSQL matching production.
-- Cover missing/expired auth; ownership and admin-only rejection; pending/
-- verifying/active; occupied target; concurrent registration and transfer;
-- RLS-denied synchronization; rollback; repeated and stale confirmations.
-- already_at_target describes current state, not an idempotency receipt.
-- If the HTTP response is lost, re-read state; do not declare rollback.
-- This database draft performs no Cloudflare/DNS calls. Provider aliases,
-- hostname cache invalidation and React confirmation still need integration.
-- Stage 4 and the overall stage 5 remain OPEN. Never apply this on commit.
