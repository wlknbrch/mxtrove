import { spawn, type ChildProcess, type ChildProcessByStdio } from "node:child_process";
import type { Readable } from "node:stream";

import { config } from "../config.js";

type SpawnedProcess = ChildProcessByStdio<null, Readable, Readable>;

export function buildMp3TranscodeArgs(inputPath: string, outputPath: string, channelCount: number | null) {
  const args = [
    "-hide_banner",
    "-nostdin",
    "-i",
    inputPath,
    "-map",
    "0:a:0",
    "-vn",
    "-sn",
    "-dn",
    "-c:a",
    "libmp3lame",
    "-b:a",
    "192k",
    "-map_metadata",
    "-1",
    "-id3v2_version",
    "3",
  ];

  if (channelCount === 1) {
    args.push("-ac", "1");
  } else if ((channelCount ?? 0) > 2) {
    args.push("-ac", "2");
  }

  args.push(outputPath);
  return args;
}

export async function transcodeToMp3(
  inputPath: string,
  outputPath: string,
  channelCount: number | null,
  onSpawn?: (child: ChildProcess) => void,
) {
  return spawnWithCapture(config.ffmpegPath, buildMp3TranscodeArgs(inputPath, outputPath, channelCount), onSpawn);
}

export async function decodeToMonoPcm(
  inputPath: string,
  onSpawn?: (child: ChildProcess) => void,
) {
  return spawnWithCapture(config.ffmpegPath, [
    "-hide_banner",
    "-nostdin",
    "-i",
    inputPath,
    "-map",
    "0:a:0",
    "-vn",
    "-sn",
    "-dn",
    "-ac",
    "1",
    "-ar",
    "8000",
    "-f",
    "s16le",
    "pipe:1",
  ], onSpawn);
}

export async function decodeToAnalysisPcm(
  inputPath: string,
  onSpawn?: (child: ChildProcess) => void,
) {
  return spawnWithCapture(config.ffmpegPath, [
    "-hide_banner",
    "-nostdin",
    "-i",
    inputPath,
    "-map",
    "0:a:0",
    "-vn",
    "-sn",
    "-dn",
    "-ac",
    "1",
    "-ar",
    "11025",
    "-t",
    "600",
    "-f",
    "f32le",
    "pipe:1",
  ], onSpawn);
}

export async function transcodeImagePreview(
  inputPath: string,
  outputPath: string,
  onSpawn?: (child: ChildProcess) => void,
) {
  return spawnWithCapture(
    config.ffmpegPath,
    [
      "-hide_banner",
      "-nostdin",
      "-i",
      inputPath,
      "-map",
      "0:v:0",
      "-frames:v",
      "1",
      "-vf",
      "scale='min(2048,iw)':'min(2048,ih)':force_original_aspect_ratio=decrease",
      "-map_metadata",
      "-1",
      "-c:v",
      "libwebp",
      "-quality",
      "82",
      "-y",
      outputPath,
    ],
    onSpawn,
  );
}

function spawnWithCapture(
  command: string,
  args: string[],
  onSpawn?: (child: ChildProcess) => void,
) {
  return new Promise<{ stdout: Buffer; stderr: string; child: SpawnedProcess | null }>((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] }) as SpawnedProcess;
    onSpawn?.(child);
    const stdoutChunks: Buffer[] = [];
    let stderr = "";

    child.stdout.on("data", (chunk: Buffer) => {
      stdoutChunks.push(chunk);
    });
    child.stderr.on("data", (chunk: Buffer) => {
      if (stderr.length < 16000) {
        stderr += chunk.toString("utf8");
      }
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(stderr || `${command} failed.`));
        return;
      }

      resolve({
        stdout: Buffer.concat(stdoutChunks),
        stderr,
        child,
      });
    });
  });
}
