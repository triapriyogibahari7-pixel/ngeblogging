-- Apply after domain-connection-installation-v1.sql. Not an activation function.
begin;
set local lock_timeout='2s';
set local statement_timeout='30s';
create function public.domain_connection_install_bind_v1(p_order text,p_user uuid,p_site uuid,p_merchant text,p_zone text,p_account text,p_target text,p_origin text,p_results jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare prepared jsonb;j public.domain_connection_installations%rowtype;d public.site_domains%rowtype;v jsonb;n integer;canonical_before text;canonical_after text;primary_before jsonb;primary_after jsonb;bound jsonb:='[]'::jsonb;
begin
 prepared:=public.domain_connection_install_prepare_v1(p_order,p_user,p_site,p_merchant,p_zone,p_account,p_target,p_origin);
 if p_results is null or jsonb_typeof(p_results) is distinct from 'array' or octet_length(p_results::text)>65536 then raise exception 'BIND_RESULTS_INVALID';end if;
 if jsonb_array_length(p_results)<>2 then raise exception 'BIND_PAIR_REQUIRED';end if;
 select custom_domain into canonical_before from public.sites where id=p_site;
 select coalesce(jsonb_agg(jsonb_build_object('id',id,'hostname',hostname) order by id),'[]'::jsonb) into primary_before from public.site_domains where site_id=p_site and is_primary=true;
 select count(*) into n from public.domain_connection_installations where hostname in (prepared->>'hostname','www.'||(prepared->>'hostname')) and state='observed' and site_id=p_site and user_id=p_user;
 if n<>2 then raise exception 'BIND_PROVIDER_PAIR_NOT_RECORDED';end if;
 for j in select * from public.domain_connection_installations where hostname in (prepared->>'hostname','www.'||(prepared->>'hostname')) order by hostname for update loop
  if j.state is distinct from 'observed' or j.site_id is distinct from p_site or j.user_id is distinct from p_user or j.provider_hostname_id is null or (j.provider_snapshot->>'id') is distinct from j.provider_hostname_id or (j.provider_snapshot->>'hostname') is distinct from j.hostname then raise exception 'BIND_JOURNAL_UNVERIFIED';end if;
  select count(*) into n from jsonb_array_elements(p_results) x where x->>'hostname'=j.hostname;
  if n<>1 then raise exception 'BIND_HOSTNAME_RESULT_INVALID';end if;
  select x into v from jsonb_array_elements(p_results) x where x->>'hostname'=j.hostname;
  if (v->>'domain_id') is distinct from j.domain_id::text or (v->>'provider_hostname_id') is distinct from j.provider_hostname_id or jsonb_typeof(v->'provider_status') is distinct from 'string' or jsonb_typeof(v->'ssl_status') is distinct from 'string' or length(v->>'provider_status') not between 1 and 80 or length(v->>'ssl_status') not between 1 and 80 or jsonb_typeof(v->'ownership_verification') is distinct from 'object' or jsonb_typeof(v->'ssl_validation') is distinct from 'array' then raise exception 'BIND_PROVIDER_RESULT_INVALID';end if;
  if octet_length((v->'ownership_verification')::text)>16384 or octet_length((v->'ssl_validation')::text)>32768 or jsonb_array_length(v->'ssl_validation')>20 then raise exception 'BIND_PROVIDER_METADATA_LIMIT';end if;
  insert into public.site_domains(id,site_id,hostname,provider,provider_hostname_id,status,is_primary,verified_at,provider_status,ssl_status,ownership_verification,ssl_validation,last_checked_at) values(j.domain_id,j.site_id,j.hostname,'cloudflare',j.provider_hostname_id,'verifying',false,null,v->>'provider_status',v->>'ssl_status',v->'ownership_verification',v->'ssl_validation',clock_timestamp()) on conflict do nothing;
  select * into d from public.site_domains where id=j.domain_id for update;
  if not found then raise exception 'BIND_DOMAIN_CONFLICT';end if;
  if d.site_id is distinct from j.site_id or d.hostname is distinct from j.hostname or d.provider not in ('cloudflare','cloudflare-custom-hostnames') or d.provider is null or d.provider_hostname_id is distinct from j.provider_hostname_id or d.is_primary is distinct from false or d.status not in ('pending','verifying','active','failed') then raise exception 'BIND_EXISTING_DOMAIN_CHANGED';end if;
  bound:=bound||jsonb_build_array(jsonb_build_object('id',d.id,'site_id',d.site_id,'hostname',d.hostname,'provider',d.provider,'provider_hostname_id',d.provider_hostname_id,'status',d.status,'is_primary',d.is_primary,'provider_status',d.provider_status,'ssl_status',d.ssl_status,'ownership_verification',d.ownership_verification,'ssl_validation',d.ssl_validation));
 end loop;
 if jsonb_array_length(bound)<>2 then raise exception 'BIND_PAIR_INCOMPLETE';end if;
 select custom_domain into canonical_after from public.sites where id=p_site;
 select coalesce(jsonb_agg(jsonb_build_object('id',id,'hostname',hostname) order by id),'[]'::jsonb) into primary_after from public.site_domains where site_id=p_site and is_primary=true;
 if canonical_after is distinct from canonical_before or primary_after is distinct from primary_before then raise exception 'BIND_PRIMARY_OR_CANONICAL_CHANGED';end if;
 return jsonb_build_object('ok',true,'orderId',p_order,'siteId',p_site,'hostname',prepared->>'hostname','domains',bound,'registryBindingCompleted',true,'primaryChanged',false,'activationChecked',false);
end;$$;
revoke all on function public.domain_connection_install_bind_v1(text,uuid,uuid,text,text,text,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.domain_connection_install_bind_v1(text,uuid,uuid,text,text,text,text,text,jsonb) to service_role;
comment on function public.domain_connection_install_bind_v1(text,uuid,uuid,text,text,text,text,text,jsonb) is 'Trusted backend only after fresh authenticated provider reads. Reauthorizes current paid order and entitlement through prepare; binds both journaled provider identities atomically as non-primary verifying aliases. Retries never overwrite existing rows or downgrade active domains. Trigger-induced canonical or primary changes roll back. Does not create provider resources, extend service, perform registrar operations, or activate serving.';
commit;
