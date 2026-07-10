import { demoAssets, demoSongVersions, demoSongs } from "@/lib/demo-data";
import { createDemoDelay, isDemoModeEnabled, requireSupabase } from "@/lib/service-utils";
import { getNextVersionNumber } from "@/lib/song-utils";
import type { SongFormValues, VersionFormValues } from "@/lib/validators";
import type { Asset, Song, SongVersion } from "@/types/domain";

import { buildSongInsertPayload } from "@/features/library/library-domain";

export interface LibraryDashboardData {
  songs: Song[];
  versions: SongVersion[];
  assets: Asset[];
}

export async function getLibraryDashboard(ownerId: string): Promise<LibraryDashboardData> {
  if (isDemoModeEnabled()) {
    await createDemoDelay();
    return {
      songs: demoSongs,
      versions: demoSongVersions,
      assets: demoAssets,
    };
  }

  const client = requireSupabase();
  const [songs, versions, assets] = await Promise.all([
    client.from("songs").select("*").eq("owner_id", ownerId).order("updated_at", { ascending: false }),
    client
      .from("song_versions")
      .select("*, song:songs!song_versions_song_id_fkey(owner_id)")
      .eq("song.owner_id", ownerId)
      .order("created_at", { ascending: false }),
    client.from("assets").select("*").eq("owner_id", ownerId).order("created_at", { ascending: false }),
  ]);

  if (songs.error) throw songs.error;
  if (versions.error) throw versions.error;
  if (assets.error) throw assets.error;

  return {
    songs: (songs.data ?? []) as Song[],
    versions: (versions.data ?? []) as SongVersion[],
    assets: (assets.data ?? []) as Asset[],
  };
}

export async function getSongDetail(songId: string) {
  if (isDemoModeEnabled()) {
    await createDemoDelay();
    const song = demoSongs.find((entry) => entry.id === songId) ?? null;
    return {
      song,
      versions: demoSongVersions.filter((version) => version.song_id === songId),
      assets: demoAssets,
    };
  }

  const client = requireSupabase();
  const [song, versions] = await Promise.all([
    client.from("songs").select("*").eq("id", songId).maybeSingle(),
    client.from("song_versions").select("*").eq("song_id", songId).order("version_number", { ascending: false }),
  ]);

  if (song.error) throw song.error;
  if (versions.error) throw versions.error;

  const { data: assets, error: assetsError } = song.data?.owner_id
    ? await client
        .from("assets")
        .select("*")
        .eq("owner_id", song.data.owner_id)
        .order("created_at", { ascending: false })
    : { data: [], error: null };

  if (assetsError) throw assetsError;

  return {
    song: song.data as Song | null,
    versions: (versions.data ?? []) as SongVersion[],
    assets: (assets ?? []) as Asset[],
  };
}

export async function updateSong(songId: string, values: SongFormValues) {
  if (isDemoModeEnabled()) {
    await createDemoDelay(180);
    return {
      ...demoSongs[0],
      id: songId,
      title: values.title.trim(),
      notes: values.notes?.trim() ? values.notes.trim() : null,
      default_artwork_asset_id: values.default_artwork_asset_id || null,
      updated_at: new Date().toISOString(),
    } satisfies Song;
  }

  const client = requireSupabase();
  const { data, error } = await client
    .from("songs")
    .update({
      title: values.title.trim(),
      notes: values.notes?.trim() ? values.notes.trim() : null,
      default_artwork_asset_id: values.default_artwork_asset_id || null,
    })
    .eq("id", songId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as Song;
}

export async function createSong(ownerId: string, values: SongFormValues) {
  if (isDemoModeEnabled()) {
    await createDemoDelay(180);
    return {
      ...demoSongs[0],
      ...values,
      owner_id: ownerId,
      notes: values.notes || null,
    } satisfies Song;
  }

  const client = requireSupabase();
  const payload = buildSongInsertPayload(ownerId, values);
  const { data, error } = await client
    .from("songs")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as Song;
}

export async function createSongVersion(songId: string, values: VersionFormValues) {
  if (isDemoModeEnabled()) {
    await createDemoDelay(180);
    return {
      ...demoSongVersions[2],
      song_id: songId,
      version_number: getNextVersionNumber(demoSongVersions.filter((version) => version.song_id === songId)),
      version_label: values.version_label,
      production_stage: values.production_stage,
      changelog: values.changelog || null,
      source_asset_id: values.source_asset_id,
      preview_asset_id: values.preview_asset_id || null,
      is_published: false,
      published_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } satisfies SongVersion;
  }

  const client = requireSupabase();
  const { data: existingVersions, error: versionsError } = await client
    .from("song_versions")
    .select("version_number")
    .eq("song_id", songId);

  if (versionsError) {
    throw versionsError;
  }

  const nextVersionNumber = getNextVersionNumber((existingVersions ?? []) as Array<Pick<SongVersion, "version_number">>);
  const { data, error } = await client
    .from("song_versions")
    .insert({
      song_id: songId,
      version_number: nextVersionNumber,
      version_label: values.version_label,
      production_stage: values.production_stage,
      changelog: values.changelog || null,
      source_asset_id: values.source_asset_id,
      preview_asset_id: values.preview_asset_id || null,
      is_published: false,
      published_at: null,
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as SongVersion;
}
