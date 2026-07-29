import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useResolvedMediaUrl } from "@/hooks/use-resolved-media-url";

describe("useResolvedMediaUrl", () => {
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
});
