create index if not exists site_comment_settings_updated_by_idx on public.site_comment_settings(updated_by) where updated_by is not null;
create index if not exists site_comments_parent_idx on public.site_comments(parent_id) where parent_id is not null;
create index if not exists site_comments_author_user_idx on public.site_comments(author_user_id) where author_user_id is not null;
create index if not exists site_comments_owner_read_by_idx on public.site_comments(owner_read_by) where owner_read_by is not null;
create index if not exists site_comments_replied_by_idx on public.site_comments(replied_by) where replied_by is not null;
create index if not exists site_comments_moderated_by_idx on public.site_comments(moderated_by) where moderated_by is not null;

drop policy if exists site_comment_settings_direct_access_denied on public.site_comment_settings;
create policy site_comment_settings_direct_access_denied on public.site_comment_settings for all to anon, authenticated using (false) with check (false);
drop policy if exists site_comments_direct_access_denied on public.site_comments;
create policy site_comments_direct_access_denied on public.site_comments for all to anon, authenticated using (false) with check (false);
drop policy if exists site_comment_reactions_direct_access_denied on public.site_comment_reactions;
create policy site_comment_reactions_direct_access_denied on public.site_comment_reactions for all to anon, authenticated using (false) with check (false);
