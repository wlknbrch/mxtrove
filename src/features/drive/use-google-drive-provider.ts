import { useMemo } from "react";

import { GoogleDriveProvider } from "@/features/drive/providers/google-drive-provider";

let sharedGoogleDriveProvider: GoogleDriveProvider | null = null;

export function useGoogleDriveProvider() {
  return useMemo(() => {
    if (!sharedGoogleDriveProvider) {
      sharedGoogleDriveProvider = new GoogleDriveProvider();
    }

    return sharedGoogleDriveProvider;
  }, []);
}
