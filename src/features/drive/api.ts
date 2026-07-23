import { demoAssets, demoCloudConnection } from "@/lib/demo-data";
import { createDemoDelay, isDemoModeEnabled, requireSupabase } from "@/lib/service-utils";
import type {
  Asset,
  AssetType,
  CloudConnection,
  PreviewGeneration,
  ProtectedMediaQuota,
  Visibility,
  WaveformDataV1,
} from "@/types/domain";

import type { CloudAssetResult } from "@/features/drive/providers/cloud-storage";

export async function getCloudConnection(profileId: string) {
  if (isDemoModeEnabled()) {
    await createDemoDelay();
    return demoCloudConnection;
  }

  const client = requireSupabase();
  const { data, error } = await client
    .from("cloud_connections")
    .select("*")
    .eq("profile_id", profileId)
    .eq("provider", "google_drive")
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as CloudConnection | null;
}

export async function getCloudConnections(profileId: string) {
  if (isDemoModeEnabled()) {
    await createDemoDelay();
    return [demoCloudConnection];
  }
  const client = requireSupabase();
  const { data, error } = await client
    .from("cloud_connections")
    .select("*")
    .eq("profile_id", profileId)
    .order("is_default", { ascending: false })
    .order("connected_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as CloudConnection[];
}

export async function getProtectedMediaQuota(profileId: string) {
  if (isDemoModeEnabled()) {
    await createDemoDelay();
    return {
      profile_id: profileId,
      used_bytes: 0,
      reserved_bytes: 0,
      attachment_used_bytes: 0,
      attachment_reserved_bytes: 0,
      protected_limit_bytes: 2 * 1024 ** 3,
      attachment_limit_bytes: 500 * 1024 ** 2,
      updated_at: new Date().toISOString(),
    } satisfies ProtectedMediaQuota;
  }
  const client = requireSupabase();
  const { data, error } = await client
    .from("protected_media_quotas")
    .select("*")
    .eq("profile_id", profileId)
    .maybeSingle();
  if (error) throw error;
  return data as ProtectedMediaQuota | null;
}

export async function setDefaultCloudProvider(provider: CloudConnection["provider"]) {
  const client = requireSupabase();
  const { data: authData, error: authError } = await client.auth.getUser();
  if (authError) throw authError;
  if (!authData.user) throw new Error("Please sign in first.");

  const { data: connection, error: connectionError } = await client
    .from("cloud_connections")
    .select("id")
    .eq("profile_id", authData.user.id)
    .eq("provider", provider)
    .eq("connection_status", "connected")
    .maybeSingle();
  if (connectionError) throw connectionError;
  if (!connection?.id) throw new Error("Connected cloud provider not found.");

  const { error } = await client.rpc("set_default_cloud_provider", {
    target_connection_id: connection.id,
  });
  if (error) throw error;
}

export async function listOwnedAssets(ownerId: string) {
  if (isDemoModeEnabled()) {
    await createDemoDelay();
    return demoAssets.filter((asset) => asset.owner_id === ownerId);
  }

  const client = requireSupabase();
  const { data, error } = await client
    .from("assets")
    .select("*")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Asset[];
}

export async function updateAssetProviderReference(input: {
  assetId: string;
  upload: CloudAssetResult;
  accessMode: Visibility;
}) {
  if (isDemoModeEnabled()) {
    await createDemoDelay();
    return;
  }

  const client = requireSupabase();
  const { error } = await client
    .from("assets")
    .update({
      provider: input.upload.provider,
      remote_file_id: input.upload.fileId,
      remote_parent_folder_id: input.upload.parentFolderId,
      filename: input.upload.filename,
      mime_type: input.upload.mimeType,
      bytes: input.upload.bytes,
      access_mode: input.accessMode,
      share_url: input.upload.shareUrl,
      view_url: input.upload.viewUrl,
      thumbnail_url: input.upload.thumbnailUrl,
    })
    .eq("id", input.assetId);
  if (error) throw error;
}

export async function upsertCloudConnection(input: Partial<CloudConnection> & { profile_id: string }) {
  if (isDemoModeEnabled()) {
    await createDemoDelay(200);
    return {
      ...demoCloudConnection,
      ...input,
      last_verified_at: new Date().toISOString(),
    };
  }

  const client = requireSupabase();
  const { data, error } = await client
    .from("cloud_connections")
    .upsert(input, { onConflict: "profile_id,provider" })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as CloudConnection;
}

export async function createAssetRecord(input: {
  ownerId: string;
  assetType: AssetType;
  accessMode: Visibility;
  upload: CloudAssetResult;
  checksum?: string | null;
  durationSeconds?: number | null;
  waveformPeaks?: WaveformDataV1 | number[] | null;
  derivedFromAssetId?: string | null;
  processingJobId?: string | null;
  previewGeneration?: PreviewGeneration | null;
  codec?: string | null;
  sampleRateHz?: number | null;
  channels?: number | null;
  bitRateBps?: number | null;
  waveformVersion?: number | null;
  waveformBucketCount?: number | null;
  waveformGeneratedAt?: string | null;
}) {
  if (isDemoModeEnabled()) {
    await createDemoDelay(180);
    return {
      id: crypto.randomUUID(),
      owner_id: input.ownerId,
      provider: input.upload.provider ?? "google_drive",
      remote_file_id: input.upload.fileId,
      remote_parent_folder_id: input.upload.parentFolderId,
      filename: input.upload.filename,
      display_name: input.upload.filename,
      mime_type: input.upload.mimeType,
      file_extension: input.upload.filename.slice(input.upload.filename.lastIndexOf(".")),
      bytes: input.upload.bytes,
      duration_seconds: input.durationSeconds ?? null,
      checksum: input.checksum ?? null,
      asset_type: input.assetType,
      access_mode: input.accessMode,
      share_url: input.upload.shareUrl,
      view_url: input.upload.viewUrl,
      thumbnail_url: input.upload.thumbnailUrl,
      waveform_peaks: input.waveformPeaks ?? null,
      derived_from_asset_id: input.derivedFromAssetId ?? null,
      processing_job_id: input.processingJobId ?? null,
      preview_generation: input.previewGeneration ?? null,
      codec: input.codec ?? null,
      sample_rate_hz: input.sampleRateHz ?? null,
      channels: input.channels ?? null,
      bit_rate_bps: input.bitRateBps ?? null,
      waveform_version: input.waveformVersion ?? null,
      waveform_bucket_count: input.waveformBucketCount ?? null,
      waveform_generated_at: input.waveformGeneratedAt ?? null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } satisfies Asset;
  }

  const client = requireSupabase();
  const { data, error } = await client
    .from("assets")
    .insert({
      owner_id: input.ownerId,
      provider: input.upload.provider ?? "google_drive",
      remote_file_id: input.upload.fileId,
      remote_parent_folder_id: input.upload.parentFolderId,
      filename: input.upload.filename,
      display_name: input.upload.filename,
      mime_type: input.upload.mimeType,
      file_extension: input.upload.filename.slice(input.upload.filename.lastIndexOf(".")),
      bytes: input.upload.bytes,
      duration_seconds: input.durationSeconds ?? null,
      checksum: input.checksum ?? null,
      asset_type: input.assetType,
      access_mode: input.accessMode,
      share_url: input.upload.shareUrl,
      view_url: input.upload.viewUrl,
      thumbnail_url: input.upload.thumbnailUrl,
      waveform_peaks: input.waveformPeaks ?? null,
      derived_from_asset_id: input.derivedFromAssetId ?? null,
      processing_job_id: input.processingJobId ?? null,
      preview_generation: input.previewGeneration ?? null,
      codec: input.codec ?? null,
      sample_rate_hz: input.sampleRateHz ?? null,
      channels: input.channels ?? null,
      bit_rate_bps: input.bitRateBps ?? null,
      waveform_version: input.waveformVersion ?? null,
      waveform_bucket_count: input.waveformBucketCount ?? null,
      waveform_generated_at: input.waveformGeneratedAt ?? null,
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as Asset;
}

export async function getAssetById(assetId: string) {
  if (isDemoModeEnabled()) {
    await createDemoDelay(120);
    return demoAssets.find((asset) => asset.id === assetId) ?? null;
  }

  const client = requireSupabase();
  const { data, error } = await client
    .from("assets")
    .select("*")
    .eq("id", assetId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as Asset | null;
}

export async function updateAssetPublicLinks(input: {
  assetId: string;
  accessMode: Visibility;
  shareUrl: string | null;
  viewUrl: string | null;
}) {
  if (isDemoModeEnabled()) {
    await createDemoDelay(120);
    return;
  }

  const client = requireSupabase();
  const { error } = await client
    .from("assets")
    .update({
      access_mode: input.accessMode,
      share_url: input.shareUrl,
      view_url: input.viewUrl,
    })
    .eq("id", input.assetId);

  if (error) {
    throw error;
  }
}

export interface AssetReferenceSummary {
  sourceVersionCount: number;
  previewVersionCount: number;
  releaseTrackCount: number;
  songArtworkCount: number;
  postArtworkCount: number;
  profileAvatarCount: number;
}

export async function getAssetReferenceSummary(assetId: string): Promise<AssetReferenceSummary> {
  if (isDemoModeEnabled()) {
    await createDemoDelay(100);
    return {
      sourceVersionCount: 0,
      previewVersionCount: 0,
      releaseTrackCount: 0,
      songArtworkCount: 0,
      postArtworkCount: 0,
      profileAvatarCount: 0,
    };
  }

  const client = requireSupabase();
  const [
    sourceVersions,
    previewVersions,
    releaseTracks,
    songArtwork,
    postArtwork,
    profileAvatar,
  ] = await Promise.all([
    client.from("song_versions").select("id", { count: "exact", head: true }).eq("source_asset_id", assetId),
    client.from("song_versions").select("id", { count: "exact", head: true }).eq("preview_asset_id", assetId),
    client.from("release_tracks").select("id", { count: "exact", head: true }).eq("preview_asset_id", assetId),
    client.from("songs").select("id", { count: "exact", head: true }).eq("default_artwork_asset_id", assetId),
    client.from("posts").select("id", { count: "exact", head: true }).eq("artwork_asset_id", assetId),
    client.from("profiles").select("id", { count: "exact", head: true }).eq("avatar_asset_id", assetId),
  ]);

  if (sourceVersions.error) throw sourceVersions.error;
  if (previewVersions.error) throw previewVersions.error;
  if (releaseTracks.error) throw releaseTracks.error;
  if (songArtwork.error) throw songArtwork.error;
  if (postArtwork.error) throw postArtwork.error;
  if (profileAvatar.error) throw profileAvatar.error;

  return {
    sourceVersionCount: sourceVersions.count ?? 0,
    previewVersionCount: previewVersions.count ?? 0,
    releaseTrackCount: releaseTracks.count ?? 0,
    songArtworkCount: songArtwork.count ?? 0,
    postArtworkCount: postArtwork.count ?? 0,
    profileAvatarCount: profileAvatar.count ?? 0,
  };
}

export function getAssetDeletionBlockers(summary: AssetReferenceSummary) {
  const blockers: string[] = [];

  if (summary.sourceVersionCount > 0) {
    blockers.push("a song version as its private source");
  }
  if (summary.previewVersionCount > 0) {
    blockers.push("a song version as its playback preview");
  }
  if (summary.releaseTrackCount > 0) {
    blockers.push("an EP or album track");
  }
  if (summary.songArtworkCount > 0) {
    blockers.push("a song as its default artwork");
  }
  if (summary.postArtworkCount > 0) {
    blockers.push("a post as its artwork");
  }
  if (summary.profileAvatarCount > 0) {
    blockers.push("a profile avatar");
  }

  return blockers;
}

export async function deleteAssetRecord(assetId: string) {
  if (isDemoModeEnabled()) {
    await createDemoDelay(120);
    return;
  }

  const client = requireSupabase();
  const { error } = await client.from("assets").delete().eq("id", assetId);

  if (error) {
    throw error;
  }
}
