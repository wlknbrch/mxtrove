import { getAssetWaveform } from "@/lib/waveform";

import type { Asset, SongVersion } from "@/types/domain";

export function hasUsablePreviewAsset(asset: Asset | null | undefined) {
  if (!asset || asset.asset_type !== "audio_preview") {
    return false;
  }

  if (!asset.remote_file_id || !asset.share_url || !asset.duration_seconds || asset.duration_seconds <= 0) {
    return false;
  }

  if (typeof asset.bytes === "number" && asset.bytes <= 0) {
    return false;
  }

  return true;
}

export function needsWaveformRepair(asset: Asset | null | undefined) {
  return !getAssetWaveform(asset);
}

export function needsVersionPlaybackRepair(
  version: Pick<SongVersion, "preview_asset_id">,
  assetsById: Map<string, Asset>,
) {
  if (!version.preview_asset_id) {
    return true;
  }

  const previewAsset = assetsById.get(version.preview_asset_id) ?? null;
  return !hasUsablePreviewAsset(previewAsset) || needsWaveformRepair(previewAsset);
}
