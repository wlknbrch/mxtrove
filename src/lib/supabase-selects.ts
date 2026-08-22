import type { Asset } from "@/types/domain";

export const ASSET_SELECT_WITHOUT_WAVEFORM = [
  "id",
  "owner_id",
  "provider",
  "remote_file_id",
  "remote_parent_folder_id",
  "filename",
  "display_name",
  "mime_type",
  "file_extension",
  "bytes",
  "duration_seconds",
  "checksum",
  "asset_type",
  "access_mode",
  "share_url",
  "view_url",
  "thumbnail_url",
  "derived_from_asset_id",
  "processing_job_id",
  "preview_generation",
  "codec",
  "sample_rate_hz",
  "channels",
  "bit_rate_bps",
  "waveform_version",
  "waveform_bucket_count",
  "waveform_generated_at",
  "created_at",
  "updated_at",
].join(", ");

type AssetWithoutWaveform = Omit<Asset, "waveform_peaks">;

export function withNullAssetWaveform(asset: AssetWithoutWaveform): Asset {
  return {
    ...asset,
    waveform_peaks: null,
  };
}
