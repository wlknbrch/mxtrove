import { describe, expect, it } from "vitest";

import {
  buildPostPlaybackTracks,
  getPlaybackQueueDurationSeconds,
} from "@/features/posts/post-playback";
import type { ResolvedPostCard } from "@/features/posts/types";
import {
  demoAssets,
  demoPosts,
  demoProfiles,
  demoReleaseTracks,
  demoSongs,
  demoSongVersions,
} from "@/lib/demo-data";
import type { ProtectedMediaAsset } from "@/types/domain";

function buildRelease(overrides: Partial<ResolvedPostCard> = {}): ResolvedPostCard {
  return {
    post: demoPosts[1],
    owner: demoProfiles[2],
    artwork: demoAssets[0],
    single: null,
    releaseTracks: [
      {
        track: demoReleaseTracks[0],
        song: demoSongs[0],
        version: demoSongVersions[1],
        versionLabel: demoSongVersions[1].version_label,
        previewAsset: demoAssets[1],
        protectedPreview: null,
        versionHeartCount: 0,
        viewerHasHeartedVersion: false,
      },
    ],
    comments: [],
    heartCount: 0,
    viewerHasHearted: false,
    versionHeartCount: 0,
    viewerHasHeartedVersion: false,
    commentCount: 0,
    credits: [],
    externalLinks: [],
    feedEvent: null,
    ...overrides,
  };
}

function buildProtectedAsset() {
  return {
    id: "protected-asset",
    duration_seconds: 187,
    waveform_data: {
      version: 1,
      durationSeconds: 187,
      sourceSampleRate: 44_100,
      analysisSampleRate: 8_000,
      bucketCount: 1,
      peaks: [[-0.5, 0.6]],
    },
  } as ProtectedMediaAsset;
}

describe("post playback queues", () => {
  it("builds playable release tracks with their post association", () => {
    const tracks = buildPostPlaybackTracks(buildRelease());

    expect(tracks).toHaveLength(1);
    expect(tracks[0]).toMatchObject({
      id: demoReleaseTracks[0].id,
      postId: demoPosts[1].id,
      versionId: demoSongVersions[1].id,
      durationSeconds: 222,
    });
    expect(tracks[0].src).toBeTruthy();
  });

  it("keeps a public release version label when the private version row is hidden", () => {
    const release = buildRelease({
      releaseTracks: [
        {
          ...buildRelease().releaseTracks[0],
          version: null,
          versionLabel: "Master candidate",
        },
      ],
    });

    expect(buildPostPlaybackTracks(release)[0]).toMatchObject({
      versionId: demoReleaseTracks[0].song_version_id,
      versionLabel: "Master candidate",
    });
  });

  it("uses a protected derivative for a non-public release", () => {
    const release = buildRelease({
      post: {
        ...demoPosts[1],
        visibility: "private",
      },
      releaseTracks: [
        {
          ...buildRelease().releaseTracks[0],
          protectedPreview: {
            asset: buildProtectedAsset(),
            readUrl: "https://worker.example/protected",
          },
        },
      ],
    });

    expect(buildPostPlaybackTracks(release)[0]).toMatchObject({
      src: "https://worker.example/protected",
      srcCandidates: ["https://worker.example/protected"],
      durationSeconds: 187,
    });
  });

  it("prefers a playable cloud preview for a public release", () => {
    const release = buildRelease({
      post: {
        ...demoPosts[1],
        visibility: "public",
      },
      releaseTracks: [
        {
          ...buildRelease().releaseTracks[0],
          protectedPreview: {
            asset: buildProtectedAsset(),
            readUrl: "https://worker.example/protected",
          },
        },
      ],
    });

    const track = buildPostPlaybackTracks(release)[0];
    expect(track.src).not.toBe("https://worker.example/protected");
    expect(track.srcCandidates).toContain("https://worker.example/protected");
    expect(track.durationSeconds).toBe(222);
  });

  it("omits unavailable tracks and totals only known positive durations", () => {
    const release = buildRelease({
      releaseTracks: [
        {
          ...buildRelease().releaseTracks[0],
          previewAsset: null,
        },
      ],
    });

    expect(buildPostPlaybackTracks(release)).toEqual([]);
    expect(
      getPlaybackQueueDurationSeconds([
        { durationSeconds: 120 },
        { durationSeconds: null },
        { durationSeconds: 42.5 },
        { durationSeconds: 0 },
      ]),
    ).toBe(162.5);
    expect(getPlaybackQueueDurationSeconds([{ durationSeconds: null }])).toBeNull();
  });
});
