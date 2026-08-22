-- Resolve feed/profile cards in one bounded call instead of issuing one query per relation and track.

create or replace function public.compact_post_card_waveform(
  target_waveform jsonb,
  max_buckets integer default 320
)
returns jsonb
language plpgsql
immutable
set search_path = public, pg_temp
as $$
declare
  source_peaks jsonb;
  compact_peaks jsonb := '[]'::jsonb;
  source_count integer;
  bucket_limit integer := greatest(1, max_buckets);
  bucket_stride integer;
  bucket_index integer;
begin
  if target_waveform is null then
    return null;
  end if;

  source_peaks := case
    when jsonb_typeof(target_waveform) = 'object' then target_waveform -> 'peaks'
    else target_waveform
  end;

  if jsonb_typeof(source_peaks) <> 'array' then
    return target_waveform;
  end if;

  source_count := jsonb_array_length(source_peaks);
  if source_count <= bucket_limit then
    return target_waveform;
  end if;

  bucket_stride := greatest(1, ceil(source_count::numeric / bucket_limit)::integer);
  for bucket_index in 0..(source_count - 1) by bucket_stride loop
    compact_peaks := compact_peaks || jsonb_build_array(source_peaks -> bucket_index);
  end loop;

  if jsonb_typeof(target_waveform) = 'object' then
    return jsonb_set(
      jsonb_set(target_waveform, '{peaks}', compact_peaks, true),
      '{bucketCount}',
      to_jsonb(jsonb_array_length(compact_peaks)),
      true
    );
  end if;

  return compact_peaks;
end;
$$;

revoke all on function public.compact_post_card_waveform(jsonb, integer) from public;

