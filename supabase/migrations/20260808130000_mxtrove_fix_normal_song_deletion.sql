-- Deleting a song removes its versions and their protected previews in the same
-- transaction. Defer this cross-reference check until both cascades have applied.

alter table public.media_processing_jobs
  drop constraint if exists media_processing_jobs_protected_asset_id_fkey;

alter table public.media_processing_jobs
  add constraint media_processing_jobs_protected_asset_id_fkey
  foreign key (protected_asset_id)
  references public.protected_media_assets (id)
  on delete set null
  deferrable initially deferred;

-- Keep collaboration tracks protected from accidental library-song deletion.
-- The preceding migration temporarily changed this while diagnosing the failure.
alter table public.collaboration_project_tracks
  drop constraint if exists collaboration_project_tracks_song_id_fkey;

alter table public.collaboration_project_tracks
  add constraint collaboration_project_tracks_song_id_fkey
  foreign key (song_id)
  references public.songs (id)
  on delete restrict;
