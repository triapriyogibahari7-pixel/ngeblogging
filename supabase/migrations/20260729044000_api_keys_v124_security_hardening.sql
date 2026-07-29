revoke all on function public.list_api_keys() from public, anon;
revoke all on function public.create_api_key(text, text[], integer) from public, anon;
revoke all on function public.revoke_api_key(uuid) from public, anon;
revoke all on function public.rotate_api_key(uuid) from public, anon;

grant execute on function public.list_api_keys() to authenticated;
grant execute on function public.create_api_key(text, text[], integer) to authenticated;
grant execute on function public.revoke_api_key(uuid) to authenticated;
grant execute on function public.rotate_api_key(uuid) to authenticated;

drop policy if exists api_keys_direct_access_denied on public.api_keys;
create policy api_keys_direct_access_denied
on public.api_keys
for all
to anon, authenticated
using (false)
with check (false);
