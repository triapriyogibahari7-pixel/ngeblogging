create or replace function public.record_analytics_event(
  target_site uuid,
  event_path text,
  content_slug text default null,
  visitor_hash text default '',
  session_hash text default null,
  classification text default 'unknown',
  bot_name text default null,
  device_type text default 'unknown',
  referrer_host text default null,
  country_code text default null,
  metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  safe_path text;
  safe_visitor text;
  safe_session text;
  safe_classification text;
  safe_device text;
  daily_count integer;
  inserted_id bigint;
begin
  if target_site is null or not exists (
    select 1
      from public.sites s
     where s.id = target_site
       and s.status = 'active'::public.site_status
       and s.is_public = true
  ) then
    raise exception using errcode = 'P0002', message = 'Situs publik tidak ditemukan.';
  end if;

  safe_path := left(coalesce(nullif(trim(event_path), ''), '/'), 1000);
  if left(safe_path, 1) <> '/' then safe_path := '/' || safe_path; end if;

  safe_visitor := left(coalesce(nullif(trim(visitor_hash), ''), encode(extensions.digest(pg_catalog.gen_random_uuid()::text, 'sha256'), 'hex')), 128);
  safe_session := nullif(left(coalesce(trim(session_hash), ''), 128), '');
  safe_classification := case when classification in ('human', 'bot', 'unknown') then classification else 'unknown' end;
  safe_device := case when device_type in ('mobile', 'desktop', 'tablet', 'tv', 'unknown') then device_type else 'unknown' end;

  select count(*)::integer
    into daily_count
    from public.analytics_events ae
   where ae.site_id = target_site
     and ae.visitor_hash = safe_visitor
     and ae.occurred_at >= pg_catalog.date_trunc('day', pg_catalog.now());

  if daily_count >= 2000 then
    return pg_catalog.jsonb_build_object('recorded', false, 'reason', 'rate_limited');
  end if;

  if exists (
    select 1
      from public.analytics_events ae
     where ae.site_id = target_site
       and ae.visitor_hash = safe_visitor
       and ae.path = safe_path
       and ae.occurred_at >= pg_catalog.now() - interval '3 seconds'
  ) then
    return pg_catalog.jsonb_build_object('recorded', false, 'reason', 'duplicate');
  end if;

  insert into public.analytics_events (
    site_id,
    event_type,
    path,
    content_slug,
    visitor_hash,
    session_hash,
    classification,
    bot_name,
    device_type,
    referrer_host,
    country_code,
    metadata
  ) values (
    target_site,
    'page_view',
    safe_path,
    nullif(left(coalesce(trim(content_slug), ''), 180), ''),
    safe_visitor,
    safe_session,
    safe_classification,
    case when safe_classification = 'bot' then nullif(left(coalesce(trim(bot_name), ''), 120), '') else null end,
    safe_device,
    nullif(left(lower(coalesce(trim(referrer_host), '')), 253), ''),
    case when country_code ~ '^[A-Za-z]{2}$' then upper(country_code) else null end,
    case when pg_catalog.jsonb_typeof(coalesce(metadata, '{}'::jsonb)) = 'object' then coalesce(metadata, '{}'::jsonb) else '{}'::jsonb end
  ) returning id into inserted_id;

  return pg_catalog.jsonb_build_object('recorded', true, 'id', inserted_id);
end;
$function$;

revoke all on function public.record_analytics_event(uuid, text, text, text, text, text, text, text, text, text, jsonb) from public;
grant execute on function public.record_analytics_event(uuid, text, text, text, text, text, text, text, text, text, jsonb) to anon, authenticated, service_role;

comment on function public.record_analytics_event(uuid, text, text, text, text, text, text, text, text, text, jsonb)
is 'Privacy-first public analytics collector: validates active tenant, normalizes fields, deduplicates rapid repeats, and rate limits per daily visitor hash.';
