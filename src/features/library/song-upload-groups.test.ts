import { describe, expect, it } from "vitest";

import { groupSongsByUploadMonth } from "@/features/library/song-upload-groups";
import type { Song } from "@/types/domain";

function song(id: string, title: string, createdAt: string): Song {
  return {
    id,
    owner_id: "owner",
    title,
    notes: null,
    lyrics: null,
    musical_key: null,
    tempo_bpm: null,
    tempo_confidence: null,
    key_confidence: null,
    audio_analysis_updated_at: null,
    default_artwork_asset_id: null,
    created_at: createdAt,
    updated_at: createdAt,
  };
}

describe("groupSongsByUploadMonth", () => {
  it("groups songs by creation month and keeps newest uploads first", () => {
    const groups = groupSongsByUploadMonth([
      song("july", "July Song", "2026-07-12T10:00:00.000Z"),
      song("august-old", "August One", "2026-08-01T10:00:00.000Z"),
      song("august-new", "August Two", "2026-08-06T10:00:00.000Z"),
    ]);

    expect(groups.map((group) => group.key)).toEqual(["2026-08", "2026-07"]);
    expect(groups[0].songs.map((entry) => entry.id)).toEqual(["august-new", "august-old"]);
  });
});
