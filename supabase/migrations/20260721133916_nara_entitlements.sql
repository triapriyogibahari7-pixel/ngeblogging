-- Nara plan entitlements, upgrade requests, and server-enforced daily quotas.

alter table public.profiles
  add column plan text not null default 'free'
    check (plan in ('free', 'pro', 'business')),
  add column plan_expires_at timestamptz;

create table public.plan_upgrade_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  requested_plan text not null default 'pro' check (requested_plan in ('pro', 'business')),
  status text not null default 'requested' check (status in ('requested', 'contacted', 'approved', 'rejected', 'cancelled')),
  source text not null default 'nara_assistant' check (char_length(source) between 1 and 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, requested_plan)
);

create table public.nara_usage_daily (
  user_id uuid not null references public.profiles(id) on delete cascade,
  usage_date date not null default current_date,
  request_count integer not null default 0 check (request_count >= 0),
  total_tokens bigint not null default 0 check (total_tokens >= 0),
  last_model text,
  last_intelligence text,
  updated_at timestamptz not null default now(),
  primary key (user_id, usage_date)
);

create index plan_upgrade_requests_status_idx
  on public.plan_upgrade_requests (status, created_at desc);

alter table public.plan_upgrade_requests enable row level security;
alter table public.nara_usage_daily enable row level security;

create policy "upgrade_requests_read_own"
on public.plan_upgrade_requests for select to authenticated
using (user_id = (select auth.uid()));

create policy "upgrade_requests_create_own"
on public.plan_upgrade_requests for insert to authenticated
with check (
  user_id = (select auth.uid())
  and status = 'requested'
  and requested_plan in ('pro', 'business')
);

create policy "nara_usage_read_own"
on public.nara_usage_daily for select to authenticated
using (user_id = (select auth.uid()));

grant select on public.plan_upgrade_requests, public.nara_usage_daily to authenticated;
grant insert (user_id, requested_plan, source) on public.plan_upgrade_requests to authenticated;

create function private.consume_nara_quota(
  requested_model text,
  requested_intelligence text
)
returns table (
  allowed boolean,
  account_plan text,
  remaining integer,
  daily_limit integer,
  reason text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  resolved_plan text;
  quota_limit integer;
  used_count integer;
  requires_pro boolean;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  select case
    when p.plan in ('pro', 'business')
      and (p.plan_expires_at is null or p.plan_expires_at > now())
      then p.plan
    else 'free'
  end
  into resolved_plan
  from public.profiles p
  where p.id = current_user_id;

  resolved_plan := coalesce(resolved_plan, 'free');
  quota_limit := case resolved_plan when 'business' then 1000 when 'pro' then 250 else 25 end;
  requires_pro := requested_model in ('nara-writer', 'nara-vision', 'nara-max')
    or requested_intelligence in ('high', 'xhigh');

  if requires_pro and resolved_plan not in ('pro', 'business') then
    return query select false, resolved_plan, quota_limit, quota_limit, 'PLAN_REQUIRED'::text;
    return;
  end if;

  insert into public.nara_usage_daily (user_id, usage_date)
  values (current_user_id, current_date)
  on conflict (user_id, usage_date) do nothing;

  select n.request_count
  into used_count
  from public.nara_usage_daily n
  where n.user_id = current_user_id and n.usage_date = current_date
  for update;

  if used_count >= quota_limit then
    return query select false, resolved_plan, 0, quota_limit, 'DAILY_LIMIT'::text;
    return;
  end if;

  update public.nara_usage_daily n
  set request_count = n.request_count + 1,
      last_model = requested_model,
      last_intelligence = requested_intelligence,
      updated_at = now()
  where n.user_id = current_user_id and n.usage_date = current_date
  returning n.request_count into used_count;

  return query select true, resolved_plan, greatest(quota_limit - used_count, 0), quota_limit, 'OK'::text;
end;
$$;

revoke all on function private.consume_nara_quota(text, text) from public, anon, authenticated;
grant execute on function private.consume_nara_quota(text, text) to authenticated;

create function public.consume_nara_quota(
  requested_model text,
  requested_intelligence text
)
returns table (
  allowed boolean,
  account_plan text,
  remaining integer,
  daily_limit integer,
  reason text
)
language sql
security invoker
set search_path = ''
as $$
  select * from private.consume_nara_quota(requested_model, requested_intelligence);
$$;

revoke all on function public.consume_nara_quota(text, text) from public, anon;
grant execute on function public.consume_nara_quota(text, text) to authenticated;
