import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  prefetchResolvedMediaSource,
  useResolvedMediaSource,
  useResolvedMediaUrl,
} from "@/hooks/use-resolved-media-url";
import { shouldFetchPublicMediaAsBlob } from "@/lib/asset-urls";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useResolvedMediaUrl", () => {
  it("pre-resolves the next direct media source for a seamless queue handoff", async () => {
    await expect(prefetchResolvedMediaSource(
      "https://media.example/next-track.mp3",
      "audio",
    )).resolves.toBe("https://media.example/next-track.mp3");
  });

  it("never exposes the previous track URL under a new candidate key", async () => {
    const { result, rerender } = renderHook(
      ({ source }) => useResolvedMediaUrl(source, "audio"),
      { initialProps: { source: "https://media.example/first-track.mp3" } },
    );

    await waitFor(() => {
      expect(result.current).toBe("https://media.example/first-track.mp3");
    });

    rerender({ source: "https://media.example/second-track.mp3" });
    expect(result.current).toBeNull();

    await waitFor(() => {
      expect(result.current).toBe("https://media.example/second-track.mp3");
    });
  });

  it("reports a failed proxied candidate instead of returning a known bad URL", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 503 })));
    const source = "https://drive.google.com/uc?export=download&id=failed-source";
    const { result } = renderHook(() => useResolvedMediaSource(source, "audio"));

    expect(result.current.isResolving).toBe(true);

    await waitFor(() => {
      expect(result.current).toEqual({
        url: null,
        isResolving: false,
      });
    });
  });

  it("validates image proxy responses while keeping audio proxy playback streamable", () => {
    const proxyUrl = "https://project.functions.supabase.co/drive-media?provider=dropbox&kind=image";

    expect(shouldFetchPublicMediaAsBlob(proxyUrl, "image")).toBe(true);
    expect(shouldFetchPublicMediaAsBlob(proxyUrl, "audio")).toBe(false);
  });
});
