-- Ngeblogging comments platform v93
-- Public submissions are accepted only through narrowly scoped SECURITY DEFINER RPCs.
-- Dashboard moderation requires an authenticated owner/admin/editor of the active site.

create table if not exists public.site_comment_settings (
  site_id uuid primary key references public.sites(id) on delete cascade,
  enabled boolean not null default true,
  require_approval boolean not null default true,
  allow_guests boolean not null default true,
  require_email boolean not null default true,
  emoji_enabled boolean not null default true,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.site_comments (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete cascade,
  content_id uuid not null references public.contents(id) on delete cascade,
  parent_id uuid references public.site_comments(id) on delete cascade,
  author_user_id uuid references auth.users(id) on delete set null,
  author_name text not null,
  author_email text,
  author_website text,
  body text not null,
  mood_emoji text,
  status text not null default 'pending',
  is_admin_reply boolean not null default false,
  visitor_hash text,
  request_path text,
  country_code text,
  device_type text,
  user_agent text,
  owner_read_at timestamptz,
  owner_read_by uuid references auth.users(id) on delete set null,
  replied_at timestamptz,
  replied_by uuid references auth.users(id) on delete set null,
  moderated_at timestamptz,
  moderated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint site_comments_author_name_length check (char_length(btrim(author_name)) between 1 and 80),
  constraint site_comments_body_length check (char_length(btrim(body)) between 1 and 4000),
  constraint site_comments_status_check check (status in ('pending','approved','hidden','spam')),
  constraint site_comments_mood_check check (mood_emoji is null or mood_emoji in ('😀','😃','😄','😁','😊','😍','🥰','😎','🤩','😂','😅','😉','🤗','🤔','😮','😢','😭','😡')),
  constraint site_comments_country_check check (country_code is null or country_code ~ '^[A-Z]{2}$'),
  constraint site_comments_device_check check (device_type is null or device_type in ('mobile','tablet','desktop','tv','unknown')),
  constraint site_comments_reply_shape check (
    (parent_id is null and is_admin_reply = false)
    or (parent_id is not null and is_admin_reply = true and author_user_id is not null)
  )
);

create table if not exists public.site_comment_reactions (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.site_comments(id) on delete cascade,
  visitor_hash text not null,
  emoji text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint site_comment_reactions_emoji_check check (emoji in ('😀','😍','😂','😮','😢','😡','👍','❤️','🎉')),
  constraint site_comment_reactions_visitor_length check (char_length(visitor_hash) between 16 and 128),
  unique (comment_id, visitor_hash)
);

create index if not exists site_comments_site_created_idx
  on public.site_comments(site_id, created_at desc);
create index if not exists site_comments_content_status_created_idx
  on public.site_comments(content_id, status, created_at asc);
create index if not exists site_comments_moderation_idx
  on public.site_comments(site_id, status, owner_read_at, replied_at, created_at desc)
  where parent_id is null;
create index if not exists site_comments_visitor_rate_idx
  on public.site_comments(site_id, visitor_hash, created_at desc)
  where visitor_hash is not null and parent_id is null;
create index if not exists site_comment_reactions_comment_idx
  on public.site_comment_reactions(comment_id, emoji);

alter table public.site_comment_settings enable row level security;
alter table public.site_comments enable row level security;
alter table public.site_comment_reactions enable row level security;

revoke all on public.site_comment_settings from anon, authenticated;
revoke all on public.site_comments from anon, authenticated;
revoke all on public.site_comment_reactions from anon, authenticated;

insert into public.site_comment_settings(site_id)
select id from public.sites
on conflict (site_id) do nothing;

create or replace function private.create_default_comment_settings()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.site_comment_settings(site_id)
  values (new.id)
  on conflict (site_id) do nothing;
  return new;
end;
$$;

drop trigger if exists sites_create_comment_settings on public.sites;
create trigger sites_create_comment_settings
after insert on public.sites
for each row execute function private.create_default_comment_settings();

drop trigger if exists site_comment_settings_set_updated_at on public.site_comment_settings;
create trigger site_comment_settings_set_updated_at
before update on public.site_comment_settings
for each row execute function private.set_updated_at();

drop trigger if exists site_comments_set_updated_at on public.site_comments;
create trigger site_comments_set_updated_at
before update on public.site_comments
for each row execute function private.set_updated_at();

drop trigger if exists site_comment_reactions_set_updated_at on public.site_comment_reactions;
create trigger site_comment_reactions_set_updated_at
before update on public.site_comment_reactions
for each row execute function private.set_updated_at();

create or replace function private.can_moderate_site_comments(target_site uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select auth.uid() is not null
    and private.has_site_role(
      target_site,
      array['owner'::public.member_role,'admin'::public.member_role,'editor'::public.member_role]
    );
$$;

create or replace function public.get_site_comment_dashboard(target_site uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  settings_payload jsonb;
  comments_payload jsonb;
  counts_payload jsonb;
begin
  if not private.can_moderate_site_comments(target_site) then
    raise exception 'COMMENT_MODERATION_FORBIDDEN' using errcode = '42501';
  end if;

  insert into public.site_comment_settings(site_id)
  values (target_site)
  on conflict (site_id) do nothing;

  select to_jsonb(s) - 'updated_by'
    into settings_payload
  from public.site_comment_settings s
  where s.site_id = target_site;

  select coalesce(jsonb_agg(item order by item_created_at desc), '[]'::jsonb)
    into comments_payload
  from (
    select
      c.created_at as item_created_at,
      jsonb_build_object(
        'id', c.id,
        'siteId', c.site_id,
        'contentId', c.content_id,
        'parentId', c.parent_id,
        'authorUserId', c.author_user_id,
        'authorName', c.author_name,
        'authorEmail', c.author_email,
        'authorWebsite', c.author_website,
        'body', c.body,
        'moodEmoji', c.mood_emoji,
        'status', c.status,
        'isAdminReply', c.is_admin_reply,
        'requestPath', c.request_path,
        'countryCode', c.country_code,
        'deviceType', c.device_type,
        'userAgent', c.user_agent,
        'ownerReadAt', c.owner_read_at,
        'repliedAt', c.replied_at,
        'createdAt', c.created_at,
        'updatedAt', c.updated_at,
        'content', jsonb_build_object('title', co.title, 'slug', co.slug, 'kind', co.kind),
        'reactions', coalesce((
          select jsonb_object_agg(r.emoji, r.total)
          from (
            select cr.emoji, count(*)::integer as total
            from public.site_comment_reactions cr
            where cr.comment_id = c.id
            group by cr.emoji
          ) r
        ), '{}'::jsonb)
      ) as item
    from public.site_comments c
    join public.contents co on co.id = c.content_id
    where c.site_id = target_site
  ) rows;

  select jsonb_build_object(
    'total', count(*) filter (where parent_id is null),
    'unread', count(*) filter (where parent_id is null and owner_read_at is null),
    'unreplied', count(*) filter (where parent_id is null and replied_at is null and status = 'approved'),
    'pending', count(*) filter (where parent_id is null and status = 'pending'),
    'approved', count(*) filter (where parent_id is null and status = 'approved'),
    'hidden', count(*) filter (where parent_id is null and status = 'hidden'),
    'spam', count(*) filter (where parent_id is null and status = 'spam')
  ) into counts_payload
  from public.site_comments
  where site_id = target_site;

  return jsonb_build_object(
    'release', 'comments-v93',
    'settings', coalesce(settings_payload, '{}'::jsonb),
    'counts', coalesce(counts_payload, '{}'::jsonb),
    'comments', comments_payload
  );
end;
$$;

create or replace function public.update_site_comment_settings(
  target_site uuid,
  comments_enabled boolean,
  approval_required boolean,
  guests_allowed boolean,
  email_required boolean,
  emojis_enabled boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  result public.site_comment_settings;
begin
  if not private.can_moderate_site_comments(target_site) then
    raise exception 'COMMENT_SETTINGS_FORBIDDEN' using errcode = '42501';
  end if;

  insert into public.site_comment_settings(
    site_id, enabled, require_approval, allow_guests, require_email, emoji_enabled, updated_by
  ) values (
    target_site,
    coalesce(comments_enabled, true),
    coalesce(approval_required, true),
    coalesce(guests_allowed, true),
    coalesce(email_required, true),
    coalesce(emojis_enabled, true),
    auth.uid()
  )
  on conflict (site_id) do update set
    enabled = excluded.enabled,
    require_approval = excluded.require_approval,
    allow_guests = excluded.allow_guests,
    require_email = excluded.require_email,
    emoji_enabled = excluded.emoji_enabled,
    updated_by = auth.uid()
  returning * into result;

  return to_jsonb(result) - 'updated_by';
end;
$$;

create or replace function public.moderate_site_comment(target_comment uuid, moderation_action text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target public.site_comments;
  action_name text := lower(btrim(coalesce(moderation_action, '')));
begin
  select * into target from public.site_comments where id = target_comment;
  if not found then raise exception 'COMMENT_NOT_FOUND' using errcode = 'P0002'; end if;
  if not private.can_moderate_site_comments(target.site_id) then
    raise exception 'COMMENT_MODERATION_FORBIDDEN' using errcode = '42501';
  end if;

  if action_name = 'delete' then
    delete from public.site_comments where id = target_comment;
    return jsonb_build_object('deleted', true, 'id', target_comment);
  elsif action_name = 'read' then
    update public.site_comments set owner_read_at = now(), owner_read_by = auth.uid() where id = target_comment;
  elsif action_name = 'unread' then
    update public.site_comments set owner_read_at = null, owner_read_by = null where id = target_comment;
  elsif action_name in ('approve','approved') then
    update public.site_comments set status = 'approved', moderated_at = now(), moderated_by = auth.uid(), owner_read_at = coalesce(owner_read_at, now()), owner_read_by = coalesce(owner_read_by, auth.uid()) where id = target_comment;
  elsif action_name in ('pending','hide','hidden','spam') then
    update public.site_comments set status = case action_name when 'hide' then 'hidden' else action_name end, moderated_at = now(), moderated_by = auth.uid(), owner_read_at = coalesce(owner_read_at, now()), owner_read_by = coalesce(owner_read_by, auth.uid()) where id = target_comment;
  else
    raise exception 'COMMENT_ACTION_INVALID' using errcode = '22023';
  end if;

  return jsonb_build_object('updated', true, 'id', target_comment, 'action', action_name);
end;
$$;

create or replace function public.reply_to_site_comment(target_comment uuid, reply_body text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  parent_comment public.site_comments;
  reply_record public.site_comments;
  responder_name text;
  clean_body text := btrim(coalesce(reply_body, ''));
begin
  if char_length(clean_body) < 1 or char_length(clean_body) > 4000 then
    raise exception 'COMMENT_REPLY_INVALID' using errcode = '22023';
  end if;

  select * into parent_comment
  from public.site_comments
  where id = target_comment and parent_id is null and is_admin_reply = false;
  if not found then raise exception 'COMMENT_NOT_FOUND' using errcode = 'P0002'; end if;
  if not private.can_moderate_site_comments(parent_comment.site_id) then
    raise exception 'COMMENT_REPLY_FORBIDDEN' using errcode = '42501';
  end if;

  select nullif(btrim(display_name), '') into responder_name
  from public.profiles where id = auth.uid();
  responder_name := coalesce(responder_name, 'Tim situs');

  insert into public.site_comments(
    site_id, content_id, parent_id, author_user_id, author_name, body,
    status, is_admin_reply, owner_read_at, owner_read_by, moderated_at, moderated_by
  ) values (
    parent_comment.site_id, parent_comment.content_id, parent_comment.id, auth.uid(), responder_name, clean_body,
    'approved', true, now(), auth.uid(), now(), auth.uid()
  ) returning * into reply_record;

  update public.site_comments
  set replied_at = now(), replied_by = auth.uid(), owner_read_at = coalesce(owner_read_at, now()), owner_read_by = coalesce(owner_read_by, auth.uid())
  where id = parent_comment.id;

  return jsonb_build_object(
    'id', reply_record.id,
    'parentId', reply_record.parent_id,
    'authorName', reply_record.author_name,
    'body', reply_record.body,
    'status', reply_record.status,
    'isAdminReply', true,
    'createdAt', reply_record.created_at
  );
end;
$$;

create or replace function public.submit_site_comment(
  target_site uuid,
  target_content uuid,
  commenter_name text,
  commenter_email text,
  commenter_website text,
  comment_body text,
  mood text,
  visitor_token text,
  request_path text,
  request_country text,
  request_device text,
  request_user_agent text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  settings_record public.site_comment_settings;
  content_record public.contents;
  clean_name text := btrim(coalesce(commenter_name, ''));
  clean_email text := lower(btrim(coalesce(commenter_email, '')));
  clean_website text := btrim(coalesce(commenter_website, ''));
  clean_body text := btrim(coalesce(comment_body, ''));
  clean_mood text := nullif(btrim(coalesce(mood, '')), '');
  new_status text;
  result public.site_comments;
  comments_allowed boolean;
begin
  if char_length(visitor_token) < 16 or char_length(visitor_token) > 128 then
    raise exception 'COMMENT_VISITOR_INVALID' using errcode = '22023';
  end if;

  insert into public.site_comment_settings(site_id)
  values (target_site)
  on conflict (site_id) do nothing;

  select * into settings_record from public.site_comment_settings where site_id = target_site;
  if not settings_record.enabled or not settings_record.allow_guests then
    raise exception 'COMMENTS_DISABLED' using errcode = '42501';
  end if;

  select c.* into content_record
  from public.contents c
  join public.sites s on s.id = c.site_id
  where c.id = target_content
    and c.site_id = target_site
    and c.status = 'published'
    and c.visibility = 'public'
    and s.status = 'active'
    and s.is_public = true;
  if not found then raise exception 'COMMENT_CONTENT_NOT_FOUND' using errcode = 'P0002'; end if;

  comments_allowed := case lower(coalesce(content_record.metadata->>'commentsEnabled', ''))
    when 'true' then true
    when 'false' then false
    else content_record.kind <> 'page'::public.content_kind
  end;
  if not comments_allowed then raise exception 'COMMENTS_DISABLED_FOR_CONTENT' using errcode = '42501'; end if;

  if char_length(clean_name) < 1 or char_length(clean_name) > 80 then raise exception 'COMMENT_NAME_INVALID' using errcode = '22023'; end if;
  if char_length(clean_body) < 1 or char_length(clean_body) > 4000 then raise exception 'COMMENT_BODY_INVALID' using errcode = '22023'; end if;
  if settings_record.require_email and clean_email = '' then raise exception 'COMMENT_EMAIL_REQUIRED' using errcode = '22023'; end if;
  if clean_email <> '' and clean_email !~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then raise exception 'COMMENT_EMAIL_INVALID' using errcode = '22023'; end if;
  if clean_website <> '' and clean_website !~* '^https?://[^[:space:]]+$' then raise exception 'COMMENT_WEBSITE_INVALID' using errcode = '22023'; end if;
  if clean_mood is not null and (not settings_record.emoji_enabled or clean_mood not in ('😀','😃','😄','😁','😊','😍','🥰','😎','🤩','😂','😅','😉','🤗','🤔','😮','😢','😭','😡')) then raise exception 'COMMENT_MOOD_INVALID' using errcode = '22023'; end if;

  if (select count(*) from public.site_comments where site_id = target_site and visitor_hash = visitor_token and parent_id is null and created_at > now() - interval '10 minutes') >= 3 then
    raise exception 'COMMENT_RATE_LIMITED' using errcode = 'P0001';
  end if;
  if exists(select 1 from public.site_comments where site_id = target_site and visitor_hash = visitor_token and parent_id is null and body = clean_body and created_at > now() - interval '5 minutes') then
    raise exception 'COMMENT_DUPLICATE' using errcode = '23505';
  end if;

  new_status := case when settings_record.require_approval then 'pending' else 'approved' end;
  insert into public.site_comments(
    site_id, content_id, author_name, author_email, author_website, body, mood_emoji,
    status, visitor_hash, request_path, country_code, device_type, user_agent
  ) values (
    target_site, target_content, clean_name, nullif(clean_email,''), nullif(clean_website,''), clean_body, clean_mood,
    new_status, visitor_token, left(coalesce(request_path,''),1000), nullif(upper(left(coalesce(request_country,''),2)),''),
    case when request_device in ('mobile','tablet','desktop','tv') then request_device else 'unknown' end,
    left(coalesce(request_user_agent,''),600)
  ) returning * into result;

  return jsonb_build_object(
    'accepted', true,
    'id', result.id,
    'status', result.status,
    'message', case when result.status = 'pending' then 'Komentar diterima dan menunggu persetujuan.' else 'Komentar diterbitkan.' end
  );
end;
$$;

create or replace function public.get_public_site_comments(target_site uuid, target_content uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  settings_record public.site_comment_settings;
  content_record public.contents;
  comments_allowed boolean;
  comments_payload jsonb;
begin
  select * into settings_record from public.site_comment_settings where site_id = target_site;
  if not found or not settings_record.enabled then
    return jsonb_build_object('enabled', false, 'comments', '[]'::jsonb);
  end if;

  select * into content_record from public.contents
  where id = target_content and site_id = target_site and status = 'published' and visibility = 'public';
  if not found then return jsonb_build_object('enabled', false, 'comments', '[]'::jsonb); end if;

  comments_allowed := case lower(coalesce(content_record.metadata->>'commentsEnabled', ''))
    when 'true' then true
    when 'false' then false
    else content_record.kind <> 'page'::public.content_kind
  end;
  if not comments_allowed then return jsonb_build_object('enabled', false, 'comments', '[]'::jsonb); end if;

  select coalesce(jsonb_agg(item order by item_created_at asc), '[]'::jsonb)
    into comments_payload
  from (
    select
      c.created_at as item_created_at,
      jsonb_build_object(
        'id', c.id,
        'parentId', c.parent_id,
        'authorName', c.author_name,
        'authorWebsite', c.author_website,
        'body', c.body,
        'moodEmoji', c.mood_emoji,
        'isAdminReply', c.is_admin_reply,
        'createdAt', c.created_at,
        'reactions', coalesce((
          select jsonb_object_agg(r.emoji, r.total)
          from (
            select cr.emoji, count(*)::integer as total
            from public.site_comment_reactions cr
            where cr.comment_id = c.id
            group by cr.emoji
          ) r
        ), '{}'::jsonb)
      ) as item
    from public.site_comments c
    where c.site_id = target_site
      and c.content_id = target_content
      and c.status = 'approved'
  ) rows;

  return jsonb_build_object(
    'enabled', true,
    'allowGuests', settings_record.allow_guests,
    'requireEmail', settings_record.require_email,
    'emojiEnabled', settings_record.emoji_enabled,
    'comments', comments_payload
  );
end;
$$;

create or replace function public.react_to_site_comment(target_comment uuid, reaction_emoji text, visitor_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  comment_record public.site_comments;
  settings_record public.site_comment_settings;
  counts_payload jsonb;
begin
  if char_length(visitor_token) < 16 or char_length(visitor_token) > 128 then raise exception 'COMMENT_VISITOR_INVALID' using errcode = '22023'; end if;
  if reaction_emoji not in ('😀','😍','😂','😮','😢','😡','👍','❤️','🎉') then raise exception 'COMMENT_REACTION_INVALID' using errcode = '22023'; end if;

  select * into comment_record from public.site_comments where id = target_comment and status = 'approved';
  if not found then raise exception 'COMMENT_NOT_FOUND' using errcode = 'P0002'; end if;
  select * into settings_record from public.site_comment_settings where site_id = comment_record.site_id;
  if not found or not settings_record.enabled or not settings_record.emoji_enabled then raise exception 'COMMENT_REACTIONS_DISABLED' using errcode = '42501'; end if;

  insert into public.site_comment_reactions(comment_id, visitor_hash, emoji)
  values (target_comment, visitor_token, reaction_emoji)
  on conflict (comment_id, visitor_hash) do update set emoji = excluded.emoji;

  select coalesce(jsonb_object_agg(emoji,total), '{}'::jsonb) into counts_payload
  from (select emoji,count(*)::integer as total from public.site_comment_reactions where comment_id = target_comment group by emoji) rows;

  return jsonb_build_object('commentId', target_comment, 'reactions', counts_payload);
end;
$$;

revoke execute on function public.get_site_comment_dashboard(uuid) from public, anon;
revoke execute on function public.update_site_comment_settings(uuid,boolean,boolean,boolean,boolean,boolean) from public, anon;
revoke execute on function public.moderate_site_comment(uuid,text) from public, anon;
revoke execute on function public.reply_to_site_comment(uuid,text) from public, anon;
revoke execute on function public.submit_site_comment(uuid,uuid,text,text,text,text,text,text,text,text,text,text) from public;
revoke execute on function public.get_public_site_comments(uuid,uuid) from public;
revoke execute on function public.react_to_site_comment(uuid,text,text) from public;

grant execute on function public.get_site_comment_dashboard(uuid) to authenticated;
grant execute on function public.update_site_comment_settings(uuid,boolean,boolean,boolean,boolean,boolean) to authenticated;
grant execute on function public.moderate_site_comment(uuid,text) to authenticated;
grant execute on function public.reply_to_site_comment(uuid,text) to authenticated;
grant execute on function public.submit_site_comment(uuid,uuid,text,text,text,text,text,text,text,text,text,text) to anon, authenticated;
grant execute on function public.get_public_site_comments(uuid,uuid) to anon, authenticated;
grant execute on function public.react_to_site_comment(uuid,text,text) to anon, authenticated;

comment on table public.site_comments is 'Moderated visitor comments and trusted site-team replies for published Posts and Pages.';
comment on function public.submit_site_comment is 'Validated public comment submission with per-visitor rate limiting and approval workflow.';
comment on function public.get_site_comment_dashboard is 'Private moderation payload for authenticated site managers.';
