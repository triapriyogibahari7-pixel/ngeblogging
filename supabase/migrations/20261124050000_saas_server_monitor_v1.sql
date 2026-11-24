BEGIN;
SET LOCAL lock_timeout='2s';
SET LOCAL statement_timeout='30s';
CREATE TABLE public.saas_monitor_control_v1(
 id boolean PRIMARY KEY DEFAULT true CHECK(id), next_tick_at timestamptz NOT NULL DEFAULT '-infinity',
 seed_after uuid, seed_done boolean NOT NULL DEFAULT false
);
INSERT INTO public.saas_monitor_control_v1(id) VALUES(true);
CREATE TABLE public.saas_monitor_jobs_v1(
 domain_id uuid PRIMARY KEY REFERENCES public.site_domains(id) ON DELETE CASCADE,
 site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
 hostname text NOT NULL, provider_hostname_id text NOT NULL,
 next_at timestamptz NOT NULL DEFAULT clock_timestamp(), lease_until timestamptz NOT NULL DEFAULT '-infinity', lease_token uuid,
 attempts integer NOT NULL DEFAULT 0 CHECK(attempts BETWEEN 0 AND 20),
 checked_at timestamptz, outcome text CHECK(outcome IN('pending','error','https200')),
 evidence jsonb NOT NULL DEFAULT '{}'::jsonb CHECK(octet_length(evidence::text)<=4096)
);
CREATE INDEX saas_monitor_due_v1 ON public.saas_monitor_jobs_v1(next_at,domain_id);
ALTER TABLE public.saas_monitor_control_v1 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_monitor_jobs_v1 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.saas_monitor_control_v1,public.saas_monitor_jobs_v1 FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION public.saas_monitor_enqueue_v1() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF TG_OP='UPDATE' AND NEW.site_id IS NOT DISTINCT FROM OLD.site_id AND NEW.hostname IS NOT DISTINCT FROM OLD.hostname AND NEW.provider IS NOT DISTINCT FROM OLD.provider AND NEW.provider_hostname_id IS NOT DISTINCT FROM OLD.provider_hostname_id AND NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW;END IF;
 IF NEW.provider::text IN('cloudflare','cloudflare-custom-hostnames') AND NEW.provider_hostname_id IS NOT NULL AND NEW.status::text NOT IN('deleted','pending_deletion','blocked','failed') THEN
  INSERT INTO public.saas_monitor_jobs_v1(domain_id,site_id,hostname,provider_hostname_id,next_at)
  VALUES(NEW.id,NEW.site_id,NEW.hostname,NEW.provider_hostname_id,clock_timestamp()+random()*interval '120 seconds')
  ON CONFLICT(domain_id) DO UPDATE SET site_id=EXCLUDED.site_id,hostname=EXCLUDED.hostname,provider_hostname_id=EXCLUDED.provider_hostname_id,next_at=EXCLUDED.next_at,lease_until='-infinity',lease_token=NULL,attempts=0,checked_at=NULL,outcome=NULL,evidence='{}';
 ELSE DELETE FROM public.saas_monitor_jobs_v1 WHERE domain_id=NEW.id;
 END IF;RETURN NEW;
END;$$;
REVOKE ALL ON FUNCTION public.saas_monitor_enqueue_v1() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER saas_monitor_enqueue_v1 AFTER INSERT OR UPDATE OF site_id,hostname,provider,provider_hostname_id,status ON public.site_domains FOR EACH ROW EXECUTE FUNCTION public.saas_monitor_enqueue_v1();
CREATE FUNCTION public.saas_monitor_seed_v1() RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE c public.saas_monitor_control_v1%ROWTYPE; last_id uuid; n integer;
BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'SERVICE_ONLY';END IF;
 SELECT * INTO c FROM public.saas_monitor_control_v1 WHERE id FOR UPDATE SKIP LOCKED;
 IF NOT FOUND OR c.seed_done THEN RETURN 0;END IF;
 WITH batch AS MATERIALIZED(SELECT id,site_id,hostname,provider_hostname_id,provider,status FROM public.site_domains WHERE c.seed_after IS NULL OR id>c.seed_after ORDER BY id LIMIT 1000),
 added AS(INSERT INTO public.saas_monitor_jobs_v1(domain_id,site_id,hostname,provider_hostname_id,next_at)
 SELECT id,site_id,hostname,provider_hostname_id,clock_timestamp()+random()*interval '120 seconds' FROM batch
 WHERE provider::text IN('cloudflare','cloudflare-custom-hostnames') AND provider_hostname_id IS NOT NULL AND status::text NOT IN('deleted','pending_deletion','blocked','failed')
 ON CONFLICT(domain_id) DO NOTHING RETURNING domain_id)
 SELECT (SELECT id FROM batch ORDER BY id DESC LIMIT 1),(SELECT count(*)::integer FROM added) INTO last_id,n;
 UPDATE public.saas_monitor_control_v1 SET seed_after=COALESCE(last_id,c.seed_after),seed_done=last_id IS NULL WHERE id;
 RETURN n;
