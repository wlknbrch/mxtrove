import { spawn } from "node:child_process";

import { config } from "../config.js";

export interface ProbedAudioFile {
  codec: string | null;
  sampleRate: number | null;
  channels: number | null;
  bitRate: number | null;
  durationSeconds: number | null;
}

interface FfprobeJson {
  streams?: Array<{
    codec_type?: string;
    codec_name?: string;
    sample_rate?: string;
    channels?: number;
    bit_rate?: string;
    duration?: string;
  }>;
  format?: {
    duration?: string;
    bit_rate?: string;
  };
}

export async function probeAudioFile(inputPath: string) {
  return new Promise<ProbedAudioFile>((resolve, reject) => {
    const child = spawn(
      config.ffprobePath,
      [
        "-v",
        "error",
        "-show_streams",
        "-show_format",
        "-of",
        "json",
        inputPath,
      ],
      { stdio: ["ignore", "pipe", "pipe"] },
    );

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString("utf8");
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString("utf8");
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(stderr || "ffprobe failed."));
        return;
      }

      const payload = JSON.parse(stdout) as FfprobeJson;
      const audioStream = payload.streams?.find((stream) => stream.codec_type === "audio");
      if (!audioStream) {
        reject(new Error("The uploaded file does not contain an audio stream."));
        return;
      }

      resolve({
        codec: audioStream.codec_name ?? null,
        sampleRate: audioStream.sample_rate ? Number(audioStream.sample_rate) : null,
        channels: audioStream.channels ?? null,
        bitRate: audioStream.bit_rate ? Number(audioStream.bit_rate) : payload.format?.bit_rate ? Number(payload.format.bit_rate) : null,
        durationSeconds: audioStream.duration ? Number(audioStream.duration) : payload.format?.duration ? Number(payload.format.duration) : null,
      });
    });
  });
}
