revoke insert, update, delete on public.site_domains from anon;
grant select on public.site_domains to anon;
grant select, insert, update, delete on public.site_domains to authenticated;

comment on table public.site_domains is
'Custom-domain registry. Direct user writes require authenticated table privileges and remain restricted by row-level security to site owners and admins.';
