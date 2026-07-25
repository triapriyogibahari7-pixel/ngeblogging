begin;

create table if not exists public.analytics_events (
  id bigint generated always as identity primary key,
  site_id uuid not null references public.sites(id) on delete cascade,
  occurred_at timestamptz not null default now(),
  event_type text not null default 'page_view' check (event_type in ('page_view','engagement')),
  path text not null default '/',
  content_slug text,
  visitor_hash text not null,
  session_hash text,
  classification text not null default 'unknown' check (classification in ('human','bot','unknown')),
  bot_name text,
  device_type text not null default 'unknown' check (device_type in ('mobile','tablet','desktop','tv','unknown')),
  referrer_host text,
  country_code text,
  duration_ms integer check (duration_ms is null or (duration_ms >= 0 and duration_ms <= 86400000)),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.analytics_events enable row level security;

revoke all on public.analytics_events from anon;
revoke insert, update, delete on public.analytics_events from authenticated;
grant select on public.analytics_events to authenticated;

create policy analytics_events_read_site_team
on public.analytics_events
for select
to authenticated
using (
  private.has_site_role(
    site_id,
    array['owner'::public.member_role,'admin'::public.member_role,'editor'::public.member_role]
  )
);

create index if not exists analytics_events_site_time_idx
  on public.analytics_events(site_id, occurred_at desc);
create index if not exists analytics_events_site_path_time_idx
  on public.analytics_events(site_id, path, occurred_at desc);
create index if not exists analytics_events_site_visitor_time_idx
  on public.analytics_events(site_id, visitor_hash, occurred_at desc);
create index if not exists analytics_events_created_brin_idx
  on public.analytics_events using brin(created_at);

create or replace function private.site_collaborator_limit()
returns integer
language sql
immutable
set search_path = ''
as $$
  select 100;
$$;

create or replace function private.enforce_site_collaborator_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  active_count integer;
  pending_count integer;
  allowed_count integer := private.site_collaborator_limit();
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.site_id::text, 37));

  select count(*)::integer
    into active_count
    from public.site_members sm
   where sm.site_id = new.site_id;

  select count(*)::integer
    into pending_count
    from public.site_invitations si
   where si.site_id = new.site_id
     and si.accepted_at is null
     and si.expires_at > pg_catalog.now();

  if tg_table_name = 'site_members' then
    if active_count >= allowed_count then
      raise exception using errcode='P0001', message=format('SITE_MEMBER_LIMIT_REACHED: maksimum %s anggota tim per situs.', allowed_count);
    end if;
  else
    if active_count + pending_count >= allowed_count then
      raise exception using errcode='P0001', message=format('SITE_MEMBER_LIMIT_REACHED: maksimum %s anggota dan undangan aktif per situs.', allowed_count);
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_site_member_limit on public.site_members;
create trigger enforce_site_member_limit
before insert on public.site_members
for each row execute function private.enforce_site_collaborator_limit();

drop trigger if exists enforce_site_invitation_limit on public.site_invitations;
create trigger enforce_site_invitation_limit
before insert on public.site_invitations
for each row execute function private.enforce_site_collaborator_limit();

create or replace function public.get_site_member_quota(target_site uuid)
returns table(active_count integer, pending_count integer, allowed_limit integer, remaining integer, can_invite boolean)
language sql
stable
security definer
set search_path = ''
as $$
  with authorized as (
    select private.has_site_role(
      target_site,
      array['owner'::public.member_role,'admin'::public.member_role]
    ) as allowed
  ), counts as (
    select
      (select count(*)::integer from public.site_members sm where sm.site_id = target_site) as active_count,
      (select count(*)::integer from public.site_invitations si where si.site_id = target_site and si.accepted_at is null and si.expires_at > pg_catalog.now()) as pending_count,
      private.site_collaborator_limit() as allowed_limit
  )
  select
    counts.active_count,
    counts.pending_count,
    counts.allowed_limit,
    greatest(counts.allowed_limit - counts.active_count - counts.pending_count, 0),
    authorized.allowed and (counts.active_count + counts.pending_count < counts.allowed_limit)
  from authorized cross join counts
  where authorized.allowed;
$$;

grant execute on function public.get_site_member_quota(uuid) to authenticated;

