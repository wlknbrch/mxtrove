import { Readable } from "node:stream";
import type { FastifyInstance } from "fastify";
import { verifySupabaseBearerToken } from "../auth/verify-jwt.js";
import { config } from "../config.js";
import { writeReadableStreamToFile } from "../media/io.js";
import { ensureJobDir } from "../media/paths.js";
import { enqueueMediaJob, failMediaJobInput, getJobForOwner, setJobQueued, setJobUploading, touchMediaJob } from "./media-jobs.js";

export async function registerMediaJobInputRoute(app: FastifyInstance) {
  const uploading = new Set<string>();
  app.put("/v1/media/jobs/:jobId/input", async (request, reply) => {
    const user = await verifySupabaseBearerToken(request.headers.authorization);
    const { jobId } = request.params as { jobId: string };
    const job = await getJobForOwner(jobId, user.id);
    if (!job) return reply.code(404).send({ error: "Job not found." });
    if (!(request.body instanceof Readable)) {
      return reply.code(415).send({ error: "Send the raw audio file, not JSON or multipart form data." });
    }
    if (uploading.has(jobId) || !["created", "uploading"].includes(job.status)) {
      return reply.code(409).send({ error: "This job is already processing or has finished. Refresh its status before retrying." });
    }
    uploading.add(jobId);
    let heartbeat: ReturnType<typeof setInterval> | undefined;
    try {
      const paths = await ensureJobDir(jobId);
      await setJobUploading(jobId);
      heartbeat = setInterval(() => { void touchMediaJob(jobId).catch(() => undefined); }, 60_000);
      await writeReadableStreamToFile(request.body as Readable, paths.inputPath, config.maxUploadBytes, job.input_bytes);
      await setJobQueued(jobId);
      enqueueMediaJob(jobId);
      return reply.code(202).send({ id: jobId, status: "queued", stage: "Queued for processing", progress: 5 });
    } catch (error) {
      await failMediaJobInput(jobId, error).catch((persistError) => app.log.error(persistError));
      app.log.warn({ err: error, jobId }, "Media input did not finish");
      const message = error instanceof Error ? error.message : "";
      const code = error && typeof error === "object" && "code" in error ? error.code : "";
      const status = message.includes("disk space") || code === "ENOSPC" ? 507
        : message.includes("size limit") ? 413
          : /incomplete|premature close/i.test(message) || code === "ECONNRESET" || code === "ERR_STREAM_PREMATURE_CLOSE" ? 422 : 503;
      return reply.code(status).send({
        error: status === 507 ? "The media worker has insufficient temporary disk space. Free worker storage, then retry the preview."
          : status === 413 ? "This source exceeds the media worker upload size limit."
            : status === 422 ? "The source upload did not finish correctly. Your cloud original is safe; retry the preview generation."
              : "The media worker could not accept the source right now. Your cloud original is safe; retry shortly.",
      });
    } finally {
      if (heartbeat) clearInterval(heartbeat);
      uploading.delete(jobId);
    }
  });
}
