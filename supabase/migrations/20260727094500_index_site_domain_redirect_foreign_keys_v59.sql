create index if not exists site_domain_redirects_site_idx
  on public.site_domain_redirects(site_id);

create index if not exists site_domain_redirects_created_by_idx
  on public.site_domain_redirects(created_by)
  where created_by is not null;
