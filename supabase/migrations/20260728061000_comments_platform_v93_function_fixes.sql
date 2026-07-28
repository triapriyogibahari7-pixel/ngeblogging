create or replace function public.get_site_comment_dashboard(target_site uuid)
returns jsonb
language plpgsql
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
  insert into public.site_comment_settings(site_id) values (target_site) on conflict (site_id) do nothing;
  select to_jsonb(s) - 'updated_by' into settings_payload from public.site_comment_settings s where s.site_id = target_site;
  select coalesce(jsonb_agg(item order by item_created_at desc), '[]'::jsonb) into comments_payload
  from (
    select c.created_at item_created_at,
      jsonb_build_object(
        'id', c.id, 'siteId', c.site_id, 'contentId', c.content_id, 'parentId', c.parent_id,
        'authorUserId', c.author_user_id, 'authorName', c.author_name, 'authorEmail', c.author_email,
        'authorWebsite', c.author_website, 'body', c.body, 'moodEmoji', c.mood_emoji,
        'status', c.status, 'isAdminReply', c.is_admin_reply, 'requestPath', c.request_path,
        'countryCode', c.country_code, 'deviceType', c.device_type, 'userAgent', c.user_agent,
        'ownerReadAt', c.owner_read_at, 'repliedAt', c.replied_at, 'createdAt', c.created_at,
        'updatedAt', c.updated_at,
        'content', jsonb_build_object('title', co.title, 'slug', co.slug, 'kind', co.kind),
        'reactions', coalesce((select jsonb_object_agg(r.emoji,r.total) from (
          select cr.emoji,count(*)::integer total from public.site_comment_reactions cr
          where cr.comment_id=c.id group by cr.emoji
        ) r),'{}'::jsonb)
      ) item
    from public.site_comments c join public.contents co on co.id=c.content_id
    where c.site_id=target_site
  ) rows;
  select jsonb_build_object(
    'total',count(*) filter(where parent_id is null),
    'unread',count(*) filter(where parent_id is null and owner_read_at is null),
    'unreplied',count(*) filter(where parent_id is null and replied_at is null and status='approved'),
    'pending',count(*) filter(where parent_id is null and status='pending'),
    'approved',count(*) filter(where parent_id is null and status='approved'),
    'hidden',count(*) filter(where parent_id is null and status='hidden'),
    'spam',count(*) filter(where parent_id is null and status='spam')
  ) into counts_payload from public.site_comments where site_id=target_site;
  return jsonb_build_object('release','comments-v93','settings',coalesce(settings_payload,'{}'::jsonb),'counts',coalesce(counts_payload,'{}'::jsonb),'comments',comments_payload);
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
  if not exists(select 1 from public.sites where id=target_site and status='active' and is_public=true) then
    return jsonb_build_object('enabled',false,'comments','[]'::jsonb);
  end if;
  select * into settings_record from public.site_comment_settings where site_id=target_site;
  if not found or not settings_record.enabled then return jsonb_build_object('enabled',false,'comments','[]'::jsonb); end if;
  select * into content_record from public.contents where id=target_content and site_id=target_site and status='published' and visibility='public';
  if not found then return jsonb_build_object('enabled',false,'comments','[]'::jsonb); end if;
  comments_allowed := case lower(coalesce(content_record.metadata->>'commentsEnabled','')) when 'true' then true when 'false' then false else content_record.kind <> 'page'::public.content_kind end;
  if not comments_allowed then return jsonb_build_object('enabled',false,'comments','[]'::jsonb); end if;
  select coalesce(jsonb_agg(item order by item_created_at asc),'[]'::jsonb) into comments_payload
  from (
    select c.created_at item_created_at,
      jsonb_build_object(
        'id',c.id,'parentId',c.parent_id,'authorName',c.author_name,'authorWebsite',c.author_website,
        'body',c.body,'moodEmoji',c.mood_emoji,'isAdminReply',c.is_admin_reply,'createdAt',c.created_at,
        'reactions',coalesce((select jsonb_object_agg(r.emoji,r.total) from (
          select cr.emoji,count(*)::integer total from public.site_comment_reactions cr where cr.comment_id=c.id group by cr.emoji
        ) r),'{}'::jsonb)
      ) item
    from public.site_comments c where c.site_id=target_site and c.content_id=target_content and c.status='approved'
  ) rows;
  return jsonb_build_object('enabled',true,'allowGuests',settings_record.allow_guests,'requireEmail',settings_record.require_email,'emojiEnabled',settings_record.emoji_enabled,'comments',comments_payload);
end;
$$;
