begin;

-- Table privileges and RLS are separate in PostgreSQL. The policies already
-- restrict every operation by account, site membership, role, author, status,
-- and visibility; authenticated users still need the underlying CRUD grants.
grant select, insert, update, delete on public.contents to authenticated;
grant select on public.contents to anon;

comment on table public.contents is
  'Ngeblogging Posts and Pages. Authenticated CRUD is always constrained by row-level security policies.';

commit;
