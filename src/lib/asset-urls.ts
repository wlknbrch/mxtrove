import { env } from "@/lib/env";

import type { Asset } from "@/types/domain";

const GOOGLE_DRIVE_HOST = "https://drive.google.com";
const GOOGLE_DRIVE_USERCONTENT_HOST = "https://drive.usercontent.google.com";
const GOOGLE_DRIVE_IMAGE_HOST = "https://lh3.googleusercontent.com";
const DRIVE_MEDIA_BLOB_HOSTS = new Set([
  "drive.google.com",
  "drive.usercontent.google.com",
  "lh3.googleusercontent.com",
]);
const LOCAL_APP_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

export function isInlineAssetUrl(value: string | null | undefined) {
  return Boolean(value && (value.startsWith("data:") || value.startsWith("blob:")));
}

function encodeFileId(fileId: string) {
  return encodeURIComponent(fileId);
}

function getSupabaseFunctionsBaseUrl() {
  if (!env.supabaseUrl) {
    return null;
  }

  try {
    const url = new URL(env.supabaseUrl);
    const projectRef = url.hostname.split(".")[0];
    return `https://${projectRef}.functions.supabase.co`;
  } catch {
    return null;
  }
}

function getDriveMediaProxyBaseUrl() {
  if (typeof window !== "undefined" && LOCAL_APP_HOSTS.has(window.location.hostname)) {
    return `${window.location.origin}/api/drive-media`;
  }

  const functionsBaseUrl = getSupabaseFunctionsBaseUrl();
  return functionsBaseUrl ? `${functionsBaseUrl}/drive-media` : null;
}

export function buildGoogleDrivePublicImageUrl(fileId: string) {
  return `${GOOGLE_DRIVE_HOST}/uc?export=view&id=${encodeFileId(fileId)}`;
}

export function buildGoogleDrivePublicDownloadUrl(fileId: string) {
  return `${GOOGLE_DRIVE_HOST}/uc?export=download&id=${encodeFileId(fileId)}`;
}

export function buildGoogleDriveUserContentUrl(fileId: string, exportMode: "download" | "view" = "download") {
  return `${GOOGLE_DRIVE_USERCONTENT_HOST}/download?id=${encodeFileId(fileId)}&export=${exportMode}&authuser=0`;
}

export function buildGoogleDriveThumbnailUrl(fileId: string, size = "w1200") {
  return `${GOOGLE_DRIVE_HOST}/thumbnail?id=${encodeFileId(fileId)}&sz=${encodeURIComponent(size)}`;
}

export function buildGoogleDriveEmbeddableImageUrl(fileId: string, size = "w1200") {
  return `${GOOGLE_DRIVE_IMAGE_HOST}/d/${encodeFileId(fileId)}=${encodeURIComponent(size)}`;
}

export function buildGoogleDriveFilePageUrl(fileId: string) {
  return `${GOOGLE_DRIVE_HOST}/file/d/${encodeFileId(fileId)}/view`;
}

export function buildGoogleDriveFilePreviewUrl(fileId: string) {
  return `${GOOGLE_DRIVE_HOST}/file/d/${encodeFileId(fileId)}/preview`;
}

export function buildDriveMediaProxyUrl(
  fileId: string,
  kind: "audio" | "image",
  options?: { size?: string | null },
) {
  const baseUrl = getDriveMediaProxyBaseUrl();
  if (!baseUrl) {
    return null;
  }

  const url = new URL(baseUrl);
  url.searchParams.set("fileId", fileId);
  url.searchParams.set("kind", kind);

  if (kind === "image" && options?.size) {
    url.searchParams.set("size", options.size);
  }

  return url.toString();
}

export function buildGoogleDrivePublicAssetLinks(fileId: string) {
  return {
    shareUrl: buildGoogleDrivePublicDownloadUrl(fileId),
    viewUrl: buildGoogleDriveFilePageUrl(fileId),
    imageUrl: buildDriveMediaProxyUrl(fileId, "image", { size: "w1200" }) ?? buildGoogleDriveEmbeddableImageUrl(fileId),
  };
}

function shouldDeriveGoogleDriveUrl(asset: Pick<Asset, "provider" | "remote_file_id" | "share_url">) {
  return asset.provider === "google_drive" && Boolean(asset.remote_file_id) && !isInlineAssetUrl(asset.share_url);
}

function uniqueUrls(values: Array<string | null | undefined>) {
  return values.filter((value, index, entries): value is string => Boolean(value) && entries.indexOf(value) === index);
}

export function shouldFetchPublicMediaAsBlob(
  value: string | null | undefined,
  mediaType?: "audio" | "image",
) {
  if (!value || isInlineAssetUrl(value)) {
    return false;
  }

  try {
    const url = new URL(value);
    if (mediaType === "image" && url.hostname === "lh3.googleusercontent.com") {
      return false;
    }
    return DRIVE_MEDIA_BLOB_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}

export function getArtworkAssetUrls(asset: Asset | null | undefined) {
  if (!asset) {
    return [];
  }

  if (shouldDeriveGoogleDriveUrl(asset)) {
    return uniqueUrls([
      buildDriveMediaProxyUrl(asset.remote_file_id, "image", { size: "w1200" }),
      isInlineAssetUrl(asset.share_url) ? asset.share_url : null,
      isInlineAssetUrl(asset.thumbnail_url) ? asset.thumbnail_url : null,
      buildGoogleDriveEmbeddableImageUrl(asset.remote_file_id),
      buildGoogleDriveThumbnailUrl(asset.remote_file_id),
      buildGoogleDriveUserContentUrl(asset.remote_file_id, "view"),
      asset.thumbnail_url,
      asset.share_url,
      asset.view_url,
    ]);
  }

  return uniqueUrls([asset.thumbnail_url, asset.share_url, asset.view_url]);
}

export function getArtworkAssetUrl(asset: Asset | null | undefined) {
  return getArtworkAssetUrls(asset)[0] ?? null;
}

export function getAvatarAssetUrl(asset: Asset | null | undefined) {
  return getArtworkAssetUrl(asset);
}

export function getAvatarAssetUrls(asset: Asset | null | undefined) {
  return getArtworkAssetUrls(asset);
}

export function getPreviewPlaybackUrls(asset: Asset | null | undefined) {
  if (!asset) {
    return [];
  }

  if (isInlineAssetUrl(asset.share_url)) {
    return uniqueUrls([asset.share_url]);
  }

  if (shouldDeriveGoogleDriveUrl(asset)) {
    return uniqueUrls([
      buildDriveMediaProxyUrl(asset.remote_file_id, "audio"),
      asset.share_url,
      buildGoogleDriveUserContentUrl(asset.remote_file_id, "download"),
      buildGoogleDrivePublicDownloadUrl(asset.remote_file_id),
      asset.view_url,
    ]);
  }

  return uniqueUrls([asset.share_url, asset.view_url]);
}

export function getPreviewPlaybackUrl(asset: Asset | null | undefined) {
  return getPreviewPlaybackUrls(asset)[0] ?? null;
}
