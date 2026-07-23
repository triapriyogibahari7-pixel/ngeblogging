insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'site-public-media',
  'site-public-media',
  true,
  15728640,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/avif'
  ]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "site_public_media_read_members" on storage.objects;
create policy "site_public_media_read_members"
on storage.objects for select
to authenticated
using (
  bucket_id = 'site-public-media'
  and private.is_site_member(
    case
      when coalesce((storage.foldername(name))[1], '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      then ((storage.foldername(name))[1])::uuid
      else null
    end
  )
);

drop policy if exists "site_public_media_insert_contributors" on storage.objects;
create policy "site_public_media_insert_contributors"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'site-public-media'
  and (storage.foldername(name))[2] = (select auth.uid())::text
  and private.has_site_role(
    case
      when coalesce((storage.foldername(name))[1], '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      then ((storage.foldername(name))[1])::uuid
      else null
    end,
    array[
      'owner'::public.member_role,
      'admin'::public.member_role,
      'editor'::public.member_role,
      'author'::public.member_role,
      'contributor'::public.member_role
    ]
  )
);

drop policy if exists "site_public_media_update_owner_or_editor" on storage.objects;
create policy "site_public_media_update_owner_or_editor"
on storage.objects for update
to authenticated
using (
  bucket_id = 'site-public-media'
  and (
    owner_id = (select auth.uid())::text
    or private.has_site_role(
      case
        when coalesce((storage.foldername(name))[1], '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        then ((storage.foldername(name))[1])::uuid
        else null
      end,
      array[
        'owner'::public.member_role,
        'admin'::public.member_role,
        'editor'::public.member_role
      ]
    )
  )
)
with check (
  bucket_id = 'site-public-media'
  and (
    owner_id = (select auth.uid())::text
    or private.has_site_role(
      case
        when coalesce((storage.foldername(name))[1], '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        then ((storage.foldername(name))[1])::uuid
        else null
      end,
      array[
        'owner'::public.member_role,
        'admin'::public.member_role,
        'editor'::public.member_role
      ]
    )
  )
);

drop policy if exists "site_public_media_delete_owner_or_editor" on storage.objects;
create policy "site_public_media_delete_owner_or_editor"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'site-public-media'
  and (
    owner_id = (select auth.uid())::text
    or private.has_site_role(
      case
        when coalesce((storage.foldername(name))[1], '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        then ((storage.foldername(name))[1])::uuid
        else null
      end,
      array[
        'owner'::public.member_role,
        'admin'::public.member_role,
        'editor'::public.member_role
      ]
    )
  )
);

grant select, insert, update, delete on public.media_assets to authenticated;
