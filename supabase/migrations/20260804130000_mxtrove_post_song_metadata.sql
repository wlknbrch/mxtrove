-- Expose release-safe song metadata without opening private library rows.

create or replace function public.get_post_song_metadata(target_post_id uuid)
returns table (
  release_track_id uuid,
  song jsonb
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    null::uuid as release_track_id,
    jsonb_build_object(
      'id', source_song.id,
      'owner_id', source_song.owner_id,
      'title', source_song.title,
      'notes', null,
      'lyrics', case
        when single_link.show_lyrics or post.owner_id = auth.uid() then source_song.lyrics
        else null
      end,
      'musical_key', source_song.musical_key,
      'tempo_bpm', source_song.tempo_bpm,
      'tempo_confidence', null,
      'key_confidence', null,
      'audio_analysis_updated_at', source_song.audio_analysis_updated_at,
      'default_artwork_asset_id', source_song.default_artwork_asset_id,
      'created_at', source_song.created_at,
      'updated_at', source_song.updated_at
    ) as song
  from public.posts as post
  join public.single_posts as single_link on single_link.post_id = post.id
  join public.songs as source_song on source_song.id = single_link.song_id
  where post.id = target_post_id
    and public.can_view_post(post.id, auth.uid())

  union all

  select
    track.id as release_track_id,
    jsonb_build_object(
      'id', source_song.id,
      'owner_id', source_song.owner_id,
      'title', source_song.title,
      'notes', null,
      'lyrics', case
        when track.show_lyrics or post.owner_id = auth.uid() then source_song.lyrics
        else null
      end,
      'musical_key', source_song.musical_key,
      'tempo_bpm', source_song.tempo_bpm,
      'tempo_confidence', null,
      'key_confidence', null,
      'audio_analysis_updated_at', source_song.audio_analysis_updated_at,
      'default_artwork_asset_id', source_song.default_artwork_asset_id,
      'created_at', source_song.created_at,
      'updated_at', source_song.updated_at
    ) as song
  from public.posts as post
  join public.release_tracks as track on track.post_id = post.id
  join public.songs as source_song on source_song.id = track.song_id
  where post.id = target_post_id
    and public.can_view_post(post.id, auth.uid());
$$;

revoke all on function public.get_post_song_metadata(uuid) from public;
grant execute on function public.get_post_song_metadata(uuid) to anon, authenticated, service_role;
