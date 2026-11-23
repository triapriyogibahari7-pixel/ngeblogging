begin;
set local lock_timeout='2s';
set local statement_timeout='30s';

create table public.domain_connection_installations (
 hostname text primary key,
 operation_id uuid not null unique default pg_catalog.gen_random_uuid(),
 domain_id uuid not null unique default pg_catalog.gen_random_uuid(),
 order_id text not null,
 user_id uuid not null,
 site_id uuid not null,
 zone_id text not null check(zone_id ~ '^[a-f0-9]{32}$'),
 account_id text not null check(account_id ~ '^[a-f0-9]{32}$'),
 cname_target text not null,
 fallback_origin text not null,
 state text not null default 'prepared' check(state in ('prepared','creating','observed')),
 provider_hostname_id text,
 provider_snapshot jsonb,
 created_at timestamptz not null default clock_timestamp(),
 write_started_at timestamptz,
 observed_at timestamptz,
 unique(zone_id,provider_hostname_id),
 check(provider_hostname_id is null or provider_hostname_id ~ '^[a-f0-9]{32}$|^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$'),
 check(provider_snapshot is null or (jsonb_typeof(provider_snapshot)='object' and octet_length(provider_snapshot::text)<=4096)),
 check((state='prepared' and write_started_at is null and provider_hostname_id is null and provider_snapshot is null and observed_at is null) or (state='creating' and write_started_at is not null and provider_hostname_id is null and provider_snapshot is null and observed_at is null) or (state='observed' and write_started_at is not null and provider_hostname_id is not null and provider_snapshot is not null and observed_at is not null))
);
alter table public.domain_connection_installations enable row level security;
revoke all on public.domain_connection_installations from public,anon,authenticated,service_role;

create function private.domain_connection_install_authorize_v1(p_order text,p_user uuid,p_site uuid,p_merchant text)
returns public.domain_connection_orders language plpgsql security definer set search_path='' as $$
declare r public.domain_connection_orders%rowtype;e public.domain_connection_entitlements%rowtype;
begin
 select * into r from public.domain_connection_orders where order_id=p_order and user_id=p_user and site_id=p_site for update;
 if not found then raise exception 'INSTALL_ORDER_NOT_FOUND';end if;
 perform pg_advisory_xact_lock(hashtextextended('domain-connection-production:'||r.hostname,0));
 if r.environment is distinct from 'production' or r.merchant_id is distinct from p_merchant or p_merchant is null or r.purpose is distinct from 'custom-domain-connection' or r.payment_state is distinct from 'paid' or r.amount_idr is distinct from 99000 or r.currency is distinct from 'IDR' or r.period_months is distinct from 12 or r.includes_www is distinct from true or r.grant_expires_at is null or r.grant_expires_at<=clock_timestamp() then raise exception 'INSTALL_PAYMENT_REQUIRED';end if;
 if r.hostname is null or length(r.hostname)>249 or r.hostname<>lower(r.hostname) or r.hostname like 'www.%' or r.hostname='ngeblogging.com' or r.hostname like '%.ngeblogging.com' or r.hostname !~ '^[a-z0-9][a-z0-9.-]*[.][a-z0-9-]*[a-z][a-z0-9-]*$' then raise exception 'INSTALL_HOSTNAME_INVALID';end if;
 select * into e from public.domain_connection_entitlements where hostname=r.hostname for update;
 if not found then raise exception 'INSTALL_ENTITLEMENT_REQUIRED';end if;
 if e.site_id is distinct from r.site_id or e.last_order_id is distinct from r.order_id or e.review_required is distinct from false or e.expires_at is null or e.expires_at<=clock_timestamp() then raise exception 'INSTALL_ENTITLEMENT_REQUIRED';end if;
 perform 1 from public.sites where id=p_site for share;
 if not found then raise exception 'INSTALL_SITE_NOT_FOUND';end if;
 if not exists(select 1 from public.sites s where s.id=p_site and (s.owner_id=p_user or exists(select 1 from public.site_members m where m.site_id=s.id and m.user_id=p_user and m.role in ('owner','admin')))) then raise exception 'INSTALL_SITE_MANAGER_REQUIRED';end if;
 return r;
end;$$;
revoke all on function private.domain_connection_install_authorize_v1(text,uuid,uuid,text) from public,anon,authenticated,service_role;

