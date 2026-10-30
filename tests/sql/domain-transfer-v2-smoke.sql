\set ON_ERROR_STOP on
-- Disposable representative schema, NOT a production clone or browser E2E.
-- No provider calls. No production secrets. No application files changed.
DO $$ BEGIN IF current_database() <> 'domain_transfer_test' THEN
  RAISE EXCEPTION 'DISPOSABLE_TEST_DATABASE_REQUIRED'; END IF; END $$;
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN;
CREATE SCHEMA auth;
CREATE SCHEMA private;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
$$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
CREATE TYPE public.member_role AS ENUM ('owner','admin','editor','viewer');
CREATE TYPE public.site_status AS ENUM ('active','inactive');
CREATE TYPE public.domain_status AS ENUM ('pending','verifying','active','failed');
CREATE TABLE public.sites(id uuid PRIMARY KEY, owner_id uuid NOT NULL, slug text NOT NULL UNIQUE, status public.site_status NOT NULL, custom_domain text, updated_at timestamptz DEFAULT now());
CREATE TABLE public.site_members(site_id uuid REFERENCES public.sites, user_id uuid, role public.member_role, PRIMARY KEY(site_id,user_id));
CREATE TABLE public.site_domains(id uuid PRIMARY KEY,site_id uuid NOT NULL REFERENCES public.sites,hostname text NOT NULL UNIQUE,status public.domain_status NOT NULL,provider text NOT NULL,is_primary boolean NOT NULL DEFAULT false,ownership_verification jsonb DEFAULT '{}',updated_at timestamptz DEFAULT now());
CREATE UNIQUE INDEX site_domains_one_primary_per_site ON public.site_domains(site_id) WHERE is_primary;
CREATE TABLE public.site_domain_redirects(id uuid PRIMARY KEY,site_id uuid NOT NULL REFERENCES public.sites,domain_id uuid NOT NULL REFERENCES public.site_domains,source_hostname text NOT NULL,target_url text NOT NULL,updated_at timestamptz DEFAULT now());
CREATE FUNCTION private.has_site_role(p_site uuid,p_roles public.member_role[]) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS
$$ SELECT EXISTS(SELECT 1 FROM public.site_members m WHERE m.site_id=p_site AND m.user_id=auth.uid() AND m.role=ANY(p_roles)) $$;
ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_domain_redirects ENABLE ROW LEVEL SECURITY;
CREATE POLICY sites_manager ON public.sites FOR ALL TO authenticated USING(private.has_site_role(id,ARRAY['owner','admin']::public.member_role[])) WITH CHECK(private.has_site_role(id,ARRAY['owner','admin']::public.member_role[]));
CREATE POLICY domains_manager ON public.site_domains FOR ALL TO authenticated USING(private.has_site_role(site_id,ARRAY['owner','admin']::public.member_role[])) WITH CHECK(private.has_site_role(site_id,ARRAY['owner','admin']::public.member_role[]));
CREATE POLICY redirects_read_members ON public.site_domain_redirects FOR SELECT TO authenticated USING(private.has_site_role(site_id,ARRAY['owner','admin']::public.member_role[]));
CREATE POLICY redirects_insert_admins ON public.site_domain_redirects FOR INSERT TO authenticated WITH CHECK(true);
CREATE POLICY redirects_update_admins ON public.site_domain_redirects FOR UPDATE TO authenticated USING(true) WITH CHECK(true);
GRANT USAGE ON SCHEMA public,private,auth TO authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.sites,public.site_domains,public.site_domain_redirects TO authenticated;
-- Representative status/primary synchronization; not the full production trigger set.
CREATE FUNCTION private.smoke_sync() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ BEGIN
 UPDATE public.sites s SET custom_domain=(SELECT d.hostname FROM public.site_domains d WHERE d.site_id=s.id AND d.status='active' AND d.is_primary) WHERE s.id=NEW.site_id;
 RETURN NEW; END $$;
CREATE TRIGGER smoke_sync AFTER UPDATE OF status,is_primary,hostname ON public.site_domains FOR EACH ROW EXECUTE FUNCTION private.smoke_sync();
\ir ../../docs/drafts/domain-redirect-rls-v2-prerequisite.sql
\ir ../../docs/drafts/domain-site-transfer-v2.sql
-- Test-only grant; deliberately absent from the candidate draft.
GRANT EXECUTE ON FUNCTION public.move_site_domain_v2(uuid,uuid,uuid,text) TO authenticated;
INSERT INTO public.sites VALUES
 ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000010','source','active','example.test',now()),
 ('00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000010','target','active','target.ngeblogging.com',now());
INSERT INTO public.site_members VALUES
 ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000010','owner'),
 ('00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000010','owner');
