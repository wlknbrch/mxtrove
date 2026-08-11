-- A project track cannot remain usable after its backing library song is deleted.
-- Cascading here restores song deletion while preserving the parent project itself.

alter table public.collaboration_project_tracks
  drop constraint if exists collaboration_project_tracks_song_id_fkey;

alter table public.collaboration_project_tracks
  add constraint collaboration_project_tracks_song_id_fkey
  foreign key (song_id)
  references public.songs (id)
  on delete cascade;