create function public.domain_connection_install_prepare_v1(p_order text,p_user uuid,p_site uuid,p_merchant text,p_zone text,p_account text,p_target text,p_origin text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.domain_connection_orders%rowtype;n integer;
begin
 r:=private.domain_connection_install_authorize_v1(p_order,p_user,p_site,p_merchant);
 if p_zone is null or p_zone !~ '^[a-f0-9]{32}$' or p_account is null or p_account !~ '^[a-f0-9]{32}$' or p_target is null or p_target !~ '^[a-z0-9][a-z0-9.-]*[.]ngeblogging[.]com$' or length(p_target)>253 or p_origin is null or p_origin !~ '^[a-z0-9][a-z0-9.-]*[.]ngeblogging[.]com$' or length(p_origin)>253 or p_origin=p_target then raise exception 'INSTALL_CONFIGURATION_INVALID';end if;
 if exists(select 1 from public.site_domains d where (d.hostname in (r.hostname,'www.'||r.hostname) or exists(select 1 from jsonb_array_elements(case when jsonb_typeof(d.ownership_verification->'additional_hostnames')='array' then d.ownership_verification->'additional_hostnames' else '[]'::jsonb end) a where a->>'hostname' in (r.hostname,'www.'||r.hostname) and a->>'enabled' is distinct from 'false')) and not exists(select 1 from public.domain_connection_installations j where j.domain_id=d.id and j.site_id=r.site_id and j.user_id=r.user_id and j.hostname=d.hostname)) then raise exception 'INSTALL_EXISTING_DOMAIN_REQUIRES_REVIEW';end if;
 insert into public.domain_connection_installations(hostname,order_id,user_id,site_id,zone_id,account_id,cname_target,fallback_origin) select h,r.order_id,r.user_id,r.site_id,p_zone,p_account,p_target,p_origin from unnest(array[r.hostname,'www.'||r.hostname]) h on conflict(hostname) do nothing;
 select count(*) into n from public.domain_connection_installations j where j.hostname in (r.hostname,'www.'||r.hostname) and j.user_id=r.user_id and j.site_id=r.site_id and j.zone_id=p_zone and j.account_id=p_account and j.cname_target=p_target and j.fallback_origin=p_origin;
 if n<>2 then raise exception 'INSTALL_SCOPE_OR_CONFIGURATION_CHANGED';end if;
 return jsonb_build_object('version','connection-installation-v1','orderId',r.order_id,'userId',r.user_id,'siteId',r.site_id,'hostname',r.hostname,'expiresAt',(select expires_at from public.domain_connection_entitlements where hostname=r.hostname),'jobs',(select jsonb_agg(to_jsonb(j) order by j.hostname) from public.domain_connection_installations j where j.hostname in (r.hostname,'www.'||r.hostname)));
end;$$;

create function public.domain_connection_install_begin_v1(p_order text,p_user uuid,p_site uuid,p_merchant text,p_zone text,p_account text,p_target text,p_origin text,p_operation uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare prepared jsonb;j public.domain_connection_installations%rowtype;n integer;
begin
 prepared:=public.domain_connection_install_prepare_v1(p_order,p_user,p_site,p_merchant,p_zone,p_account,p_target,p_origin);
 select * into j from public.domain_connection_installations where operation_id=p_operation and hostname in (prepared->>'hostname','www.'||(prepared->>'hostname')) and site_id=p_site and user_id=p_user for update;
 if not found then raise exception 'INSTALL_OPERATION_NOT_FOUND';end if;
 update public.domain_connection_installations set state='creating',write_started_at=clock_timestamp() where operation_id=p_operation and state='prepared';
 get diagnostics n=row_count;
 select * into j from public.domain_connection_installations where operation_id=p_operation;
 return jsonb_build_object('claimed',n=1,'expiresAt',prepared->>'expiresAt','job',to_jsonb(j));
end;$$;

create function public.domain_connection_install_record_v1(p_operation uuid,p_receipt jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare j public.domain_connection_installations%rowtype;pid text;
begin
 select * into j from public.domain_connection_installations where operation_id=p_operation for update;
 if not found then raise exception 'INSTALL_OPERATION_NOT_FOUND';end if;
 if p_receipt is null or jsonb_typeof(p_receipt) is distinct from 'object' or octet_length(p_receipt::text)>4096 or jsonb_typeof(p_receipt->'id') is distinct from 'string' or jsonb_typeof(p_receipt->'hostname') is distinct from 'string' or (p_receipt->>'hostname') is distinct from j.hostname then raise exception 'INSTALL_RECEIPT_INVALID';end if;
 pid:=p_receipt->>'id';
 if pid !~ '^[a-f0-9]{32}$|^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$' then raise exception 'INSTALL_PROVIDER_ID_INVALID';end if;
 if j.state='observed' then
  if j.provider_hostname_id is distinct from pid then raise exception 'INSTALL_RECEIPT_CONFLICT';end if;
 elsif j.state='creating' then
  update public.domain_connection_installations set state='observed',provider_hostname_id=pid,provider_snapshot=p_receipt,observed_at=clock_timestamp() where operation_id=p_operation returning * into j;
 else raise exception 'INSTALL_WRITE_NOT_STARTED';end if;
 return jsonb_build_object('ok',true,'job',to_jsonb(j));
end;$$;

revoke all on function public.domain_connection_install_prepare_v1(text,uuid,uuid,text,text,text,text,text) from public,anon,authenticated;
revoke all on function public.domain_connection_install_begin_v1(text,uuid,uuid,text,text,text,text,text,uuid) from public,anon,authenticated;
revoke all on function public.domain_connection_install_record_v1(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.domain_connection_install_prepare_v1(text,uuid,uuid,text,text,text,text,text) to service_role;
grant execute on function public.domain_connection_install_begin_v1(text,uuid,uuid,text,text,text,text,text,uuid) to service_role;
grant execute on function public.domain_connection_install_record_v1(uuid,jsonb) to service_role;
comment on table public.domain_connection_installations is 'Private paid-connection provider journal. Original order and identity snapshots are retained across same-user renewals. No automatic lease expiry or replay of an uncertain POST; no adoption of existing provider resources. Does not bind site_domains, activate sites, alter primary, or perform registrar operations.';
comment on function public.domain_connection_install_record_v1(uuid,jsonb) is 'Trusted backend receipt persistence only. Intentionally records an already-attempted provider outcome even if payment rights or management permissions changed in flight; this audit record grants no serving or activation rights.';
commit;
