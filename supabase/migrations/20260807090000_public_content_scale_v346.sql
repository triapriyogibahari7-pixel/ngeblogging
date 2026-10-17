-- Public content publication reliability and scale indexes for v346.
-- Supports 12 active sites per account and cursor-based public reads for sites with
-- up to 100,000 published articles without widening anonymous table scans.

create index if not exists contents_public_slug_lookup_v346
  on public.contents (site_id, slug, status, visibility, updated_at desc, id desc)
  include (kind, title, published_at)
  where status = 'published' and visibility = 'public';

create index if not exists contents_public_article_feed_v346
  on public.contents (site_id, published_at desc, id desc)
  include (kind, title, slug, excerpt, featured_image_path, metadata, seo, updated_at)
  where kind = 'article' and status = 'published' and visibility = 'public';

create index if not exists contents_public_page_menu_v346
  on public.contents (site_id, ((metadata->>'menuOrder')), title, id)
  include (slug, excerpt, metadata, published_at, updated_at)
  where kind = 'page' and status = 'published' and visibility = 'public';

create index if not exists contents_studio_site_kind_status_cursor_v346
  on public.contents (site_id, kind, status, updated_at desc, id desc)
  include (title, slug, visibility, excerpt, featured_image_path, published_at, scheduled_at, created_at);

create index if not exists sites_owner_active_capacity_v346
  on public.sites (owner_id, status, created_at desc, id desc)
  where status <> 'archived';
