import { Readable } from "node:stream";
import type { FastifyInstance, FastifyReply } from "fastify";

const GOOGLE_DRIVE_FILE_ID_PATTERN = /^[A-Za-z0-9_-]{20,}$/;
const DROPBOX_HOST_SUFFIXES = [".dropbox.com", ".dropboxusercontent.com"];

function buildGoogleDriveUrl(fileId: string, kind: "audio" | "image", size: string | null) {
  const encodedFileId = encodeURIComponent(fileId);
  if (kind === "image") {
    const requestedSize = size?.trim() || "w1200";
    return `https://drive.google.com/thumbnail?id=${encodedFileId}&sz=${encodeURIComponent(requestedSize)}`;
  }

  return `https://drive.google.com/uc?export=download&id=${encodedFileId}`;
}

export function getDropboxPublicMediaUrl(value: string | null) {
  if (!value) return null;

  try {
    const url = new URL(value);
    const isDropboxHost = url.hostname === "dropbox.com"
      || DROPBOX_HOST_SUFFIXES.some((suffix) => url.hostname.endsWith(suffix));
    if (url.protocol !== "https:" || !isDropboxHost || url.username || url.password) {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

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

      const upstream = await fetch(
        dropboxUrl ?? buildGoogleDriveUrl(fileId, kind, query.size ?? null),
        {
          method: request.method,
          headers,
          redirect: "follow",
        },
      );

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
