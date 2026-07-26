-- Ngeblogging v55: every authenticated account owns at most twelve sites.
-- This supersedes the temporary dynamic-capacity experiment from v40.

begin;

create or replace function private.site_limit_for_plan(plan_name text)
returns integer
language sql
immutable
set search_path = ''
as $function$
  select 12;
$function$;

create or replace function private.site_limit_for_owner(
  target_user uuid,
  plan_name text default 'free'
)
returns integer
language sql
stable
security definer
set search_path = ''
as $function$
  select 12;
$function$;

update private.account_site_capacity
   set allowed_limit = 12,
       updated_at = pg_catalog.now()
 where allowed_limit <> 12;

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
      coalesce(
        (select profile.plan from public.profiles profile where profile.id = account.user_id),
        'free'
      ) as plan,
      (
        select count(*)::integer
          from public.sites site
         where site.owner_id = account.user_id
      ) as current_count
    from account
  )
  select
    state.current_count,
    12,
    12,
    12,
    greatest(12 - state.current_count, 0),
    state.plan
  from state
  where state.user_id is not null;
$function$;

revoke all on function public.get_site_creation_quota() from public;
revoke all on function public.get_site_creation_quota() from anon;
grant execute on function public.get_site_creation_quota() to authenticated;
grant execute on function public.get_site_creation_quota() to service_role;

comment on function private.site_limit_for_plan(text) is
  'Returns the fixed Ngeblogging account limit of twelve sites.';
comment on function private.site_limit_for_owner(uuid,text) is
  'Returns the fixed Ngeblogging account limit of twelve sites for every owner.';
comment on function public.get_site_creation_quota() is
  'Returns current usage and the fixed twelve-site account capacity.';

commit;
