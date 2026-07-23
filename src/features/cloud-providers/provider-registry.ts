import { DropboxProvider } from "@/features/dropbox/dropbox-provider";
import { GoogleDriveProvider } from "@/features/drive/providers/google-drive-provider";
import type { CloudStorageProvider } from "@/features/drive/providers/cloud-storage";
import { OneDriveProvider } from "@/features/onedrive/onedrive-provider";
import type { CloudProvider } from "@/types/domain";

const providers: Record<CloudProvider, CloudStorageProvider> = {
  google_drive: new GoogleDriveProvider(),
  dropbox: new DropboxProvider(),
  onedrive: new OneDriveProvider(),
};

export function getCloudStorageProvider(provider: CloudProvider) {
  return providers[provider];
}

export function listCloudStorageProviders() {
  return Object.values(providers);
}
