import { describe, expect, it } from "vitest";

import { buildSongInsertPayload } from "@/features/library/library-domain";
import { getNextVersionNumber, shouldBumpPostActivityForRelease, canUseAssetForPublicPlayback } from "@/lib/song-utils";
import { usernameSchema } from "@/lib/validators";

describe("username validation", () => {
  it("accepts lowercase usernames with underscores", () => {
    expect(() => usernameSchema.parse("kai_orion42")).not.toThrow();
  });

  it("rejects uppercase letters and spaces", () => {
    expect(() => usernameSchema.parse("Kai Orion")).toThrow();
  });
});

describe("song creation payload", () => {
  it("builds a trimmed song payload with nullable notes", () => {
    expect(
      buildSongInsertPayload("user-1", {
        title: "  Eternal Light  ",
        notes: "   ",
        default_artwork_asset_id: null,
      }),
    ).toEqual({
      owner_id: "user-1",
      title: "Eternal Light",
      notes: null,
      default_artwork_asset_id: null,
    });
  });
});

describe("version numbering", () => {
  it("calculates the next version number from existing versions", () => {
    expect(getNextVersionNumber([{ version_number: 1 }, { version_number: 2 }, { version_number: 4 }])).toBe(5);
  });
});

describe("activity bump rules", () => {
  it("bumps activity for single updates", () => {
    expect(
      shouldBumpPostActivityForRelease({
        postType: "single",
        changeKind: "new_version",
      }),
    ).toBe(true);
  });

  it("does not bump activity for album track changes", () => {
    expect(
      shouldBumpPostActivityForRelease({
        postType: "album",
        changeKind: "track_reorder",
      }),
    ).toBe(false);
  });
});

describe("public playback rules", () => {
  it("rejects private originals as public player assets", () => {
    expect(
      canUseAssetForPublicPlayback({
        asset_type: "audio_original",
        access_mode: "private",
        file_extension: ".wav",
      }),
    ).toBe(false);
  });

  it("accepts public preview assets in browser-friendly formats", () => {
    expect(
      canUseAssetForPublicPlayback({
        asset_type: "audio_preview",
        access_mode: "public",
        file_extension: ".mp3",
      }),
    ).toBe(true);
  });
});
