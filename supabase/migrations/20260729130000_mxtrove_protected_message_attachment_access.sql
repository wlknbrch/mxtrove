-- Keep protected message attachment metadata and binary access aligned for all
-- conversation members. The media remains private and is still served by a
-- short-lived signed worker URL.
create or replace function public.can_access_protected_media(
  target_asset_id uuid,
  target_profile_id uuid default auth.uid(),
  supplied_share_token text default null
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.protected_media_assets as asset
    where asset.id = target_asset_id
      and asset.status = 'ready'
      and asset.deleted_at is null
      and (asset.expires_at is null or asset.expires_at > timezone('utc', now()))
      and not public.is_profile_blocked_pair(asset.owner_id, target_profile_id)
      and (
        asset.owner_id = target_profile_id
        or (
          asset.message_id is not null
          and exists (
            select 1
            from public.messages as message
            where message.id = asset.message_id
              and public.is_conversation_member(message.conversation_id, target_profile_id)
          )
        )
        or (
          asset.post_id is not null
          and public.can_view_post(asset.post_id, target_profile_id)
        )
        or (
          asset.project_id is not null
          and public.can_view_collaboration_project(asset.project_id, target_profile_id)
        )
        or (
          supplied_share_token is not null
          and exists (
            select 1
            from public.share_links as share_link
            where share_link.token_hash = encode(
              extensions.digest(supplied_share_token, 'sha256'),
              'hex'
            )
              and share_link.is_active = true
              and share_link.revoked_at is null
              and (share_link.expires_at is null or share_link.expires_at > timezone('utc', now()))
              and (share_link.max_uses is null or share_link.use_count <= share_link.max_uses)
              and (
                (share_link.target_type = 'post' and share_link.target_id = asset.post_id)
                or (
                  share_link.target_type = 'collaboration_project'
                  and share_link.target_id = asset.project_id
                )
                or (
                  share_link.target_type = 'song_version'
                  and share_link.target_id = asset.song_version_id
                )
              )
          )
        )
      )
  );
$$;

revoke all on function public.can_access_protected_media(uuid, uuid, text) from public;
grant execute on function public.can_access_protected_media(uuid, uuid, text)
to authenticated, service_role;

drop policy if exists "protected media owner metadata select"
on public.protected_media_assets;

create policy "protected media owner metadata select"
on public.protected_media_assets for select
using (
  owner_id = auth.uid()
  or (
    message_id is not null
    and public.can_access_protected_media(id, auth.uid(), null)
  )
  or (
    project_id is not null
    and public.can_view_collaboration_project(project_id, auth.uid())
  )
  or (
    post_id is not null
    and public.can_view_post(post_id, auth.uid())
  )
);
