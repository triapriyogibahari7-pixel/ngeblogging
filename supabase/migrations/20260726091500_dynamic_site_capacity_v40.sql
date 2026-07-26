-- Dynamic per-account site capacity for Ngeblogging v40.
-- The public Studio no longer presents a fixed marketing maximum. PostgreSQL
-- still keeps an enforceable safety capacity that can be expanded per account.

begin;

create table if not exists private.account_site_capacity (
  user_id uuid primary key references auth.users(id) on delete cascade,
  allowed_limit integer not null check (allowed_limit between 1 and 1000000),
  updated_at timestamptz not null default pg_catalog.now()
);

revoke all on table private.account_site_capacity from public;
revoke all on table private.account_site_capacity from anon;
revoke all on table private.account_site_capacity from authenticated;
grant select, insert, update, delete on table private.account_site_capacity to service_role;

create or replace function private.site_limit_for_plan(plan_name text)
returns integer
language sql
immutable
set search_path = ''
as $function$
  select 1000;
$function$;

revoke all on function private.site_limit_for_plan(text) from public;
revoke all on function private.site_limit_for_plan(text) from anon;
revoke all on function private.site_limit_for_plan(text) from authenticated;
grant execute on function private.site_limit_for_plan(text) to service_role;

create or replace function private.site_limit_for_owner(target_user uuid, plan_name text default 'free')
returns integer
language sql
stable
security definer
set search_path = ''
as $function$
  select coalesce(
    (select capacity.allowed_limit
       from private.account_site_capacity capacity
      where capacity.user_id = target_user),
    private.site_limit_for_plan(plan_name)
  );
$function$;

revoke all on function private.site_limit_for_owner(uuid,text) from public;
revoke all on function private.site_limit_for_owner(uuid,text) from anon;
revoke all on function private.site_limit_for_owner(uuid,text) from authenticated;
grant execute on function private.site_limit_for_owner(uuid,text) to authenticated;
grant execute on function private.site_limit_for_owner(uuid,text) to service_role;

create or replace function private.enforce_owned_site_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  request_user uuid := auth.uid();
  account_plan text := 'free';
  current_count integer := 0;
  allowed_count integer := 1000;
begin
  if request_user is not null and new.owner_id <> request_user then
    raise exception using errcode = '42501', message = 'Pemilik situs tidak cocok dengan akun aktif.';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.owner_id::text, 0));

  select coalesce(profile.plan, 'free')
    into account_plan
    from public.profiles profile
   where profile.id = new.owner_id;

  allowed_count := private.site_limit_for_owner(new.owner_id, account_plan);

  select count(*)::integer
    into current_count
    from public.sites site
   where site.owner_id = new.owner_id;

  if current_count >= allowed_count then
    raise exception using
      errcode = 'P0001',
      message = 'SITE_CAPACITY_REACHED: Kapasitas situs akun saat ini telah terpakai dan perlu diperluas.';
  end if;

  return new;
end;
$function$;

revoke all on function private.enforce_owned_site_limit() from public;

create or replace function public.get_site_creation_quota()
returns table(
  current_count integer,
  free_limit integer,
  maximum_limit integer,
  allowed_limit integer,
  remaining integer,
  plan text
)
language sql
stable
security invoker
set search_path = ''
as $function$
  with account as (
    select auth.uid() as user_id
  ), state as (
    select
      account.user_id,
      coalesce((select profile.plan from public.profiles profile where profile.id = account.user_id), 'free') as plan,
      (select count(*)::integer from public.sites site where site.owner_id = account.user_id) as current_count
    from account
  ), capacity as (
    select
      state.*,
      private.site_limit_for_owner(state.user_id, state.plan) as allowed_limit
    from state
    where state.user_id is not null
  )
  select
    capacity.current_count,
    capacity.allowed_limit,
    capacity.allowed_limit,
    capacity.allowed_limit,
    greatest(capacity.allowed_limit - capacity.current_count, 0),
    capacity.plan
  from capacity;
$function$;

revoke all on function public.get_site_creation_quota() from public;
revoke all on function public.get_site_creation_quota() from anon;
grant execute on function public.get_site_creation_quota() to authenticated;
grant execute on function public.get_site_creation_quota() to service_role;

comment on table private.account_site_capacity is
  'Optional per-account override for dynamically scalable site capacity.';
comment on function public.get_site_creation_quota() is
  'Returns authenticated account capacity for server enforcement without exposing a fixed public marketing maximum.';

commit;
