import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

let getJobPaths: typeof import("./paths.js").getJobPaths;
let ensureJobDir: typeof import("./paths.js").ensureJobDir;
let removeJobDir: typeof import("./paths.js").removeJobDir;
let root: string;
beforeAll(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), "mxtrove-safe-job-paths-"));
  process.env.SUPABASE_URL ||= "https://example.supabase.co";
  process.env.SUPABASE_SECRET_KEY ||= "test-service-role-key";
  process.env.PROTECTED_MEDIA_SIGNING_SECRET ||= "test-signing-secret-with-enough-entropy";
  process.env.MEDIA_TEMP_DIR = root;
  ({ getJobPaths, ensureJobDir, removeJobDir } = await import("./paths.js"));
});
afterAll(async () => { await fs.rm(root, { recursive: true, force: true }); });

describe("media job filesystem boundaries", () => {
  it.each(["../outside", "/tmp", "..", "", "a/b", "a\\b", "%2e%2e%2foutside", "11111111-1111-1111-1111-111111111111/../../outside", "11111111-1111-1111-1111-111111111111\n"])("rejects invalid ID %j before create or delete", async (input) => {
    expect(() => getJobPaths(input)).toThrow("Invalid media job ID");
    await expect(ensureJobDir(input)).rejects.toThrow("Invalid media job ID");
    await expect(removeJobDir(input)).rejects.toThrow("Invalid media job ID");
  });
  it("creates and removes only the selected UUID job directory", async () => {
    const id = "11111111-1111-4111-8111-111111111111";
    const job = await ensureJobDir(id);
    expect(job.dir).toBe(path.join(root, id));
    const sentinel = path.join(root, "keep-me");
    await fs.writeFile(sentinel, "outside the job");
    await fs.writeFile(job.inputPath, "input");
    await removeJobDir(id);
    expect(await fs.readFile(sentinel, "utf8")).toBe("outside the job");
    expect(await fs.stat(job.dir).catch(() => null)).toBeNull();
  });
});
