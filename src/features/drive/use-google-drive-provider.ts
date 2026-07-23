import { useMemo } from "react";

import { getCloudStorageProvider } from "@/features/cloud-providers/provider-registry";
import type { GoogleDriveProvider } from "@/features/drive/providers/google-drive-provider";

export function useGoogleDriveProvider() {
  return useMemo(() => {
    return getCloudStorageProvider("google_drive") as GoogleDriveProvider;
  }, []);
}
