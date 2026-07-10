import { describe, expect, it } from "vitest";

import { buildCloudConnectionUpsert, getStoredDriveFolders } from "@/features/drive/google-drive-connection";

describe("stored drive folders", () => {
  it("returns null when a persisted folder id is invalid", () => {
    expect(
      getStoredDriveFolders({
        id: "connection-1",
        profile_id: "profile-1",
        provider: "google_drive",
        provider_account_email: "artist@example.com",
        root_folder_id: "root-1",
        audio_originals_folder_id: ".",
        audio_previews_folder_id: "previews-1",
        artwork_folder_id: "artwork-1",
        avatars_folder_id: "avatars-1",
        connected_at: "2026-07-08T10:00:00.000Z",
        last_verified_at: "2026-07-08T10:00:00.000Z",
      }),
    ).toBeNull();
  });
});

describe("cloud connection upsert payload", () => {
  it("maps provider folders into the Supabase payload", () => {
    const payload = buildCloudConnectionUpsert("profile-1", {
      provider: "google_drive",
      email: "artist@example.com",
      accessToken: "token",
      expiresAt: null,
      folders: {
        rootFolderId: "root-1",
        audioFolderId: "audio-1",
        audioOriginalsFolderId: "originals-1",
        audioPreviewsFolderId: "previews-1",
        artworkFolderId: "artwork-1",
        avatarsFolderId: "avatars-1",
      },
    });

    expect(payload.profile_id).toBe("profile-1");
    expect(payload.provider_account_email).toBe("artist@example.com");
    expect(payload.root_folder_id).toBe("root-1");
    expect(payload.audio_originals_folder_id).toBe("originals-1");
    expect(payload.audio_previews_folder_id).toBe("previews-1");
    expect(payload.artwork_folder_id).toBe("artwork-1");
    expect(payload.avatars_folder_id).toBe("avatars-1");
  });
});
