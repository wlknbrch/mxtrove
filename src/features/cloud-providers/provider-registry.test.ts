import { describe, expect, it } from "vitest";

import {
  getCloudStorageProvider,
  listCloudStorageProviders,
} from "@/features/cloud-providers/provider-registry";

describe("cloud provider registry", () => {
  it("exposes one implementation for every supported V2 provider", () => {
    expect(listCloudStorageProviders().map((provider) => provider.provider).sort()).toEqual([
      "dropbox",
      "google_drive",
      "onedrive",
    ]);
  });

  it("returns stable provider instances for upload routing", () => {
    expect(getCloudStorageProvider("google_drive").provider).toBe("google_drive");
    expect(getCloudStorageProvider("dropbox").provider).toBe("dropbox");
    expect(getCloudStorageProvider("onedrive").provider).toBe("onedrive");
    expect(getCloudStorageProvider("dropbox")).toBe(getCloudStorageProvider("dropbox"));
  });
});
