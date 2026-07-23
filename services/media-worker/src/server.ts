import fs from "node:fs";
import fsPromises from "node:fs/promises";
import Fastify from "fastify";
import cors from "@fastify/cors";
import type { Readable } from "node:stream";

import { registerAttachmentRoutes } from "./attachments/routes.js";
import { verifySupabaseBearerToken } from "./auth/verify-jwt.js";
import { runCleanupCycle } from "./cleanup/cleanup.js";
import { config } from "./config.js";
import { writeReadableStreamToFile } from "./media/io.js";
import { ensureMediaTempDir, getJobPaths } from "./media/paths.js";
import {
  acknowledgeMediaJob,
  cancelMediaJob,
  createMediaProcessingJobForOwner,
  enqueueMediaJob,
  getJobForOwner,
  markUploadingToDrive,
  recoverStaleMediaJobs,
  setJobUploading,
} from "./jobs/media-jobs.js";
import {
  ensureProtectedMediaStorage,
} from "./protected-media/index.js";
import { registerProtectedMediaRoutes } from "./protected-media/routes.js";
import { dispatchPushBatch, sendImmediateTestPush } from "./push/dispatcher.js";
import { registerSocialPreviewRoutes } from "./social-preview/routes.js";
import { processDataExportBatch } from "./exports/processor.js";
import { InMemoryRateLimiter, selectRateLimitPolicy } from "./security/rate-limit.js";

const app = Fastify({
  bodyLimit: config.maxUploadBytes,
  trustProxy: config.trustProxy,
  logger: {
    redact: {
      paths: [
        "req.headers.authorization",
        "req.headers.x-mxshare-share-token",
        "req.headers.x-mxshare-filename",
      ],
      censor: "[redacted]",
    },
  },
});

const allowedOrigins = new Set(config.appOrigins);
const rateLimiter = new InMemoryRateLimiter();

await app.register(cors, {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.has(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error(`Origin ${origin} is not allowed by the media worker CORS policy.`), false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Authorization",
    "Content-Type",
    "Range",
    "X-MxShare-Share-Token",
    "X-MxShare-Filename",
    "X-MxShare-Attachment-Type",
  ],
  exposedHeaders: [
    "Accept-Ranges",
    "Content-Length",
    "Content-Range",
    "Content-Type",
  ],
});

app.addContentTypeParser("*", function rawStreamParser(_request, payload, done) {
  done(null, payload);
});

app.addHook("onRequest", async (request, reply) => {
  if (!config.rateLimitEnabled) {
    return;
  }

  const pathname = new URL(request.url, "http://mxshare-worker.local").pathname;
  const policy = selectRateLimitPolicy(request.method, pathname);
  if (!policy) {
    return;
  }

  const result = rateLimiter.check(`${policy.bucket}:${request.ip}`, policy);
  reply
    .header("X-RateLimit-Limit", result.limit)
    .header("X-RateLimit-Remaining", result.remaining)
    .header("Retry-After", result.retryAfterSeconds);

  if (!result.allowed) {
    return reply.code(429).send({
      error: "Too many requests. Please wait briefly and try again.",
    });
  }
});

app.get("/healthz", async () => ({ ok: true, worker: config.workerInstanceId }));

app.get("/readyz", async () => {
  await Promise.all([
    ensureMediaTempDir(),
    ensureProtectedMediaStorage(),
  ]);
  return {
    ok: true,
    tempDir: config.mediaTempDir,
    protectedMedia: true,
  };
});

app.post("/v1/media/jobs", async (request, reply) => {
  const user = await verifySupabaseBearerToken(request.headers.authorization);
  const body = (request.body ?? {}) as {
    sourceAssetId?: string;
    songVersionId?: string | null;
    outputMode?: "public_cloud" | "protected";
    protectedPurpose?: "post_preview" | "collaboration_preview" | "message_audio" | null;
    projectId?: string | null;
    postId?: string | null;
  };

  if (!body.sourceAssetId) {
    return reply.code(400).send({ error: "sourceAssetId is required." });
  }

  const job = await createMediaProcessingJobForOwner({
    ownerId: user.id,
    sourceAssetId: body.sourceAssetId,
    songVersionId: body.songVersionId ?? null,
    outputMode: body.outputMode,
    protectedPurpose: body.protectedPurpose ?? null,
    projectId: body.projectId ?? null,
    postId: body.postId ?? null,
  });

  return reply.send({
    id: job.id,
    status: job.status,
    stage: job.stage,
    progress: job.progress,
  });
});

