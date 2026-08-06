-- v312 security hardening: Studio member management RPCs are authenticated-only.
revoke execute on function public.get_site_members_v176(uuid) from anon, public;
revoke execute on function public.get_site_member_quota(uuid) from anon, public;
revoke execute on function public.invite_site_member_v176(uuid,text,public.member_role) from anon, public;
revoke execute on function public.update_site_member_role_v176(uuid,uuid,public.member_role) from anon, public;
revoke execute on function public.remove_site_member_v176(uuid,uuid) from anon, public;
revoke execute on function public.cancel_site_invitation_v176(uuid,uuid) from anon, public;
revoke execute on function public.transfer_site_owner_v312(uuid,uuid) from anon, public;

grant execute on function public.get_site_members_v176(uuid) to authenticated;
grant execute on function public.get_site_member_quota(uuid) to authenticated;
grant execute on function public.invite_site_member_v176(uuid,text,public.member_role) to authenticated;
grant execute on function public.update_site_member_role_v176(uuid,uuid,public.member_role) to authenticated;
grant execute on function public.remove_site_member_v176(uuid,uuid) to authenticated;
grant execute on function public.cancel_site_invitation_v176(uuid,uuid) to authenticated;
grant execute on function public.transfer_site_owner_v312(uuid,uuid) to authenticated;
