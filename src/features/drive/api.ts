import { demoAssets, demoCloudConnection } from "@/lib/demo-data";
import { createDemoDelay, isDemoModeEnabled, requireSupabase } from "@/lib/service-utils";
import type { Asset, AssetType, CloudConnection, Visibility } from "@/types/domain";

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
    .upsert(input)
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
  waveformPeaks?: number[] | null;
}) {
  if (isDemoModeEnabled()) {
    await createDemoDelay(180);
    return {
      id: crypto.randomUUID(),
      owner_id: input.ownerId,
      provider: "google_drive",
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
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } satisfies Asset;
  }

  const client = requireSupabase();
  const { data, error } = await client
    .from("assets")
    .insert({
      owner_id: input.ownerId,
      provider: "google_drive",
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
