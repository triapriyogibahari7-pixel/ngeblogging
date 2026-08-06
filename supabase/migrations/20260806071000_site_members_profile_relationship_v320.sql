-- site_members has two user UUID columns. The member row embeds profiles through
-- user_id, so invited_by must point at auth.users to keep the profiles relation
-- unambiguous for PostgREST while retaining referential integrity.
alter table public.site_members
  drop constraint if exists site_members_invited_by_fkey;

alter table public.site_members
  add constraint site_members_invited_by_fkey
  foreign key (invited_by) references auth.users(id) on delete set null;
