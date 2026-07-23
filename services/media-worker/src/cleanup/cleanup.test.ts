import { beforeAll, describe, expect, it } from "vitest";

let collectCleanupAssetIds: typeof import("./cleanup.js").collectCleanupAssetIds;

beforeAll(async () => {
  process.env.SUPABASE_URL ||= "https://example.supabase.co";
  process.env.SUPABASE_SECRET_KEY ||= "test-service-role-key";
  process.env.PROTECTED_MEDIA_SIGNING_SECRET ||= "test-signing-secret-with-enough-entropy";
  ({ collectCleanupAssetIds } = await import("./cleanup.js"));
});

describe("protected derivative cleanup", () => {
  it("deduplicates expired and abandoned reservations before deletion", () => {
    expect(
      collectCleanupAssetIds(
        [{ id: "expired-a" }, { id: "shared" }],
        [{ id: "shared" }, { id: "abandoned-b" }],
      ),
    ).toEqual(["expired-a", "shared", "abandoned-b"]);
  });
});
