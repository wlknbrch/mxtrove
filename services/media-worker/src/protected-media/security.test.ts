import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

let LocalProtectedMediaStorage: typeof import("./local-storage.js").LocalProtectedMediaStorage;
let signProtectedAsset: typeof import("./signing.js").signProtectedAsset;
let verifyProtectedAssetSignature: typeof import("./signing.js").verifyProtectedAssetSignature;
const tempRoots: string[] = [];

beforeAll(async () => {
  process.env.SUPABASE_URL ||= "https://example.supabase.co";
  process.env.SUPABASE_SECRET_KEY ||= "test-service-role-key";
  process.env.PROTECTED_MEDIA_SIGNING_SECRET ||= "test-signing-secret-with-enough-entropy";
  ({ LocalProtectedMediaStorage } = await import("./local-storage.js"));
  ({ signProtectedAsset, verifyProtectedAssetSignature } = await import("./signing.js"));
});

afterEach(async () => {
  vi.useRealTimers();
  await Promise.all(
    tempRoots.splice(0).map((root) =>
      fs.rm(root, { recursive: true, force: true }),
    ),
  );
});

describe("protected media signatures", () => {
  it("accepts an intact short-lived signature and rejects expiry or tampering", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-23T10:00:00Z"));
    const expiresAt = Math.floor(Date.now() / 1000) + 60;
    const signature = signProtectedAsset("asset-123", expiresAt);

    expect(verifyProtectedAssetSignature("asset-123", expiresAt, signature)).toBe(true);
    expect(verifyProtectedAssetSignature("asset-456", expiresAt, signature)).toBe(false);

    vi.setSystemTime(new Date("2026-07-23T10:01:01Z"));
    expect(verifyProtectedAssetSignature("asset-123", expiresAt, signature)).toBe(false);
  });
});

describe("local protected media storage", () => {
  it("copies derivatives below the configured root with private permissions", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "mxshare-storage-"));
    tempRoots.push(root);
    const source = path.join(root, "source.mp3");
    await fs.writeFile(source, "protected audio");
    const storage = new LocalProtectedMediaStorage(path.join(root, "media"));

    await storage.put({
      assetId: "asset-123",
      storageKey: "ab/cdefghij",
      sourcePath: source,
      mimeType: "audio/mpeg",
      bytes: 15,
    });

    const stored = path.join(root, "media", "ab", "cdefghij");
    expect(await fs.readFile(stored, "utf8")).toBe("protected audio");
    expect((await fs.stat(stored)).mode & 0o777).toBe(0o600);
  });

  it("rejects path traversal before touching the filesystem", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "mxshare-storage-"));
    tempRoots.push(root);
    const source = path.join(root, "source.mp3");
    await fs.writeFile(source, "protected audio");
    const storage = new LocalProtectedMediaStorage(path.join(root, "media"));

    await expect(
      storage.put({
        assetId: "asset-123",
        storageKey: "../outside",
        sourcePath: source,
        mimeType: "audio/mpeg",
        bytes: 15,
      }),
    ).rejects.toThrow("storage key is invalid");
  });
});