app.put("/v1/media/jobs/:jobId/input", async (request, reply) => {
  const user = await verifySupabaseBearerToken(request.headers.authorization);
  const params = request.params as { jobId: string };
  const job = await getJobForOwner(params.jobId, user.id);

  if (!job) {
    return reply.code(404).send({ error: "Job not found." });
  }

  const paths = await ensureMediaTempDir().then(() => getJobPaths(params.jobId));
  await fsPromises.mkdir(paths.dir, { recursive: true });
  await setJobUploading(job.id);
  await writeReadableStreamToFile(request.body as Readable, paths.inputPath, config.maxUploadBytes);

  await recoverStaleMediaJobs();
  enqueueMediaJob(params.jobId);

  return reply.code(202).send({
    id: job.id,
    status: "queued",
    stage: "Queued for processing",
    progress: 5,
  });
});

app.get("/v1/media/jobs/:jobId", async (request, reply) => {
  const user = await verifySupabaseBearerToken(request.headers.authorization);
  const params = request.params as { jobId: string };
  const job = await getJobForOwner(params.jobId, user.id);

  if (!job) {
    return reply.code(404).send({ error: "Job not found." });
  }

  return reply.send(job);
});

app.get("/v1/media/jobs/:jobId/preview", async (request, reply) => {
  const user = await verifySupabaseBearerToken(request.headers.authorization);
  const params = request.params as { jobId: string };
  const job = await getJobForOwner(params.jobId, user.id);

  if (!job) {
    return reply.code(404).send({ error: "Job not found." });
  }

  if (!["ready", "uploading_to_drive", "completed"].includes(job.status)) {
    return reply.code(409).send({ error: "Preview is not ready yet." });
  }

  const paths = getJobPaths(params.jobId);
  const exists = await fsPromises.stat(paths.previewPath).catch(() => null);
  if (!exists) {
    return reply.code(404).send({ error: "Preview file has already been cleaned up." });
  }

  if (job.status === "ready") {
    await markUploadingToDrive(job.id);
  }

  return reply
    .type("audio/mpeg")
    .header("Content-Disposition", `inline; filename="${job.id}.mp3"`)
    .send(fs.createReadStream(paths.previewPath));
});

app.post("/v1/media/jobs/:jobId/acknowledge", async (request, reply) => {
  const user = await verifySupabaseBearerToken(request.headers.authorization);
  const params = request.params as { jobId: string };
  const job = await getJobForOwner(params.jobId, user.id);

  if (!job) {
    return reply.code(404).send({ error: "Job not found." });
  }

  await acknowledgeMediaJob(job.id);
  return reply.code(204).send();
});

app.delete("/v1/media/jobs/:jobId", async (request, reply) => {
  const user = await verifySupabaseBearerToken(request.headers.authorization);
  const params = request.params as { jobId: string };
  const job = await getJobForOwner(params.jobId, user.id);

  if (!job) {
    return reply.code(404).send({ error: "Job not found." });
  }

  await cancelMediaJob(job.id);
  return reply.code(204).send();
});

app.post("/v1/push/test", async (request, reply) => {
  const user = await verifySupabaseBearerToken(request.headers.authorization);
  await sendImmediateTestPush(user.id);
  return reply.send({ ok: true });
});

await registerProtectedMediaRoutes(app);
await registerAttachmentRoutes(app);
await registerSocialPreviewRoutes(app);

app.setErrorHandler((error, _request, reply) => {
  const message = error instanceof Error ? error.message : "Worker request failed.";
  const statusCode =
    message.includes("bearer token") || message.includes("JWT")
      ? 401
      : message.includes("quota") || message.includes("size limit")
        ? 413
        : 500;

  app.log.error(error);
  return reply.code(statusCode).send({
    error:
      statusCode === 500 && config.nodeEnv === "production"
        ? "The media worker could not complete this request."
        : message,
  });
});

await Promise.all([
  ensureMediaTempDir(),
  ensureProtectedMediaStorage(),
]);
await recoverStaleMediaJobs();

setInterval(() => {
  void runCleanupCycle().catch((error) => {
    app.log.error(error);
  });
  rateLimiter.prune();
}, 60000).unref();

setInterval(() => {
  void dispatchPushBatch().catch((error) => {
    app.log.error(error);
  });
}, config.pushPollIntervalMs).unref();

setInterval(() => {
  void processDataExportBatch().catch((error) => {
    app.log.error(error);
  });
}, config.dataExportPollIntervalMs).unref();

void processDataExportBatch().catch((error) => {
  app.log.error(error);
});

app.listen({ port: config.port, host: "0.0.0.0" }).catch((error) => {
  app.log.error(error);
  process.exit(1);
});
