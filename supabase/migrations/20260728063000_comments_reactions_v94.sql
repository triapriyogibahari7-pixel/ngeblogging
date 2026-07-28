alter table public.site_comment_reactions drop constraint if exists site_comment_reactions_emoji_check;
alter table public.site_comment_reactions
  add constraint site_comment_reactions_emoji_check
  check (emoji in ('😀','😊','😍','😂','😮','😢','😡','👍','❤️','🎉'));

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
  if char_length(visitor_token) < 16 or char_length(visitor_token) > 128 then
    raise exception 'COMMENT_VISITOR_INVALID' using errcode = '22023';
  end if;
  if reaction_emoji not in ('😀','😊','😍','😂','😮','😢','😡','👍','❤️','🎉') then
    raise exception 'COMMENT_REACTION_INVALID' using errcode = '22023';
  end if;

  select * into comment_record
  from public.site_comments
  where id = target_comment and status = 'approved';
  if not found then raise exception 'COMMENT_NOT_FOUND' using errcode = 'P0002'; end if;

  select * into settings_record
  from public.site_comment_settings
  where site_id = comment_record.site_id;
  if not found or not settings_record.enabled or not settings_record.emoji_enabled then
    raise exception 'COMMENT_REACTIONS_DISABLED' using errcode = '42501';
  end if;

  insert into public.site_comment_reactions(comment_id, visitor_hash, emoji)
  values (target_comment, visitor_token, reaction_emoji)
  on conflict (comment_id, visitor_hash) do update set emoji = excluded.emoji;

  select coalesce(jsonb_object_agg(emoji,total), '{}'::jsonb)
    into counts_payload
  from (
    select emoji,count(*)::integer as total
    from public.site_comment_reactions
    where comment_id = target_comment
    group by emoji
  ) rows;

  return jsonb_build_object('commentId', target_comment, 'reactions', counts_payload);
end;
$$;
