-- Complimentary Nara entitlement for the explicitly authorized owner only.
-- Does not grant platform administrator privileges or change other users.
-- Existing usage limits and provider availability remain unchanged.
do $$
declare
  target_user_id uuid;
  affected integer;
begin
  select id into strict target_user_id
  from auth.users
  where lower(email) = 'triapriyogibahari7@gmail.com'
    and email_confirmed_at is not null;

  update public.profiles
  set plan = 'business', plan_expires_at = null
  where id = target_user_id;

  get diagnostics affected = row_count;
  if affected <> 1 then
    raise exception 'Expected exactly one owner profile; no entitlement granted';
  end if;
end;
$$;
