import fs from "node:fs";
import fsPromises from "node:fs/promises";
import type { Readable } from "node:stream";
import { Transform } from "node:stream";
import { pipeline } from "node:stream/promises";

import { config } from "../config.js";

export async function ensureFreeDiskSpace(requiredBytes: number) {
  const stats = await fsPromises.statfs(config.mediaTempDir);
  const availableBytes = stats.bavail * stats.bsize;
  if (availableBytes < requiredBytes) {
    throw new Error("Not enough temporary disk space is available for media processing.");
  }
}

export async function writeReadableStreamToFile(input: Readable, outputPath: string, maxBytes: number, expectedBytes?: number | null) {
  const expected = expectedBytes != null && Number.isSafeInteger(expectedBytes) && expectedBytes > 0
    ? expectedBytes : null;
  if (expected && expected > maxBytes) throw new Error("Upload exceeds the configured size limit.");
  // Reserve space for this input and its derived output, rather than demanding
  // twice the maximum possible upload for every small song in a batch.
  await ensureFreeDiskSpace((expected ?? maxBytes) * 2);
  let writtenBytes = 0;
  const counter = new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      writtenBytes += chunk.length;
      callback(writtenBytes > maxBytes ? new Error("Upload exceeds the configured size limit.") : null, chunk);
    },
  });
  try {
    // pipeline handles premature close/aborted requests as well as stream errors.
    // A closed request must never leave a permanently pending upload promise.
    await pipeline(input, counter, fs.createWriteStream(outputPath, { flags: "w" }));
    if (!writtenBytes || (expected != null && writtenBytes !== expected)) {
      throw new Error("The source upload was incomplete. Retry the preview generation.");
    }
    return writtenBytes;
  } catch (error) {
    await fsPromises.rm(outputPath, { force: true }).catch(() => undefined);
    throw error;
  }
}
