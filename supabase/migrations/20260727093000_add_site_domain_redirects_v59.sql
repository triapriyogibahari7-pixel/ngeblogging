create table if not exists public.site_domain_redirects (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete cascade,
  domain_id uuid not null references public.site_domains(id) on delete cascade,
  source_hostname text not null,
  target_url text not null,
  enabled boolean not null default true,
  locked boolean not null default false,
  permanent boolean not null default true,
  preserve_path boolean not null default true,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint site_domain_redirects_source_format check (
    source_hostname = lower(source_hostname)
    and length(source_hostname) between 4 and 253
    and source_hostname ~ '^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])$'
    and position('..' in source_hostname) = 0
  ),
  constraint site_domain_redirects_target_https check (
    target_url ~ '^https://[^[:space:]]+$'
  ),
  constraint site_domain_redirects_source_unique unique (source_hostname)
);

create index if not exists site_domain_redirects_domain_idx
  on public.site_domain_redirects(domain_id, created_at);

create index if not exists site_domain_redirects_active_source_idx
  on public.site_domain_redirects(source_hostname)
  where enabled = true;

create or replace function private.touch_site_domain_redirect_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists site_domain_redirects_touch_updated_at on public.site_domain_redirects;
create trigger site_domain_redirects_touch_updated_at
before update on public.site_domain_redirects
for each row execute function private.touch_site_domain_redirect_updated_at();

alter table public.site_domain_redirects enable row level security;

revoke all on public.site_domain_redirects from anon, authenticated;
grant select on public.site_domain_redirects to anon;
grant select, insert, update, delete on public.site_domain_redirects to authenticated;

drop policy if exists redirects_read_public_active on public.site_domain_redirects;
create policy redirects_read_public_active
on public.site_domain_redirects
for select
to anon
using (
  enabled
  and exists (
    select 1
    from public.site_domains d
    join public.sites s on s.id = d.site_id
    where d.id = site_domain_redirects.domain_id
      and d.site_id = site_domain_redirects.site_id
      and d.status = 'active'::domain_status
      and s.status = 'active'::site_status
      and s.is_public
  )
);

drop policy if exists redirects_read_members on public.site_domain_redirects;
create policy redirects_read_members
on public.site_domain_redirects
for select
to authenticated
using (private.is_site_member(site_id));

drop policy if exists redirects_insert_admins on public.site_domain_redirects;
create policy redirects_insert_admins
on public.site_domain_redirects
for insert
to authenticated
with check (
  private.has_site_role(site_id, array['owner'::member_role, 'admin'::member_role])
  and exists (
    select 1 from public.site_domains d
    where d.id = domain_id and d.site_id = site_id
  )
);

drop policy if exists redirects_update_admins on public.site_domain_redirects;
create policy redirects_update_admins
on public.site_domain_redirects
for update
to authenticated
using (private.has_site_role(site_id, array['owner'::member_role, 'admin'::member_role]))
with check (
  private.has_site_role(site_id, array['owner'::member_role, 'admin'::member_role])
  and exists (
    select 1 from public.site_domains d
    where d.id = domain_id and d.site_id = site_id
  )
);

drop policy if exists redirects_delete_admins on public.site_domain_redirects;
create policy redirects_delete_admins
on public.site_domain_redirects
for delete
to authenticated
using (private.has_site_role(site_id, array['owner'::member_role, 'admin'::member_role]));
