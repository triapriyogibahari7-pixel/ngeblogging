create or replace function private.sync_site_custom_domain_from_domains()
returns trigger
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  target_site_id uuid;
  previous_hostname text;
  next_hostname text;
begin
  target_site_id := coalesce(new.site_id, old.site_id);
  previous_hostname := case when tg_op = 'INSERT' then null else old.hostname end;

  if tg_op <> 'DELETE'
     and new.status = 'active'::domain_status
     and new.is_primary is true then
    update public.sites
       set custom_domain = new.hostname,
           updated_at = now()
     where id = new.site_id
       and custom_domain is distinct from new.hostname;
    return new;
  end if;

  if tg_op = 'DELETE'
     or previous_hostname is distinct from coalesce(new.hostname, previous_hostname)
     or (tg_op = 'UPDATE' and (new.status <> 'active'::domain_status or new.is_primary is not true)) then
    select d.hostname
      into next_hostname
      from public.site_domains d
     where d.site_id = target_site_id
       and d.status = 'active'::domain_status
       and d.is_primary is true
       and (tg_op <> 'DELETE' or d.id <> old.id)
     order by d.verified_at desc nulls last, d.updated_at desc
     limit 1;

    update public.sites
       set custom_domain = next_hostname,
           updated_at = now()
     where id = target_site_id
       and (
         custom_domain = previous_hostname
         or custom_domain is null
         or not exists (
           select 1
             from public.site_domains active_domain
            where active_domain.site_id = target_site_id
              and active_domain.hostname = public.sites.custom_domain
              and active_domain.status = 'active'::domain_status
              and active_domain.is_primary is true
         )
       );
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists sync_site_custom_domain_from_domains on public.site_domains;
create trigger sync_site_custom_domain_from_domains
after insert or update of status, is_primary, hostname or delete
on public.site_domains
for each row
execute function private.sync_site_custom_domain_from_domains();

comment on function private.sync_site_custom_domain_from_domains() is
'Keeps sites.custom_domain synchronized with the one active primary site_domains row so managed subdomains can redirect safely to the canonical custom domain.';
