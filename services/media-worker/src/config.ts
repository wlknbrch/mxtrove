import fs from "node:fs";
import path from "node:path";

const envFiles = [
  path.resolve(process.cwd(), ".env.local"),
  path.resolve(process.cwd(), ".env"),
];

function stripWrappedQuotes(value: string) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

function loadEnvFiles() {
  for (const envFile of envFiles) {
    if (!fs.existsSync(envFile)) {
      continue;
    }

    const contents = fs.readFileSync(envFile, "utf8");
    for (const rawLine of contents.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) {
        continue;
      }

      const separatorIndex = line.indexOf("=");
      if (separatorIndex <= 0) {
        continue;
      }

      const key = line.slice(0, separatorIndex).trim();
      const value = stripWrappedQuotes(line.slice(separatorIndex + 1).trim());

      if (!key || typeof process.env[key] !== "undefined") {
        continue;
      }

      process.env[key] = value;
    }
  }
}

loadEnvFiles();

function readNumber(name: string, fallback: number) {
  const value = process.env[name];
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function readOrigins(name: string, fallback: string[]) {
  const value = process.env[name];
  if (!value?.trim()) {
    return fallback;
  }

  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export const config = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: readNumber("PORT", 8080),
  appOrigin: process.env.APP_ORIGIN || "http://localhost:5173",
  appOrigins: readOrigins("APP_ORIGIN", [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:4173",
    "http://127.0.0.1:4173",
  ]),
  supabaseUrl: process.env.SUPABASE_URL || "",
  supabaseServerKey: process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  webPushPublicKey: process.env.WEB_PUSH_PUBLIC_KEY || "",
  webPushPrivateKey: process.env.WEB_PUSH_PRIVATE_KEY || "",
  webPushSubject: process.env.WEB_PUSH_SUBJECT || "mailto:admin@example.com",
  ffmpegPath: process.env.FFMPEG_PATH || "ffmpeg",
  ffprobePath: process.env.FFPROBE_PATH || "ffprobe",
  mediaTempDir: path.resolve(process.env.MEDIA_TEMP_DIR || "/tmp/mxshare"),
  maxUploadBytes: readNumber("MAX_UPLOAD_BYTES", 524288000),
  maxAudioDurationSeconds: readNumber("MAX_AUDIO_DURATION_SECONDS", 5400),
  maxConcurrentMediaJobs: readNumber("MAX_CONCURRENT_MEDIA_JOBS", 1),
  mediaReadyTtlSeconds: readNumber("MEDIA_READY_TTL_SECONDS", 21600),
  mediaJobTimeoutSeconds: readNumber("MEDIA_JOB_TIMEOUT_SECONDS", 1800),
  pushPollIntervalMs: readNumber("PUSH_POLL_INTERVAL_MS", 3000),
  workerInstanceId: process.env.WORKER_INSTANCE_ID || `worker-${process.pid}`,
};

if (!config.supabaseUrl || !config.supabaseServerKey) {
  throw new Error(
    `SUPABASE_URL and either SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY are required. Checked: ${envFiles.join(", ")}`,
  );
}
