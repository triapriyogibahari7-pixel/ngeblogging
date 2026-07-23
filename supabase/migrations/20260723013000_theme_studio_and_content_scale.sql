-- Theme Studio persistence and stable cursor indexes for large multi-site datasets.
-- Additive migration: safe to deploy before the matching frontend release.

alter table public.sites
  add column if not exists blueprint text not null default 'blog'
  check (blueprint in (
    'blog', 'website', 'news', 'community', 'forum', 'landing',
    'profile', 'diary', 'portfolio', 'knowledge'
  ));

create table if not exists public.site_theme_settings (
  site_id uuid primary key references public.sites(id) on delete cascade,
  active_theme_id text not null default 'editorial-noir' check (char_length(active_theme_id) between 1 and 100),
  preview_theme_id text not null default 'editorial-noir' check (char_length(preview_theme_id) between 1 and 100),
  draft_config jsonb not null default '{}'::jsonb check (jsonb_typeof(draft_config) = 'object'),
  published_config jsonb not null default '{}'::jsonb check (jsonb_typeof(published_config) = 'object'),
  code jsonb not null default '{}'::jsonb check (jsonb_typeof(code) = 'object'),
  updated_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.site_theme_versions (
  id bigint generated always as identity primary key,
  site_id uuid not null references public.sites(id) on delete cascade,
  client_version_id text not null check (char_length(client_version_id) between 1 and 120),
  created_by uuid not null references public.profiles(id) on delete restrict,
  note text not null default 'Versi tema' check (char_length(note) between 1 and 120),
  active_theme_id text not null check (char_length(active_theme_id) between 1 and 100),
  published_config jsonb not null check (jsonb_typeof(published_config) = 'object'),
  code jsonb not null check (jsonb_typeof(code) = 'object'),
  created_at timestamptz not null default now(),
  unique (site_id, client_version_id)
);

create index if not exists site_theme_versions_cursor_idx
  on public.site_theme_versions (site_id, created_at desc, id desc);
create index if not exists site_theme_settings_updated_by_idx
  on public.site_theme_settings (updated_by);
create index if not exists site_theme_versions_created_by_idx
  on public.site_theme_versions (created_by);

-- Stable keyset/cursor pagination. The id tie-breaker prevents skipped rows
-- when multiple documents share the same timestamp.
create index if not exists contents_studio_cursor_idx
  on public.contents (site_id, kind, updated_at desc, id desc)
  include (title, slug, status, visibility, published_at);
create index if not exists contents_status_cursor_idx
  on public.contents (site_id, kind, status, updated_at desc, id desc)
  include (title, slug, visibility, published_at);
create index if not exists contents_public_cursor_idx
  on public.contents (site_id, kind, published_at desc, id desc)
  include (title, slug, excerpt, featured_image_path)
  where status = 'published' and visibility = 'public';

-- BRIN stays compact for append-heavy operational tables at very large scale.
create index if not exists audit_logs_created_brin_idx
  on public.audit_logs using brin (created_at) with (pages_per_range = 64);
create index if not exists revisions_created_brin_idx
  on public.content_revisions using brin (created_at) with (pages_per_range = 64);

drop trigger if exists site_theme_settings_set_updated_at on public.site_theme_settings;
create trigger site_theme_settings_set_updated_at
before update on public.site_theme_settings
for each row execute function private.set_updated_at();

alter table public.site_theme_settings enable row level security;
alter table public.site_theme_versions enable row level security;

create policy "theme_settings_read_members"
on public.site_theme_settings for select to authenticated
using (private.is_site_member(site_id));

create policy "theme_settings_insert_editors"
on public.site_theme_settings for insert to authenticated
with check (
  updated_by = (select auth.uid())
  and private.has_site_role(site_id, array['owner', 'admin', 'editor']::public.member_role[])
);

create policy "theme_settings_update_editors"
on public.site_theme_settings for update to authenticated
using (private.has_site_role(site_id, array['owner', 'admin', 'editor']::public.member_role[]))
with check (
  updated_by = (select auth.uid())
  and private.has_site_role(site_id, array['owner', 'admin', 'editor']::public.member_role[])
);

create policy "theme_versions_read_members"
on public.site_theme_versions for select to authenticated
using (private.is_site_member(site_id));

create policy "theme_versions_insert_editors"
on public.site_theme_versions for insert to authenticated
with check (
  created_by = (select auth.uid())
  and private.has_site_role(site_id, array['owner', 'admin', 'editor']::public.member_role[])
);

create policy "theme_versions_delete_admins"
on public.site_theme_versions for delete to authenticated
using (private.has_site_role(site_id, array['owner', 'admin']::public.member_role[]));

grant select, insert, update on public.site_theme_settings to authenticated;
grant select, insert, delete on public.site_theme_versions to authenticated;
grant usage, select on sequence public.site_theme_versions_id_seq to authenticated;
grant update (blueprint) on public.sites to authenticated;
grant insert (blueprint) on public.sites to authenticated;
