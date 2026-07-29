create extension if not exists pgcrypto;

create table if not exists public.api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 80),
  prefix text not null,
  last_four text not null,
  token_hash text not null unique,
  scopes text[] not null default array['sites:read']::text[],
  status text not null default 'active' check (status in ('active','revoked')),
  expires_at timestamptz,
  last_used_at timestamptz,
  last_used_ip text,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists api_keys_user_created_idx on public.api_keys(user_id, created_at desc);
create index if not exists api_keys_active_hash_idx on public.api_keys(token_hash) where status = 'active';

alter table public.api_keys enable row level security;
revoke all on table public.api_keys from anon, authenticated;

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
  where k.user_id = uid;

  return payload;
end;
$$;

create or replace function public.create_api_key(
  key_name text,
  requested_scopes text[] default array['sites:read']::text[],
  expires_in_days integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  uid uuid := auth.uid();
  clean_name text := trim(coalesce(key_name, ''));
  allowed_scopes constant text[] := array[
    'sites:read',
    'content:read',
    'content:write',
    'media:read',
    'analytics:read',
    'comments:moderate'
  ];
  clean_scopes text[];
  secret text;
  secret_hash text;
  key_id uuid;
  expiry timestamptz;
  active_count integer;
begin
  if uid is null then
    raise exception 'API_KEY_AUTH_REQUIRED' using errcode = '42501';
  end if;
  if char_length(clean_name) < 1 or char_length(clean_name) > 80 then
    raise exception 'API_KEY_NAME_INVALID';
  end if;

  select coalesce(array_agg(distinct s order by s), array['sites:read']::text[])
  into clean_scopes
  from unnest(coalesce(requested_scopes, array['sites:read']::text[])) s
  where s = any(allowed_scopes);

  if cardinality(clean_scopes) = 0 then
    clean_scopes := array['sites:read']::text[];
  end if;

  select count(*) into active_count
  from public.api_keys
  where user_id = uid and status = 'active';

  if active_count >= 20 then
    raise exception 'API_KEY_LIMIT_REACHED';
  end if;

  if expires_in_days is not null then
    if expires_in_days < 1 or expires_in_days > 3650 then
      raise exception 'API_KEY_EXPIRY_INVALID';
    end if;
    expiry := now() + make_interval(days => expires_in_days);
  end if;

  secret := 'ngb_live_' || encode(gen_random_bytes(32), 'hex');
  secret_hash := encode(digest(secret, 'sha256'), 'hex');

  insert into public.api_keys(
    user_id, name, prefix, last_four, token_hash, scopes, expires_at
  ) values (
    uid, clean_name, left(secret, 20), right(secret, 4), secret_hash, clean_scopes, expiry
  ) returning id into key_id;

  return jsonb_build_object(
    'id', key_id,
    'name', clean_name,
    'secret', secret,
    'prefix', left(secret, 20),
    'lastFour', right(secret, 4),
    'scopes', clean_scopes,
    'expiresAt', expiry,
    'createdAt', now()
  );
end;
$$;

create or replace function public.revoke_api_key(target_key uuid)
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
  set status = 'revoked',
      revoked_at = coalesce(revoked_at, now()),
      updated_at = now()
  where id = target_key and user_id = uid and status = 'active';

  return found;
end;
$$;

create or replace function public.rotate_api_key(target_key uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  uid uuid := auth.uid();
  current_key public.api_keys%rowtype;
  secret text;
  secret_hash text;
  new_id uuid;
begin
  if uid is null then
    raise exception 'API_KEY_AUTH_REQUIRED' using errcode = '42501';
  end if;

  select * into current_key
  from public.api_keys
  where id = target_key and user_id = uid
  for update;

  if not found then
    raise exception 'API_KEY_NOT_FOUND';
  end if;

  update public.api_keys
  set status = 'revoked',
      revoked_at = coalesce(revoked_at, now()),
      updated_at = now()
  where id = current_key.id;

  secret := 'ngb_live_' || encode(gen_random_bytes(32), 'hex');
  secret_hash := encode(digest(secret, 'sha256'), 'hex');

  insert into public.api_keys(
    user_id, name, prefix, last_four, token_hash, scopes, expires_at
  ) values (
    uid, current_key.name, left(secret, 20), right(secret, 4),
    secret_hash, current_key.scopes, current_key.expires_at
  ) returning id into new_id;

  return jsonb_build_object(
    'id', new_id,
    'name', current_key.name,
    'secret', secret,
    'prefix', left(secret, 20),
    'lastFour', right(secret, 4),
    'scopes', current_key.scopes,
    'expiresAt', current_key.expires_at,
    'createdAt', now(),
    'rotatedFrom', current_key.id
  );
end;
$$;

grant execute on function public.list_api_keys() to authenticated;
grant execute on function public.create_api_key(text, text[], integer) to authenticated;
grant execute on function public.revoke_api_key(uuid) to authenticated;
grant execute on function public.rotate_api_key(uuid) to authenticated;

comment on table public.api_keys is
  'Hashed Ngeblogging user API keys. Plaintext secrets are never stored.';
