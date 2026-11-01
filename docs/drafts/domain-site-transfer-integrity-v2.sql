-- DRAFT ONLY: stage 5 integrity candidate. Never apply to production on commit.
-- Requires the V2 RPC/index and qualified redirect RLS prerequisite in a disposable database.
BEGIN;
SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '15s';
ALTER TABLE public.site_domains ADD CONSTRAINT site_domains_id_site_v2 UNIQUE (id,site_id);
ALTER TABLE public.site_domain_redirects ADD CONSTRAINT site_domain_redirects_domain_site_v2
  FOREIGN KEY (domain_id,site_id) REFERENCES public.site_domains(id,site_id)
  ON UPDATE NO ACTION ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;
CREATE FUNCTION private.guard_domain_move_integrity_v2()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER
SET search_path = '' SET lock_timeout = '2s'
AS $guard$
DECLARE actor uuid := auth.uid();
BEGIN
  IF NEW.site_id IS NOT DISTINCT FROM OLD.site_id THEN RETURN NEW; END IF;
  IF actor IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED' USING ERRCODE='42501'; END IF;
  IF OLD.provider IS DISTINCT FROM 'cloudflare-full-zone'
     OR OLD.hostname = 'ngeblogging.com' OR OLD.hostname LIKE '%.ngeblogging.com'
     OR OLD.hostname IS DISTINCT FROM pg_catalog.lower(OLD.hostname)
     OR OLD.status IS NULL
     OR OLD.status NOT IN ('pending'::public.domain_status,'verifying'::public.domain_status,'active'::public.domain_status)
     OR (OLD.is_primary IS TRUE AND OLD.status <> 'active'::public.domain_status) THEN
    RAISE EXCEPTION 'DOMAIN_STATE_NOT_TRANSFERABLE' USING ERRCODE='22023';
  END IF;
  IF (pg_catalog.to_jsonb(NEW)-ARRAY['site_id','updated_at'])
      IS DISTINCT FROM (pg_catalog.to_jsonb(OLD)-ARRAY['site_id','updated_at']) THEN
    RAISE EXCEPTION 'TRANSFER_MUST_PRESERVE_DOMAIN_FIELDS' USING ERRCODE='22023';
  END IF;
  PERFORM s.id FROM public.sites s WHERE s.id IN (OLD.site_id,NEW.site_id) ORDER BY s.id FOR UPDATE NOWAIT;
  IF (SELECT count(*) FROM public.sites s WHERE s.id IN (OLD.site_id,NEW.site_id)
      AND s.owner_id=actor AND private.has_site_role(s.id,ARRAY['owner'::public.member_role])) <> 2 THEN
    RAISE EXCEPTION 'BOTH_SITE_OWNERSHIP_AND_MEMBERSHIP_REQUIRED' USING ERRCODE='42501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.sites s WHERE s.id=NEW.site_id AND s.status='active'::public.site_status) THEN
    RAISE EXCEPTION 'TARGET_SITE_INACTIVE' USING ERRCODE='22023';
  END IF;
  RETURN NEW;
END;
$guard$;
CREATE TRIGGER guard_domain_move_integrity_v2 BEFORE UPDATE ON public.site_domains
FOR EACH ROW EXECUTE FUNCTION private.guard_domain_move_integrity_v2();
CREATE FUNCTION private.check_domain_move_mapping_v2()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''
AS $check$
DECLARE actor uuid := auth.uid();
BEGIN
  IF NEW.site_id IS NOT DISTINCT FROM OLD.site_id THEN RETURN NULL; END IF;
  IF actor IS NULL OR (SELECT count(*) FROM public.sites s WHERE s.id IN (OLD.site_id,NEW.site_id)
      AND s.owner_id=actor AND private.has_site_role(s.id,ARRAY['owner'::public.member_role])) <> 2 THEN
    RAISE EXCEPTION 'MOVE_FINAL_SITES_NOT_AUTHORIZED' USING ERRCODE='42501';
  END IF;
  IF EXISTS (SELECT 1 FROM public.sites s WHERE s.id IN (OLD.site_id,NEW.site_id)
    AND (NOT EXISTS (SELECT 1 FROM public.site_domains d WHERE d.site_id=s.id
      AND d.hostname=s.slug || '.ngeblogging.com' AND d.provider='cloudflare' AND d.status='active'::public.domain_status)
      OR NOT EXISTS (SELECT 1 FROM public.site_domains d WHERE d.site_id=s.id
        AND d.status='active'::public.domain_status AND d.is_primary IS TRUE)
      OR s.custom_domain IS DISTINCT FROM (SELECT d.hostname FROM public.site_domains d
        WHERE d.site_id=s.id AND d.status='active'::public.domain_status AND d.is_primary IS TRUE))) THEN
    RAISE EXCEPTION 'MOVE_FINAL_MAPPING_INCONSISTENT' USING ERRCODE='23514';
  END IF;
  RETURN NULL;
END;
$check$;
CREATE CONSTRAINT TRIGGER check_domain_move_mapping_v2 AFTER UPDATE ON public.site_domains
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION private.check_domain_move_mapping_v2();
REVOKE ALL ON FUNCTION private.guard_domain_move_integrity_v2() FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION private.check_domain_move_mapping_v2() FROM PUBLIC,anon,authenticated,service_role;
COMMIT;
-- This preserves data invariants for site_id updates; it does not enforce RPC-only access.
-- It does not protect arbitrary later metadata/site mapping writes after the transfer commits.
-- Full-schema, PG17, concurrency, registration, provider/cache and React tests remain required.
