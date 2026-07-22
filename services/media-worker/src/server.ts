import fs from "node:fs";
import fsPromises from "node:fs/promises";
import Fastify from "fastify";
import cors from "@fastify/cors";
import type { Readable } from "node:stream";

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
import { dispatchPushBatch, sendImmediateTestPush } from "./push/dispatcher.js";

const app = Fastify({
  bodyLimit: config.maxUploadBytes,
  logger: true,
});

const allowedOrigins = new Set(config.appOrigins);

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
  allowedHeaders: ["Authorization", "Content-Type"],
});

app.addContentTypeParser("*", function rawStreamParser(_request, payload, done) {
  done(null, payload);
});

app.get("/healthz", async () => ({ ok: true, worker: config.workerInstanceId }));

app.get("/readyz", async () => {
  await ensureMediaTempDir();
  return {
    ok: true,
    tempDir: config.mediaTempDir,
  };
});

app.post("/v1/media/jobs", async (request, reply) => {
  const user = await verifySupabaseBearerToken(request.headers.authorization);
  const body = (request.body ?? {}) as { sourceAssetId?: string; songVersionId?: string | null };

  if (!body.sourceAssetId) {
    return reply.code(400).send({ error: "sourceAssetId is required." });
  }

  const job = await createMediaProcessingJobForOwner({
    ownerId: user.id,
    sourceAssetId: body.sourceAssetId,
    songVersionId: body.songVersionId ?? null,
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

await ensureMediaTempDir();
await recoverStaleMediaJobs();

setInterval(() => {
  void runCleanupCycle().catch((error) => {
    app.log.error(error);
  });
}, 60000).unref();

setInterval(() => {
  void dispatchPushBatch().catch((error) => {
    app.log.error(error);
  });
}, config.pushPollIntervalMs).unref();

app.listen({ port: config.port, host: "0.0.0.0" }).catch((error) => {
  app.log.error(error);
  process.exit(1);
});
