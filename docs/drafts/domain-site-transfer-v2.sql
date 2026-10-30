-- DRAFT ONLY: issue #730. Never apply to production or on commit.
-- Requires domain-redirect-rls-v2-prerequisite.sql in disposable PostgreSQL.
-- UNTESTED: syntax, authenticated RLS, rollback, concurrency, provider/cache E2E.
-- No application EXECUTE grant. This is not an activation migration.
BEGIN;
SET LOCAL lock_timeout = '2s';

-- Proposed classifier: all non-platform hostnames reserve a custom slot.
-- Unknown providers and platform topology require separate preflight review.
-- Duplicate custom rows fail index creation; never delete them automatically.
CREATE UNIQUE INDEX site_domains_one_external_per_site_v2
ON public.site_domains(site_id)
WHERE hostname <> 'ngeblogging.com' AND hostname NOT LIKE '%.ngeblogging.com';

CREATE FUNCTION public.move_site_domain_v2(
  p_domain_id uuid, p_source_site_id uuid, p_target_site_id uuid,
  p_confirm_hostname text
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER
SET search_path = '' SET lock_timeout = '2s' SET statement_timeout = '15s'
AS $move$
DECLARE
  actor uuid := auth.uid();
  source_site public.sites%ROWTYPE;
  target_site public.sites%ROWTYPE;
  domain_before public.site_domains%ROWTYPE;
  source_free uuid; target_free uuid;
  expected_redirects bigint; changed bigint;
BEGIN
  IF actor IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED' USING ERRCODE='42501'; END IF;
  IF p_domain_id IS NULL OR p_source_site_id IS NULL OR p_target_site_id IS NULL
     OR p_source_site_id = p_target_site_id OR p_confirm_hostname IS NULL
     OR pg_catalog.btrim(p_confirm_hostname) = '' THEN
    RAISE EXCEPTION 'INVALID_TRANSFER_CONFIRMATION' USING ERRCODE='22023';
  END IF;
  -- Conservative prototype: serializes writes to these three tables.
  -- Not production-ready; benchmark/review lock scope before activation.
  LOCK TABLE public.sites, public.site_domains, public.site_domain_redirects
    IN SHARE ROW EXCLUSIVE MODE;
  SELECT * INTO source_site FROM public.sites WHERE id=p_source_site_id FOR UPDATE;
  SELECT * INTO target_site FROM public.sites WHERE id=p_target_site_id FOR UPDATE;
  IF source_site.id IS NULL OR target_site.id IS NULL
     OR source_site.owner_id IS DISTINCT FROM actor
     OR target_site.owner_id IS DISTINCT FROM actor
     OR private.has_site_role(p_source_site_id, ARRAY['owner'::public.member_role]) IS NOT TRUE
     OR private.has_site_role(p_target_site_id, ARRAY['owner'::public.member_role]) IS NOT TRUE THEN
    RAISE EXCEPTION 'BOTH_SITE_OWNERSHIP_AND_MEMBERSHIP_REQUIRED' USING ERRCODE='42501';
  END IF;
  IF target_site.status IS DISTINCT FROM 'active'::public.site_status THEN
    RAISE EXCEPTION 'TARGET_SITE_INACTIVE' USING ERRCODE='22023';
  END IF;
  SELECT * INTO domain_before FROM public.site_domains WHERE id=p_domain_id FOR UPDATE;
  IF domain_before.id IS NULL THEN
    RAISE EXCEPTION 'DOMAIN_NOT_ACCESSIBLE' USING ERRCODE='42501';
  END IF;
  IF domain_before.site_id IS DISTINCT FROM p_source_site_id THEN
    -- Includes a repeated request after a successful move: caller must re-read.
    RAISE EXCEPTION 'DOMAIN_SOURCE_CHANGED_RELOAD_STATE' USING ERRCODE='40001';
  END IF;
  IF domain_before.hostname IS DISTINCT FROM pg_catalog.lower(pg_catalog.btrim(p_confirm_hostname)) THEN
    RAISE EXCEPTION 'HOSTNAME_CONFIRMATION_MISMATCH' USING ERRCODE='22023';
  END IF;
  IF domain_before.provider IS DISTINCT FROM 'cloudflare-full-zone'
     OR domain_before.hostname = 'ngeblogging.com'
     OR domain_before.hostname LIKE '%.ngeblogging.com'
     OR domain_before.status IS NULL
     OR domain_before.status NOT IN ('pending'::public.domain_status,'verifying'::public.domain_status,'active'::public.domain_status)
     OR (domain_before.is_primary IS TRUE AND domain_before.status <> 'active'::public.domain_status) THEN
    RAISE EXCEPTION 'DOMAIN_STATE_NOT_TRANSFERABLE' USING ERRCODE='22023';
  END IF;
  -- Fail closed on unreviewed platform rows or external domains at target.
  IF EXISTS (SELECT 1 FROM public.site_domains d JOIN public.sites s ON s.id=d.site_id
    WHERE s.id IN (p_source_site_id,p_target_site_id)
      AND (d.hostname='ngeblogging.com' OR d.hostname LIKE '%.ngeblogging.com')
      AND (d.hostname IS DISTINCT FROM s.slug || '.ngeblogging.com'
        OR d.provider IS DISTINCT FROM 'cloudflare'
        OR d.status IS DISTINCT FROM 'active'::public.domain_status)) THEN
    RAISE EXCEPTION 'PLATFORM_TOPOLOGY_REQUIRES_REVIEW' USING ERRCODE='23514';
  END IF;
  IF EXISTS (SELECT 1 FROM public.site_domains d WHERE d.site_id=p_target_site_id
    AND d.hostname <> 'ngeblogging.com' AND d.hostname NOT LIKE '%.ngeblogging.com') THEN
    RAISE EXCEPTION 'TARGET_HAS_CUSTOM_DOMAIN' USING ERRCODE='23505';
  END IF;
  SELECT id INTO source_free FROM public.site_domains
    WHERE site_id=p_source_site_id AND hostname=source_site.slug || '.ngeblogging.com' FOR UPDATE;
  SELECT id INTO target_free FROM public.site_domains
    WHERE site_id=p_target_site_id AND hostname=target_site.slug || '.ngeblogging.com' FOR UPDATE;
  IF source_free IS NULL OR target_free IS NULL THEN
    RAISE EXCEPTION 'MANAGED_SUBDOMAIN_REQUIRED' USING ERRCODE='23514';
  END IF;
  IF EXISTS (SELECT 1 FROM public.site_domain_redirects r WHERE r.domain_id=p_domain_id
    AND r.site_id IS DISTINCT FROM p_source_site_id) THEN
    RAISE EXCEPTION 'REDIRECT_SITE_MISMATCH_REQUIRES_REVIEW' USING ERRCODE='23514';
  END IF;
  SELECT count(*) INTO expected_redirects FROM public.site_domain_redirects WHERE domain_id=p_domain_id;
  IF domain_before.is_primary IS TRUE THEN
    UPDATE public.site_domains SET is_primary=false WHERE id=target_free;
    GET DIAGNOSTICS changed=ROW_COUNT;
    IF changed<>1 THEN RAISE EXCEPTION 'TARGET_PRIMARY_UPDATE_DENIED' USING ERRCODE='42501'; END IF;
  END IF;
  UPDATE public.site_domains SET site_id=p_target_site_id
    WHERE id=p_domain_id AND site_id=p_source_site_id;
  GET DIAGNOSTICS changed=ROW_COUNT;
  IF changed<>1 THEN RAISE EXCEPTION 'DOMAIN_MOVE_DENIED' USING ERRCODE='42501'; END IF;
  UPDATE public.site_domain_redirects SET site_id=p_target_site_id
    WHERE domain_id=p_domain_id AND site_id=p_source_site_id;
  GET DIAGNOSTICS changed=ROW_COUNT;
  IF changed<>expected_redirects THEN RAISE EXCEPTION 'REDIRECT_MOVE_DENIED' USING ERRCODE='42501'; END IF;
  UPDATE public.site_domains d SET is_primary=true
    WHERE d.id IN (source_free,target_free) AND d.is_primary IS NOT TRUE
      AND NOT EXISTS (SELECT 1 FROM public.site_domains x WHERE x.site_id=d.site_id AND x.is_primary IS TRUE);
  -- The existing metadata trigger does not cover a site_id-only move.
  UPDATE public.sites s SET custom_domain=(SELECT d.hostname FROM public.site_domains d
    WHERE d.site_id=s.id AND d.status='active'::public.domain_status AND d.is_primary IS TRUE),
    updated_at=pg_catalog.now() WHERE s.id IN (p_source_site_id,p_target_site_id);
  GET DIAGNOSTICS changed=ROW_COUNT;
  IF changed<>2 THEN RAISE EXCEPTION 'SITE_SYNC_DENIED' USING ERRCODE='42501'; END IF;
  IF EXISTS (SELECT 1 FROM public.sites s WHERE s.id IN (p_source_site_id,p_target_site_id)
    AND (NOT EXISTS (SELECT 1 FROM public.site_domains d WHERE d.site_id=s.id
      AND d.hostname=s.slug || '.ngeblogging.com' AND d.status='active'::public.domain_status)
      OR NOT EXISTS (SELECT 1 FROM public.site_domains d WHERE d.site_id=s.id
        AND d.status='active'::public.domain_status AND d.is_primary IS TRUE)
      OR s.custom_domain IS DISTINCT FROM (SELECT d.hostname FROM public.site_domains d
        WHERE d.site_id=s.id AND d.status='active'::public.domain_status AND d.is_primary IS TRUE)))
    OR EXISTS (SELECT 1 FROM public.site_domain_redirects r WHERE r.domain_id=p_domain_id
      AND r.site_id IS DISTINCT FROM p_target_site_id)
    OR NOT EXISTS (SELECT 1 FROM public.site_domains d WHERE d.id=p_domain_id
      AND d.site_id=p_target_site_id
      AND (pg_catalog.to_jsonb(d)-ARRAY['site_id','updated_at'])
        IS NOT DISTINCT FROM (pg_catalog.to_jsonb(domain_before)-ARRAY['site_id','updated_at'])) THEN
    RAISE EXCEPTION 'TRANSFER_FINAL_STATE_INVALID' USING ERRCODE='23514';
  END IF;
  RETURN pg_catalog.jsonb_build_object('status','moved','domainId',p_domain_id,
    'sourceSiteId',p_source_site_id,'targetSiteId',p_target_site_id,
    'redirectsMoved',expected_redirects,'providerCacheVerified',false);
END;
$move$;
REVOKE ALL ON FUNCTION public.move_site_domain_v2(uuid,uuid,uuid,text)
  FROM PUBLIC,anon,authenticated,service_role;
COMMIT;

-- Activation blockers: authenticated-role integration tests; registration
-- conflict/recovery tests; failure injection and rollback; lost-response reload;
-- alias routing and cache invalidation; live topology re-audit; lock benchmarking.
-- Direct table writes still need a reviewed transfer guard/integrity design.
-- This RPC alone does not enforce all invariants for writes outside the RPC.
-- No production grant, endpoint, React activation, DNS/provider call or merge.
-- Existing v1 remains blocked; stage 4 and stage 5 remain OPEN.
