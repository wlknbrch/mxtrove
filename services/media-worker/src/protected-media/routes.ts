import fs from "node:fs";
import fsPromises from "node:fs/promises";
import type { FastifyInstance } from "fastify";

import { verifySupabaseBearerToken } from "../auth/verify-jwt.js";
import { config } from "../config.js";
import { supabaseAdmin } from "../supabase/service.js";
import { protectedMediaStorage } from "./index.js";
import { parseByteRange } from "./range.js";
import { verifyProtectedAssetSignature } from "./signing.js";
import { safeContentDispositionFilename } from "../security/safe-filename.js";

interface ProtectedMediaRecord {
  id: string;
  filename: string;
  mime_type: string;
  bytes: number | null;
  status: string;
  deleted_at: string | null;
}

function getHeaderValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

async function getProtectedMediaRecord(assetId: string) {
  const { data, error } = await supabaseAdmin
    .from("protected_media_assets")
    .select("id, filename, mime_type, bytes, status, deleted_at")
    .eq("id", assetId)
    .maybeSingle();
  if (error) {
    throw error;
  }
  return data as ProtectedMediaRecord | null;
}

async function ensureProtectedMediaAccess(input: {
  assetId: string;
  profileId: string | null;
  shareToken?: string | null;
}) {
  const { data, error } = await supabaseAdmin.rpc("can_access_protected_media", {
    target_asset_id: input.assetId,
    target_profile_id: input.profileId,
    supplied_share_token: input.shareToken ?? null,
  });
  if (error) {
    throw error;
  }
  return Boolean(data);
}

export async function registerProtectedMediaRoutes(app: FastifyInstance) {
  app.route({
    method: ["GET", "HEAD"],
    url: "/v1/protected-media/:assetId",
    handler: async (request, reply) => {
      const params = request.params as { assetId: string };
      const query = request.query as { expires?: string; signature?: string };
      const expiresAt = Number(query.expires ?? 0);
      const hasValidSignature = Boolean(
        query.signature
        && verifyProtectedAssetSignature(params.assetId, expiresAt, query.signature),
      );
      let canAccess = hasValidSignature;

      if (!canAccess) {
        const user = await verifySupabaseBearerToken(request.headers.authorization);
        const shareToken = getHeaderValue(request.headers["x-mxshare-share-token"]);
        canAccess = await ensureProtectedMediaAccess({
          assetId: params.assetId,
          profileId: user.id,
          shareToken,
        });
      }

      if (!canAccess) {
        return reply.code(404).send({ error: "Protected media not found." });
      }

      const asset = await getProtectedMediaRecord(params.assetId);
      if (!asset || asset.status !== "ready" || asset.deleted_at) {
        return reply.code(404).send({ error: "Protected media not found." });
      }

      const readPath = await protectedMediaStorage.getReadPath(params.assetId);
      const stats = await fsPromises.stat(readPath);
      const size = stats.size;
      let range = null;
      try {
        range = parseByteRange(request.headers.range, size);
      } catch {
        return reply
          .code(416)
          .header("Content-Range", `bytes */${size}`)
          .send();
      }

      reply
        .header("Accept-Ranges", "bytes")
        .header("Cache-Control", "private, no-store, max-age=0")
        .header("Content-Type", asset.mime_type)
        .header("X-Content-Type-Options", "nosniff")
        .header(
          "Content-Disposition",
          `inline; filename="${safeContentDispositionFilename(asset.filename)}"`,
        );

      if (range) {
        const contentLength = range.end - range.start + 1;
        reply
          .code(206)
          .header("Content-Length", contentLength)
          .header("Content-Range", `bytes ${range.start}-${range.end}/${size}`);
        if (request.method === "HEAD") {
          return reply.send();
        }
        return reply.send(fs.createReadStream(readPath, range));
      }

      reply.header("Content-Length", size);
      if (request.method === "HEAD") {
        return reply.send();
      }
      return reply.send(fs.createReadStream(readPath));
    },
  });

  app.post("/v1/protected-media/:assetId/read-url", async (request, reply) => {
    const user = request.headers.authorization
      ? await verifySupabaseBearerToken(request.headers.authorization)
      : null;
    const params = request.params as { assetId: string };
    const shareToken = getHeaderValue(request.headers["x-mxshare-share-token"]);
    const canAccess = await ensureProtectedMediaAccess({
      assetId: params.assetId,
      profileId: user?.id ?? null,
      shareToken,
    });
    if (!canAccess) {
      return reply.code(404).send({ error: "Protected media not found." });
    }

    return reply.send({
      url: await protectedMediaStorage.createSignedReadUrl(
        params.assetId,
        config.protectedUrlTtlSeconds,
      ),
      expiresInSeconds: config.protectedUrlTtlSeconds,
    });
  });
}
