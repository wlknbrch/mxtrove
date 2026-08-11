import { useQuery } from "@tanstack/react-query";

import { getCloudStorageProvider } from "@/features/cloud-providers/provider-registry";
import { getCloudConnections, upsertCloudConnection } from "@/features/drive/api";
import { buildCloudConnectionUpsert, getStoredDriveFolders } from "@/features/drive/google-drive-connection";
import { queryClient } from "@/lib/query-client";
import type { CloudProvider } from "@/types/domain";

export function useCloudUploadProvider(
  profileId: string | null,
  preferredProvider?: CloudProvider | null,
) {
  const connectionsQuery = useQuery({
    queryKey: ["cloud-connections", profileId],
    queryFn: () => getCloudConnections(profileId!),
    enabled: Boolean(profileId),
  });
  const connection =
    connectionsQuery.data?.find(
      (entry) =>
        entry.provider === preferredProvider &&
        entry.connection_status === "connected",
    )
    ?? connectionsQuery.data?.find(
      (entry) => entry.is_default && entry.connection_status === "connected",
    )
    ?? connectionsQuery.data?.find((entry) => entry.connection_status === "connected")
    ?? null;
  const providerId = connection?.provider ?? preferredProvider ?? "google_drive";
  const provider = getCloudStorageProvider(providerId);
  const storedFolders = getStoredDriveFolders(connection);

  async function ensureFolders() {
    if (!profileId) throw new Error("Please sign in first.");
    const restored = await provider.restoreSession();
    const result = restored ? null : await provider.connect(profileId);
    const folders = result?.folders ?? await provider.ensureRootStructure(profileId);
    await upsertCloudConnection(result
      ? {
          ...buildCloudConnectionUpsert(profileId, result),
          is_default: connection?.is_default ?? !(connectionsQuery.data?.length),
        }
      : {
          profile_id: profileId,
          provider: providerId,
          root_folder_id: folders.rootFolderId,
          audio_originals_folder_id: folders.audioOriginalsFolderId,
          audio_previews_folder_id: folders.audioPreviewsFolderId,
          artwork_folder_id: folders.artworkFolderId,
          avatars_folder_id: folders.avatarsFolderId,
          exports_folder_id: folders.exportsFolderId,
          connection_status: "connected",
          capabilities: {
            ...(connection?.capabilities ?? {}),
            profile_scoped_folders: true,
          },
          last_verified_at: new Date().toISOString(),
        });
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["cloud-connections", profileId] }),
      queryClient.invalidateQueries({ queryKey: ["cloud-connection", profileId] }),
    ]);
    return folders;
  }

  return {
    connectionsQuery,
    connection,
    provider,
    providerId,
    storedFolders,
    ensureFolders,
  };
}
