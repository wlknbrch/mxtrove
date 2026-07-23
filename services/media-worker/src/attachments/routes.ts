import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import fsPromises from "node:fs/promises";
import path from "node:path";
import type { Readable } from "node:stream";
import type { FastifyInstance } from "fastify";
import sharp from "sharp";

import { verifySupabaseBearerToken } from "../auth/verify-jwt.js";
import { config } from "../config.js";
import { detectAttachmentSignature, type AttachmentKind } from "./file-signatures.js";
import { decodeToMonoPcm, transcodeToMp3 } from "../media/ffmpeg.js";
import { probeAudioFile } from "../media/ffprobe.js";
import { writeReadableStreamToFile } from "../media/io.js";
import { protectedMediaStorage } from "../protected-media/index.js";
import { sanitizeIncomingFilename } from "../security/safe-filename.js";
import { supabaseAdmin } from "../supabase/service.js";
import { generateWaveformFromPcm } from "../waveform/generate-waveform.js";

interface MessageRecord {
  id: string;
  sender_id: string;
  conversation_id: string;
}

interface ProtectedReservation {
  id: string;
  storage_key: string;
}

function readHeader(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function configuredLimit(kind: AttachmentKind) {
  if (kind === "image") {
    return config.maxImageAttachmentBytes;
  }
  if (kind === "document") {
    return config.maxDocumentAttachmentBytes;
  }
  return config.maxAttachmentBytes;
}

async function sha256File(filePath: string) {
  return new Promise<string>((resolve, reject) => {
    const hash = createHash("sha256");
    const stream = fs.createReadStream(filePath);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(hash.digest("hex")));
  });
}

async function getMessageForAttachment(messageId: string, userId: string) {
  const { data, error } = await supabaseAdmin
    .from("messages")
    .select("id, sender_id, conversation_id")
    .eq("id", messageId)
    .eq("sender_id", userId)
    .maybeSingle();
  if (error) {
    throw error;
  }
  if (!data) {
    return null;
  }

  const { data: canSend, error: permissionError } = await supabaseAdmin.rpc(
    "can_send_message_to_conversation",
    {
      target_conversation_id: data.conversation_id,
      sender_profile_id: userId,
    },
  );
  if (permissionError) {
    throw permissionError;
  }
  return canSend ? data as MessageRecord : null;
}

async function reserveAttachment(input: {
  ownerId: string;
  kind: AttachmentKind;
  filename: string;
  mimeType: string;
  expectedBytes: number;
}) {
  const { data, error } = await supabaseAdmin.rpc("reserve_protected_media_asset", {
    target_owner_id: input.ownerId,
    target_purpose: `message_${input.kind}`,
    target_filename: input.filename,
    target_mime_type: input.mimeType,
    expected_bytes: input.expectedBytes,
    target_source_asset_id: null,
    target_post_id: null,
    target_project_id: null,
    target_song_version_id: null,
    target_expires_at: null,
  });
  if (error) {
    throw error;
  }
  const reservation = (Array.isArray(data) ? data[0] : data) as ProtectedReservation | null;
  if (!reservation?.id || !reservation.storage_key) {
    throw new Error("Attachment storage reservation failed.");
  }
  return reservation;
}

async function releaseReservation(assetId: string) {
  await protectedMediaStorage.delete(assetId).catch(() => undefined);
  await supabaseAdmin.rpc("release_protected_media_asset", {
    target_asset_id: assetId,
  });
}

