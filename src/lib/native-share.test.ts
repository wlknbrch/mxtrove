import { afterEach, describe, expect, it, vi } from "vitest";

import { shareWithSystemDialog } from "@/lib/native-share";

describe("shareWithSystemDialog", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses the native share dialog when it is available", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { share });

    await expect(
      shareWithSystemDialog({ title: "Release", url: "https://mxtrove.wlknbrch.com/post/1" }),
    ).resolves.toBe("shared");
    expect(share).toHaveBeenCalledOnce();
  });

  it("falls back to copying the URL", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });

    await expect(
      shareWithSystemDialog({ title: "Release", url: "https://mxtrove.wlknbrch.com/post/1" }),
    ).resolves.toBe("copied");
    expect(writeText).toHaveBeenCalledWith("https://mxtrove.wlknbrch.com/post/1");
  });

  it("does not treat a cancelled share sheet as an error", async () => {
    const share = vi.fn().mockRejectedValue(new DOMException("Cancelled", "AbortError"));
    vi.stubGlobal("navigator", { share });

    await expect(
      shareWithSystemDialog({ title: "Release", url: "https://mxtrove.wlknbrch.com/post/1" }),
    ).resolves.toBe("cancelled");
  });

  it("copies the link when the native share sheet rejects the request", async () => {
    const share = vi.fn().mockRejectedValue(new DOMException("Unavailable", "NotAllowedError"));
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { share, clipboard: { writeText } });

    await expect(
      shareWithSystemDialog({ title: "Release", url: "https://mxtrove.wlknbrch.com/post/1" }),
    ).resolves.toBe("copied");
    expect(writeText).toHaveBeenCalledWith("https://mxtrove.wlknbrch.com/post/1");
  });
});
