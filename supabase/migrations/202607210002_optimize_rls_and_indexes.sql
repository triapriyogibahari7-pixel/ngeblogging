-- Follow-up from Supabase database advisors: cover foreign keys and avoid
-- duplicate permissive SELECT policies for authenticated users.

create index audit_logs_actor_idx on public.audit_logs (actor_id);
create index revisions_editor_idx on public.content_revisions (editor_id);
create index content_terms_term_idx on public.content_terms (term_id, content_id);
create index media_uploaded_by_idx on public.media_assets (uploaded_by);
create index conversations_site_idx on public.nara_conversations (site_id, updated_at desc);
create index memories_content_idx on public.nara_memories (content_id) where content_id is not null;
create index memories_owner_idx on public.nara_memories (owner_user_id) where owner_user_id is not null;
create index messages_owner_idx on public.nara_messages (owner_id, created_at desc);
create index invitations_inviter_idx on public.site_invitations (invited_by);
create index members_inviter_idx on public.site_members (invited_by) where invited_by is not null;

drop policy "sites_read_public" on public.sites;
drop policy "sites_read_members" on public.sites;
create policy "sites_read_public"
on public.sites for select to anon
using (status = 'active' and is_public);
create policy "sites_read_authenticated"
on public.sites for select to authenticated
using ((status = 'active' and is_public) or private.is_site_member(id));

drop policy "contents_read_published" on public.contents;
drop policy "contents_read_members" on public.contents;
create policy "contents_read_published"
on public.contents for select to anon
using (
  status = 'published'
  and visibility = 'public'
  and exists (
    select 1 from public.sites s
    where s.id = contents.site_id
      and s.status = 'active'
      and s.is_public
  )
);
create policy "contents_read_authenticated"
on public.contents for select to authenticated
using (
  private.is_site_member(site_id)
  or (
    status = 'published'
    and visibility = 'public'
    and exists (
      select 1 from public.sites s
      where s.id = contents.site_id
        and s.status = 'active'
        and s.is_public
    )
  )
);

drop policy "terms_read_public" on public.terms;
drop policy "terms_read_members" on public.terms;
drop policy "terms_manage_editorial" on public.terms;
create policy "terms_read_public"
on public.terms for select to anon
using (
  exists (
    select 1 from public.sites s
    where s.id = terms.site_id and s.status = 'active' and s.is_public
  )
);
create policy "terms_read_authenticated"
on public.terms for select to authenticated
using (
  private.is_site_member(site_id)
  or exists (
    select 1 from public.sites s
    where s.id = terms.site_id and s.status = 'active' and s.is_public
  )
);
create policy "terms_insert_editorial"
on public.terms for insert to authenticated
with check (
  private.has_site_role(
    site_id,
    array['owner', 'admin', 'editor', 'author']::public.member_role[]
  )
);
create policy "terms_update_editorial"
on public.terms for update to authenticated
using (
  private.has_site_role(
    site_id,
    array['owner', 'admin', 'editor', 'author']::public.member_role[]
  )
)
with check (
  private.has_site_role(
    site_id,
    array['owner', 'admin', 'editor', 'author']::public.member_role[]
  )
);
create policy "terms_delete_editorial"
on public.terms for delete to authenticated
using (
  private.has_site_role(
    site_id,
    array['owner', 'admin', 'editor', 'author']::public.member_role[]
  )
);

drop policy "content_terms_manage_editorial" on public.content_terms;
create policy "content_terms_insert_editorial"
on public.content_terms for insert to authenticated
with check (
  private.can_modify_content(content_id)
  and exists (
    select 1
    from public.contents c
    join public.terms t on t.site_id = c.site_id
    where c.id = content_terms.content_id
      and t.id = content_terms.term_id
  )
);
create policy "content_terms_delete_editorial"
on public.content_terms for delete to authenticated
using (private.can_modify_content(content_id));

drop policy "domains_manage_admins" on public.site_domains;
create policy "domains_insert_admins"
on public.site_domains for insert to authenticated
with check (private.has_site_role(site_id, array['owner', 'admin']::public.member_role[]));
create policy "domains_update_admins"
on public.site_domains for update to authenticated
using (private.has_site_role(site_id, array['owner', 'admin']::public.member_role[]))
with check (private.has_site_role(site_id, array['owner', 'admin']::public.member_role[]));
create policy "domains_delete_admins"
on public.site_domains for delete to authenticated
using (private.has_site_role(site_id, array['owner', 'admin']::public.member_role[]));
