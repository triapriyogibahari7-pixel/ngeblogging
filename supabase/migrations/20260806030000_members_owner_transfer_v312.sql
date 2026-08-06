-- Studio Members v312: atomic owner transfer used by the five-role member menu.
-- Owner transfer is intentionally separate from update_site_member_role_v176 so
-- Admins cannot promote themselves or another member to owner.
create or replace function public.transfer_site_owner_v312(target_site uuid,target_user uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_owner uuid;
  target_role public.member_role;
begin
  if auth.uid() is null then
    raise exception 'Sesi pengguna tidak tersedia.' using errcode='42501';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(target_site::text, 312));

  select owner_id into current_owner
  from public.sites
  where id = target_site
  for update;

  if current_owner is null then
    raise exception 'Situs tidak ditemukan.' using errcode='P0001';
  end if;
  if current_owner <> auth.uid() then
    raise exception 'Hanya Owner saat ini yang dapat memindahkan kepemilikan situs.' using errcode='42501';
  end if;
  if target_user = current_owner then
    return pg_catalog.jsonb_build_object('status','unchanged','owner_id',current_owner,'previous_owner_id',current_owner);
  end if;

  select role into target_role
  from public.site_members
  where site_id = target_site and user_id = target_user
  for update;

  if target_role is null then
    raise exception 'Anggota tujuan tidak ditemukan atau undangan belum diterima.' using errcode='P0001';
  end if;

  update public.site_members
  set role='admin'::public.member_role, updated_at=pg_catalog.now()
  where site_id=target_site and user_id=current_owner;

  update public.site_members
  set role='owner'::public.member_role, updated_at=pg_catalog.now()
  where site_id=target_site and user_id=target_user;

  update public.sites
  set owner_id=target_user, updated_at=pg_catalog.now()
  where id=target_site;

  return pg_catalog.jsonb_build_object(
    'status','transferred',
    'owner_id',target_user,
    'previous_owner_id',current_owner,
    'previous_owner_role','admin'
  );
end;
$$;

revoke all on function public.transfer_site_owner_v312(uuid,uuid) from public;
revoke execute on function public.transfer_site_owner_v312(uuid,uuid) from anon;
grant execute on function public.transfer_site_owner_v312(uuid,uuid) to authenticated;
