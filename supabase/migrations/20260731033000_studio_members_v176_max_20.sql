-- Studio Members v176: maximum 20 active + pending collaborators per site.
create or replace function private.site_collaborator_limit()
returns integer
language sql
immutable
set search_path = ''
as $$ select 20; $$;

create or replace function private.enforce_site_collaborator_limit_v176()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare current_total integer;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.site_id::text, 176));
  select
    (select count(*) from public.site_members sm where sm.site_id = new.site_id)
    +
    (select count(*) from public.site_invitations si where si.site_id = new.site_id and si.accepted_at is null and si.expires_at > pg_catalog.now())
  into current_total;
  if current_total >= private.site_collaborator_limit() then
    raise exception 'Batas anggota situs adalah % orang.', private.site_collaborator_limit() using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_site_member_limit_v176 on public.site_members;
create trigger enforce_site_member_limit_v176 before insert on public.site_members
for each row execute function private.enforce_site_collaborator_limit_v176();

drop trigger if exists enforce_site_invitation_limit_v176 on public.site_invitations;
create trigger enforce_site_invitation_limit_v176 before insert on public.site_invitations
for each row execute function private.enforce_site_collaborator_limit_v176();

create or replace function public.get_site_members_v176(target_site uuid)
returns table(
  member_id uuid,
  email text,
  display_name text,
  avatar_url text,
  role text,
  status text,
  joined_at timestamptz,
  invitation_id uuid,
  expires_at timestamptz
)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if auth.uid() is null or not private.has_site_role(target_site, array['owner'::public.member_role,'admin'::public.member_role]) then
    raise exception 'Anda tidak mempunyai izin mengelola anggota.' using errcode = '42501';
  end if;
  return query
  select sm.user_id, au.email::text, nullif(p.display_name,''), p.avatar_url, sm.role::text,
    'active'::text, sm.joined_at, null::uuid, null::timestamptz
  from public.site_members sm
  join auth.users au on au.id = sm.user_id
  left join public.profiles p on p.id = sm.user_id
  where sm.site_id = target_site
  union all
  select null::uuid, si.email, null::text, null::text, si.role::text,
    'pending'::text, si.created_at, si.id, si.expires_at
  from public.site_invitations si
  where si.site_id = target_site and si.accepted_at is null and si.expires_at > pg_catalog.now()
  order by joined_at asc;
end;
$$;

create or replace function public.invite_site_member_v176(
  target_site uuid,
  target_email text,
  target_role public.member_role default 'viewer'::public.member_role
)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  normalized_email text := lower(btrim(target_email));
  existing_user uuid;
  existing_invitation uuid;
  active_count integer;
  pending_count integer;
begin
  if auth.uid() is null or not private.has_site_role(target_site, array['owner'::public.member_role,'admin'::public.member_role]) then
    raise exception 'Anda tidak mempunyai izin mengundang anggota.' using errcode = '42501';
  end if;
  if normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or char_length(normalized_email) > 320 then
    raise exception 'Alamat email tidak valid.' using errcode = '22023';
  end if;
  if target_role not in ('admin'::public.member_role,'editor'::public.member_role,'author'::public.member_role,'viewer'::public.member_role) then
    raise exception 'Peran undangan tidak didukung.' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(target_site::text, 176));
  select count(*)::integer into active_count from public.site_members where site_id = target_site;
  select count(*)::integer into pending_count from public.site_invitations
    where site_id = target_site and accepted_at is null and expires_at > pg_catalog.now();
  select id into existing_user from auth.users where lower(email) = normalized_email limit 1;

  if existing_user is not null then
    if exists(select 1 from public.site_members where site_id = target_site and user_id = existing_user) then
      raise exception 'Pengguna tersebut sudah menjadi anggota situs.' using errcode = 'P0001';
    end if;
    if active_count + pending_count >= private.site_collaborator_limit() then
      raise exception 'Batas anggota situs adalah % orang.', private.site_collaborator_limit() using errcode = 'P0001';
    end if;
    delete from public.site_invitations where site_id = target_site and email = normalized_email and accepted_at is null;
    insert into public.site_members(site_id,user_id,role,invited_by)
      values(target_site,existing_user,target_role,auth.uid());
    return jsonb_build_object('status','active','email',normalized_email,'role',target_role::text,'limit',private.site_collaborator_limit());
  end if;

  select id into existing_invitation from public.site_invitations
    where site_id = target_site and email = normalized_email and accepted_at is null
    order by created_at desc limit 1;
  if existing_invitation is not null then
    update public.site_invitations set role=target_role, expires_at=pg_catalog.now()+interval '7 days',
      invited_by=auth.uid(), token_hash=encode(extensions.gen_random_bytes(32),'hex')
      where id=existing_invitation;
    return jsonb_build_object('status','pending','email',normalized_email,'role',target_role::text,'limit',private.site_collaborator_limit(),'renewed',true);
  end if;

  if active_count + pending_count >= private.site_collaborator_limit() then
    raise exception 'Batas anggota situs adalah % orang.', private.site_collaborator_limit() using errcode = 'P0001';
  end if;
  insert into public.site_invitations(site_id,email,role,token_hash,invited_by)
    values(target_site,normalized_email,target_role,encode(extensions.gen_random_bytes(32),'hex'),auth.uid());
  return jsonb_build_object('status','pending','email',normalized_email,'role',target_role::text,'limit',private.site_collaborator_limit(),'renewed',false);
