-- Batas faktual: satu pemilik maksimal 25 situs.
-- Guard UI tetap ada, tetapi trigger ini mencegah bypass melalui request langsung
-- dan menyerialkan pembuatan situs paralel untuk pemilik yang sama.

create or replace function public.enforce_owner_site_limit_v169()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  owned_sites bigint;
begin
  -- Mengunci transaksi pembuatan situs untuk owner yang sama sehingga dua INSERT
  -- paralel tidak dapat sama-sama membaca kuota 24 lalu menghasilkan situs ke-26.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(new.owner_id::text, 169)
  );

  select count(*)
    into owned_sites
    from public.sites
   where owner_id = new.owner_id;

  if owned_sites >= 25 then
    raise exception using
      errcode = 'P0001',
      message = 'SITE_LIMIT_REACHED_25: Setiap akun dapat memiliki maksimal 25 situs.';
  end if;

  return new;
end;
$$;

-- Fungsi trigger SECURITY DEFINER tidak menjadi endpoint RPC publik.
revoke all on function public.enforce_owner_site_limit_v169() from public;
revoke all on function public.enforce_owner_site_limit_v169() from anon;
revoke all on function public.enforce_owner_site_limit_v169() from authenticated;

drop trigger if exists enforce_owner_site_limit_v169 on public.sites;
create trigger enforce_owner_site_limit_v169
before insert on public.sites
for each row
execute function public.enforce_owner_site_limit_v169();

comment on function public.enforce_owner_site_limit_v169() is
  'Menolak pembuatan situs ke-26, termasuk INSERT paralel, untuk pemilik yang sama; authority site-policy-v169-20260730.';
