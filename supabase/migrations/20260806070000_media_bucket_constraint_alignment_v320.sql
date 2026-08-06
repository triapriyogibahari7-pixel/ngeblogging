-- Preserve the historical site-media bucket while aligning metadata writes with
-- the currently used site-public-media bucket.
alter table public.media_assets
  alter column bucket_id set default 'site-public-media';

alter table public.media_assets
  drop constraint if exists media_assets_bucket_id_check;

alter table public.media_assets
  add constraint media_assets_bucket_id_check
  check (bucket_id in ('site-media', 'site-public-media'));
