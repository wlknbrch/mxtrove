begin;

create or replace function public.get_release_track_version_labels(
  target_post_id uuid
)
returns table (
  track_id uuid,
  song_version_id uuid,
  version_label text
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    track.id,
    version.id,
    version.version_label
  from public.release_tracks as track
  join public.song_versions as version
    on version.id = track.song_version_id
  where track.post_id = target_post_id
    and public.can_view_post(target_post_id, auth.uid())
  order by track.track_number;
$$;

revoke all on function public.get_release_track_version_labels(uuid) from public;
grant execute on function public.get_release_track_version_labels(uuid)
to anon, authenticated, service_role;

commit;
