import webpush from "web-push";

import { config } from "../config.js";
import { supabaseAdmin } from "../supabase/service.js";

interface ClaimedPushRow {
  queue_item_id: string;
  notification_id: string;
  recipient_id: string;
  subscription_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  notification_type: string;
  post_id: string | null;
  project_id: string | null;
  song_version_id: string | null;
  comment_id: string | null;
  conversation_id: string | null;
  actor_display_name: string | null;
  actor_username: string | null;
  post_title: string | null;
  privacy_safe_push: boolean;
}

if (config.webPushPublicKey && config.webPushPrivateKey) {
  webpush.setVapidDetails(config.webPushSubject, config.webPushPublicKey, config.webPushPrivateKey);
}

function buildPushPayload(row: ClaimedPushRow) {
  const actorName = row.actor_display_name ?? row.actor_username ?? "Someone";
  const postTitle = row.post_title ?? "your post";

  const detailedBody =
    row.notification_type === "follow"
      ? `${actorName} started following you.`
      : row.notification_type === "post_heart"
        ? `${actorName} hearted “${postTitle}”.`
        : row.notification_type === "version_heart"
          ? `${actorName} hearted one of your versions.`
          : row.notification_type === "comment_heart"
            ? `${actorName} hearted your comment on “${postTitle}”.`
            : row.notification_type === "comment"
              ? `${actorName} commented on “${postTitle}”.`
              : row.notification_type === "comment_reply"
                ? `${actorName} replied in a comment thread.`
                : row.notification_type === "single_version"
                ? `${actorName} uploaded a new public version of “${postTitle}”.`
                : row.notification_type === "release_update"
                  ? `${actorName} updated “${postTitle}”, a release you engaged with.`
                : row.notification_type === "project_invite"
                  ? `${actorName} invited you to a private project.`
                  : row.notification_type === "project_invite_accepted"
                    ? `${actorName} accepted your project invitation.`
                    : row.notification_type === "project_member_removed"
                      ? "Your access to a project changed."
                      : row.notification_type === "project_role_changed"
                        ? "Your role in a private project changed."
                        : row.notification_type === "project_feedback"
                          ? `${actorName} added feedback in a private project.`
                          : row.notification_type === "project_feedback_reply"
                            ? `${actorName} replied to project feedback.`
                            : row.notification_type === "project_feedback_resolved"
                              ? `${actorName} resolved project feedback.`
                              : row.notification_type === "project_version_uploaded"
                                ? `${actorName} added a version to a private project.`
                                : row.notification_type === "project_status_changed"
                                  ? `${actorName} changed a project status.`
                                  : row.notification_type === "message_attachment"
                                    ? `${actorName} sent you an attachment.`
                                    : row.notification_type === "share_link_review"
                                      ? "A private review link received activity."
                                      : "You have a new message on MxTrove.";

  const body = row.privacy_safe_push
    ? "You have a new private activity update on MxTrove."
    : detailedBody;

  const url =
    row.notification_type === "follow"
      ? row.actor_username
        ? `/@${row.actor_username}`
        : "/explore"
      : row.notification_type === "message" || row.notification_type === "message_attachment"
        ? row.conversation_id
          ? `/messages/${row.conversation_id}`
          : "/messages"
        : row.project_id
          ? `/projects/${row.project_id}`
        : row.post_id
          ? `/post/${row.post_id}`
          : "/notifications";

  return {
    title: "MxTrove",
    body,
    url,
    tag: `${row.notification_type}:${row.notification_id}`,
  };
}

async function markQueueResult(input: {
  queueItemId: string;
  status: "delivered" | "failed" | "discarded";
  attemptCount: number;
  lastError?: string | null;
}) {
  const payload: Record<string, unknown> = {
    status: input.status,
    attempt_count: input.attemptCount,
    last_error: input.lastError ?? null,
    locked_at: null,
    locked_by: null,
    updated_at: new Date().toISOString(),
  };

  if (input.status === "delivered") {
    payload.delivered_at = new Date().toISOString();
  }

  if (input.status === "failed") {
    payload.available_at = new Date(Date.now() + Math.min(300000, input.attemptCount * 15000)).toISOString();
  }

  const { error } = await supabaseAdmin.from("push_delivery_queue").update(payload).eq("id", input.queueItemId);
  if (error) {
    throw error;
  }
}

