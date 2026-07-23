import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import { config } from "../config.js";
import { protectedMediaStorage } from "../protected-media/index.js";
import { supabaseAdmin } from "../supabase/service.js";
import { buildExportArchive, type ExportPayload, type ExportTable } from "./archive.js";

interface ExportRequest {
  id: string;
  profile_id: string;
  format: "json" | "json_csv";
}

async function selectRows(
  table: string,
  configure: (query: any) => any,
) {
  const query = supabaseAdmin.from(table).select("*");
  const { data, error } = await configure(query) as {
    data: ExportTable | null;
    error: Error | null;
  };
  if (error) throw error;
  return data ?? [];
}

function ids(rows: ExportTable, key = "id") {
  return rows.map((row) => row[key]).filter((value): value is string => typeof value === "string");
}

async function collectExport(profileId: string) {
  const [
    profile,
    songs,
    assets,
    posts,
    postHearts,
    versionHearts,
    follows,
    cloudConnections,
    privacy,
    appearance,
  ] = await Promise.all([
    selectRows("profiles", (query) => query.eq("id", profileId)),
    selectRows("songs", (query) => query.eq("owner_id", profileId)),
    selectRows("assets", (query) => query.eq("owner_id", profileId)),
    selectRows("posts", (query) => query.eq("owner_id", profileId)),
    selectRows("post_hearts", (query) => query.eq("profile_id", profileId)),
    selectRows("version_hearts", (query) => query.eq("profile_id", profileId)),
    selectRows("follows", (query) => query.or(`follower_id.eq.${profileId},followed_id.eq.${profileId}`)),
    selectRows("cloud_connections", (query) => query.eq("profile_id", profileId)),
    selectRows("profile_privacy_settings", (query) => query.eq("profile_id", profileId)),
    selectRows("profile_appearance_settings", (query) => query.eq("profile_id", profileId)),
  ]);

  const songIds = ids(songs);
  const postIds = ids(posts);
  const [versions, releaseTracks, singlePosts, credits, externalLinks, comments, memberships, conversationMemberships] =
    await Promise.all([
      songIds.length
        ? selectRows("song_versions", (query) => query.in("song_id", songIds))
        : [],
      postIds.length
        ? selectRows("release_tracks", (query) => query.in("post_id", postIds))
        : [],
      postIds.length
        ? selectRows("single_posts", (query) => query.in("post_id", postIds))
        : [],
      postIds.length
        ? selectRows("post_credits", (query) => query.in("post_id", postIds))
        : [],
      postIds.length
        ? selectRows("post_external_links", (query) => query.in("post_id", postIds))
        : [],
      selectRows("comments", (query) =>
        postIds.length
          ? query.or(`author_id.eq.${profileId},post_id.in.(${postIds.join(",")})`)
          : query.eq("author_id", profileId)),
      selectRows("collaboration_project_members", (query) => query.eq("profile_id", profileId)),
      selectRows("conversation_members", (query) => query.eq("profile_id", profileId)),
    ]);

  const projectIds = ids(memberships, "project_id");
  const conversationIds = ids(conversationMemberships, "conversation_id");
  const [projects, projectMembers, projectTracks, projectActivity, feedback, messages] = await Promise.all([
    projectIds.length
      ? selectRows("collaboration_projects", (query) => query.in("id", projectIds))
      : [],
    projectIds.length
      ? selectRows("collaboration_project_members", (query) => query.in("project_id", projectIds))
      : [],
    projectIds.length
      ? selectRows("collaboration_project_tracks", (query) => query.in("project_id", projectIds))
      : [],
    projectIds.length
      ? selectRows("collaboration_activity", (query) => query.in("project_id", projectIds))
      : [],
    projectIds.length
      ? selectRows("feedback_threads", (query) => query.in("project_id", projectIds))
      : selectRows("feedback_threads", (query) => query.eq("author_id", profileId)),
    conversationIds.length
      ? selectRows("messages", (query) => query.in("conversation_id", conversationIds))
      : [],
  ]);

  const feedbackIds = ids(feedback);
  const messageIds = ids(messages);
  const [feedbackReplies, feedbackReactions, messageAttachments] = await Promise.all([
    feedbackIds.length
      ? selectRows("feedback_replies", (query) => query.in("thread_id", feedbackIds))
      : [],
    feedbackIds.length
      ? selectRows("feedback_reactions", (query) => query.in("thread_id", feedbackIds))
      : [],
    messageIds.length
      ? selectRows("message_attachments", (query) => query.in("message_id", messageIds))
      : [],
  ]);

  return {
    generated_at: new Date().toISOString(),
    format_version: 2,
    note: "Cloud binary files are not included. Asset and attachment rows contain references only.",
    tables: {
      profile,
      privacy_settings: privacy,
      appearance_settings: appearance,
      songs,
      song_versions: versions,
      assets,
      posts,
      single_posts: singlePosts,
      release_tracks: releaseTracks,
      post_credits: credits,
      post_external_links: externalLinks,
      comments,
      post_hearts: postHearts,
      version_hearts: versionHearts,
      follows,
      conversations: conversationMemberships,
      messages,
      message_attachments: messageAttachments,
      projects,
      project_members: projectMembers,
      project_tracks: projectTracks,
      project_activity: projectActivity,
      feedback_threads: feedback,
      feedback_replies: feedbackReplies,
      feedback_reactions: feedbackReactions,
      cloud_connections: cloudConnections,
    },
  } satisfies ExportPayload;
}

