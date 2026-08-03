import { describe, expect, it } from "vitest";

import { getVisiblePostLyrics } from "@/features/posts/lyrics-visibility";

describe("post lyrics visibility", () => {
  it("shows lyrics that were enabled for the release", () => {
    expect(getVisiblePostLyrics({
      lyrics: "First line",
      showLyrics: true,
      ownerId: "owner",
      viewerId: "listener",
    })).toBe("First line");
  });

  it("lets an owner manage lyrics hidden on an older release", () => {
    expect(getVisiblePostLyrics({
      lyrics: "First line",
      showLyrics: false,
      ownerId: "owner",
      viewerId: "owner",
    })).toBe("First line");
  });

  it("keeps hidden lyrics private from other and anonymous viewers", () => {
    const baseInput = {
      lyrics: "First line",
      showLyrics: false,
      ownerId: "owner",
    };

    expect(getVisiblePostLyrics({ ...baseInput, viewerId: "listener" })).toBeNull();
    expect(getVisiblePostLyrics(baseInput)).toBeNull();
  });
});
