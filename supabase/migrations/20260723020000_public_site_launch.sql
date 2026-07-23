-- Public delivery permissions for launched sites.
-- Only active public sites, published theme fields, active domains, and
-- already-published content can be read anonymously.

create policy "theme_settings_read_public"
on public.site_theme_settings for select to anon
using (
  exists (
    select 1
    from public.sites s
    where s.id = site_theme_settings.site_id
      and s.status = 'active'
      and s.is_public
  )
);

grant select (site_id, active_theme_id, published_config, code, updated_at)
  on public.site_theme_settings to anon;

create policy "domains_read_public_active"
on public.site_domains for select to anon
using (
  status = 'active'
  and exists (
    select 1
    from public.sites s
    where s.id = site_domains.site_id
      and s.status = 'active'
      and s.is_public
  )
);

grant select (site_id, hostname, status, is_primary)
  on public.site_domains to anon;