end;
$$;

create or replace function public.update_site_member_role_v176(target_site uuid,target_user uuid,target_role public.member_role)
returns void language plpgsql security definer set search_path = ''
as $$
declare current_role public.member_role;
begin
  if auth.uid() is null or not private.has_site_role(target_site,array['owner'::public.member_role,'admin'::public.member_role]) then
    raise exception 'Anda tidak mempunyai izin mengubah peran.' using errcode='42501';
  end if;
  if target_role not in ('admin'::public.member_role,'editor'::public.member_role,'author'::public.member_role,'viewer'::public.member_role) then
    raise exception 'Peran tidak didukung.' using errcode='22023';
  end if;
  select role into current_role from public.site_members where site_id=target_site and user_id=target_user;
  if current_role is null then raise exception 'Anggota tidak ditemukan.' using errcode='P0001'; end if;
  if current_role='owner'::public.member_role then raise exception 'Peran pemilik tidak dapat diubah.' using errcode='P0001'; end if;
  if target_user=auth.uid() then raise exception 'Anda tidak dapat mengubah peran sendiri.' using errcode='P0001'; end if;
  update public.site_members set role=target_role,updated_at=pg_catalog.now() where site_id=target_site and user_id=target_user;
end;
$$;

create or replace function public.remove_site_member_v176(target_site uuid,target_user uuid)
returns void language plpgsql security definer set search_path = ''
as $$
declare current_role public.member_role;
begin
  if auth.uid() is null or not private.has_site_role(target_site,array['owner'::public.member_role,'admin'::public.member_role]) then
    raise exception 'Anda tidak mempunyai izin menghapus anggota.' using errcode='42501';
  end if;
  select role into current_role from public.site_members where site_id=target_site and user_id=target_user;
  if current_role is null then raise exception 'Anggota tidak ditemukan.' using errcode='P0001'; end if;
  if current_role='owner'::public.member_role then raise exception 'Pemilik situs tidak dapat dihapus.' using errcode='P0001'; end if;
  delete from public.site_members where site_id=target_site and user_id=target_user;
end;
$$;

create or replace function public.cancel_site_invitation_v176(target_site uuid,target_invitation uuid)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is null or not private.has_site_role(target_site,array['owner'::public.member_role,'admin'::public.member_role]) then
    raise exception 'Anda tidak mempunyai izin membatalkan undangan.' using errcode='42501';
  end if;
  delete from public.site_invitations where site_id=target_site and id=target_invitation;
end;
$$;

revoke all on function public.get_site_members_v176(uuid) from public;
revoke all on function public.invite_site_member_v176(uuid,text,public.member_role) from public;
revoke all on function public.update_site_member_role_v176(uuid,uuid,public.member_role) from public;
revoke all on function public.remove_site_member_v176(uuid,uuid) from public;
revoke all on function public.cancel_site_invitation_v176(uuid,uuid) from public;
grant execute on function public.get_site_members_v176(uuid) to authenticated;
grant execute on function public.invite_site_member_v176(uuid,text,public.member_role) to authenticated;
grant execute on function public.update_site_member_role_v176(uuid,uuid,public.member_role) to authenticated;
grant execute on function public.remove_site_member_v176(uuid,uuid) to authenticated;
grant execute on function public.cancel_site_invitation_v176(uuid,uuid) to authenticated;
