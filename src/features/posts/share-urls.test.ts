import { describe, expect, it } from "vitest";

import {
  buildPublicReleaseShareUrl,
  buildPublicTrackShareUrl,
} from "@/features/posts/share-urls";

describe("public share URLs", () => {
  it("builds a cache-busted release share URL", () => {
    const url = new URL(buildPublicReleaseShareUrl(
      "https://mxtrove.wlknbrch.com",
      "post/id",
      "2026-08-03T12:00:00.000Z",
    ));

    expect(url.pathname).toBe("/social/post/post%2Fid");
    expect(url.searchParams.get("v")).toBe("2026-08-03T12:00:00.000Z");
  });

  it("keeps the release and selected track in the social URL", () => {
    const url = new URL(buildPublicTrackShareUrl(
      "https://mxtrove.wlknbrch.com",
      "post-1",
      "track-2",
      "revision-3",
    ));

    expect(url.pathname).toBe("/social/post/post-1/track/track-2");
    expect(url.searchParams.get("v")).toBe("revision-3");
  });
});
