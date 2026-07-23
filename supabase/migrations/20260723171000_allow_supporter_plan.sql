alter table public.profiles drop constraint if exists profiles_plan_check;
alter table public.profiles add constraint profiles_plan_check check (plan = any (array['free'::text,'pro'::text,'business'::text,'supporter'::text]));