export async function dispatchPushBatch() {
  if (!config.webPushPublicKey || !config.webPushPrivateKey) {
    return;
  }

  const { data, error } = await supabaseAdmin.rpc("claim_push_delivery_batch", {
    batch_size: 20,
  });

  if (error) {
    throw error;
  }

  const claimedRows = (data ?? []) as ClaimedPushRow[];
  const rowsByQueue = new Map<string, ClaimedPushRow[]>();

  claimedRows.forEach((row) => {
    rowsByQueue.set(row.queue_item_id, [...(rowsByQueue.get(row.queue_item_id) ?? []), row]);
  });

  for (const [queueItemId, rows] of rowsByQueue.entries()) {
    let delivered = 0;
    let discarded = 0;
    let failed = 0;
    let attemptCount = 0;
    let lastError: string | null = null;

    for (const row of rows) {
      attemptCount += 1;
      const payload = JSON.stringify(buildPushPayload(row));

      try {
        await webpush.sendNotification(
          {
            endpoint: row.endpoint,
            keys: {
              p256dh: row.p256dh,
              auth: row.auth,
            },
          },
          payload,
        );

        delivered += 1;
        await supabaseAdmin.from("push_delivery_attempts").insert({
          queue_item_id: queueItemId,
          subscription_id: row.subscription_id,
          status_code: 201,
        });
        await supabaseAdmin
          .from("push_subscriptions")
          .update({
            last_success_at: new Date().toISOString(),
            failure_count: 0,
            updated_at: new Date().toISOString(),
          })
          .eq("id", row.subscription_id);
      } catch (error) {
        const statusCode = Number((error as { statusCode?: number }).statusCode ?? 0);
        lastError = error instanceof Error ? error.message : "Push delivery failed.";

        await supabaseAdmin.from("push_delivery_attempts").insert({
          queue_item_id: queueItemId,
          subscription_id: row.subscription_id,
          status_code: statusCode || null,
          error_message: lastError,
        });

        if (statusCode === 404 || statusCode === 410) {
          discarded += 1;
          await supabaseAdmin
            .from("push_subscriptions")
            .update({
              is_active: false,
              last_failure_at: new Date().toISOString(),
              failure_count: 1,
              updated_at: new Date().toISOString(),
            })
            .eq("id", row.subscription_id);
        } else {
          failed += 1;
          await supabaseAdmin
            .from("push_subscriptions")
            .update({
              last_failure_at: new Date().toISOString(),
              failure_count: 1,
              updated_at: new Date().toISOString(),
            })
            .eq("id", row.subscription_id);
        }
      }
    }

    if (delivered > 0) {
      await markQueueResult({
        queueItemId,
        status: "delivered",
        attemptCount,
      });
    } else if (discarded > 0 && failed === 0) {
      await markQueueResult({
        queueItemId,
        status: "discarded",
        attemptCount,
        lastError,
      });
    } else {
      await markQueueResult({
        queueItemId,
        status: "failed",
        attemptCount,
        lastError,
      });
    }
  }
}

export async function sendImmediateTestPush(recipientId: string) {
  if (!config.webPushPublicKey || !config.webPushPrivateKey) {
    throw new Error("Web push is not configured on the worker.");
  }

  const { data, error } = await supabaseAdmin
    .from("push_subscriptions")
    .select("*")
    .eq("profile_id", recipientId)
    .eq("is_active", true);

  if (error) {
    throw error;
  }

  if (!(data ?? []).length) {
    throw new Error("No active push subscription was found for this account.");
  }

  await Promise.all(
    (data ?? []).map((subscription) =>
      webpush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256dh,
            auth: subscription.auth,
          },
        },
        JSON.stringify({
          title: "MxTrove",
          body: "Push notifications are enabled on this device.",
          url: "/settings/notifications",
          tag: "push-test",
        }),
      ),
    ),
  );
}
