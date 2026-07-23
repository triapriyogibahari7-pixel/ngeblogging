alter table public.contents add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.site_theme_settings add column if not exists widgets jsonb not null default '[]'::jsonb;
alter table public.site_theme_versions add column if not exists widgets jsonb not null default '[]'::jsonb;

update storage.buckets
set public = true,
    file_size_limit = 52428800,
    allowed_mime_types = array[
      'image/jpeg','image/png','image/webp','image/gif','image/avif','image/svg+xml','image/heic','image/heif','image/tiff','image/bmp',
      'video/mp4','video/webm','video/quicktime','video/x-matroska','video/mpeg','video/ogg','video/3gpp',
      'audio/mpeg','audio/mp4','audio/wav','audio/x-wav','audio/ogg','audio/flac','audio/aac',
      'application/pdf','text/plain','text/markdown','text/csv','application/json','application/zip',
      'application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint','application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ]::text[]
where id = 'site-public-media';

create table if not exists public.nara_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  site_id uuid references public.sites(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 160),
  description text not null default '',
  instructions text not null default '',
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists nara_projects_user_updated_idx on public.nara_projects(user_id, updated_at desc);
alter table public.nara_projects enable row level security;
drop policy if exists "nara_projects_own_select" on public.nara_projects;
create policy "nara_projects_own_select" on public.nara_projects for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "nara_projects_own_insert" on public.nara_projects;
create policy "nara_projects_own_insert" on public.nara_projects for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "nara_projects_own_update" on public.nara_projects;
create policy "nara_projects_own_update" on public.nara_projects for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "nara_projects_own_delete" on public.nara_projects;
create policy "nara_projects_own_delete" on public.nara_projects for delete to authenticated using ((select auth.uid()) = user_id);
grant select,insert,update,delete on public.nara_projects to authenticated;

alter table public.nara_conversations add column if not exists project_id uuid references public.nara_projects(id) on delete set null;
alter table public.nara_conversations add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.nara_memories add column if not exists project_id uuid references public.nara_projects(id) on delete set null;
alter table public.nara_memories add column if not exists importance smallint not null default 3 check (importance between 1 and 5);
alter table public.nara_memories add column if not exists expires_at timestamptz;
alter table public.nara_messages add column if not exists attachments jsonb not null default '[]'::jsonb;
alter table public.nara_messages add column if not exists metadata jsonb not null default '{}'::jsonb;
create index if not exists nara_memories_project_idx on public.nara_memories(project_id, updated_at desc);

create table if not exists public.user_integrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  site_id uuid references public.sites(id) on delete cascade,
  provider text not null,
  display_name text not null default '',
  status text not null default 'pending' check (status in ('pending','connected','disabled','error')),
  scopes text[] not null default '{}'::text[],
  config jsonb not null default '{}'::jsonb,
  secret_reference text,
  last_checked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, site_id, provider)
);
alter table public.user_integrations enable row level security;
drop policy if exists "user_integrations_own_select" on public.user_integrations;
create policy "user_integrations_own_select" on public.user_integrations for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "user_integrations_own_insert" on public.user_integrations;
create policy "user_integrations_own_insert" on public.user_integrations for insert to authenticated with check ((select auth.uid()) = user_id and secret_reference is null);
drop policy if exists "user_integrations_own_update" on public.user_integrations;
create policy "user_integrations_own_update" on public.user_integrations for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id and secret_reference is null);
drop policy if exists "user_integrations_own_delete" on public.user_integrations;
create policy "user_integrations_own_delete" on public.user_integrations for delete to authenticated using ((select auth.uid()) = user_id);
grant select,insert,update,delete on public.user_integrations to authenticated;

create table if not exists public.integration_audit_logs (
  id bigint generated by default as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  integration_id uuid references public.user_integrations(id) on delete set null,
  action text not null,
  result text not null default 'success',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists integration_audit_user_idx on public.integration_audit_logs(user_id,created_at desc);
alter table public.integration_audit_logs enable row level security;
drop policy if exists "integration_audit_own_select" on public.integration_audit_logs;
create policy "integration_audit_own_select" on public.integration_audit_logs for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "integration_audit_own_insert" on public.integration_audit_logs;
create policy "integration_audit_own_insert" on public.integration_audit_logs for insert to authenticated with check ((select auth.uid()) = user_id);
grant select,insert on public.integration_audit_logs to authenticated;

create table if not exists public.billing_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null default 'paypal',
  provider_order_id text not null unique,
  plan text not null,
  amount numeric(12,2) not null,
  currency text not null default 'USD',
  status text not null default 'created',
  payer_email text,
  provider_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.billing_orders enable row level security;
drop policy if exists "billing_orders_own_select" on public.billing_orders;
create policy "billing_orders_own_select" on public.billing_orders for select to authenticated using ((select auth.uid()) = user_id);
grant select on public.billing_orders to authenticated;

create or replace function private.is_site_slug_available_internal(candidate text,excluding_site uuid default null)
returns boolean language plpgsql stable security definer set search_path=''
as $$
declare normalized text:=lower(trim(coalesce(candidate,'')));
begin
 if (select auth.uid()) is null then return false; end if;
 if char_length(normalized) not between 3 and 63
    or normalized !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    or normalized=any(array['account','admin','api','app','assets','auth','billing','cdn','community','dashboard','docs','help','login','mail','media','nara','ngeblogging','news','root','security','settings','smtp','static','status','studio','support','system','www']::text[])
 then return false; end if;
 return not exists(select 1 from public.sites s where s.slug=normalized and (excluding_site is null or s.id<>excluding_site));
end;$$;
revoke all on function private.is_site_slug_available_internal(text,uuid) from public,anon;
grant execute on function private.is_site_slug_available_internal(text,uuid) to authenticated;

create or replace function public.is_site_slug_available(candidate text,excluding_site uuid default null)
returns boolean language sql stable security invoker set search_path=''
as $$select private.is_site_slug_available_internal(candidate,excluding_site);$$;
revoke all on function public.is_site_slug_available(text,uuid) from public,anon;
grant execute on function public.is_site_slug_available(text,uuid) to authenticated;
