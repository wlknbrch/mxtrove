import type { CloudConnection } from "@/types/domain";

import type { CloudConnectionResult, CloudFolderStructure } from "@/features/drive/providers/cloud-storage";

function sanitizeDriveId(value: string | null | undefined) {
  const trimmed = value?.trim();
  if (!trimmed || trimmed === "." || trimmed === "null" || trimmed === "undefined") {
    return null;
  }

  return trimmed;
}

export function getStoredDriveFolders(connection: CloudConnection | null | undefined): CloudFolderStructure | null {
  const rootFolderId = sanitizeDriveId(connection?.root_folder_id);
  const audioOriginalsFolderId = sanitizeDriveId(connection?.audio_originals_folder_id);
  const audioPreviewsFolderId = sanitizeDriveId(connection?.audio_previews_folder_id);
  const artworkFolderId = sanitizeDriveId(connection?.artwork_folder_id);
  const avatarsFolderId = sanitizeDriveId(connection?.avatars_folder_id);
  const exportsFolderId = sanitizeDriveId(connection?.exports_folder_id);

  if (!rootFolderId || !audioOriginalsFolderId || !audioPreviewsFolderId || !artworkFolderId || !avatarsFolderId) {
    return null;
  }

  return {
    rootFolderId,
    audioFolderId: sanitizeDriveId(connection?.root_folder_id) ?? rootFolderId,
    audioOriginalsFolderId,
    audioPreviewsFolderId,
    artworkFolderId,
    avatarsFolderId,
    exportsFolderId: exportsFolderId ?? rootFolderId,
  };
}

export function buildCloudConnectionUpsert(profileId: string, result: CloudConnectionResult) {
  return {
    profile_id: profileId,
    provider: result.provider,
    provider_account_id: result.accountId,
    provider_account_email: result.email,
    root_folder_id: result.folders.rootFolderId,
    audio_originals_folder_id: result.folders.audioOriginalsFolderId,
    audio_previews_folder_id: result.folders.audioPreviewsFolderId,
    artwork_folder_id: result.folders.artworkFolderId,
    avatars_folder_id: result.folders.avatarsFolderId,
    exports_folder_id: result.folders.exportsFolderId,
    is_default: true,
    connection_status: "connected" as const,
    capabilities: {
      private_upload: true,
      resumable_upload: true,
      public_preview: true,
      browser_transfer: true,
      profile_scoped_folders: true,
    },
    last_error: null,
    connected_at: new Date().toISOString(),
    last_verified_at: new Date().toISOString(),
  };
}
