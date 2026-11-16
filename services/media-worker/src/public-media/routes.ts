import { Readable } from "node:stream";
import type { FastifyInstance, FastifyReply } from "fastify";

import { fetchPublicProviderMedia, getDropboxPublicMediaUrl } from "./upstream.js";
export { getDropboxPublicMediaUrl } from "./upstream.js";

const GOOGLE_DRIVE_FILE_ID_PATTERN = /^[A-Za-z0-9_-]{20,}$/;

function buildGoogleDriveUrl(fileId: string, kind: "audio" | "image", size: string | null) {
  const encodedFileId = encodeURIComponent(fileId);
  if (kind === "image") {
    const requestedSize = size?.trim() || "w1200";
    return `https://drive.google.com/thumbnail?id=${encodedFileId}&sz=${encodeURIComponent(requestedSize)}`;
  }

  return `https://drive.google.com/uc?export=download&id=${encodedFileId}`;
}

function buildGoogleDriveAlternateUrl(fileId: string, kind: "audio" | "image", size: string | null) {
  const encodedFileId = encodeURIComponent(fileId);
  if (kind === "image") {
    const width = size?.trim().replace(/[^0-9]/g, "") || "1200";
    return `https://lh3.googleusercontent.com/d/${encodedFileId}=w${width}`;
  }

  // The classic uc endpoint answers 410/403 for freshly shared or throttled
  // files; the dedicated download host usually still serves them.
  return `https://drive.usercontent.google.com/download?id=${encodedFileId}&export=download`;
}

// Google answers with these transient statuses while permissions propagate or
// when it throttles a download host; retrying against the alternate host keeps
// freshly imported previews playable instead of surfacing a bare 410.
const TRANSIENT_GOOGLE_STATUSES = new Set([403, 410, 429]);
const GOOGLE_RETRY_DELAY_MS = 750;

function copyUpstreamHeaders(headers: Headers, reply: FastifyReply) {
  for (const headerName of [
    "accept-ranges",
    "content-length",
    "content-range",
    "content-type",
    "etag",
    "last-modified",
  ]) {
    const value = headers.get(headerName);
    if (value) reply.header(headerName, value);
  }
}

export async function registerPublicMediaRoutes(app: FastifyInstance) {
  app.route({
    method: ["GET", "HEAD"],
    url: "/v1/public-media",
    handler: async (request, reply) => {
      const query = request.query as {
        fileId?: string;
        kind?: string;
        provider?: string;
        size?: string;
        url?: string;
      };
      const kind = query.kind === "audio" ? "audio" : "image";
      const fileId = query.fileId?.trim() ?? "";
      const dropboxUrl = query.provider === "dropbox"
        ? getDropboxPublicMediaUrl(query.url ?? null)
        : null;

      if (!dropboxUrl && !GOOGLE_DRIVE_FILE_ID_PATTERN.test(fileId)) {
        return reply.code(400).send({ error: "Missing or unsupported public media source." });
      }

      const headers = new Headers();
      if (request.headers.range) headers.set("Range", request.headers.range);

      let upstream: Response;
      try {
        upstream = await fetchPublicProviderMedia(
          dropboxUrl ?? buildGoogleDriveUrl(fileId, kind, query.size ?? null),
          { method: request.method, headers },
        );

        if (!dropboxUrl && TRANSIENT_GOOGLE_STATUSES.has(upstream.status)) {
          await new Promise((resolve) => setTimeout(resolve, GOOGLE_RETRY_DELAY_MS));
          const retry = await fetchPublicProviderMedia(
            buildGoogleDriveAlternateUrl(fileId, kind, query.size ?? null),
            { method: request.method, headers },
          );
          if (!TRANSIENT_GOOGLE_STATUSES.has(retry.status) && retry.status < 500) {
            await upstream.body?.cancel().catch(() => undefined);
            upstream = retry;
          }
        }
      } catch {
        return reply.code(502).send({ error: "The public media provider could not return a supported response." });
      }

      if (TRANSIENT_GOOGLE_STATUSES.has(upstream.status)) {
        await upstream.body?.cancel().catch(() => undefined);
        return reply.code(502).send({
          error: "This media file is not publicly readable yet. Try again in a few moments.",
        });
      }

      reply.code(upstream.status);
      copyUpstreamHeaders(upstream.headers, reply);
      reply
        .header("Cache-Control", kind === "image"
          ? "public, max-age=86400, stale-while-revalidate=604800"
          : "public, max-age=86400, stale-while-revalidate=86400")
        .header("X-Content-Type-Options", "nosniff");

      if (
        dropboxUrl
        && (!upstream.headers.get("content-type") || upstream.headers.get("content-type") === "application/octet-stream")
      ) {
        reply.type(kind === "audio" ? "audio/mpeg" : "image/jpeg");
      }

      if (request.method === "HEAD" || !upstream.body) {
        return reply.send();
      }

      return reply.send(Readable.fromWeb(upstream.body as import("node:stream/web").ReadableStream));
    },
  });
}
