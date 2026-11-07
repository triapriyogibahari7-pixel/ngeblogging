-- Requires foundation tables. RPC is not invoked by the public runtime yet.
begin;
create function public.domain_migration_provider_checkpoint(p_identity jsonb,p_fence uuid,p_operation_id text,p_stage text,p_request jsonb,p_result jsonb default null) returns jsonb language plpgsql security invoker set search_path='' set lock_timeout='3s' as $$
declare
 a uuid:=(p_identity->>'actorId')::uuid;s uuid:=(p_identity->>'siteId')::uuid;d uuid:=(p_identity->>'domainId')::uuid;m uuid:=(p_identity->>'migrationId')::uuid;
 st public.sites%rowtype;sm public.site_members%rowtype;l public.domain_migration_locks%rowtype;o public.domain_migration_provider_operations%rowtype;
begin
 if current_user<>'service_role' then raise exception 'SERVER_ONLY';end if;
 if a is null or s is null or d is null or m is null or p_fence is null or p_operation_id is null or p_operation_id!~'^[a-zA-Z0-9_.:-]{1,200}$' or p_stage is null or p_stage not in ('reserve','settle') or jsonb_typeof(p_request) is distinct from 'object' or octet_length(p_request::text)>65536 then raise exception 'INVALID_PROVIDER_CHECKPOINT';end if;
 select * into st from public.sites where id=s for update;
 if not found then raise exception 'MIGRATION_FORBIDDEN';end if;
 if st.owner_id is distinct from a then
  select * into sm from public.site_members where site_id=s and user_id=a and role in ('owner','admin') for share;
  if not found then raise exception 'MIGRATION_FORBIDDEN';end if;
 end if;
 perform id from public.site_domains where id=d and site_id=s for update;
 if not found then raise exception 'MIGRATION_NOT_IN_SCOPE';end if;
 select * into l from public.domain_migration_locks where domain_id=d and migration_id=m and site_id=s and actor_id=a and fence=p_fence for update;
 if not found then raise exception 'MIGRATION_LOCK_LOST';end if;
 if p_stage='reserve' then
  insert into public.domain_migration_provider_operations(migration_id,operation_id,domain_id,fence,intent,phase) values(m,p_operation_id,d,p_fence,p_request,'intent') on conflict do nothing returning * into o;
  if not found then raise exception 'PROVIDER_OPERATION_RECONCILIATION_REQUIRED';end if;
  return jsonb_build_object('reserved',true,'operationId',p_operation_id);
 end if;
 if jsonb_typeof(p_result) is distinct from 'object' or octet_length(p_result::text)>262144 then raise exception 'INVALID_PROVIDER_RESULT';end if;
 select * into o from public.domain_migration_provider_operations where migration_id=m and operation_id=p_operation_id for update;
 if not found then raise exception 'PROVIDER_INTENT_REQUIRED';end if;
 if o.domain_id is distinct from d or o.fence is distinct from p_fence or o.intent is distinct from p_request or o.phase is distinct from 'intent' then raise exception 'PROVIDER_CHECKPOINT_CONFLICT';end if;
 update public.domain_migration_provider_operations set outcome=p_result,phase='settled',updated_at=clock_timestamp() where migration_id=m and operation_id=p_operation_id;
 return jsonb_build_object('settled',true,'operationId',p_operation_id);
end;$$;
revoke all on function public.domain_migration_provider_checkpoint(jsonb,uuid,text,text,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.domain_migration_provider_checkpoint(jsonb,uuid,text,text,jsonb,jsonb) to service_role;
commit;
