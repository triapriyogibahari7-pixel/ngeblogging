-- Every authenticated Ngeblogging account may own up to twelve independent sites.
-- The existing BEFORE INSERT trigger remains the single concurrency-safe authority.

create or replace function private.site_limit_for_plan(plan_name text)
returns integer
language sql
immutable
set search_path to ''
as $$
  select 12;
$$;

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
set search_path to ''
as $$
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
      private.site_limit_for_plan(state.plan) as allowed_limit
    from state
    where state.user_id is not null
  )
  select
    quota.current_count,
    12,
    12,
    quota.allowed_limit,
    greatest(quota.allowed_limit - quota.current_count, 0),
    quota.plan
  from quota;
$$;

create or replace function public.create_site_workspace(
  site_name text,
  site_slug text,
  site_description text default '',
  site_blueprint text default 'blog'
)
returns public.sites
language plpgsql
set search_path to ''
as $$
declare
  current_user_id uuid := auth.uid();
  normalized_name text := trim(coalesce(site_name, ''));
  normalized_slug text := lower(trim(coalesce(site_slug, '')));
  normalized_description text := trim(coalesce(site_description, ''));
  normalized_blueprint text := lower(trim(coalesce(site_blueprint, 'blog')));
  account_plan text := 'free';
  allowed_limit integer := 12;
  owned_count integer := 0;
  created_site public.sites;
  reserved_slugs constant text[] := array[
    'account','admin','api','app','assets','auth','billing','cdn','community',
    'dashboard','docs','help','login','mail','media','nara','ngeblogging','news',
    'root','security','settings','smtp','static','status','studio','support',
    'system','www'
  ]::text[];
begin
  if current_user_id is null then
    raise exception using errcode = '42501', message = 'Anda harus masuk untuk membuat situs.';
  end if;

  if not exists (select 1 from public.profiles p where p.id = current_user_id) then
    raise exception using errcode = '23503', message = 'Profil akun belum siap. Muat ulang lalu coba lagi.';
  end if;

  select coalesce(p.plan, 'free')
    into account_plan
    from public.profiles p
   where p.id = current_user_id;

  allowed_limit := private.site_limit_for_plan(account_plan);

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(current_user_id::text, 0)
  );

  select count(*)::integer
    into owned_count
    from public.sites s
   where s.owner_id = current_user_id;

  if owned_count >= allowed_limit then
    raise exception using
      errcode = 'P0001',
      message = format(
        'SITE_LIMIT_REACHED: Akun paket %s sudah memiliki %s dari maksimum %s situs.',
        upper(account_plan),
        owned_count,
        allowed_limit
      );
  end if;

  if char_length(normalized_name) not between 2 and 100 then
    raise exception using errcode = '22023', message = 'Nama situs harus terdiri dari 2–100 karakter.';
  end if;

  if char_length(normalized_slug) not between 3 and 63
     or normalized_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
     or normalized_slug = any (reserved_slugs)
  then
    raise exception using errcode = '22023', message = 'Format subdomain tidak valid atau termasuk nama sistem.';
  end if;

  if exists (select 1 from public.sites s where s.slug = normalized_slug) then
    raise exception using errcode = '23505', message = 'Subdomain ini sudah digunakan.';
  end if;

  if char_length(normalized_description) > 500 then
    raise exception using errcode = '22023', message = 'Deskripsi maksimal 500 karakter.';
  end if;

  if normalized_blueprint <> all (array[
    'blog','website','news','community','forum','landing','profile','diary','portfolio','knowledge'
  ]::text[]) then
    normalized_blueprint := 'blog';
  end if;

  insert into public.sites (
    owner_id,
    name,
    slug,
    description,
    status,
    is_public,
    blueprint,
    settings
  ) values (
    current_user_id,
    normalized_name,
    normalized_slug,
    normalized_description,
    'draft',
    false,
    normalized_blueprint,
    jsonb_build_object(
      'onboarding', 'workspace-hub',
      'managed_subdomain', true,
      'cloudflare', 'wildcard-subdomain',
      'site_limit', allowed_limit
    )
  )
  returning * into created_site;

  update public.profiles
     set onboarding_completed = true,
         updated_at = now()
   where id = current_user_id;

  return created_site;
end;
$$;