create or replace function public.get_resolved_post_cards(target_post_ids uuid[])
returns table (post_id uuid, card jsonb)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with requested_posts as (
    select post.*
    from public.posts as post
    where post.id = any(coalesce(target_post_ids, array[]::uuid[]))
      and public.can_view_post(post.id, auth.uid())
    limit 50
  )
  select
    post.id as post_id,
    jsonb_build_object(
      'post', to_jsonb(post),
      'owner', (
        select jsonb_build_object(
          'id', owner.id,
          'username', owner.username,
          'display_name', owner.display_name,
          'bio', null,
          'location', null,
          'website_url', null,
          'instagram_url', null,
          'spotify_url', null,
          'youtube_url', null,
          'support_url', null,
          'avatar_asset_id', owner.avatar_asset_id,
          'pinned_post_id', null,
          'onboarding_completed', true,
          'created_at', owner.created_at,
          'updated_at', owner.updated_at
        )
        from public.profiles as owner
        where owner.id = post.owner_id
      ),
      'artwork', (
        select (to_jsonb(artwork) - 'waveform_peaks')
        from public.assets as artwork
        where artwork.id = post.artwork_asset_id
      ),
      'single', case when post.post_type = 'single' then (
        select jsonb_build_object(
          'song', jsonb_build_object(
            'id', song.id,
            'owner_id', song.owner_id,
            'title', song.title,
            'notes', null,
            'lyrics', case when single_link.show_lyrics or post.owner_id = auth.uid() then song.lyrics else null end,
            'musical_key', song.musical_key,
            'tempo_bpm', song.tempo_bpm,
            'tempo_confidence', null,
            'key_confidence', null,
            'audio_analysis_updated_at', song.audio_analysis_updated_at,
            'default_artwork_asset_id', song.default_artwork_asset_id,
            'created_at', song.created_at,
            'updated_at', song.updated_at
          ),
          'showLyrics', single_link.show_lyrics,
          'featuredVersion', to_jsonb(featured_version),
          'previousVersion', (
            select to_jsonb(previous_version)
            from public.song_versions as previous_version
            where previous_version.song_id = single_link.song_id
              and previous_version.id <> single_link.featured_version_id
            order by previous_version.version_number desc
            limit 1
          ),
          'previewAsset', (
            select to_jsonb(preview_asset) || jsonb_build_object(
              'waveform_peaks',
              public.compact_post_card_waveform(preview_asset.waveform_peaks, 320)
            )
            from public.assets as preview_asset
            where preview_asset.id = featured_version.preview_asset_id
          ),
          'protectedPreviewAsset', (
            select jsonb_build_object(
              'id', protected_asset.id,
              'owner_id', protected_asset.owner_id,
              'purpose', protected_asset.purpose,
              'status', protected_asset.status,
              'filename', protected_asset.filename,
              'mime_type', protected_asset.mime_type,
              'bytes', protected_asset.bytes,
              'duration_seconds', protected_asset.duration_seconds,
              'waveform_data', public.compact_post_card_waveform(protected_asset.waveform_data, 320),
              'post_id', protected_asset.post_id,
              'project_id', protected_asset.project_id,
              'song_version_id', protected_asset.song_version_id,
              'message_id', protected_asset.message_id,
              'created_at', protected_asset.created_at,
              'ready_at', protected_asset.ready_at
            )
            from public.protected_media_assets as protected_asset
            where protected_asset.song_version_id = featured_version.id
              and protected_asset.status = 'ready'
              and protected_asset.deleted_at is null
            order by protected_asset.ready_at desc nulls last
            limit 1
          ),
          'versionHeartCount', (
            select count(*) from public.version_hearts as heart
            where heart.song_version_id = featured_version.id
          ),
          'viewerHasHeartedVersion', exists (
            select 1 from public.version_hearts as heart
            where heart.song_version_id = featured_version.id
              and heart.profile_id = auth.uid()
          )
        )
        from public.single_posts as single_link
        join public.songs as song on song.id = single_link.song_id
        join public.song_versions as featured_version on featured_version.id = single_link.featured_version_id
        where single_link.post_id = post.id
      ) else null end,
      'releaseTracks', coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'track', to_jsonb(track),
            'song', jsonb_build_object(
              'id', song.id,
              'owner_id', song.owner_id,
              'title', song.title,
              'notes', null,
              'lyrics', case when track.show_lyrics or post.owner_id = auth.uid() then song.lyrics else null end,
              'musical_key', song.musical_key,
              'tempo_bpm', song.tempo_bpm,
              'tempo_confidence', null,
              'key_confidence', null,
              'audio_analysis_updated_at', song.audio_analysis_updated_at,
              'default_artwork_asset_id', song.default_artwork_asset_id,
              'created_at', song.created_at,
              'updated_at', song.updated_at
            ),
            'version', case when version.id is null then null else to_jsonb(version) end,
            'versionLabel', version.version_label,
            'previewAsset', case when preview_asset.id is null then null else
              to_jsonb(preview_asset) || jsonb_build_object(
                'waveform_peaks',
                public.compact_post_card_waveform(preview_asset.waveform_peaks, 320)
              )
            end,
            'protectedPreviewAsset', (
              select jsonb_build_object(
                'id', protected_asset.id,
                'owner_id', protected_asset.owner_id,
                'purpose', protected_asset.purpose,
                'status', protected_asset.status,
                'filename', protected_asset.filename,
                'mime_type', protected_asset.mime_type,
                'bytes', protected_asset.bytes,
                'duration_seconds', protected_asset.duration_seconds,
                'waveform_data', public.compact_post_card_waveform(protected_asset.waveform_data, 320),
                'post_id', protected_asset.post_id,
                'project_id', protected_asset.project_id,
                'song_version_id', protected_asset.song_version_id,
                'message_id', protected_asset.message_id,
                'created_at', protected_asset.created_at,
                'ready_at', protected_asset.ready_at
              )
              from public.protected_media_assets as protected_asset
              where protected_asset.song_version_id = track.song_version_id
                and protected_asset.status = 'ready'
                and protected_asset.deleted_at is null
              order by protected_asset.ready_at desc nulls last
              limit 1
            ),
            'versionHeartCount', (
              select count(*) from public.version_hearts as heart
              where heart.song_version_id = track.song_version_id
            ),
            'viewerHasHeartedVersion', exists (
              select 1 from public.version_hearts as heart
              where heart.song_version_id = track.song_version_id
                and heart.profile_id = auth.uid()
            )
          ) order by track.track_number
        )
        from public.release_tracks as track
        join public.songs as song on song.id = track.song_id
        left join public.song_versions as version on version.id = track.song_version_id
        left join public.assets as preview_asset on preview_asset.id = track.preview_asset_id
        where track.post_id = post.id
      ), '[]'::jsonb),
      'heartCount', (select count(*) from public.post_hearts as heart where heart.post_id = post.id),
      'viewerHasHearted', exists (
        select 1 from public.post_hearts as heart
        where heart.post_id = post.id and heart.profile_id = auth.uid()
      ),
      'versionHeartCount', case when post.post_type = 'single' then (
        select count(*)
        from public.single_posts as single_link
        join public.version_hearts as heart on heart.song_version_id = single_link.featured_version_id
        where single_link.post_id = post.id
      ) else 0 end,
      'viewerHasHeartedVersion', case when post.post_type = 'single' then exists (
        select 1
        from public.single_posts as single_link
        join public.version_hearts as heart on heart.song_version_id = single_link.featured_version_id
        where single_link.post_id = post.id and heart.profile_id = auth.uid()
      ) else false end,
      'commentCount', (
        select count(*) from public.comments as comment
        where comment.post_id = post.id and comment.deleted_at is null
      ),
      'comments', '[]'::jsonb,
      'credits', '[]'::jsonb,
      'externalLinks', '[]'::jsonb,
      'feedEvent', (
        select to_jsonb(feed_event)
        from public.feed_events as feed_event
        where feed_event.post_id = post.id
        order by feed_event.created_at desc
        limit 1
      )
    ) as card
  from requested_posts as post;
$$;

revoke all on function public.get_resolved_post_cards(uuid[]) from public;
grant execute on function public.get_resolved_post_cards(uuid[]) to anon, authenticated, service_role;
