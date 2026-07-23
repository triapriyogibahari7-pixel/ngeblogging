begin;

alter table public.site_domains
  add column if not exists provider text not null default 'cloudflare',
  add column if not exists provider_hostname_id text,
  add column if not exists provider_status text not null default 'pending',
  add column if not exists ssl_status text not null default 'pending',
  add column if not exists ownership_verification jsonb not null default '{}'::jsonb,
  add column if not exists ssl_validation jsonb not null default '[]'::jsonb,
  add column if not exists last_checked_at timestamptz,
  add column if not exists error_message text;

create unique index if not exists site_domains_provider_hostname_id_uq
  on public.site_domains(provider_hostname_id)
  where provider_hostname_id is not null;

create index if not exists site_domains_site_status_idx
  on public.site_domains(site_id,status,created_at desc);

create index if not exists site_domains_hostname_active_idx
  on public.site_domains(hostname)
  where status = 'active';

create or replace function private.enforce_site_account_quota()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  account_plan text := 'free';
  site_limit integer := 5;
  owned_count integer := 0;
begin
  select coalesce(p.plan::text,'free')
    into account_plan
    from public.profiles p
   where p.id = new.owner_id;

  if account_plan = 'pro' then
    site_limit := 25;
  else
    site_limit := 5;
  end if;

  select count(*)
    into owned_count
    from public.sites s
   where s.owner_id = new.owner_id;

  if owned_count >= site_limit then
    raise exception using
      errcode = 'P0001',
      message = format('Batas akun tercapai: paket %s mendukung maksimal %s situs.', account_plan, site_limit),
      hint = 'Hapus situs yang tidak dipakai atau gunakan paket dengan kuota lebih besar.';
  end if;

  return new;
end;
$$;

revoke all on function private.enforce_site_account_quota() from public, anon, authenticated;

drop trigger if exists sites_enforce_account_quota on public.sites;
create trigger sites_enforce_account_quota
before insert on public.sites
for each row execute function private.enforce_site_account_quota();

comment on function private.enforce_site_account_quota() is
  'Authoritative account quota: five owned sites for free/supporter accounts and twenty-five for pro accounts.';

comment on column public.site_domains.provider_hostname_id is
  'Cloudflare for SaaS custom hostname identifier. Never accepted from the browser as an authority.';

comment on column public.site_domains.ownership_verification is
  'Sanitized ownership verification instructions returned by the domain provider.';

commit;
