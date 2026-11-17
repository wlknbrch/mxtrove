import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { PassThrough, Readable } from "node:stream";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("../config.js", () => ({ config: { mediaTempDir: "/tmp" } }));
import { writeReadableStreamToFile } from "./io.js";

let directory: string;
beforeEach(async () => {
  directory = await fs.mkdtemp(path.join(os.tmpdir(), "mxtrove-input-"));
  vi.spyOn(fs, "statfs").mockResolvedValue({ bavail: 1_000_000, bsize: 1 } as Awaited<ReturnType<typeof fs.statfs>>);
});
afterEach(async () => { vi.restoreAllMocks(); await fs.rm(directory, { recursive: true, force: true }); });

describe("media input streams", () => {
  it("reserves disk for the actual source, not twice the maximum permitted upload", async () => {
    const target = path.join(directory, "input.bin");
    await expect(writeReadableStreamToFile(Readable.from([Buffer.from("original")]), target, 500_000_000, 8)).resolves.toBe(8);
    expect(await fs.readFile(target, "utf8")).toBe("original");
  });
  it("rejects and removes a truncated original", async () => {
    const target = path.join(directory, "input.bin");
    await expect(writeReadableStreamToFile(Readable.from([Buffer.from("short")]), target, 100, 12)).rejects.toThrow("incomplete");
    await expect(fs.stat(target)).rejects.toMatchObject({ code: "ENOENT" });
  });
  it("settles on premature close instead of hanging at zero percent", async () => {
    const stream = new PassThrough();
    const target = path.join(directory, "input.bin");
    const pending = writeReadableStreamToFile(stream, target, 100, 10);
    const assertion = expect(pending).rejects.toThrow();
    setTimeout(() => stream.destroy(), 5);
    await assertion;
    await expect(fs.stat(target)).rejects.toMatchObject({ code: "ENOENT" });
  });
  it("enforces the limit during streaming and removes partial bytes", async () => {
    const target = path.join(directory, "input.bin");
    await expect(writeReadableStreamToFile(Readable.from([Buffer.alloc(11)]), target, 10)).rejects.toThrow("size limit");
    await expect(fs.stat(target)).rejects.toMatchObject({ code: "ENOENT" });
  });
});
