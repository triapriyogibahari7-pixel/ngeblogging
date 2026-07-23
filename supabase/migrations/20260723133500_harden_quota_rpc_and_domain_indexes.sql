-- Keep the repository in sync with the production Supabase hardening applied
-- during the July 23 production audit.

begin;

-- The quota endpoint only needs the signed-in user's own rows. Running it as
-- SECURITY INVOKER keeps Row Level Security active and removes anonymous
-- access to a SECURITY DEFINER function.
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
      a.user_id,
      coalesce((select p.plan from public.profiles p where p.id = a.user_id), 'free') as plan,
      (select count(*)::integer from public.sites s where s.owner_id = a.user_id) as current_count
    from account a
  ), quota as (
    select
      state.*,
      case when lower(coalesce(state.plan, 'free')) = 'free' then 5 else 12 end as allowed_limit
    from state
    where state.user_id is not null
  )
  select
    quota.current_count,
    5,
    12,
    quota.allowed_limit,
    greatest(quota.allowed_limit - quota.current_count, 0),
    quota.plan
  from quota;
$function$;

revoke all on function public.get_site_creation_quota() from public;
revoke all on function public.get_site_creation_quota() from anon;
grant execute on function public.get_site_creation_quota() to authenticated;
grant execute on function public.get_site_creation_quota() to service_role;

-- Both indexes enforced the same one-primary-domain-per-site rule. Keeping one
-- avoids duplicate write work and removes the Supabase performance warning.
drop index if exists public.site_domains_one_primary_idx;

commit;
