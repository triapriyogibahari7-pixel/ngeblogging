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
  if tg_op = 'DELETE' then
    target_site_id := old.site_id;
    previous_hostname := old.hostname;
  else
    target_site_id := new.site_id;
    previous_hostname := case when tg_op = 'INSERT' then null else old.hostname end;
  end if;

  if tg_op <> 'DELETE' then
    if new.status = 'active'::domain_status and new.is_primary is true then
      update public.sites
         set custom_domain = new.hostname, updated_at = now()
       where id = new.site_id
         and custom_domain is distinct from new.hostname;
      return new;
    end if;
  end if;

  -- An additional domain must not clear an unrelated/free-site mapping.
  if previous_hostname is not null then
    select d.hostname into next_hostname
      from public.site_domains d
     where d.site_id = target_site_id
       and d.status = 'active'::domain_status
       and d.is_primary is true
     order by d.verified_at desc nulls last, d.updated_at desc
     limit 1;

    update public.sites
       set custom_domain = next_hostname, updated_at = now()
     where id = target_site_id
       and custom_domain = previous_hostname
       and custom_domain is distinct from next_hostname;
  end if;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

comment on function private.sync_site_custom_domain_from_domains() is
'Explicit active primary domains retain canonical mapping behavior. Additional-domain updates and removals may only replace their own existing mapping, never an unrelated or free-site address.';