create or replace function public.get_site_analytics_dashboard(target_site uuid, range_days integer default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  safe_days integer := greatest(1, least(coalesce(range_days, 30), 365));
  result jsonb;
begin
  if not private.has_site_role(
    target_site,
    array['owner'::public.member_role,'admin'::public.member_role,'editor'::public.member_role]
  ) then
    raise exception using errcode='42501', message='Akses analitik situs ditolak.';
  end if;

  with bounds as (
    select
      pg_catalog.date_trunc('day', pg_catalog.now()) - (safe_days - 1) * interval '1 day' as current_start,
      pg_catalog.date_trunc('day', pg_catalog.now()) + interval '1 day' as current_end,
      pg_catalog.date_trunc('day', pg_catalog.now()) - (safe_days * 2 - 1) * interval '1 day' as previous_start
  ), current_events as (
    select ae.*
      from public.analytics_events ae, bounds b
     where ae.site_id = target_site
       and ae.event_type = 'page_view'
       and ae.occurred_at >= b.current_start
       and ae.occurred_at < b.current_end
  ), previous_events as (
    select ae.*
      from public.analytics_events ae, bounds b
     where ae.site_id = target_site
       and ae.event_type = 'page_view'
       and ae.occurred_at >= b.previous_start
       and ae.occurred_at < b.current_start
  ), totals as (
    select
      count(*)::integer as views,
      count(*) filter (where classification='human')::integer as human_views,
      count(*) filter (where classification='bot')::integer as bot_views,
      count(*) filter (where classification='unknown')::integer as unknown_views,
      count(distinct visitor_hash) filter (where classification='human')::integer as unique_humans,
      count(*) filter (where occurred_at >= pg_catalog.date_trunc('day', pg_catalog.now()))::integer as views_today
    from current_events
  ), previous_total as (
    select count(*)::integer as views from previous_events
  ), daily as (
    select
      day::date as day,
      count(ce.id)::integer as views,
      count(ce.id) filter (where ce.classification='human')::integer as humans,
      count(ce.id) filter (where ce.classification='bot')::integer as bots
    from pg_catalog.generate_series(
      pg_catalog.current_date - (safe_days - 1),
      pg_catalog.current_date,
      interval '1 day'
    ) day
    left join current_events ce on ce.occurred_at >= day and ce.occurred_at < day + interval '1 day'
    group by day
    order by day
  ), traffic as (
    select classification as label, count(*)::integer as value
      from current_events
     group by classification
     order by value desc
  ), devices as (
    select device_type as label, count(*)::integer as value
      from current_events
     group by device_type
     order by value desc
  ), referrers as (
    select coalesce(nullif(referrer_host,''),'Langsung') as label, count(*)::integer as value
      from current_events
     group by coalesce(nullif(referrer_host,''),'Langsung')
     order by value desc
     limit 10
  ), countries as (
    select coalesce(nullif(country_code,''),'--') as label, count(*)::integer as value
      from current_events
     group by coalesce(nullif(country_code,''),'--')
     order by value desc
     limit 10
  ), top_content as (
    select
      ce.path,
      coalesce(max(c.title), ce.path) as title,
      count(*)::integer as views,
      count(*) filter (where ce.classification='human')::integer as humans,
      count(*) filter (where ce.classification='bot')::integer as bots,
      count(distinct ce.visitor_hash) filter (where ce.classification='human')::integer as unique_humans
    from current_events ce
    left join public.contents c
      on c.site_id = target_site
     and c.slug = ce.content_slug
    group by ce.path
    order by views desc
    limit 20
  )
  select pg_catalog.jsonb_build_object(
    'rangeDays', safe_days,
    'generatedAt', pg_catalog.now(),
    'totals', pg_catalog.jsonb_build_object(
      'views', totals.views,
      'humanViews', totals.human_views,
      'botViews', totals.bot_views,
      'unknownViews', totals.unknown_views,
      'uniqueHumans', totals.unique_humans,
      'viewsToday', totals.views_today,
      'previousViews', previous_total.views,
      'changePercent', case when previous_total.views = 0 then null else round(((totals.views - previous_total.views)::numeric / previous_total.views::numeric) * 100, 1) end
    ),
    'series', coalesce((select pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object('day',day,'views',views,'humans',humans,'bots',bots) order by day) from daily), '[]'::jsonb),
    'traffic', coalesce((select pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object('label',label,'value',value) order by value desc) from traffic), '[]'::jsonb),
    'devices', coalesce((select pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object('label',label,'value',value) order by value desc) from devices), '[]'::jsonb),
    'referrers', coalesce((select pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object('label',label,'value',value) order by value desc) from referrers), '[]'::jsonb),
    'countries', coalesce((select pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object('label',label,'value',value) order by value desc) from countries), '[]'::jsonb),
    'topContent', coalesce((select pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object('path',path,'title',title,'views',views,'humans',humans,'bots',bots,'uniqueHumans',unique_humans) order by views desc) from top_content), '[]'::jsonb)
  )
  into result
  from totals cross join previous_total;

  return coalesce(result, '{}'::jsonb);
end;
$$;

grant execute on function public.get_site_analytics_dashboard(uuid, integer) to authenticated;

commit;
