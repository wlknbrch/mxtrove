import fs from "node:fs";
import fsPromises from "node:fs/promises";
import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import type { Readable } from "node:stream";

import { registerAttachmentRoutes } from "./attachments/routes.js";
import { analyzeSongSourceForOwner } from "./audio-analysis/analyze-song.js";
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
import { registerPublicMediaRoutes } from "./public-media/routes.js";
import { dispatchPushBatch, sendImmediateTestPush } from "./push/dispatcher.js";
import { registerSocialPreviewRoutes } from "./social-preview/routes.js";
import { processDataExportBatch } from "./exports/processor.js";
import { workerRateLimitOptions } from "./security/http-rate-limit.js";
import { workerErrorResponse } from "./security/http-errors.js";

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
await app.register(rateLimit, workerRateLimitOptions(config.rateLimitEnabled));

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
    "X-MxShare-Song-Id",
    "X-MxShare-Source-Asset-Id",
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

app.get("/healthz", async () => ({ ok: true, worker: config.workerInstanceId }));

app.get("/source", async (_request, reply) => reply.redirect(config.sourceUrl));

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
    songId?: string | null;
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
    songId: body.songId ?? null,
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

app.post("/v1/media/analyze-song", async (request, reply) => {
  const user = await verifySupabaseBearerToken(request.headers.authorization);
  const songId = request.headers["x-mxshare-song-id"];
  const sourceAssetId = request.headers["x-mxshare-source-asset-id"];

  if (typeof songId !== "string" || typeof sourceAssetId !== "string") {
    return reply.code(400).send({ error: "Song and source asset headers are required." });
  }

  const analysis = await analyzeSongSourceForOwner({
    ownerId: user.id,
    songId,
    sourceAssetId,
    source: request.body as Readable,
  });
  return reply.send(analysis);
});

app.post("/v1/push/test", async (request, reply) => {
  const user = await verifySupabaseBearerToken(request.headers.authorization);
  await sendImmediateTestPush(user.id);
  return reply.send({ ok: true });
});

await registerProtectedMediaRoutes(app);
await registerPublicMediaRoutes(app);
await registerAttachmentRoutes(app);
await registerSocialPreviewRoutes(app);

app.setErrorHandler((error, _request, reply) => {
  const result = workerErrorResponse(error, config.nodeEnv === "production");
  if (result.statusCode >= 500) app.log.error(error);
  return reply.code(result.statusCode).send(result.body);
});

await Promise.all([
  ensureMediaTempDir(),
  ensureProtectedMediaStorage(),
]);
await recoverStaleMediaJobs();

function scheduleCleanupCycle() {
  setTimeout(async () => {
    try {
      await runCleanupCycle();
    } catch (error) {
      app.log.error(error);
    } finally {
      scheduleCleanupCycle();
    }
  }, config.cleanupIntervalMs).unref();
}

function schedulePushCycle(delayMs = 0) {
  setTimeout(async () => {
    let processed = 0;
    try {
      processed = await dispatchPushBatch();
    } catch (error) {
      app.log.error(error);
    } finally {
      schedulePushCycle(processed > 0 ? config.pushPollIntervalMs : config.pushIdlePollIntervalMs);
    }
  }, delayMs).unref();
}

function scheduleDataExportCycle(delayMs = 0) {
  setTimeout(async () => {
    let processed = 0;
    try {
      processed = await processDataExportBatch();
    } catch (error) {
      app.log.error(error);
    } finally {
      scheduleDataExportCycle(
        processed > 0 ? config.dataExportPollIntervalMs : config.dataExportIdlePollIntervalMs,
      );
    }
  }, delayMs).unref();
}

scheduleCleanupCycle();
schedulePushCycle();
scheduleDataExportCycle();

app.listen({ port: config.port, host: "0.0.0.0" }).catch((error) => {
  app.log.error(error);
  process.exit(1);
});
