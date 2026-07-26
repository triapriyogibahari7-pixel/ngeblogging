create or replace function public.get_site_analytics_dashboard(target_site uuid, range_days integer default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
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
      current_date - (safe_days - 1),
      current_date,
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
$function$;

revoke all on function public.get_site_analytics_dashboard(uuid, integer) from public, anon;
grant execute on function public.get_site_analytics_dashboard(uuid, integer) to authenticated, service_role;
