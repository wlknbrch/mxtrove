import fs from "node:fs";
import fsPromises from "node:fs/promises";
import type { Readable } from "node:stream";

import { config } from "../config.js";

export async function ensureFreeDiskSpace(requiredBytes: number) {
  const stats = await fsPromises.statfs(config.mediaTempDir);
  const availableBytes = stats.bavail * stats.bsize;
  if (availableBytes < requiredBytes) {
    throw new Error("Not enough temporary disk space is available for media processing.");
  }
}

export async function writeReadableStreamToFile(input: Readable, outputPath: string, maxBytes: number) {
  await ensureFreeDiskSpace(maxBytes * 2);

  return new Promise<number>((resolve, reject) => {
    const output = fs.createWriteStream(outputPath, { flags: "w" });
    let writtenBytes = 0;
    let rejected = false;

    function fail(error: Error) {
      if (rejected) {
        return;
      }

      rejected = true;
      input.destroy(error);
      output.destroy(error);
      reject(error);
    }

    input.on("data", (chunk: Buffer) => {
      writtenBytes += chunk.length;
      if (writtenBytes > maxBytes) {
        fail(new Error("Upload exceeds the configured size limit."));
      }
    });

    input.on("error", (error) => fail(error instanceof Error ? error : new Error(String(error))));
    output.on("error", (error) => fail(error instanceof Error ? error : new Error(String(error))));
    output.on("finish", () => {
      if (!rejected) {
        resolve(writtenBytes);
      }
    });

    input.pipe(output);
  });
}
