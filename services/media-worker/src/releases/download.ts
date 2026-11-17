import type { FastifyInstance } from "fastify";
import { verifySupabaseBearerToken } from "../auth/verify-jwt.js";
import { supabaseAdmin } from "../supabase/service.js";

export class ReleaseDownloadError extends Error {
  constructor(public readonly statusCode: number, message: string) { super(message); }
}

export function archiveSegment(value: string, fallback = "Untitled") {
  const safe = value.normalize("NFC").replace(/[\u0000-\u001f\u007f<>:"/\\|?*]/g, "_")
    .replace(/^[. ]+|[. ]+$/g, "").trim().slice(0, 120).replace(/[. ]+$/g, "") || fallback;
  return /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(safe) ? `_${safe}` : safe;
}

interface DownloadAsset {
  id: string; owner_id: string; provider: string; remote_file_id: string;
  filename: string; mime_type: string; file_extension: string; bytes: number | null; asset_type: string;
}
interface DownloadVersion {
  id: string; song_id: string; owner_id: string; source_asset_id: string;
  version_number: number; version_label: string; production_stage: string;
}
interface DownloadSong { id: string; owner_id: string; title: string; musical_key: string | null; tempo_bpm: number | null }

/** No waveform, signed URL, cloud access token or public share link is returned. */
export async function getReleaseDownloadManifest(postId: string, ownerId: string) {
  const { data: post, error: postError } = await supabaseAdmin.from("posts")
    .select("id, owner_id, post_type, title, description, release_notes, artwork_asset_id")
    .eq("id", postId).eq("owner_id", ownerId).maybeSingle();
  if (postError) throw postError;
  if (!post) throw new ReleaseDownloadError(404, "Release not found or you are not its author.");

  let ordered: Array<{ songId: string; versionId: string; title: string; number: number }>;
  let versions: DownloadVersion[];
  const versionColumns = "id, song_id, owner_id, source_asset_id, version_number, version_label, production_stage";
  if (post.post_type === "single") {
    const { data: single, error } = await supabaseAdmin.from("single_posts")
      .select("song_id").eq("post_id", postId).maybeSingle();
    if (error) throw error;
    if (!single) throw new ReleaseDownloadError(409, "This single has no linked song.");
    const result = await supabaseAdmin.from("song_versions").select(versionColumns, { count: "exact" })
      .eq("song_id", single.song_id).eq("owner_id", ownerId).order("version_number", { ascending: true });
    if (result.error) throw result.error;
    if (result.count != null && result.count > (result.data?.length ?? 0)) {
      throw new ReleaseDownloadError(409, "The version list exceeds the server response limit. No partial archive was created.");
    }
    versions = result.data ?? [];
    ordered = versions.map((v, i) => ({ songId: v.song_id, versionId: v.id, title: post.title, number: i + 1 }));
  } else {
    const { data: tracks, error, count } = await supabaseAdmin.from("release_tracks")
      .select("song_id, song_version_id, track_title, track_number", { count: "exact" }).eq("post_id", postId)
      .order("track_number", { ascending: true });
    if (error) throw error;
    if (count != null && count > (tracks?.length ?? 0)) {
      throw new ReleaseDownloadError(409, "The track list exceeds the server response limit. No partial archive was created.");
    }
    if (!tracks?.length || tracks.some(t => !t.song_version_id)) {
      throw new ReleaseDownloadError(409, "Every release track needs a linked version before downloading its original.");
    }
    const result = await supabaseAdmin.from("song_versions").select(versionColumns)
      .in("id", [...new Set(tracks.map(t => t.song_version_id))]).eq("owner_id", ownerId);
    if (result.error) throw result.error;
    versions = result.data ?? [];
    ordered = tracks.map(t => ({ songId: t.song_id, versionId: t.song_version_id, title: t.track_title, number: t.track_number }));
  }
  if (!ordered.length) throw new ReleaseDownloadError(409, "There are no saved song versions to download yet.");
  const sourceIds = [...new Set(versions.map(v => v.source_asset_id))];
  const assetIds = [...sourceIds, ...(post.artwork_asset_id ? [post.artwork_asset_id] : [])];
  const [assetsResult, songsResult] = await Promise.all([
    supabaseAdmin.from("assets").select("id, owner_id, provider, remote_file_id, filename, mime_type, file_extension, bytes, asset_type")
      .in("id", assetIds).eq("owner_id", ownerId),
    supabaseAdmin.from("songs").select("id, owner_id, title, musical_key, tempo_bpm")
      .in("id", [...new Set(ordered.map(t => t.songId))]).eq("owner_id", ownerId),
  ]);
  if (assetsResult.error) throw assetsResult.error;
  if (songsResult.error) throw songsResult.error;
  const assets = new Map<string, DownloadAsset>((assetsResult.data ?? []).map(a => [a.id, a]));
  const songs = new Map<string, DownloadSong>((songsResult.data ?? []).map(s => [s.id, s]));
  const byVersion = new Map(versions.map(v => [v.id, v]));
  const rootDirectory = archiveSegment(post.title, "MxTrove release");
  const used = new Set<string>();
  const entry = (asset: DownloadAsset, name: string) => {
    // Segments are generated here; neither provider filenames nor titles can
    // inject paths or Windows device names into an extracted archive.
    const extension = asset.filename.match(/\.([a-z0-9]{1,12})$/i)?.[1]?.toLowerCase()
      ?? asset.file_extension?.replace(/^\./, "").replace(/[^a-z0-9]/gi, "").slice(0, 12) ?? "bin";
    const stem = archiveSegment(name);
    let filename = `${stem}.${extension || "bin"}`;
    let duplicate = 1;
    while (used.has(filename.toLowerCase())) filename = `${stem} (${++duplicate}).${extension || "bin"}`;
    used.add(filename.toLowerCase());
    return {
      path: `${rootDirectory}/${filename}`,
      asset: { id: asset.id, provider: asset.provider, remoteFileId: asset.remote_file_id,
        filename: asset.filename, mimeType: asset.mime_type, bytes: asset.bytes },
    };
  };
  const tracks = ordered.map((track, index) => {
    const version = byVersion.get(track.versionId);
    const song = songs.get(track.songId);
    const asset = version && assets.get(version.source_asset_id);
    if (!song || !version || version.song_id !== song.id || !asset || asset.asset_type !== "audio_original") {
      throw new ReleaseDownloadError(409, "A private original is missing or belongs to another artist. No partial archive was created.");
    }
    const title = post.post_type === "single" ? song.title : track.title || song.title;
    const suffix = post.post_type === "single" ? ` — ${version.version_label || `v${version.version_number}`}` : "";
    return { ...entry(asset, `${String(index + 1).padStart(2, "0")} - ${title}${suffix}`),
      trackNumber: track.number, title, songId: song.id, versionId: version.id,
      versionLabel: version.version_label, versionNumber: version.version_number,
      productionStage: version.production_stage, musicalKey: song.musical_key, tempoBpm: song.tempo_bpm };
  });
  const cover = post.artwork_asset_id ? assets.get(post.artwork_asset_id) : null;
  if (post.artwork_asset_id && (!cover || cover.asset_type !== "cover_artwork")) {
    throw new ReleaseDownloadError(409, "The release cover is missing or belongs to another artist.");
  }
  return { formatVersion: 1 as const, generatedAt: new Date().toISOString(),
    archiveName: `${rootDirectory}.zip`, rootDirectory,
    post: { id: post.id, title: post.title, type: post.post_type, description: post.description, releaseNotes: post.release_notes },
    tracks, artwork: cover ? entry(cover, "Cover") : null };
}

export async function registerReleaseDownloadRoutes(app: FastifyInstance) {
  app.get("/v1/releases/:postId/download-manifest", async (request, reply) => {
    const user = await verifySupabaseBearerToken(request.headers.authorization);
    const { postId } = request.params as { postId: string };
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(postId)) {
      return reply.code(400).send({ error: "Invalid release ID." });
    }
    try {
      const manifest = await getReleaseDownloadManifest(postId, user.id);
      return reply.header("Cache-Control", "private, no-store").send(manifest);
    } catch (error) {
      if (error instanceof ReleaseDownloadError) return reply.code(error.statusCode).send({ error: error.message });
      throw error;
    }
  });
}