async function processExportRequest(request: ExportRequest) {
  let protectedAssetId: string | null = null;
  const tempPath = path.join(config.mediaTempDir, `export-${request.id}-${randomUUID()}`);
  try {
    const payload = await collectExport(request.profile_id);
    const archive = buildExportArchive(payload, request.format);
    const expiresAt = new Date(
      Date.now() + config.dataExportTtlSeconds * 1000,
    ).toISOString();
    const { data: reservationData, error: reservationError } = await supabaseAdmin.rpc(
      "reserve_protected_media_asset",
      {
        target_owner_id: request.profile_id,
        target_purpose: "data_export",
        target_filename: archive.filename,
        target_mime_type: archive.mimeType,
        expected_bytes: archive.bytes.byteLength,
        target_source_asset_id: null,
        target_post_id: null,
        target_project_id: null,
        target_song_version_id: null,
        target_expires_at: expiresAt,
      },
    );
    if (reservationError) throw reservationError;
    const reservation = (Array.isArray(reservationData) ? reservationData[0] : reservationData) as {
      id?: string;
      storage_key?: string;
    } | null;
    if (!reservation?.id || !reservation.storage_key) {
      throw new Error("Could not reserve protected storage for the export.");
    }
    protectedAssetId = reservation.id;
    await fs.writeFile(tempPath, archive.bytes, { mode: 0o600 });
    await protectedMediaStorage.put({
      assetId: reservation.id,
      storageKey: reservation.storage_key,
      sourcePath: tempPath,
      mimeType: archive.mimeType,
      bytes: archive.bytes.byteLength,
    });
    const checksum = createHash("sha256").update(archive.bytes).digest("hex");
    const { error: finalizeError } = await supabaseAdmin.rpc("finalize_protected_media_asset", {
      target_asset_id: reservation.id,
      actual_bytes: archive.bytes.byteLength,
      target_checksum: checksum,
      target_duration_seconds: null,
      target_width: null,
      target_height: null,
      target_waveform_data: null,
    });
    if (finalizeError) throw finalizeError;

    const { error: updateError } = await supabaseAdmin
      .from("data_export_requests")
      .update({
        status: "ready",
        protected_asset_id: reservation.id,
        completed_at: new Date().toISOString(),
        expires_at: expiresAt,
        error_message: null,
      })
      .eq("id", request.id);
    if (updateError) throw updateError;
    protectedAssetId = null;
  } catch (error) {
    if (protectedAssetId) {
      await protectedMediaStorage.delete(protectedAssetId).catch(() => undefined);
      await supabaseAdmin.rpc("release_protected_media_asset", {
        target_asset_id: protectedAssetId,
      });
    }
    await supabaseAdmin
      .from("data_export_requests")
      .update({
        status: "failed",
        completed_at: new Date().toISOString(),
        error_message: error instanceof Error ? error.message.slice(0, 1000) : "Export generation failed.",
      })
      .eq("id", request.id);
  } finally {
    await fs.rm(tempPath, { force: true }).catch(() => undefined);
  }
}

let exportCycleRunning = false;

export async function processDataExportBatch() {
  if (exportCycleRunning) return;
  exportCycleRunning = true;
  try {
    const { data, error } = await supabaseAdmin
      .from("data_export_requests")
      .select("id, profile_id, format")
      .eq("status", "queued")
      .order("requested_at", { ascending: true })
      .limit(config.dataExportBatchSize);
    if (error) throw error;

    for (const candidate of (data ?? []) as ExportRequest[]) {
      const { data: claimed, error: claimError } = await supabaseAdmin
        .from("data_export_requests")
        .update({
          status: "processing",
          started_at: new Date().toISOString(),
          error_message: null,
        })
        .eq("id", candidate.id)
        .eq("status", "queued")
        .select("id")
        .maybeSingle();
      if (claimError) throw claimError;
      if (claimed) await processExportRequest(candidate);
    }
  } finally {
    exportCycleRunning = false;
  }
}
