import fs from "node:fs/promises";
import path from "node:path";

import { config } from "../config.js";

export interface JobPaths {
  dir: string;
  inputPath: string;
  previewPath: string;
}

export function getJobPaths(jobId: string): JobPaths {
  const dir = path.join(config.mediaTempDir, jobId);
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
