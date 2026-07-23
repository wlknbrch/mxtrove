import fs from "node:fs/promises";

import { config } from "../config.js";
import { removeJobDir } from "../media/paths.js";
import { protectedMediaStorage } from "../protected-media/index.js";
import { supabaseAdmin } from "../supabase/service.js";

export function collectCleanupAssetIds(
  expiredAssets: Array<{ id: string }>,
  staleReservations: Array<{ id: string }>,
) {
  return Array.from(
    new Set([...expiredAssets, ...staleReservations].map((asset) => asset.id)),
  );
}

export async function runCleanupCycle() {
  const nowIso = new Date().toISOString();

  const { data: jobs, error } = await supabaseAdmin
    .from("media_processing_jobs")
    .select("id, status, expires_at")
    .not("expires_at", "is", null)
    .lt("expires_at", nowIso);

  if (error) {
    throw error;
  }

  for (const job of jobs ?? []) {
    await removeJobDir(job.id);
    await supabaseAdmin
      .from("media_processing_jobs")
      .update({
        status: job.status === "completed" ? "completed" : "expired",
        stage: job.status === "completed" ? "Completed" : "Expired",
        updated_at: nowIso,
      })
      .eq("id", job.id);
  }

  const entries = await fs.readdir(config.mediaTempDir, { withFileTypes: true }).catch(() => []);
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const fullPath = `${config.mediaTempDir}/${entry.name}`;
    const stats = await fs.stat(fullPath).catch(() => null);
    if (!stats) {
      continue;
    }

    if (Date.now() - stats.mtimeMs > config.mediaReadyTtlSeconds * 1000) {
      await fs.rm(fullPath, { recursive: true, force: true });
    }
  }

  const reservationCutoff = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const [{ data: expiredAssets, error: expiredError }, { data: staleReservations, error: staleError }] =
    await Promise.all([
      supabaseAdmin
        .from("protected_media_assets")
        .select("id")
        .eq("status", "ready")
        .not("expires_at", "is", null)
        .lt("expires_at", nowIso),
      supabaseAdmin
        .from("protected_media_assets")
        .select("id")
        .in("status", ["reserved", "processing", "failed"])
        .lt("created_at", reservationCutoff),
    ]);

  if (expiredError) {
    throw expiredError;
  }
  if (staleError) {
    throw staleError;
  }

  const cleanupAssetIds = collectCleanupAssetIds(
    expiredAssets ?? [],
    staleReservations ?? [],
  );
  for (const assetId of cleanupAssetIds) {
    await protectedMediaStorage.delete(assetId).catch(() => undefined);
    const { error: releaseError } = await supabaseAdmin.rpc(
      "release_protected_media_asset",
      { target_asset_id: assetId },
    );
    if (releaseError) {
      throw releaseError;
    }
  }

  const { error: exportExpiryError } = await supabaseAdmin
    .from("data_export_requests")
    .update({ status: "expired" })
    .eq("status", "ready")
    .lt("expires_at", nowIso);
  if (exportExpiryError) {
    throw exportExpiryError;
  }

  const { data: dueDeletions, error: deletionError } = await supabaseAdmin
    .from("account_deletion_requests")
    .select("profile_id")
    .eq("status", "scheduled")
    .lte("scheduled_for", nowIso);
  if (deletionError) {
    throw deletionError;
  }

  for (const request of dueDeletions ?? []) {
    const { data: ownedAssets, error: ownedAssetsError } = await supabaseAdmin
      .from("protected_media_assets")
      .select("id")
      .eq("owner_id", request.profile_id)
      .neq("status", "deleted");
    if (ownedAssetsError) {
      throw ownedAssetsError;
    }

    for (const asset of ownedAssets ?? []) {
      await protectedMediaStorage.delete(asset.id).catch(() => undefined);
      const { error: releaseError } = await supabaseAdmin.rpc(
        "release_protected_media_asset",
        { target_asset_id: asset.id },
      );
      if (releaseError) {
        throw releaseError;
      }
    }

    const { error: requestUpdateError } = await supabaseAdmin
      .from("account_deletion_requests")
      .update({ status: "completed", completed_at: nowIso })
      .eq("profile_id", request.profile_id)
      .eq("status", "scheduled");
    if (requestUpdateError) {
      throw requestUpdateError;
    }

    const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(
      request.profile_id,
    );
    if (deleteUserError) {
      await supabaseAdmin
        .from("account_deletion_requests")
        .update({ status: "scheduled", completed_at: null })
        .eq("profile_id", request.profile_id);
      throw deleteUserError;
    }
  }
}