END;$$;
CREATE FUNCTION public.saas_monitor_claim_v1() RETURNS SETOF public.saas_monitor_jobs_v1 LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE t timestamptz:=clock_timestamp(); ready boolean;
BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'SERVICE_ONLY';END IF;
 SELECT true INTO ready FROM public.saas_monitor_control_v1 WHERE id AND next_tick_at<=t FOR UPDATE SKIP LOCKED;
 IF NOT FOUND THEN RETURN;END IF;
 UPDATE public.saas_monitor_control_v1 SET next_tick_at=t+interval '60 seconds' WHERE id;
 RETURN QUERY WITH due AS(SELECT j.domain_id FROM public.saas_monitor_jobs_v1 j WHERE j.next_at<=t AND j.lease_until<=t ORDER BY j.next_at,j.domain_id LIMIT 60 FOR UPDATE SKIP LOCKED)
 UPDATE public.saas_monitor_jobs_v1 j SET lease_token=gen_random_uuid(),lease_until=t+interval '180 seconds',next_at=t+interval '180 seconds',attempts=LEAST(j.attempts+1,20)
 FROM due WHERE j.domain_id=due.domain_id RETURNING j.*;
END;$$;
CREATE FUNCTION public.saas_monitor_cooldown_v1(p_seconds integer) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'SERVICE_ONLY';END IF;
 UPDATE public.saas_monitor_control_v1 SET next_tick_at=GREATEST(next_tick_at,clock_timestamp()+make_interval(secs=>GREATEST(60,LEAST(COALESCE(p_seconds,300),86400)))) WHERE id;
END;$$;
CREATE FUNCTION public.saas_monitor_finish_v1(p_domain_id uuid,p_token uuid,p_outcome text,p_evidence jsonb,p_retry_seconds integer DEFAULT 0) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE d public.site_domains%ROWTYPE; j public.saas_monitor_jobs_v1%ROWTYPE; t timestamptz:=clock_timestamp(); delay_seconds integer;
BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'SERVICE_ONLY';END IF;
 IF p_outcome NOT IN('pending','error','https200') OR p_outcome IS NULL OR jsonb_typeof(p_evidence) IS DISTINCT FROM 'object' OR octet_length(p_evidence::text)>2048 THEN RAISE EXCEPTION 'INVALID_EVIDENCE';END IF;
 SELECT * INTO d FROM public.site_domains WHERE id=p_domain_id FOR SHARE;
 IF NOT FOUND THEN RETURN false;END IF;
 SELECT * INTO j FROM public.saas_monitor_jobs_v1 WHERE domain_id=p_domain_id FOR UPDATE;
 IF NOT FOUND OR j.lease_token IS DISTINCT FROM p_token OR j.lease_until<=t OR d.site_id<>j.site_id OR d.hostname<>j.hostname OR d.provider_hostname_id IS DISTINCT FROM j.provider_hostname_id OR d.provider::text NOT IN('cloudflare','cloudflare-custom-hostnames') OR d.status::text IN('deleted','pending_deletion','blocked','failed') THEN RETURN false;END IF;
 IF p_outcome='https200' AND (p_evidence->>'https_verified' IS DISTINCT FROM 'true' OR p_evidence->>'http_status' IS DISTINCT FROM '200' OR p_evidence->>'provider_status' IS DISTINCT FROM 'active' OR p_evidence->>'ssl_status' IS DISTINCT FROM 'active') THEN RAISE EXCEPTION 'HTTPS_EVIDENCE_REQUIRED';END IF;
 delay_seconds:=CASE WHEN p_outcome='https200' THEN 86400 ELSE LEAST(21600,(60*power(2,LEAST(j.attempts,9)))::integer) END;
 delay_seconds:=GREATEST(delay_seconds,GREATEST(0,LEAST(COALESCE(p_retry_seconds,0),86400)));
 UPDATE public.saas_monitor_jobs_v1 SET checked_at=t,outcome=p_outcome,lease_token=NULL,lease_until='-infinity',attempts=CASE WHEN p_outcome='https200' THEN 0 ELSE attempts END,
 next_at=t+make_interval(secs=>delay_seconds+floor(random()*delay_seconds*.1)::integer),
 evidence=jsonb_build_object('provider_status',left(COALESCE(p_evidence->>'provider_status','unknown'),32),'ssl_status',left(COALESCE(p_evidence->>'ssl_status','unknown'),32),'http_status',CASE WHEN p_outcome='https200' THEN 200 ELSE NULL END,'https_verified',p_outcome='https200','dns_cname_observed',p_evidence->>'dns_cname_observed'='true','site_content_verified',false,'live',false)
 WHERE domain_id=p_domain_id;RETURN true;
END;$$;
REVOKE ALL ON FUNCTION public.saas_monitor_seed_v1(),public.saas_monitor_claim_v1(),public.saas_monitor_cooldown_v1(integer),public.saas_monitor_finish_v1(uuid,uuid,text,jsonb,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.saas_monitor_seed_v1(),public.saas_monitor_claim_v1(),public.saas_monitor_cooldown_v1(integer),public.saas_monitor_finish_v1(uuid,uuid,text,jsonb,integer) TO service_role;
COMMIT;
