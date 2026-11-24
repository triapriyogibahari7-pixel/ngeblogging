BEGIN;
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='15s';
CREATE FUNCTION private.saas_free_primary_handoff_v1() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $fn$
DECLARE actor uuid; s public.sites%ROWTYPE; f public.site_domains%ROWTYPE; changed integer;
BEGIN
 IF NEW.provider NOT IN ('cloudflare','cloudflare-custom-hostnames') OR NEW.hostname='ngeblogging.com' OR NEW.hostname LIKE '%.ngeblogging.com' THEN RETURN NEW; END IF;
 actor:=auth.uid();
 IF actor IS NULL THEN RETURN NEW; END IF;
 IF NEW.site_id IS DISTINCT FROM OLD.site_id OR NEW.hostname IS DISTINCT FROM OLD.hostname OR NEW.provider IS DISTINCT FROM OLD.provider OR NEW.provider_hostname_id IS DISTINCT FROM OLD.provider_hostname_id OR NEW.provider_hostname_id IS NULL THEN RAISE EXCEPTION 'SAAS_PRIMARY_IDENTITY_CHANGED' USING ERRCODE='22023'; END IF;
 IF OLD.status::text IN ('pending_deletion','deleted','blocked','test_blocked','test_failed') THEN RAISE EXCEPTION 'SAAS_PRIMARY_TERMINAL_STATE' USING ERRCODE='23514'; END IF;
 IF NEW.status::text<>'active' OR NEW.provider_status IS DISTINCT FROM 'active' OR NEW.ssl_status IS DISTINCT FROM 'active' THEN RAISE EXCEPTION 'SAAS_PRIMARY_PROVIDER_NOT_ACTIVE' USING ERRCODE='23514'; END IF;
 SELECT * INTO s FROM public.sites WHERE id=NEW.site_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'SAAS_PRIMARY_SITE_MANAGER_REQUIRED' USING ERRCODE='42501'; END IF;
 IF s.owner_id IS DISTINCT FROM actor AND NOT EXISTS(SELECT 1 FROM public.site_members m WHERE m.site_id=s.id AND m.user_id=actor AND m.role::text IN ('owner','admin')) THEN RAISE EXCEPTION 'SAAS_PRIMARY_SITE_MANAGER_REQUIRED' USING ERRCODE='42501'; END IF;
 SELECT * INTO f FROM public.site_domains WHERE site_id=s.id AND is_primary IS TRUE AND id<>NEW.id ORDER BY id FOR UPDATE;
 IF NOT FOUND THEN RETURN NEW; END IF;
 IF f.hostname IS DISTINCT FROM s.slug||'.ngeblogging.com' OR f.status::text<>'active' OR f.provider_hostname_id IS NOT NULL THEN RAISE EXCEPTION 'SAAS_PRIMARY_REVIEW_REQUIRED' USING ERRCODE='40001'; END IF;
 UPDATE public.site_domains SET is_primary=false WHERE id=f.id AND site_id=s.id AND is_primary IS TRUE;
 GET DIAGNOSTICS changed=ROW_COUNT;
 IF changed<>1 THEN RAISE EXCEPTION 'SAAS_PRIMARY_SNAPSHOT_CHANGED' USING ERRCODE='40001'; END IF;
 RETURN NEW;
END;
$fn$;
REVOKE ALL ON FUNCTION private.saas_free_primary_handoff_v1() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER domain_saas_free_primary_handoff_v1 BEFORE UPDATE OF is_primary ON public.site_domains FOR EACH ROW WHEN(NEW.is_primary IS TRUE AND OLD.is_primary IS NOT TRUE) EXECUTE FUNCTION private.saas_free_primary_handoff_v1();
COMMIT;
