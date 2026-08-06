-- Members v311: explicit, transactional site ownership transfer.
-- Only the current owner can promote an existing active member to Owner.

create or replace function public.transfer_site_owner_v311(target_site uuid, target_user uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  request_user uuid := auth.uid();
  current_owner uuid;
  target_member_role public.member_role;
  target_owned_count integer;
begin
  if request_user is null then
    raise exception 'Silakan masuk untuk memindahkan Owner.' using errcode = '42501';
  end if;
  if target_site is null or target_user is null then
    raise exception 'Situs dan anggota wajib dipilih.' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(target_site::text, 311));
  select owner_id into current_owner from public.sites where id = target_site for update;
  if current_owner is null then
    raise exception 'Situs tidak ditemukan.' using errcode = 'P0001';
  end if;
  if current_owner <> request_user then
    raise exception 'Hanya Owner saat ini yang dapat memindahkan kepemilikan.' using errcode = '42501';
  end if;
  if target_user = current_owner then
    return jsonb_build_object('status','unchanged','owner_id',current_owner);
  end if;

  select role into target_member_role
    from public.site_members
   where site_id = target_site and user_id = target_user
   for update;
  if target_member_role is null then
    raise exception 'Anggota aktif tidak ditemukan.' using errcode = 'P0001';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(target_user::text, 312));
  select count(*)::integer into target_owned_count from public.sites where owner_id = target_user;
  if target_owned_count >= 25 then
    raise exception 'Owner baru sudah mencapai batas 25 situs.' using errcode = 'P0001';
  end if;

  update public.sites
     set owner_id = target_user,
         updated_at = pg_catalog.now()
   where id = target_site;

  update public.site_members
     set role = 'admin'::public.member_role,
         updated_at = pg_catalog.now()
   where site_id = target_site and user_id = current_owner;

  update public.site_members
     set role = 'owner'::public.member_role,
         updated_at = pg_catalog.now()
   where site_id = target_site and user_id = target_user;

  return jsonb_build_object(
    'status','transferred',
    'site_id',target_site,
    'previous_owner_id',current_owner,
    'owner_id',target_user,
    'previous_owner_role','admin'
  );
end;
$$;

revoke all on function public.transfer_site_owner_v311(uuid,uuid) from public;
revoke all on function public.transfer_site_owner_v311(uuid,uuid) from anon;
grant execute on function public.transfer_site_owner_v311(uuid,uuid) to authenticated;

comment on function public.transfer_site_owner_v311(uuid,uuid) is
  'Transfers one site to an existing active member. Current owner becomes admin; target owner must remain under the 25-site ownership limit.';
