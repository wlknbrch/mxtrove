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
    if (await provider.restoreSession()) {
      return provider.ensureRootStructure();
    }
    const result = await provider.connect();
    await upsertCloudConnection({
      ...buildCloudConnectionUpsert(profileId, result),
      is_default: connection?.is_default ?? !(connectionsQuery.data?.length),
    });
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["cloud-connections", profileId] }),
      queryClient.invalidateQueries({ queryKey: ["cloud-connection", profileId] }),
    ]);
    return result.folders;
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
