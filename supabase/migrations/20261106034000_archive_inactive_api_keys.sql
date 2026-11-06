begin;

alter table public.api_keys add column if not exists archived_at timestamptz;

create or replace function public.archive_api_key(target_key uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'API_KEY_AUTH_REQUIRED' using errcode = '42501';
  end if;

  update public.api_keys
  set archived_at = now(),
      status = 'revoked',
      revoked_at = coalesce(revoked_at, now()),
      updated_at = now()
  where id = target_key and user_id = uid and archived_at is null
    and (status = 'revoked' or (expires_at is not null and expires_at <= now()));

  return found;
end;
$$;

revoke all on function public.archive_api_key(uuid) from public, anon;
grant execute on function public.archive_api_key(uuid) to authenticated;

create or replace function public.list_api_keys()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  uid uuid := auth.uid();
  payload jsonb;
begin
  if uid is null then
    raise exception 'API_KEY_AUTH_REQUIRED' using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', k.id,
    'name', k.name,
    'prefix', k.prefix,
    'lastFour', k.last_four,
    'scopes', k.scopes,
    'status', k.status,
    'expiresAt', k.expires_at,
    'lastUsedAt', k.last_used_at,
    'createdAt', k.created_at,
    'revokedAt', k.revoked_at
  ) order by k.created_at desc), '[]'::jsonb)
  into payload
  from public.api_keys k
  where k.user_id = uid and k.archived_at is null;

  return payload;
end;
$$;

revoke all on function public.list_api_keys() from public, anon;
grant execute on function public.list_api_keys() to authenticated;
comment on column public.api_keys.archived_at is 'Hides inactive keys from the user list without deleting credential history.';

commit;
