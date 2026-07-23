begin;

-- Media uploads write the object to Supabase Storage and then persist metadata
-- in public.media_assets. RLS already limits create/update/delete by membership,
-- uploader, and editorial role; the table privileges are still required.
grant select, insert, update, delete on public.media_assets to authenticated;

comment on table public.media_assets is
  'Metadata for Ngeblogging cloud media. Authenticated operations remain constrained by media RLS policies.';

commit;
