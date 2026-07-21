-- Ngeblogging initial production schema.
-- PostgreSQL 17 / Supabase. All public tables use RLS.

create extension if not exists pgcrypto with schema extensions;
create extension if not exists vector with schema extensions;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

create type public.member_role as enum (
  'owner', 'admin', 'editor', 'author', 'contributor', 'viewer'
);
create type public.site_status as enum (
  'draft', 'active', 'suspended', 'archived'
);
create type public.content_status as enum (
  'draft', 'review', 'scheduled', 'published', 'archived'
);
create type public.content_kind as enum ('article', 'page');
create type public.content_visibility as enum ('public', 'members', 'private');
create type public.term_kind as enum ('category', 'tag');
create type public.domain_status as enum ('pending', 'verifying', 'active', 'failed');
create type public.nara_message_role as enum ('user', 'assistant', 'system', 'tool');
create type public.memory_scope as enum ('user', 'site', 'content');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 100),
  avatar_url text,
  bio text not null default '' check (char_length(bio) <= 500),
  locale text not null default 'id-ID',
  timezone text not null default 'Asia/Jakarta',
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.sites (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete restrict,
  name text not null check (char_length(name) between 2 and 100),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  description text not null default '' check (char_length(description) <= 500),
  status public.site_status not null default 'draft',
  is_public boolean not null default true,
  theme_key text not null default 'editorial',
  locale text not null default 'id-ID',
  timezone text not null default 'Asia/Jakarta',
  settings jsonb not null default '{}'::jsonb check (jsonb_typeof(settings) = 'object'),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.site_members (
  site_id uuid not null references public.sites(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.member_role not null default 'viewer',
  invited_by uuid references public.profiles(id) on delete set null,
  joined_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (site_id, user_id)
);

create table public.site_invitations (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete cascade,
  email text not null check (email = lower(email) and char_length(email) between 3 and 320),
  role public.member_role not null default 'viewer' check (role <> 'owner'),
  token_hash text not null unique,
  invited_by uuid not null references public.profiles(id) on delete cascade,
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index site_invitations_pending_email_idx
  on public.site_invitations (site_id, email)
  where accepted_at is null;

create table public.contents (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete restrict,
  kind public.content_kind not null default 'article',
  title text not null default 'Tanpa judul' check (char_length(title) <= 300),
  slug text not null check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  body_json jsonb not null default '{}'::jsonb,
  body_html text not null default '',
  excerpt text not null default '' check (char_length(excerpt) <= 1000),
  featured_image_path text,
  status public.content_status not null default 'draft',
  visibility public.content_visibility not null default 'public',
  seo jsonb not null default '{}'::jsonb check (jsonb_typeof(seo) = 'object'),
  scheduled_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search_vector tsvector generated always as (
    to_tsvector(
      'simple',
      coalesce(title, '') || ' ' || coalesce(excerpt, '') || ' ' ||
      regexp_replace(coalesce(body_html, ''), '<[^>]+>', ' ', 'g')
    )
  ) stored,
  unique (site_id, slug)
);

create table public.content_revisions (
  id bigint generated always as identity primary key,
  content_id uuid not null references public.contents(id) on delete cascade,
  editor_id uuid not null references public.profiles(id) on delete restrict,
  snapshot jsonb not null check (jsonb_typeof(snapshot) = 'object'),
  note text not null default '' check (char_length(note) <= 500),
  created_at timestamptz not null default now()
);

create table public.terms (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete cascade,
  kind public.term_kind not null,
  name text not null check (char_length(name) between 1 and 100),
  slug text not null check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  description text not null default '' check (char_length(description) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (site_id, kind, slug)
);

create table public.content_terms (
  content_id uuid not null references public.contents(id) on delete cascade,
  term_id uuid not null references public.terms(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (content_id, term_id)
);

create table public.media_assets (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete cascade,
  uploaded_by uuid not null references public.profiles(id) on delete restrict,
  bucket_id text not null default 'site-media' check (bucket_id = 'site-media'),
  object_path text not null unique,
  filename text not null check (char_length(filename) between 1 and 255),
  mime_type text not null,
  bytes bigint check (bytes is null or bytes >= 0),
  width integer check (width is null or width > 0),
  height integer check (height is null or height > 0),
  alt_text text not null default '' check (char_length(alt_text) <= 500),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.site_domains (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete cascade,
  hostname text not null unique check (
    hostname = lower(hostname)
    and hostname ~ '^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$'
  ),
  status public.domain_status not null default 'pending',
  verification_token text not null default encode(gen_random_bytes(24), 'hex'),
  is_primary boolean not null default false,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index site_domains_one_primary_idx
  on public.site_domains (site_id)
  where is_primary;

create table public.nara_conversations (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null default 'Percakapan baru' check (char_length(title) <= 200),
  context jsonb not null default '{}'::jsonb check (jsonb_typeof(context) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.nara_messages (
  id bigint generated always as identity primary key,
  conversation_id uuid not null references public.nara_conversations(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  role public.nara_message_role not null,
  content text not null check (char_length(content) between 1 and 100000),
  citations jsonb not null default '[]'::jsonb check (jsonb_typeof(citations) = 'array'),
  model text,
  token_count integer check (token_count is null or token_count >= 0),
  created_at timestamptz not null default now()
);

create table public.nara_memories (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete cascade,
  owner_user_id uuid references public.profiles(id) on delete cascade,
  content_id uuid references public.contents(id) on delete cascade,
  scope public.memory_scope not null,
  memory_key text not null check (char_length(memory_key) between 1 and 200),
  memory_text text not null check (char_length(memory_text) between 1 and 20000),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  embedding extensions.vector,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (scope = 'user' and owner_user_id is not null)
    or (scope = 'site' and owner_user_id is null and content_id is null)
    or (scope = 'content' and content_id is not null)
  )
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  site_id uuid not null references public.sites(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null check (char_length(action) between 1 and 100),
  entity_type text not null check (char_length(entity_type) between 1 and 100),
  entity_id text,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now()
);

create index sites_owner_idx on public.sites (owner_id, updated_at desc);
create index site_members_user_idx on public.site_members (user_id, site_id);
create index contents_site_status_idx on public.contents (site_id, status, updated_at desc);
create index contents_author_idx on public.contents (author_id, updated_at desc);
create index contents_search_idx on public.contents using gin (search_vector);
create index revisions_content_idx on public.content_revisions (content_id, created_at desc);
create index terms_site_kind_idx on public.terms (site_id, kind, name);
create index media_site_idx on public.media_assets (site_id, created_at desc);
create index conversations_user_idx on public.nara_conversations (user_id, updated_at desc);
create index messages_conversation_idx on public.nara_messages (conversation_id, created_at);
create index memories_site_scope_idx on public.nara_memories (site_id, scope, updated_at desc);
create index audit_site_created_idx on public.audit_logs (site_id, created_at desc);

create function private.is_site_member(target_site uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and exists (
      select 1
      from public.site_members sm
      where sm.site_id = target_site
        and sm.user_id = (select auth.uid())
    );
$$;

create function private.has_site_role(
  target_site uuid,
  allowed_roles public.member_role[]
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and exists (
      select 1
      from public.site_members sm
      where sm.site_id = target_site
        and sm.user_id = (select auth.uid())
        and sm.role = any (allowed_roles)
    );
$$;

create function private.shares_site(other_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) = other_user
    or exists (
      select 1
      from public.site_members mine
      join public.site_members theirs on theirs.site_id = mine.site_id
      where mine.user_id = (select auth.uid())
        and theirs.user_id = other_user
    );
$$;

create function private.can_modify_content(target_content uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.contents c
    join public.site_members sm on sm.site_id = c.site_id
    where c.id = target_content
      and sm.user_id = (select auth.uid())
      and (
        sm.role in ('owner', 'admin', 'editor', 'author')
        or (
          sm.role = 'contributor'
          and c.author_id = (select auth.uid())
          and c.status in ('draft', 'review')
        )
      )
  );
$$;

create function private.owns_conversation(target_conversation uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.nara_conversations nc
    where nc.id = target_conversation
      and nc.user_id = (select auth.uid())
      and private.is_site_member(nc.site_id)
  );
$$;

revoke all on function private.is_site_member(uuid) from public, anon;
revoke all on function private.has_site_role(uuid, public.member_role[]) from public, anon;
revoke all on function private.shares_site(uuid) from public, anon;
revoke all on function private.can_modify_content(uuid) from public, anon;
revoke all on function private.owns_conversation(uuid) from public, anon;
grant execute on function private.is_site_member(uuid) to authenticated;
grant execute on function private.has_site_role(uuid, public.member_role[]) to authenticated;
grant execute on function private.shares_site(uuid) to authenticated;
grant execute on function private.can_modify_content(uuid) to authenticated;
grant execute on function private.owns_conversation(uuid) to authenticated;

create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function private.set_updated_at() from public, anon, authenticated;

create trigger profiles_set_updated_at before update on public.profiles
for each row execute function private.set_updated_at();
create trigger sites_set_updated_at before update on public.sites
for each row execute function private.set_updated_at();
create trigger site_members_set_updated_at before update on public.site_members
for each row execute function private.set_updated_at();
create trigger contents_set_updated_at before update on public.contents
for each row execute function private.set_updated_at();
create trigger terms_set_updated_at before update on public.terms
for each row execute function private.set_updated_at();
create trigger media_assets_set_updated_at before update on public.media_assets
for each row execute function private.set_updated_at();
create trigger site_domains_set_updated_at before update on public.site_domains
for each row execute function private.set_updated_at();
create trigger nara_conversations_set_updated_at before update on public.nara_conversations
for each row execute function private.set_updated_at();
create trigger nara_memories_set_updated_at before update on public.nara_memories
for each row execute function private.set_updated_at();

create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email, ''),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke all on function private.handle_new_user() from public, anon, authenticated;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_user();

create function private.add_owner_membership()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.site_members (site_id, user_id, role)
  values (new.id, new.owner_id, 'owner');
  return new;
end;
$$;

revoke all on function private.add_owner_membership() from public, anon, authenticated;
create trigger on_site_created
after insert on public.sites
for each row execute function private.add_owner_membership();

alter table public.profiles enable row level security;
alter table public.sites enable row level security;
alter table public.site_members enable row level security;
alter table public.site_invitations enable row level security;
alter table public.contents enable row level security;
alter table public.content_revisions enable row level security;
alter table public.terms enable row level security;
alter table public.content_terms enable row level security;
alter table public.media_assets enable row level security;
alter table public.site_domains enable row level security;
alter table public.nara_conversations enable row level security;
alter table public.nara_messages enable row level security;
alter table public.nara_memories enable row level security;
alter table public.audit_logs enable row level security;

create policy "profiles_read_shared_sites"
on public.profiles for select to authenticated
using (private.shares_site(id));

create policy "profiles_update_self"
on public.profiles for update to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy "sites_read_public"
on public.sites for select to anon, authenticated
using (status = 'active' and is_public);

create policy "sites_read_members"
on public.sites for select to authenticated
using (private.is_site_member(id));

create policy "sites_create_owner"
on public.sites for insert to authenticated
with check ((select auth.uid()) = owner_id);

create policy "sites_update_managers"
on public.sites for update to authenticated
using (private.has_site_role(id, array['owner', 'admin']::public.member_role[]))
with check (private.has_site_role(id, array['owner', 'admin']::public.member_role[]));

create policy "sites_delete_owner"
on public.sites for delete to authenticated
using (private.has_site_role(id, array['owner']::public.member_role[]));

create policy "members_read_site_team"
on public.site_members for select to authenticated
using (private.is_site_member(site_id));

create policy "members_add_by_manager"
on public.site_members for insert to authenticated
with check (
  private.has_site_role(site_id, array['owner', 'admin']::public.member_role[])
  and (
    role <> 'owner'
    or private.has_site_role(site_id, array['owner']::public.member_role[])
  )
);

create policy "members_update_by_manager"
on public.site_members for update to authenticated
using (
  user_id <> (select auth.uid())
  and (
    private.has_site_role(site_id, array['owner']::public.member_role[])
    or (
      private.has_site_role(site_id, array['admin']::public.member_role[])
      and role <> 'owner'
    )
  )
)
with check (
  user_id <> (select auth.uid())
  and (
    private.has_site_role(site_id, array['owner']::public.member_role[])
    or (
      private.has_site_role(site_id, array['admin']::public.member_role[])
      and role <> 'owner'
    )
  )
);

create policy "members_remove_or_leave"
on public.site_members for delete to authenticated
using (
  (user_id = (select auth.uid()) and role <> 'owner')
  or (
    user_id <> (select auth.uid())
    and (
      private.has_site_role(site_id, array['owner']::public.member_role[])
      or (
        private.has_site_role(site_id, array['admin']::public.member_role[])
        and role <> 'owner'
      )
    )
  )
);

create policy "invitations_read_managers"
on public.site_invitations for select to authenticated
using (private.has_site_role(site_id, array['owner', 'admin']::public.member_role[]));

create policy "invitations_create_managers"
on public.site_invitations for insert to authenticated
with check (
  invited_by = (select auth.uid())
  and role <> 'owner'
  and private.has_site_role(site_id, array['owner', 'admin']::public.member_role[])
);

create policy "invitations_update_managers"
on public.site_invitations for update to authenticated
using (private.has_site_role(site_id, array['owner', 'admin']::public.member_role[]))
with check (private.has_site_role(site_id, array['owner', 'admin']::public.member_role[]));

create policy "invitations_delete_managers"
on public.site_invitations for delete to authenticated
using (private.has_site_role(site_id, array['owner', 'admin']::public.member_role[]));

create policy "contents_read_published"
on public.contents for select to anon, authenticated
using (
  status = 'published'
  and visibility = 'public'
  and exists (
    select 1 from public.sites s
    where s.id = contents.site_id
      and s.status = 'active'
      and s.is_public
  )
);

create policy "contents_read_members"
on public.contents for select to authenticated
using (private.is_site_member(site_id));

create policy "contents_create_contributors"
on public.contents for insert to authenticated
with check (
  author_id = (select auth.uid())
  and private.has_site_role(
    site_id,
    array['owner', 'admin', 'editor', 'author', 'contributor']::public.member_role[]
  )
  and (
    status in ('draft', 'review')
    or private.has_site_role(
      site_id,
      array['owner', 'admin', 'editor', 'author']::public.member_role[]
    )
  )
);

create policy "contents_update_editorial"
on public.contents for update to authenticated
using (
  private.has_site_role(
    site_id,
    array['owner', 'admin', 'editor', 'author']::public.member_role[]
  )
  or (
    author_id = (select auth.uid())
    and status in ('draft', 'review')
    and private.has_site_role(site_id, array['contributor']::public.member_role[])
  )
)
with check (
  private.has_site_role(
    site_id,
    array['owner', 'admin', 'editor', 'author']::public.member_role[]
  )
  or (
    author_id = (select auth.uid())
    and status in ('draft', 'review')
    and private.has_site_role(site_id, array['contributor']::public.member_role[])
  )
);

create policy "contents_delete_editorial"
on public.contents for delete to authenticated
using (
  private.has_site_role(
    site_id,
    array['owner', 'admin', 'editor', 'author']::public.member_role[]
  )
  or (
    author_id = (select auth.uid())
    and status in ('draft', 'review')
    and private.has_site_role(site_id, array['contributor']::public.member_role[])
  )
);

create policy "revisions_read_members"
on public.content_revisions for select to authenticated
using (
  exists (
    select 1 from public.contents c
    where c.id = content_revisions.content_id
      and private.is_site_member(c.site_id)
  )
);

create policy "revisions_create_editors"
on public.content_revisions for insert to authenticated
with check (
  editor_id = (select auth.uid())
  and private.can_modify_content(content_id)
);

create policy "terms_read_public"
on public.terms for select to anon, authenticated
using (
  exists (
    select 1 from public.sites s
    where s.id = terms.site_id and s.status = 'active' and s.is_public
  )
);

create policy "terms_read_members"
on public.terms for select to authenticated
using (private.is_site_member(site_id));

create policy "terms_manage_editorial"
on public.terms for all to authenticated
using (
  private.has_site_role(
    site_id,
    array['owner', 'admin', 'editor', 'author']::public.member_role[]
  )
)
with check (
  private.has_site_role(
    site_id,
    array['owner', 'admin', 'editor', 'author']::public.member_role[]
  )
);

create policy "content_terms_read_visible"
on public.content_terms for select to anon, authenticated
using (
  exists (
    select 1 from public.contents c
    where c.id = content_terms.content_id
  )
);

create policy "content_terms_manage_editorial"
on public.content_terms for all to authenticated
using (private.can_modify_content(content_id))
with check (
  private.can_modify_content(content_id)
  and exists (
    select 1
    from public.contents c
    join public.terms t on t.site_id = c.site_id
    where c.id = content_terms.content_id
      and t.id = content_terms.term_id
  )
);

create policy "media_read_members"
on public.media_assets for select to authenticated
using (private.is_site_member(site_id));

create policy "media_create_contributors"
on public.media_assets for insert to authenticated
with check (
  uploaded_by = (select auth.uid())
  and private.has_site_role(
    site_id,
    array['owner', 'admin', 'editor', 'author', 'contributor']::public.member_role[]
  )
);

create policy "media_update_uploaders_or_editors"
on public.media_assets for update to authenticated
using (
  uploaded_by = (select auth.uid())
  or private.has_site_role(site_id, array['owner', 'admin', 'editor']::public.member_role[])
)
with check (
  uploaded_by = (select auth.uid())
  or private.has_site_role(site_id, array['owner', 'admin', 'editor']::public.member_role[])
);

create policy "media_delete_uploaders_or_editors"
on public.media_assets for delete to authenticated
using (
  uploaded_by = (select auth.uid())
  or private.has_site_role(site_id, array['owner', 'admin', 'editor']::public.member_role[])
);

create policy "domains_read_members"
on public.site_domains for select to authenticated
using (private.is_site_member(site_id));

create policy "domains_manage_admins"
on public.site_domains for all to authenticated
using (private.has_site_role(site_id, array['owner', 'admin']::public.member_role[]))
with check (private.has_site_role(site_id, array['owner', 'admin']::public.member_role[]));

create policy "nara_conversations_read_own"
on public.nara_conversations for select to authenticated
using (user_id = (select auth.uid()) and private.is_site_member(site_id));

create policy "nara_conversations_create_own"
on public.nara_conversations for insert to authenticated
with check (user_id = (select auth.uid()) and private.is_site_member(site_id));

create policy "nara_conversations_update_own"
on public.nara_conversations for update to authenticated
using (user_id = (select auth.uid()) and private.is_site_member(site_id))
with check (user_id = (select auth.uid()) and private.is_site_member(site_id));

create policy "nara_conversations_delete_own"
on public.nara_conversations for delete to authenticated
using (user_id = (select auth.uid()) and private.is_site_member(site_id));

create policy "nara_messages_read_own"
on public.nara_messages for select to authenticated
using (owner_id = (select auth.uid()) and private.owns_conversation(conversation_id));

create policy "nara_messages_create_user_only"
on public.nara_messages for insert to authenticated
with check (
  owner_id = (select auth.uid())
  and role = 'user'
  and private.owns_conversation(conversation_id)
);

create policy "nara_memories_read_allowed"
on public.nara_memories for select to authenticated
using (
  private.is_site_member(site_id)
  and (owner_user_id is null or owner_user_id = (select auth.uid()))
);

create policy "nara_memories_create_personal"
on public.nara_memories for insert to authenticated
with check (
  scope = 'user'
  and owner_user_id = (select auth.uid())
  and content_id is null
  and private.is_site_member(site_id)
);

create policy "nara_memories_update_personal"
on public.nara_memories for update to authenticated
using (
  scope = 'user'
  and owner_user_id = (select auth.uid())
  and private.is_site_member(site_id)
)
with check (
  scope = 'user'
  and owner_user_id = (select auth.uid())
  and content_id is null
  and private.is_site_member(site_id)
);

create policy "nara_memories_delete_personal"
on public.nara_memories for delete to authenticated
using (
  scope = 'user'
  and owner_user_id = (select auth.uid())
  and private.is_site_member(site_id)
);

create policy "audit_read_admins"
on public.audit_logs for select to authenticated
using (private.has_site_role(site_id, array['owner', 'admin']::public.member_role[]));

-- Explicit Data API privileges (new SQL tables are not auto-exposed).
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
grant usage on schema public to anon, authenticated;

grant select on public.sites, public.contents, public.terms, public.content_terms to anon;

grant select on public.profiles to authenticated;
grant update (display_name, avatar_url, bio, locale, timezone, onboarding_completed)
  on public.profiles to authenticated;

grant select, delete on public.sites to authenticated;
grant insert (owner_id, name, slug, description, status, is_public, theme_key, locale, timezone, settings, published_at)
  on public.sites to authenticated;
grant update (name, slug, description, status, is_public, theme_key, locale, timezone, settings, published_at)
  on public.sites to authenticated;

grant select, delete on public.site_members to authenticated;
grant update (role) on public.site_members to authenticated;
grant select, delete on public.site_invitations to authenticated;

grant select, delete on public.contents to authenticated;
grant insert (site_id, author_id, kind, title, slug, body_json, body_html, excerpt, featured_image_path, status, visibility, seo, scheduled_at, published_at)
  on public.contents to authenticated;
grant update (title, slug, body_json, body_html, excerpt, featured_image_path, status, visibility, seo, scheduled_at, published_at)
  on public.contents to authenticated;

grant select on public.content_revisions to authenticated;
grant insert (content_id, editor_id, snapshot, note) on public.content_revisions to authenticated;
grant select, delete on public.terms to authenticated;
grant insert (site_id, kind, name, slug, description) on public.terms to authenticated;
grant update (name, slug, description) on public.terms to authenticated;
grant select, insert, delete on public.content_terms to authenticated;
grant select, delete on public.media_assets to authenticated;
grant insert (site_id, uploaded_by, bucket_id, object_path, filename, mime_type, bytes, width, height, alt_text, metadata)
  on public.media_assets to authenticated;
grant update (filename, mime_type, bytes, width, height, alt_text, metadata)
  on public.media_assets to authenticated;
grant select, delete on public.site_domains to authenticated;
grant insert (site_id, hostname, is_primary) on public.site_domains to authenticated;
grant update (hostname, is_primary) on public.site_domains to authenticated;
grant select, delete on public.nara_conversations to authenticated;
grant insert (site_id, user_id, title, context) on public.nara_conversations to authenticated;
grant update (title, context) on public.nara_conversations to authenticated;
grant select on public.nara_messages to authenticated;
grant insert (conversation_id, owner_id, role, content, citations, model, token_count)
  on public.nara_messages to authenticated;
grant select, delete on public.nara_memories to authenticated;
grant insert (site_id, owner_user_id, content_id, scope, memory_key, memory_text, metadata, embedding)
  on public.nara_memories to authenticated;
grant update (memory_key, memory_text, metadata, embedding)
  on public.nara_memories to authenticated;
grant select on public.audit_logs to authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- Private site media. Paths must be: <site_id>/<user_id>/<filename>.
insert into storage.buckets (
  id, name, public, file_size_limit, allowed_mime_types
)
values (
  'site-media',
  'site-media',
  false,
  20971520,
  array[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif',
    'video/mp4', 'audio/mpeg', 'audio/ogg', 'application/pdf'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "site_media_read_members"
on storage.objects for select to authenticated
using (
  bucket_id = 'site-media'
  and private.is_site_member(((storage.foldername(name))[1])::uuid)
);

create policy "site_media_insert_contributors"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'site-media'
  and (storage.foldername(name))[2] = (select auth.uid())::text
  and private.has_site_role(
    ((storage.foldername(name))[1])::uuid,
    array['owner', 'admin', 'editor', 'author', 'contributor']::public.member_role[]
  )
);

create policy "site_media_update_owner_or_editor"
on storage.objects for update to authenticated
using (
  bucket_id = 'site-media'
  and (
    owner_id = (select auth.uid())::text
    or private.has_site_role(
      ((storage.foldername(name))[1])::uuid,
      array['owner', 'admin', 'editor']::public.member_role[]
    )
  )
)
with check (
  bucket_id = 'site-media'
  and (
    owner_id = (select auth.uid())::text
    or private.has_site_role(
      ((storage.foldername(name))[1])::uuid,
      array['owner', 'admin', 'editor']::public.member_role[]
    )
  )
);

create policy "site_media_delete_owner_or_editor"
on storage.objects for delete to authenticated
using (
  bucket_id = 'site-media'
  and (
    owner_id = (select auth.uid())::text
    or private.has_site_role(
      ((storage.foldername(name))[1])::uuid,
      array['owner', 'admin', 'editor']::public.member_role[]
    )
  )
);
