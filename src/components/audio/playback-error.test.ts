import { describe, expect, it } from "vitest";

import { shouldReportPlaybackError } from "@/components/audio/playback-error";

const activeFailure = {
  expectedTrackId: "track-1",
  activeTrackId: "track-1",
  loadedTrackId: "track-1",
  expectedSource: "https://example.com/preview.mp3",
  currentSource: "https://example.com/preview.mp3",
  isPlaying: true,
  isPaused: true,
};

describe("shouldReportPlaybackError", () => {
  it("reports a terminal failure for the active source", () => {
    expect(shouldReportPlaybackError(activeFailure)).toBe(true);
  });

  it("stays silent after playback recovers", () => {
    expect(shouldReportPlaybackError({ ...activeFailure, isPaused: false })).toBe(false);
  });

  it("stays silent when the queue moves to another track", () => {
    expect(shouldReportPlaybackError({ ...activeFailure, activeTrackId: "track-2" })).toBe(false);
  });

  it("stays silent when a fallback replaces the failed source", () => {
    expect(
      shouldReportPlaybackError({
        ...activeFailure,
        currentSource: "blob:http://localhost/fallback-preview",
      }),
    ).toBe(false);
  });
});
