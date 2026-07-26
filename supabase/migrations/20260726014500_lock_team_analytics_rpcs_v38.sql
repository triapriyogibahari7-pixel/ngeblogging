revoke all on function public.get_site_analytics_dashboard(uuid, integer) from public, anon;
grant execute on function public.get_site_analytics_dashboard(uuid, integer) to authenticated, service_role;

revoke all on function public.get_site_member_quota(uuid) from public, anon;
grant execute on function public.get_site_member_quota(uuid) to authenticated, service_role;

revoke execute on function public.record_analytics_event(uuid, text, text, text, text, text, text, text, text, text, jsonb) from authenticated;
grant execute on function public.record_analytics_event(uuid, text, text, text, text, text, text, text, text, text, jsonb) to anon, service_role;
