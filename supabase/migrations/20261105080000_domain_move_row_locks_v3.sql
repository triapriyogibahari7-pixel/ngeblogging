BEGIN;
SET LOCAL lock_timeout='2s';
SET LOCAL statement_timeout='30s';
-- Fail on inconsistent existing topology; never delete or rewrite customer rows.
CREATE UNIQUE INDEX site_domains_external_slot_v3 ON public.site_domains(site_id) WHERE hostname<>'ngeblogging.com' AND hostname NOT LIKE '%.ngeblogging.com';
CREATE UNIQUE INDEX site_domains_primary_slot_v3 ON public.site_domains(site_id) WHERE is_primary;
DO $patch$
DECLARE src text;old text;replacement text;before_acl text;after_acl text;f oid;
BEGIN
 f:='public.move_site_domain_v2(uuid,uuid,uuid,text)'::regprocedure;
 IF (SELECT prosecdef FROM pg_proc WHERE oid=f) OR has_function_privilege('anon',f,'EXECUTE') OR has_function_privilege('authenticated',f,'EXECUTE') OR has_function_privilege('service_role',f,'EXECUTE') THEN RAISE EXCEPTION 'Unexpected transfer privileges; stop';END IF;
 SELECT pg_get_functiondef(oid),proacl::text INTO src,before_acl FROM pg_proc WHERE oid=f;
 old:='LOCK TABLE public.sites, public.site_domains, public.site_domain_redirects'||chr(10)||'    IN SHARE ROW EXCLUSIVE MODE;';
 IF length(src)-length(replace(src,old,''))<>length(old) THEN RAISE EXCEPTION 'Audited transfer lock source changed; stop';END IF;
 replacement:=$locks$PERFORM s.id FROM public.sites s WHERE s.id IN (p_source_site_id,p_target_site_id) ORDER BY s.id FOR UPDATE NOWAIT;
  PERFORM d.id FROM public.site_domains d WHERE d.site_id IN (p_source_site_id,p_target_site_id) ORDER BY d.id FOR UPDATE NOWAIT;
  PERFORM r.id FROM public.site_domain_redirects r WHERE r.domain_id=p_domain_id ORDER BY r.id FOR UPDATE NOWAIT;$locks$;
 src:=replace(src,old,replacement);
 src:=replace(src,'-- Conservative prototype: serializes writes to these three tables.'||chr(10)||'  -- Not production-ready; benchmark/review lock scope before activation.','-- Candidate ordered row locks; unique indexes guard slot conflicts.'||chr(10)||'  -- Production activation still requires RLS, concurrency and cache verification.');
 EXECUTE src;
 SELECT proacl::text INTO after_acl FROM pg_proc WHERE oid=f;
 IF after_acl IS DISTINCT FROM before_acl THEN RAISE EXCEPTION 'Transfer permissions changed unexpectedly';END IF;
END $patch$;
-- No EXECUTE grant, endpoint activation, provider operation or ownership change.
COMMIT;
