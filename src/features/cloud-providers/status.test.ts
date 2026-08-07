import { describe, expect, it } from "vitest";

import { getActiveCloudConnection, getCloudStorageStatus } from "@/features/cloud-providers/status";
import type { CloudConnection, CloudProvider } from "@/types/domain";

function connection(
  provider: CloudProvider,
  overrides: Partial<CloudConnection> = {},
): CloudConnection {
  return {
    id: provider,
    profile_id: "profile-1",
    provider,
    provider_account_id: null,
    provider_account_email: `${provider}@example.com`,
    root_folder_id: "root",
    audio_originals_folder_id: "originals",
    audio_previews_folder_id: "previews",
    artwork_folder_id: "artwork",
    avatars_folder_id: "avatars",
    exports_folder_id: "exports",
    is_default: false,
    connection_status: "connected",
    capabilities: {},
    last_error: null,
    connected_at: "2026-08-06T00:00:00.000Z",
    last_verified_at: null,
    updated_at: "2026-08-06T00:00:00.000Z",
    ...overrides,
  };
}

describe("cloud storage status", () => {
  it("uses a connected default provider instead of preferring Google Drive", () => {
    const google = connection("google_drive", { connection_status: "disconnected" });
    const dropbox = connection("dropbox", { is_default: true });

    expect(getActiveCloudConnection([google, dropbox])).toBe(dropbox);
    expect(getCloudStorageStatus([google, dropbox]).storageReady).toBe(true);
  });

  it("falls back to the only connected provider", () => {
    const dropbox = connection("dropbox");
    const status = getCloudStorageStatus([dropbox]);

    expect(status.activeConnection).toBe(dropbox);
    expect(status.readyConnections).toHaveLength(1);
  });

  it("requires a complete folder structure for upload readiness", () => {
    const incomplete = connection("onedrive", { artwork_folder_id: null });

    expect(getCloudStorageStatus([incomplete]).storageReady).toBe(false);
  });
});
