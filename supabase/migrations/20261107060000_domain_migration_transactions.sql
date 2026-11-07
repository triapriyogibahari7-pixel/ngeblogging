-- Apply only after 20261107050000; not executed by committing this file.
begin;
create unique index domain_migration_one_site_lock on public.domain_migration_locks(site_id);
create function public.domain_migration_rpc(p_op text,p_identity jsonb,p_payload jsonb default '{}'::jsonb) returns jsonb language plpgsql security invoker set search_path='' set lock_timeout='3s' as $$
declare
 a uuid:=(p_identity->>'actorId')::uuid; s uuid:=(p_identity->>'siteId')::uuid; d uuid:=(p_identity->>'domainId')::uuid; m uuid:=(p_identity->>'migrationId')::uuid;
 st public.sites%rowtype; dr public.site_domains%rowtype; lk public.domain_migration_locks%rowtype; j public.domain_migration_journal%rowtype; member public.site_members%rowtype;
 snap jsonb; nxt jsonb; expected jsonb; target jsonb; proof jsonb; original jsonb; provider_id text; v bigint;
begin
 if current_user<>'service_role' then raise exception 'SERVER_ONLY'; end if;
 if a is null or s is null or d is null or m is null then raise exception 'INVALID_MIGRATION_REQUEST'; end if;
 select * into st from public.sites where id=s for update;
 if not found then raise exception 'MIGRATION_FORBIDDEN'; end if;
 if st.owner_id is distinct from a then
  select * into member from public.site_members where site_id=s and user_id=a and role in ('owner','admin') for share;
  if not found then raise exception 'MIGRATION_FORBIDDEN'; end if;
 end if;
 select * into dr from public.site_domains where id=d and site_id=s for update;
 if not found then raise exception 'MIGRATION_NOT_FOUND'; end if;
 snap:=jsonb_build_object('domain',to_jsonb(dr),'site',jsonb_build_object('id',st.id,'custom_domain',st.custom_domain));
 select * into j from public.domain_migration_journal where migration_id=m for update;
 if found and (j.domain_id<>d or j.site_id<>s) then raise exception 'MIGRATION_NOT_IN_SCOPE'; end if;
 if p_op='read' then return j.state; end if;
 if p_op='authorize' then return 'true'::jsonb; end if;
 if p_op='acquire' then
  insert into public.domain_migration_locks(domain_id,migration_id,site_id,actor_id) values(d,m,s,a) on conflict do nothing returning * into lk;
  if not found then return 'null'::jsonb; end if;
  return jsonb_build_object('fence',lk.fence);
 end if;
 select * into lk from public.domain_migration_locks where domain_id=d and site_id=s and migration_id=m and actor_id=a and fence=(p_payload->>'fence')::uuid for update;
 if not found then raise exception 'MIGRATION_LOCK_LOST'; end if;
 if p_op='assertHeld' then return 'true'::jsonb; end if;
 if p_op='release' then
  if j.state is not null and j.state->>'phase' not in ('planned','prepared','cutover_complete','rolled_back') then raise exception 'MANUAL_RECONCILIATION_REQUIRED'; end if;
  delete from public.domain_migration_locks where domain_id=d and fence=lk.fence;return 'true'::jsonb;
 end if;
 if p_op='read_record' then return snap; end if;
 if p_op='assertUnchanged' then
  if snap is distinct from p_payload->'expected' then raise exception 'DOMAIN_SNAPSHOT_CONFLICT'; end if;return 'true'::jsonb;
 end if;
 if p_op='write' then
  nxt:=p_payload->'state';v:=coalesce(j.version,0);
  if jsonb_typeof(nxt) is distinct from 'object' or v is distinct from (p_payload->>'expectedVersion')::bigint or (nxt->>'version')::bigint is distinct from v+1 or (nxt->>'domainId')::uuid is distinct from d or (nxt->>'siteId')::uuid is distinct from s or (nxt->>'migrationId')::uuid is distinct from m or (nxt->>'actorId')::uuid is distinct from a then raise exception 'JOURNAL_CAS_CONFLICT'; end if;
  if (nxt#>>'{snapshot,domain,id}')::uuid is distinct from d or (nxt#>>'{snapshot,domain,site_id}')::uuid is distinct from s or (nxt#>>'{snapshot,site,id}')::uuid is distinct from s then raise exception 'JOURNAL_SNAPSHOT_SCOPE_CONFLICT'; end if;
  if v>0 and ((nxt->'snapshot') is distinct from (j.state->'snapshot') or (nxt->'source') is distinct from (j.state->'source') or (j.state ? 'receipt' and (nxt->'receipt') is distinct from (j.state->'receipt'))) then raise exception 'JOURNAL_IDENTITY_CONFLICT'; end if;
  insert into public.domain_migration_journal(migration_id,domain_id,site_id,version,state) values(m,d,s,v+1,nxt) on conflict(migration_id) do update set version=excluded.version,state=excluded.state,updated_at=clock_timestamp();return 'true'::jsonb;
 end if;
 if p_op not in ('commit','rollback') then raise exception 'INVALID_MIGRATION_OPERATION'; end if;
 expected:=p_payload->'expected';
 if snap is distinct from expected then raise exception 'DOMAIN_SNAPSHOT_CONFLICT'; end if;
 if j.state is null then raise exception 'MIGRATION_NOT_FOUND'; end if;
 if p_op='commit' then
  if j.state->>'phase'<>'committing_record' then raise exception 'INVALID_CUTOVER_PHASE'; end if;
  target:=j.state->'target';proof:=j.state->'proof';
  if target is distinct from p_payload->'target' or proof is distinct from p_payload->'proof' then raise exception 'JOURNAL_PROOF_CONFLICT'; end if;
  if (target->>'siteId')::uuid is distinct from s or (target->>'migrationId')::uuid is distinct from m or (proof->>'siteId')::uuid is distinct from s or (proof->>'migrationId')::uuid is distinct from m then raise exception 'PROOF_SCOPE_CONFLICT'; end if;
  if jsonb_typeof(target->'hostnames') is distinct from 'array' or jsonb_array_length(target->'hostnames')<1 or jsonb_typeof(proof->'hostnames') is distinct from 'array' then raise exception 'LIVE_PROOF_REQUIRED'; end if;
  if (proof->>'checkedAt')::numeric is null or (proof->>'checkedAt')::numeric>extract(epoch from clock_timestamp())*1000+5000 or (proof->>'checkedAt')::numeric<extract(epoch from clock_timestamp())*1000-60000 then raise exception 'LIVE_PROOF_REQUIRED'; end if;
  if exists(select 1 from jsonb_array_elements(target->'hostnames') h where h->>'status' is distinct from 'active' or h->>'sslStatus' is distinct from 'active' or coalesce(h->>'id','')='') or exists(select 1 from jsonb_array_elements(proof->'hostnames') h where h->'dnsVerified' is distinct from 'true'::jsonb or h->'routingVerified' is distinct from 'true'::jsonb or h->'siteContentVerified' is distinct from 'true'::jsonb or h->>'sslStatus' is distinct from 'active') then raise exception 'LIVE_PROOF_REQUIRED'; end if;
  if (select jsonb_agg(h->>'hostname' order by h->>'hostname') from jsonb_array_elements(target->'hostnames') h) is distinct from (select jsonb_agg(h->>'hostname' order by h->>'hostname') from jsonb_array_elements(proof->'hostnames') h) or (select jsonb_agg(h->>'hostname' order by h->>'hostname') from jsonb_array_elements(target->'hostnames') h) is distinct from (select jsonb_agg(h order by h) from jsonb_array_elements_text(j.state#>'{source,hostnames}') h) then raise exception 'PROOF_HOST_SET_CONFLICT'; end if;
  if exists(select 1 from jsonb_array_elements(target->'hostnames') t left join jsonb_array_elements(proof->'hostnames') p on p->>'hostname'=t->>'hostname' where p->>'providerId' is distinct from t->>'id') then raise exception 'LIVE_PROVIDER_ID_MISMATCH'; end if;
  select h->>'id' into strict provider_id from jsonb_array_elements(target->'hostnames') h where h->>'hostname'=dr.hostname;
  perform set_config('ngeblogging.migration_fence',lk.fence::text,true);
  update public.site_domains set provider='cloudflare-custom-hostnames',provider_hostname_id=provider_id,provider_status='active',ssl_status='active',ownership_verification=jsonb_set(ownership_verification,'{saas_migration}',jsonb_build_object('migrationId',m,'hostnames',target->'hostnames'),true) where id=d returning * into dr;
 else
  if j.state->>'phase'<>'restoring_record' then raise exception 'INVALID_ROLLBACK_PHASE'; end if;
  original:=j.state->'snapshot';
  if original is distinct from p_payload->'snapshot' then raise exception 'JOURNAL_SNAPSHOT_CONFLICT'; end if;
  -- Executor verifies source proof before calling. This RPC cannot observe DNS/TLS.
  if jsonb_typeof(p_payload->'sourceProof') is distinct from 'object' then raise exception 'LIVE_PROOF_REQUIRED'; end if;
  perform set_config('ngeblogging.migration_fence',lk.fence::text,true);
  update public.site_domains set provider=original#>>'{domain,provider}',provider_hostname_id=original#>>'{domain,provider_hostname_id}',provider_status=original#>>'{domain,provider_status}',ssl_status=original#>>'{domain,ssl_status}',ownership_verification=original#>'{domain,ownership_verification}',ssl_validation=original#>'{domain,ssl_validation}' where id=d returning * into dr;
 end if;
 if to_jsonb(dr)->>'site_id' is distinct from expected#>>'{domain,site_id}' or dr.hostname is distinct from expected#>>'{domain,hostname}' or to_jsonb(dr)->'is_primary' is distinct from expected#>'{domain,is_primary}' or dr.verified_at::text is distinct from (jsonb_populate_record(null::public.site_domains,expected->'domain')).verified_at::text then raise exception 'IDENTITY_OR_PRIMARY_CHANGED'; end if;
 select * into st from public.sites where id=s;
 if st.custom_domain is distinct from expected#>>'{site,custom_domain}' then raise exception 'SITE_MAPPING_CHANGED'; end if;
 return jsonb_build_object('domain',to_jsonb(dr),'site',jsonb_build_object('id',st.id,'custom_domain',st.custom_domain));
end;$$;
revoke all on function public.domain_migration_rpc(text,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.domain_migration_rpc(text,jsonb,jsonb) to service_role;
create function private.guard_domain_migration_write() returns trigger language plpgsql security definer set search_path='' as $$
declare sid uuid; l public.domain_migration_locks%rowtype;
begin
 sid:=case when tg_table_name='sites' then old.id else coalesce(new.site_id,old.site_id) end;
 perform id from public.sites where id=sid for update;
 select * into l from public.domain_migration_locks where site_id=sid;
 if found and not (coalesce(current_setting('role',true),'')='service_role' and coalesce(current_setting('ngeblogging.migration_fence',true),'')=l.fence::text) then raise exception 'DOMAIN_MIGRATION_MAINTENANCE'; end if;
 if tg_op='DELETE' then return old;end if;return new;
end;$$;
revoke all on function private.guard_domain_migration_write() from public,anon,authenticated;
create trigger guard_domain_migration_write before insert or update or delete on public.site_domains for each row execute function private.guard_domain_migration_write();
create trigger guard_site_migration_write before update of custom_domain,slug,owner_id,status or delete on public.sites for each row execute function private.guard_domain_migration_write();
commit;
