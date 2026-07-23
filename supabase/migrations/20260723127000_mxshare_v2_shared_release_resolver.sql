begin;

create or replace function public.resolve_shared_post(
  supplied_token text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_link public.share_links%rowtype;
  target_post public.posts%rowtype;
  response jsonb;
begin
  select *
  into target_link
  from public.share_links
  where token_hash = encode(extensions.digest(supplied_token, 'sha256'), 'hex')
    and target_type = 'post'
  for update;

  if target_link.id is null
    or not target_link.is_active
    or target_link.revoked_at is not null
    or (target_link.expires_at is not null and target_link.expires_at <= timezone('utc', now()))
    or (target_link.max_uses is not null and target_link.use_count >= target_link.max_uses) then
    raise exception 'This shared release is invalid or has expired.';
  end if;

  select *
  into target_post
  from public.posts
  where id = target_link.target_id
    and hidden_at is null;

  if target_post.id is null then
    raise exception 'This shared release is unavailable.';
  end if;

  update public.share_links
  set use_count = use_count + 1
  where id = target_link.id;

  insert into public.share_link_access_logs (
    share_link_id,
    profile_id,
    access_kind
  )
  values (
    target_link.id,
    auth.uid(),
    'view'
  );

  select jsonb_build_object(
    'post', to_jsonb(post),
    'owner', to_jsonb(owner),
    'artwork', to_jsonb(artwork),
    'single', (
      select jsonb_build_object(
        'song', to_jsonb(song),
        'featuredVersion', to_jsonb(version),
        'previewAsset', to_jsonb(preview),
        'protectedAsset', to_jsonb(protected)
      )
      from public.single_posts as single_link
      join public.songs as song on song.id = single_link.song_id
      join public.song_versions as version on version.id = single_link.featured_version_id
      left join public.assets as preview on preview.id = version.preview_asset_id
      left join lateral (
        select protected_asset.*
        from public.protected_media_assets as protected_asset
        where protected_asset.song_version_id = version.id
          and protected_asset.status = 'ready'
          and protected_asset.deleted_at is null
        order by protected_asset.created_at desc
        limit 1
      ) as protected on true
      where single_link.post_id = post.id
    ),
    'releaseTracks', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'track', to_jsonb(track),
          'song', to_jsonb(song),
          'version', to_jsonb(version),
          'previewAsset', to_jsonb(preview),
          'protectedAsset', to_jsonb(protected)
        )
        order by track.track_number
      )
      from public.release_tracks as track
      join public.songs as song on song.id = track.song_id
      left join public.song_versions as version on version.id = track.song_version_id
      left join public.assets as preview on preview.id = track.preview_asset_id
      left join lateral (
        select protected_asset.*
        from public.protected_media_assets as protected_asset
        where protected_asset.song_version_id = track.song_version_id
          and protected_asset.status = 'ready'
          and protected_asset.deleted_at is null
        order by protected_asset.created_at desc
        limit 1
      ) as protected on true
      where track.post_id = post.id
    ), '[]'::jsonb),
    'credits', coalesce((
      select jsonb_agg(to_jsonb(credit) order by credit.position)
      from public.post_credits as credit
      where credit.post_id = post.id
    ), '[]'::jsonb),
    'externalLinks', coalesce((
      select jsonb_agg(to_jsonb(link) order by link.position)
      from public.post_external_links as link
      where link.post_id = post.id
    ), '[]'::jsonb)
  )
  into response
  from public.posts as post
  join public.profiles as owner on owner.id = post.owner_id
  left join public.assets as artwork on artwork.id = post.artwork_asset_id
  where post.id = target_post.id;

  return response;
end;
$$;

grant execute on function public.resolve_shared_post(text) to anon, authenticated;

commit;