export async function registerAttachmentRoutes(app: FastifyInstance) {
  app.post("/v1/messages/:messageId/attachments", async (request, reply) => {
    const user = await verifySupabaseBearerToken(request.headers.authorization);
    const params = request.params as { messageId: string };
    const message = await getMessageForAttachment(params.messageId, user.id);
    if (!message) {
      return reply.code(404).send({ error: "Message not found." });
    }

    const filename = sanitizeIncomingFilename(
      readHeader(request.headers["x-mxshare-filename"]),
    );
    const claimedKind = readHeader(request.headers["x-mxshare-attachment-type"]) as AttachmentKind | undefined;
    if (!claimedKind || !["audio", "image", "document"].includes(claimedKind)) {
      return reply.code(400).send({ error: "A valid attachment type is required." });
    }

    const claimedLength = Number(request.headers["content-length"] ?? 0);
    const maxBytes = configuredLimit(claimedKind);
    if (Number.isFinite(claimedLength) && claimedLength > maxBytes) {
      return reply.code(413).send({ error: "Attachment exceeds the configured size limit." });
    }

    const tempDir = path.join(config.mediaTempDir, "attachments", randomUUID());
    const inputPath = path.join(tempDir, "input.bin");
    const outputPath = path.join(tempDir, claimedKind === "image" ? "preview.webp" : claimedKind === "audio" ? "preview.mp3" : "document.bin");
    await fsPromises.mkdir(tempDir, { recursive: true });

    let reservationId: string | null = null;
    try {
      const inputBytes = await writeReadableStreamToFile(
        request.body as Readable,
        inputPath,
        maxBytes,
      );
      const inputHandle = await fsPromises.open(inputPath, "r");
      const header = Buffer.alloc(Math.min(inputBytes, 65536));
      await inputHandle.read(header, 0, header.length, 0);
      await inputHandle.close();

      const detected = detectAttachmentSignature(header, filename);
      if (!detected || detected.kind !== claimedKind) {
        return reply.code(415).send({ error: "The attachment file signature is not supported." });
      }

      let durationSeconds: number | null = null;
      let width: number | null = null;
      let height: number | null = null;
      let waveformData: unknown = null;
      let outputMimeType = detected.mimeType;
      let storedFilename = filename;

      if (claimedKind === "audio") {
        const metadata = await probeAudioFile(inputPath);
        if (!metadata.durationSeconds || metadata.durationSeconds > config.maxAudioDurationSeconds) {
          return reply.code(422).send({ error: "The audio duration is invalid or exceeds the limit." });
        }
        durationSeconds = metadata.durationSeconds;
        await transcodeToMp3(inputPath, outputPath, metadata.channels);
        const pcm = await decodeToMonoPcm(outputPath);
        waveformData = generateWaveformFromPcm(pcm.stdout, metadata.durationSeconds);
        outputMimeType = "audio/mpeg";
        storedFilename = `${path.parse(filename).name || "audio"}.mp3`;
      } else if (claimedKind === "image") {
        await sharp(inputPath)
          .rotate()
          .resize({
            width: 2048,
            height: 2048,
            fit: "inside",
            withoutEnlargement: true,
          })
          .webp({ quality: 82 })
          .toFile(outputPath);
        const metadata = await sharp(outputPath).metadata();
        width = metadata.width ?? null;
        height = metadata.height ?? null;
        outputMimeType = "image/webp";
        storedFilename = `${path.parse(filename).name || "image"}.webp`;
      } else {
        await fsPromises.copyFile(inputPath, outputPath);
      }

      const outputStats = await fsPromises.stat(outputPath);
      const reservation = await reserveAttachment({
        ownerId: user.id,
        kind: claimedKind,
        filename: storedFilename,
        mimeType: outputMimeType,
        expectedBytes: outputStats.size,
      });
      reservationId = reservation.id;

      await protectedMediaStorage.put({
        assetId: reservation.id,
        storageKey: reservation.storage_key,
        sourcePath: outputPath,
        mimeType: outputMimeType,
        bytes: outputStats.size,
      });

      const checksum = await sha256File(outputPath);
      const { error: finalizeError } = await supabaseAdmin.rpc(
        "finalize_protected_media_asset",
        {
          target_asset_id: reservation.id,
          actual_bytes: outputStats.size,
          target_checksum: checksum,
          target_duration_seconds: durationSeconds,
          target_width: width,
          target_height: height,
          target_waveform_data: waveformData,
        },
      );
      if (finalizeError) {
        throw finalizeError;
      }

      const { error: assetLinkError } = await supabaseAdmin
        .from("protected_media_assets")
        .update({ message_id: message.id })
        .eq("id", reservation.id)
        .eq("owner_id", user.id);
      if (assetLinkError) {
        throw assetLinkError;
      }

      const { data: attachment, error: attachmentError } = await supabaseAdmin
        .from("message_attachments")
        .insert({
          message_id: message.id,
          owner_id: user.id,
          attachment_type: claimedKind,
          protected_asset_id: reservation.id,
          filename: storedFilename,
          mime_type: outputMimeType,
          bytes: outputStats.size,
          duration_seconds: durationSeconds,
          width,
          height,
        })
        .select("*")
        .single();
      if (attachmentError) {
        throw attachmentError;
      }

      reservationId = null;
      return reply.code(201).send(attachment);
    } finally {
      if (reservationId) {
        await releaseReservation(reservationId).catch(() => undefined);
      }
      await fsPromises.rm(tempDir, { recursive: true, force: true });
    }
  });

  app.delete("/v1/message-attachments/:attachmentId", async (request, reply) => {
    const user = await verifySupabaseBearerToken(request.headers.authorization);
    const params = request.params as { attachmentId: string };
    const { data: attachment, error: attachmentError } = await supabaseAdmin
      .from("message_attachments")
      .select("id, protected_asset_id")
      .eq("id", params.attachmentId)
      .eq("owner_id", user.id)
      .is("deleted_at", null)
      .maybeSingle();
    if (attachmentError) {
      throw attachmentError;
    }
    if (!attachment) {
      return reply.code(404).send({ error: "Attachment not found." });
    }

    const { error } = await supabaseAdmin
      .from("message_attachments")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", params.attachmentId)
      .eq("owner_id", user.id)
      .is("deleted_at", null);
    if (error) {
      throw error;
    }
    if (attachment.protected_asset_id) {
      await releaseReservation(attachment.protected_asset_id);
    }
    return reply.code(204).send();
  });
}
