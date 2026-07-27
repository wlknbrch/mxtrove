import { beforeEach, describe, expect, it } from "vitest";

import {
  type PlaybackTrack,
  usePlayerStore,
} from "@/components/audio/player-store";

const tracks: PlaybackTrack[] = [
  {
    id: "one",
    title: "First",
    artistName: "MxTrove",
    src: "/first.mp3",
  },
  {
    id: "two",
    title: "Second",
    artistName: "MxTrove",
    src: "/second.mp3",
  },
];

describe("player queue state", () => {
  beforeEach(() => {
    usePlayerStore.setState({
      queue: [],
      activeTrackId: null,
      isPlaying: false,
      repeatMode: "off",
      isQueueOpen: false,
      currentTimeSeconds: 0,
      requestedSeekSeconds: null,
    });
  });

  it("moves through a release queue and preserves the requested start track", () => {
    usePlayerStore.getState().enqueue(tracks, "one");
    expect(usePlayerStore.getState()).toMatchObject({
      activeTrackId: "one",
      isPlaying: true,
    });

    usePlayerStore.getState().playNext();
    expect(usePlayerStore.getState().activeTrackId).toBe("two");

    usePlayerStore.getState().playPrevious();
    expect(usePlayerStore.getState().activeTrackId).toBe("one");
  });

  it("wraps only when queue repeat is active and records explicit seeks", () => {
    usePlayerStore.getState().enqueue(tracks, "two");
    usePlayerStore.setState({ repeatMode: "all" });
    usePlayerStore.getState().playNext();
    expect(usePlayerStore.getState().activeTrackId).toBe("one");

    usePlayerStore.getState().requestSeek(42.5);
    expect(usePlayerStore.getState().requestedSeekSeconds).toBe(42.5);
    usePlayerStore.getState().consumeSeekRequest();
    expect(usePlayerStore.getState().requestedSeekSeconds).toBeNull();
  });
});
