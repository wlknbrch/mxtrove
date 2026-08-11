import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GoogleDriveProvider } from "@/features/drive/providers/google-drive-provider";
import { env } from "@/lib/env";

describe("GoogleDriveProvider MxTrove folder compatibility", () => {
  const originalClientId = env.googleDriveClientId;

  beforeEach(() => {
    env.googleDriveClientId = "google-client-id";
    window.google = {
      accounts: {
        oauth2: {
          initTokenClient: (config) => ({
            requestAccessToken: () => {
              config.callback({
                access_token: "google-access-token",
                expires_in: 3600,
              });
            },
          }),
        },
      },
    };
  });

  afterEach(() => {
    env.googleDriveClientId = originalClientId;
    delete window.google;
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("renames the saved legacy root by ID without recreating its children", async () => {
    const requests: Array<{ method: string; url: string; body: string | null }> = [];
    vi.stubGlobal("fetch", vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";
      requests.push({
        method,
        url,
        body: typeof init?.body === "string" ? init.body : null,
      });

      if (url.includes("/drive/v3/files/root-folder-id?fields=id,name,trashed")) {
        return Response.json({
          id: "root-folder-id",
          name: "MxShare",
          trashed: false,
        });
      }
      if (url.includes("/drive/v3/files?q=")) {
        return Response.json({ files: [] });
      }
      if (url.includes("/drive/v3/files/root-folder-id?fields=id,name") && method === "PATCH") {
        return Response.json({
          id: "root-folder-id",
          name: "MxTrove",
        });
      }

      throw new Error(`Unexpected Google Drive request: ${method} ${url}`);
    }));

    const folders = {
      rootFolderId: "root-folder-id",
      audioFolderId: "audio-folder-id",
      audioOriginalsFolderId: "originals-folder-id",
      audioPreviewsFolderId: "previews-folder-id",
      artworkFolderId: "artwork-folder-id",
      avatarsFolderId: "avatars-folder-id",
      exportsFolderId: "exports-folder-id",
    };
    const provider = new GoogleDriveProvider();
    provider.hydrateConnection({ folders, email: "artist@example.com" });

    await expect(provider.ensureRootStructure()).resolves.toEqual(folders);
    expect(requests).toContainEqual({
      method: "PATCH",
      url: "https://www.googleapis.com/drive/v3/files/root-folder-id?fields=id,name",
      body: JSON.stringify({ name: "MxTrove" }),
    });
    expect(requests.some((request) => request.method === "POST")).toBe(false);
  });

  it("keeps cached folder trees isolated by MxTrove profile", () => {
    const folders = {
      rootFolderId: "profile-folder-id",
      audioFolderId: "audio-folder-id",
      audioOriginalsFolderId: "originals-folder-id",
      audioPreviewsFolderId: "previews-folder-id",
      artworkFolderId: "artwork-folder-id",
      avatarsFolderId: "avatars-folder-id",
      exportsFolderId: "exports-folder-id",
    };
    const provider = new GoogleDriveProvider();
    provider.hydrateConnection({ folders, email: "artist@example.com", profileId: "profile-a" });

    expect(provider.getCachedFolders("profile-a")).toEqual(folders);
    expect(provider.getCachedFolders("profile-b")).toBeNull();
  });
});
