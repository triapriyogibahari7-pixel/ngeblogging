begin;

create or replace function private.site_limit_for_plan(plan_name text)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case when lower(coalesce(plan_name, 'free')) = 'free' then 5 else 12 end;
$$;

revoke all on function private.site_limit_for_plan(text) from public;

create or replace function private.enforce_owned_site_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_user uuid := auth.uid();
  account_plan text := 'free';
  current_count integer := 0;
  allowed_count integer := 5;
begin
  if request_user is not null and new.owner_id <> request_user then
    raise exception using errcode = '42501', message = 'Pemilik situs tidak cocok dengan akun aktif.';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.owner_id::text, 0));

  select coalesce(p.plan, 'free')
    into account_plan
    from public.profiles p
   where p.id = new.owner_id;

  allowed_count := private.site_limit_for_plan(account_plan);

  select count(*)::integer
    into current_count
    from public.sites s
   where s.owner_id = new.owner_id;

  if current_count >= allowed_count then
    raise exception using
      errcode = 'P0001',
      message = format(
        'SITE_LIMIT_REACHED: Akun paket %s sudah memiliki %s dari maksimum %s situs.',
        upper(coalesce(account_plan, 'free')),
        current_count,
        allowed_count
      );
  end if;

  return new;
end;
$$;

revoke all on function private.enforce_owned_site_limit() from public;

drop trigger if exists enforce_owned_site_limit on public.sites;
create trigger enforce_owned_site_limit
before insert on public.sites
for each row execute function private.enforce_owned_site_limit();

create or replace function public.get_site_creation_quota()
returns table (
  current_count integer,
  free_limit integer,
  maximum_limit integer,
  allowed_limit integer,
  remaining integer,
  plan text
)
language sql
stable
security definer
set search_path = ''
as $$
  with account as (
    select auth.uid() as user_id
  ), state as (
    select
      a.user_id,
      coalesce((select p.plan from public.profiles p where p.id = a.user_id), 'free') as plan,
      (select count(*)::integer from public.sites s where s.owner_id = a.user_id) as current_count
    from account a
  )
  select
    state.current_count,
    5,
    12,
    private.site_limit_for_plan(state.plan),
    greatest(private.site_limit_for_plan(state.plan) - state.current_count, 0),
    state.plan
  from state
  where state.user_id is not null;
$$;

revoke all on function public.get_site_creation_quota() from public;
grant execute on function public.get_site_creation_quota() to authenticated;

comment on function public.get_site_creation_quota() is
  'Returns the authenticated account site quota: five sites on Free and an absolute maximum of twelve on paid plans.';

commit;
