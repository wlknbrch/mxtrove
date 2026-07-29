import { describe, expect, it, vi } from "vitest";

import { resolveAvailableProtectedReadUrls } from "@/features/posts/protected-preview";
import type { ProtectedMediaAsset } from "@/types/domain";

const assets = [
  { id: "available-preview" },
  { id: "missing-preview" },
] as ProtectedMediaAsset[];

describe("resolveAvailableProtectedReadUrls", () => {
  it("keeps available previews without rejecting the post when another file is missing", async () => {
    const createReadUrl = vi.fn(async (assetId: string) => {
      if (assetId === "missing-preview") {
        throw new Error("This protected media file is no longer available.");
      }
      return `https://worker.example/${assetId}`;
    });

    await expect(resolveAvailableProtectedReadUrls(assets, createReadUrl)).resolves.toEqual(
      new Map([["available-preview", "https://worker.example/available-preview"]]),
    );
  });
});
