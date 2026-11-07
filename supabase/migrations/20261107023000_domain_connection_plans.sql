BEGIN;
SET LOCAL lock_timeout='2s';
SET LOCAL statement_timeout='30s';
CREATE TABLE public.domain_connection_plans (domain_id uuid PRIMARY KEY REFERENCES public.site_domains(id) ON DELETE CASCADE,site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,plan jsonb NOT NULL CHECK(jsonb_typeof(plan)='object' AND octet_length(plan::text)<=32768),revision bigint NOT NULL CHECK(revision>0),updated_at timestamptz NOT NULL DEFAULT clock_timestamp());
ALTER TABLE public.domain_connection_plans ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.domain_connection_plans FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.domain_connection_plans TO service_role;
CREATE FUNCTION public.read_domain_connection_plan(p_site_id uuid,p_domain_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $f$
DECLARE r public.domain_connection_plans%ROWTYPE;u uuid:=auth.uid();
BEGIN
 PERFORM 1 FROM public.sites WHERE id=p_site_id FOR SHARE;
 PERFORM 1 FROM public.site_domains WHERE id=p_domain_id AND site_id=p_site_id FOR SHARE;
 IF u IS NULL OR NOT EXISTS(SELECT 1 FROM public.site_domains d JOIN public.sites s ON s.id=d.site_id WHERE d.id=p_domain_id AND d.site_id=p_site_id AND (s.owner_id=u OR EXISTS(SELECT 1 FROM public.site_members m WHERE m.site_id=s.id AND m.user_id=u AND m.role IN ('owner','admin')))) THEN RAISE EXCEPTION 'DOMAIN_PLAN_NOT_AUTHORIZED' USING ERRCODE='42501';END IF;
 SELECT * INTO r FROM public.domain_connection_plans WHERE domain_id=p_domain_id AND site_id=p_site_id;
 IF NOT FOUND THEN RETURN jsonb_build_object('plan',NULL,'revision',0);END IF;
 RETURN jsonb_build_object('plan',r.plan,'revision',r.revision);
END $f$;
CREATE FUNCTION public.save_domain_connection_plan(p_site_id uuid,p_domain_id uuid,p_plan jsonb,p_expected_revision bigint) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $f$
DECLARE d public.site_domains%ROWTYPE;u uuid:=auth.uid();v bigint;
BEGIN
 PERFORM 1 FROM public.sites WHERE id=p_site_id FOR SHARE;
 SELECT * INTO d FROM public.site_domains WHERE id=p_domain_id AND site_id=p_site_id FOR SHARE;
 IF NOT FOUND OR u IS NULL OR d.status='pending_deletion' OR NOT EXISTS(SELECT 1 FROM public.sites s WHERE s.id=p_site_id AND (s.owner_id=u OR EXISTS(SELECT 1 FROM public.site_members m WHERE m.site_id=s.id AND m.user_id=u AND m.role IN ('owner','admin')))) THEN RAISE EXCEPTION 'DOMAIN_PLAN_NOT_AUTHORIZED' USING ERRCODE='42501';END IF;
 IF p_expected_revision IS NULL OR p_expected_revision<0 OR p_plan IS NULL OR jsonb_typeof(p_plan) IS DISTINCT FROM 'object' OR octet_length(p_plan::text)>32768 THEN RAISE EXCEPTION 'DOMAIN_PLAN_INVALID';END IF;
 IF (p_plan->>'version') IS DISTINCT FROM '1' OR (p_plan->>'hostname') IS DISTINCT FROM d.hostname OR coalesce(p_plan->>'dnsProvider','') NOT IN ('registrar','cloudflare','other') OR coalesce(p_plan->>'destination','') NOT IN ('ngeblogging','blogger','external') OR jsonb_typeof(p_plan->'registrar') IS DISTINCT FROM 'string' OR length(p_plan->>'registrar')>120 OR jsonb_typeof(p_plan->'nameservers') IS DISTINCT FROM 'array' OR jsonb_typeof(p_plan->'records') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'DOMAIN_PLAN_INVALID';END IF;
 IF jsonb_array_length(p_plan->'nameservers')>13 OR jsonb_array_length(p_plan->'records')>24 THEN RAISE EXCEPTION 'DOMAIN_PLAN_LIMIT';END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(p_plan->'nameservers') n WHERE jsonb_typeof(n) IS DISTINCT FROM 'string' OR length(n#>>'{}')>253 OR (n#>>'{}') !~ '^[a-z0-9][a-z0-9.-]*[.][a-z][a-z0-9-]*$') THEN RAISE EXCEPTION 'DOMAIN_PLAN_NAMESERVER_INVALID';END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(p_plan->'records') r WHERE jsonb_typeof(r) IS DISTINCT FROM 'object' OR coalesce(r->>'type','') NOT IN ('A','AAAA','CNAME','TXT','MX') OR jsonb_typeof(r->'host') IS DISTINCT FROM 'string' OR jsonb_typeof(r->'value') IS DISTINCT FROM 'string' OR length(r->>'host')>253 OR length(r->>'value') NOT BETWEEN 1 AND 2048 OR NOT(coalesce(r->>'host','')=d.hostname OR right(coalesce(r->>'host',''),length(d.hostname)+1)='.'||d.hostname)) THEN RAISE EXCEPTION 'DOMAIN_PLAN_RECORD_INVALID';END IF;
 INSERT INTO public.domain_connection_plans AS existing(domain_id,site_id,plan,revision) SELECT p_domain_id,p_site_id,p_plan,1 WHERE p_expected_revision=0 OR EXISTS(SELECT 1 FROM public.domain_connection_plans WHERE domain_id=p_domain_id) ON CONFLICT(domain_id) DO UPDATE SET site_id=excluded.site_id,plan=excluded.plan,revision=existing.revision+1,updated_at=clock_timestamp() WHERE (existing.site_id=p_site_id AND existing.revision=p_expected_revision) OR (existing.site_id<>p_site_id AND p_expected_revision=0) RETURNING revision INTO v;
 IF v IS NULL THEN RAISE EXCEPTION 'DOMAIN_PLAN_CHANGED_RELOAD' USING ERRCODE='40001';END IF;
 RETURN jsonb_build_object('revision',v);
END $f$;
REVOKE ALL ON FUNCTION public.read_domain_connection_plan(uuid,uuid) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.save_domain_connection_plan(uuid,uuid,jsonb,bigint) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.read_domain_connection_plan(uuid,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_domain_connection_plan(uuid,uuid,jsonb,bigint) TO authenticated;
COMMENT ON TABLE public.domain_connection_plans IS 'Private user-entered DNS planning metadata only; not provider-assigned nameservers, verified ownership, DNS execution or readiness evidence. No provider or site_domains updates are performed by these RPCs.';
COMMIT;