INSERT INTO public.site_domains(id,site_id,hostname,status,provider,is_primary,ownership_verification) VALUES
 ('00000000-0000-0000-0000-000000000101','00000000-0000-0000-0000-000000000001','source.ngeblogging.com','active','cloudflare',false,'{}'),
 ('00000000-0000-0000-0000-000000000102','00000000-0000-0000-0000-000000000002','target.ngeblogging.com','active','cloudflare',true,'{}'),
 ('00000000-0000-0000-0000-000000000103','00000000-0000-0000-0000-000000000001','example.test','active','cloudflare-full-zone',true,'{"additional_hostnames":[{"hostname":"www.example.test"}]}');
INSERT INTO public.site_domain_redirects VALUES ('00000000-0000-0000-0000-000000000201','00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000103','go.example.test','https://example.test/',now());
CREATE FUNCTION private.smoke_fail_redirect() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF current_setting('smoke.fail_redirect',true)='on' THEN RAISE EXCEPTION 'SMOKE_FORCED_FAILURE'; END IF; RETURN NEW; END $$;
CREATE TRIGGER smoke_fail_redirect BEFORE UPDATE ON public.site_domain_redirects FOR EACH ROW EXECUTE FUNCTION private.smoke_fail_redirect();
BEGIN;
SET LOCAL ROLE authenticated;
DO $$ DECLARE a uuid:='00000000-0000-0000-0000-000000000001'; b uuid:='00000000-0000-0000-0000-000000000002'; d uuid:='00000000-0000-0000-0000-000000000103'; result jsonb; BEGIN
 PERFORM set_config('request.jwt.claim.sub','',true);
 BEGIN PERFORM public.move_site_domain_v2(d,a,b,'example.test'); RAISE EXCEPTION 'AUTH_NEGATIVE_CONTROL_FAILED' USING ERRCODE='ZX001'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 PERFORM set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000099',true);
 BEGIN PERFORM public.move_site_domain_v2(d,a,b,'example.test'); RAISE EXCEPTION 'OWNER_NEGATIVE_CONTROL_FAILED' USING ERRCODE='ZX001'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 PERFORM set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000010',true);
 BEGIN PERFORM public.move_site_domain_v2(d,a,b,'wrong.test'); RAISE EXCEPTION 'HOSTNAME_NEGATIVE_CONTROL_FAILED' USING ERRCODE='ZX001'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
 BEGIN UPDATE public.site_domain_redirects SET site_id=b; RAISE EXCEPTION 'REDIRECT_RLS_NEGATIVE_CONTROL_FAILED' USING ERRCODE='ZX001'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 PERFORM set_config('smoke.fail_redirect','on',true);
 BEGIN PERFORM public.move_site_domain_v2(d,a,b,'example.test'); RAISE EXCEPTION 'FAILURE_INJECTION_NOT_REACHED' USING ERRCODE='ZX001'; EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'SMOKE_FORCED_FAILURE' THEN RAISE; END IF; END;
 IF (SELECT site_id FROM public.site_domains WHERE id=d)<>a OR NOT (SELECT is_primary FROM public.site_domains WHERE hostname='target.ngeblogging.com') OR (SELECT custom_domain FROM public.sites WHERE id=a)<>'example.test' OR (SELECT site_id FROM public.site_domain_redirects LIMIT 1)<>a THEN RAISE EXCEPTION 'ROLLBACK_STATE_INVALID'; END IF;
 PERFORM set_config('smoke.fail_redirect','off',true);
 result:=public.move_site_domain_v2(d,a,b,'example.test');
 IF result->>'status'<>'moved' OR (result->>'redirectsMoved')::integer<>1 OR (SELECT custom_domain FROM public.sites WHERE id=a)<>'source.ngeblogging.com' OR (SELECT custom_domain FROM public.sites WHERE id=b)<>'example.test' OR (SELECT site_id FROM public.site_domain_redirects LIMIT 1)<>b OR (SELECT count(*) FROM public.site_domains WHERE hostname IN ('source.ngeblogging.com','target.ngeblogging.com'))<>2 OR (SELECT ownership_verification->'additional_hostnames'->0->>'hostname' FROM public.site_domains WHERE id=d)<>'www.example.test' THEN RAISE EXCEPTION 'MOVE_STATE_INVALID'; END IF;
 BEGIN PERFORM public.move_site_domain_v2(d,a,b,'example.test'); RAISE EXCEPTION 'RETRY_NEGATIVE_CONTROL_FAILED' USING ERRCODE='ZX001'; EXCEPTION WHEN serialization_failure THEN NULL; END;
 RAISE NOTICE 'SMOKE PASSED: auth, owner, confirmation, redirect RLS, injected rollback, active move, metadata, managed fallback, stale retry';
END $$;
ROLLBACK;
-- Missing: pending/verifying, admin/viewer matrix, concurrency, full production
-- triggers/policies, cache/provider/registration integration and React E2E.
