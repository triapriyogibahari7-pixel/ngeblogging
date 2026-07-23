alter table public.profiles
  add column if not exists website text;

grant select, update on public.profiles to authenticated;
