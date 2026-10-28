import fs from "node:fs/promises";
import path from "node:path";

import { config } from "../config.js";

export interface JobPaths {
  dir: string;
  inputPath: string;
  previewPath: string;
}

export function getJobPaths(jobId: string): JobPaths {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(jobId)) {
    throw new Error("Invalid media job ID.");
  }
  const root = path.resolve(config.mediaTempDir);
  const dir = path.resolve(root, jobId.toLowerCase());
  if (!dir.startsWith(`${root}${path.sep}`)) {
    throw new Error("Media job path escaped its storage root.");
  }
  return {
    dir,
    inputPath: path.join(dir, "input.bin"),
    previewPath: path.join(dir, "preview.mp3"),
  };
}

export async function ensureMediaTempDir() {
  await fs.mkdir(config.mediaTempDir, { recursive: true });
}

export async function ensureJobDir(jobId: string) {
  const paths = getJobPaths(jobId);
  await fs.mkdir(paths.dir, { recursive: true });
  return paths;
}

export async function removeJobDir(jobId: string) {
  const paths = getJobPaths(jobId);
  await fs.rm(paths.dir, { recursive: true, force: true });
}
