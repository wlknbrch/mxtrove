-- Release-level lyrics visibility keeps private library notes out of public posts by default.

alter table public.single_posts
  add column if not exists show_lyrics boolean not null default false;

alter table public.release_tracks
  add column if not exists show_lyrics boolean not null default false;

create or replace function public.update_release_post(
  target_post_id uuid,
  next_title text,
  next_description text,
  next_release_url text,
  next_artwork_asset_id uuid,
  next_tracks jsonb default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_user_id uuid := auth.uid();
  target_post public.posts%rowtype;
  track_entry jsonb;
  normalized_tracks jsonb := '[]'::jsonb;
  track_index integer := 0;
  preserved_show_lyrics boolean;
begin
  if current_user_id is null then
    raise exception 'Authentication required.';
  end if;

  select *
  into target_post
  from public.posts
  where id = target_post_id
    and owner_id = current_user_id;

  if target_post.id is null then
    raise exception 'Post not found.';
  end if;

  update public.posts
  set
    title = coalesce(nullif(btrim(next_title), ''), title),
    description = nullif(btrim(next_description), ''),
    release_url = nullif(btrim(next_release_url), ''),
    artwork_asset_id = next_artwork_asset_id,
    updated_at = timezone('utc', now())
  where id = target_post_id;

  if target_post.post_type = 'single' then
    return;
  end if;

  if next_tracks is null or jsonb_typeof(next_tracks) <> 'array' then
    raise exception 'Tracks payload must be a JSON array.';
  end if;

  -- Older clients do not send show_lyrics. Preserve an existing choice for the
  -- same song instead of silently hiding lyrics whenever they edit a release.
  for track_entry in
    select value
    from jsonb_array_elements(next_tracks)
  loop
    if not (track_entry ? 'show_lyrics') then
      preserved_show_lyrics := false;

      select track.show_lyrics
      into preserved_show_lyrics
      from public.release_tracks as track
      where track.post_id = target_post_id
        and track.song_id = nullif(track_entry ->> 'song_id', '')::uuid
      order by track.track_number
      limit 1;

      track_entry := track_entry || jsonb_build_object(
        'show_lyrics',
        coalesce(preserved_show_lyrics, false)
      );
    end if;

    normalized_tracks := normalized_tracks || jsonb_build_array(track_entry);
  end loop;

  delete from public.release_tracks
  where post_id = target_post_id;

  track_index := 0;

  for track_entry in
    select value
    from jsonb_array_elements(normalized_tracks)
  loop
    track_index := track_index + 1;

    insert into public.release_tracks (
      post_id,
      song_id,
      song_version_id,
      track_title,
      track_number,
      preview_asset_id,
      production_stage,
      show_lyrics
    )
    values (
      target_post_id,
      (track_entry ->> 'song_id')::uuid,
      nullif(track_entry ->> 'song_version_id', '')::uuid,
      coalesce(nullif(btrim(track_entry ->> 'track_title'), ''), 'Untitled track'),
      coalesce((track_entry ->> 'track_number')::integer, track_index),
      nullif(track_entry ->> 'preview_asset_id', '')::uuid,
      nullif(track_entry ->> 'production_stage', ''),
      coalesce((track_entry ->> 'show_lyrics')::boolean, false)
    );
  end loop;

  update public.posts
  set updated_at = timezone('utc', now())
  where id = target_post_id;
end;
$$;

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
        'song', to_jsonb(song) || jsonb_build_object(
          'lyrics', case when single_link.show_lyrics then song.lyrics else null end
        ),
        'showLyrics', single_link.show_lyrics,
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
          'song', to_jsonb(song) || jsonb_build_object(
            'lyrics', case when track.show_lyrics then song.lyrics else null end
          ),
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
