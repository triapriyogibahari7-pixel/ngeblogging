BEGIN;
SET LOCAL lock_timeout='2s';
CREATE TABLE public.domain_pending_recheck_claims(zone_id text PRIMARY KEY CHECK(zone_id ~ '^[a-f0-9]{32}$'),domain_id uuid NOT NULL REFERENCES public.site_domains(id) ON DELETE CASCADE,last_claimed_at timestamptz NOT NULL);
CREATE INDEX domain_pending_recheck_time_idx ON public.domain_pending_recheck_claims(last_claimed_at);
ALTER TABLE public.domain_pending_recheck_claims ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.domain_pending_recheck_claims FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.domain_pending_recheck_claims TO service_role;
CREATE FUNCTION public.claim_domain_pending_recheck(p_domain_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' SET lock_timeout='2s' AS $f$
DECLARE d public.site_domains%ROWTYPE;u uuid:=auth.uid();sid uuid;n timestamptz;claimed text;
BEGIN
 SELECT site_id INTO sid FROM public.site_domains WHERE id=p_domain_id;
 PERFORM 1 FROM public.sites WHERE id=sid FOR SHARE;
 SELECT * INTO d FROM public.site_domains WHERE id=p_domain_id FOR SHARE;
 IF NOT FOUND OR u IS NULL OR d.provider IS DISTINCT FROM 'cloudflare-full-zone' OR d.status NOT IN ('pending','verifying','active') OR d.provider_hostname_id IS NULL OR d.provider_hostname_id !~ '^[a-f0-9]{32}$' OR d.hostname='ngeblogging.com' OR d.hostname LIKE '%.ngeblogging.com' OR NOT EXISTS(SELECT 1 FROM public.sites s WHERE s.id=d.site_id AND (s.owner_id=u OR EXISTS(SELECT 1 FROM public.site_members m WHERE m.site_id=s.id AND m.user_id=u AND m.role IN ('owner','admin')))) THEN RAISE EXCEPTION 'RECHECK_NOT_AUTHORIZED' USING ERRCODE='42501';END IF;
 PERFORM pg_advisory_xact_lock(73476291::bigint);n:=clock_timestamp();
 IF (SELECT count(*) FROM public.domain_pending_recheck_claims WHERE last_claimed_at>n-interval '1 minute')>=6 THEN RETURN jsonb_build_object('acquired',false,'code','RECHECK_GLOBAL_RATE_LIMITED');END IF;
 INSERT INTO public.domain_pending_recheck_claims AS previous(zone_id,domain_id,last_claimed_at) VALUES(d.provider_hostname_id,d.id,n) ON CONFLICT(zone_id) DO UPDATE SET domain_id=excluded.domain_id,last_claimed_at=excluded.last_claimed_at WHERE previous.last_claimed_at<=n-interval '1 hour' RETURNING zone_id INTO claimed;
 IF claimed IS NULL THEN RETURN jsonb_build_object('acquired',false,'code','RECHECK_COOLDOWN');END IF;
 RETURN jsonb_build_object('acquired',true,'domainId',d.id,'siteId',d.site_id,'hostname',d.hostname,'zoneId',d.provider_hostname_id);
END $f$;
REVOKE ALL ON FUNCTION public.claim_domain_pending_recheck(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.claim_domain_pending_recheck(uuid) TO authenticated;
COMMENT ON TABLE public.domain_pending_recheck_claims IS 'Durable claim/cooldown only, not proof a provider request was sent or accepted. One claim per zone per hour, six claims globally per minute. API must separately verify the provider account and exact pending zone before using it. No domain status, DNS, delegation or publication writes.';
COMMIT;
