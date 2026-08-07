import { getStoredDriveFolders } from "@/features/drive/google-drive-connection";
import type { CloudConnection, CloudProvider } from "@/types/domain";

const providerLabels: Record<CloudProvider, string> = {
  google_drive: "Google Drive",
  dropbox: "Dropbox",
  onedrive: "OneDrive",
};

export function getCloudProviderLabel(provider: CloudProvider | null | undefined) {
  return provider ? providerLabels[provider] : "Cloud storage";
}

export function isCloudConnectionReady(connection: CloudConnection | null | undefined) {
  return Boolean(
    connection?.connection_status === "connected"
    && getStoredDriveFolders(connection),
  );
}

export function getActiveCloudConnection(
  connections: CloudConnection[] | null | undefined,
) {
  const connected = (connections ?? []).filter(
    (connection) => connection.connection_status === "connected",
  );

  return connected.find((connection) => connection.is_default)
    ?? connected[0]
    ?? (connections ?? []).find((connection) => connection.is_default)
    ?? connections?.[0]
    ?? null;
}

export function getCloudStorageStatus(
  connections: CloudConnection[] | null | undefined,
) {
  const activeConnection = getActiveCloudConnection(connections);
  const connectedConnections = (connections ?? []).filter(
    (connection) => connection.connection_status === "connected",
  );
  const readyConnections = connectedConnections.filter(isCloudConnectionReady);

  return {
    activeConnection,
    activeFolders: getStoredDriveFolders(activeConnection),
    connectedConnections,
    readyConnections,
    storageReady: readyConnections.length > 0,
  };
}
