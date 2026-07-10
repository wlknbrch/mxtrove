import type { Asset, SongVersion } from "@/types/domain";

export function getNextVersionNumber(versions: Array<Pick<SongVersion, "version_number">>) {
  if (versions.length === 0) {
    return 1;
  }

  return Math.max(...versions.map((version) => version.version_number)) + 1;
}

export function shouldBumpPostActivityForRelease(params: {
  postType: "single" | "ep" | "album";
  changeKind: "new_version" | "metadata_update" | "track_reorder" | "track_replace";
}) {
  if (params.postType === "single" && params.changeKind === "new_version") {
    return true;
  }

  return false;
}

export function canUseAssetForPublicPlayback(asset: Pick<Asset, "asset_type" | "access_mode" | "file_extension">) {
  const extension = asset.file_extension.toLowerCase();
  const isBrowserFriendly = [".mp3", ".m4a", ".aac", ".ogg"].includes(extension);
  return (
    asset.asset_type === "audio_preview" &&
    asset.access_mode === "public" &&
    isBrowserFriendly
  );
}

export function isPublicPreviewRecommended(extension: string) {
  return [".mp3", ".m4a", ".aac", ".ogg"].includes(extension.toLowerCase());
}
