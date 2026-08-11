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
      .select("*")
      .eq("owner_id", ownerId)
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
      lyrics: values.lyrics?.trim() ? values.lyrics.trim() : null,
      musical_key: values.musical_key?.trim() ? values.musical_key.trim() : null,
      tempo_bpm: values.tempo_bpm ?? null,
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
      lyrics: values.lyrics?.trim() ? values.lyrics.trim() : null,
      musical_key: values.musical_key?.trim() ? values.musical_key.trim() : null,
      tempo_bpm: values.tempo_bpm ?? null,
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
      lyrics: values.lyrics || null,
      musical_key: values.musical_key || null,
      tempo_bpm: values.tempo_bpm ?? null,
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

export async function createSongVersion(
  songId: string,
  values: VersionFormValues,
  context?: {
    projectId: string;
    trackId: string;
  },
) {
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
      owner_id: demoSongVersions[2].owner_id,
      collaboration_project_id: context?.projectId ?? null,
      collaboration_track_id: context?.trackId ?? null,
      sharing_mode: context ? "project_members" : "private",
      review_status: "not_requested",
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
      collaboration_project_id: context?.projectId ?? null,
      collaboration_track_id: context?.trackId ?? null,
      sharing_mode: context ? "project_members" : "private",
      review_status: "not_requested",
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

export async function deleteSong(songId: string) {
  if (isDemoModeEnabled()) {
    await createDemoDelay(140);
    return;
  }

  const client = requireSupabase();
  const [singleUsage, releaseUsage] = await Promise.all([
    client.from("single_posts").select("post_id", { count: "exact", head: true }).eq("song_id", songId),
    client.from("release_tracks").select("id", { count: "exact", head: true }).eq("song_id", songId),
  ]);

  if (singleUsage.error) {
    throw new Error(singleUsage.error.message || "Could not check single usage for this song.");
  }

  if (releaseUsage.error) {
    throw new Error(releaseUsage.error.message || "Could not check release usage for this song.");
  }

  if ((singleUsage.count ?? 0) > 0) {
    throw new Error("This song is still attached to a published or draft single post. Delete or remap that post first.");
  }

  if ((releaseUsage.count ?? 0) > 0) {
    throw new Error("This song is still attached to an EP or album tracklist. Remove it from those releases first.");
  }

  const { error } = await client
    .from("songs")
    .delete()
    .eq("id", songId);

  if (error) {
    if (
      error.code === "23503"
      && error.message.includes("media_processing_jobs_protected_asset_id_fkey")
    ) {
      throw new Error("MxTrove could not finish cleaning up this song's media records. Apply the latest database update and try again.");
    }
    throw new Error(error.message || "Could not delete this song.");
  }
}

export async function deleteSongVersion(versionId: string) {
  if (isDemoModeEnabled()) {
    await createDemoDelay(140);
    return;
  }

  const client = requireSupabase();
  const { data: singleLink, error: singleLinkError } = await client
    .from("single_posts")
    .select("post_id")
    .eq("featured_version_id", versionId)
    .maybeSingle();

  if (singleLinkError) {
    throw singleLinkError;
  }

  if (singleLink) {
    throw new Error("This version is currently live on a single post. Publish another version or delete the post first.");
  }

  const { error } = await client
    .from("song_versions")
    .delete()
    .eq("id", versionId);

  if (error) {
    throw error;
  }
}

export async function updateSongVersionPreview(input: {
  versionId: string;
  previewAssetId: string | null;
}) {
  if (isDemoModeEnabled()) {
    await createDemoDelay(160);
    return;
  }

  const client = requireSupabase();
  const { data: version, error: versionError } = await client
    .from("song_versions")
    .update({
      preview_asset_id: input.previewAssetId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.versionId)
    .select("id")
    .single();

  if (versionError) {
    throw versionError;
  }

  const { error: releaseTracksError } = await client
    .from("release_tracks")
    .update({
      preview_asset_id: input.previewAssetId,
      updated_at: new Date().toISOString(),
    })
    .eq("song_version_id", input.versionId);

  if (releaseTracksError) {
    throw releaseTracksError;
  }

  return version;
}
