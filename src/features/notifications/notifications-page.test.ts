import { describe, expect, it } from "vitest";

import {
  getModerationNotificationDetails,
  getNotificationHeading,
  getNotificationMessage,
} from "@/features/notifications/notifications-page";
import type { ResolvedNotification } from "@/features/notifications/api";

const moderationNotification: ResolvedNotification = {
  actor: null,
  notification: {
    id: "notification-1",
    recipient_id: "profile-1",
    actor_id: null,
    type: "content_moderated",
    post_id: "post-1",
    song_version_id: null,
    comment_id: "comment-1",
    conversation_id: null,
    project_id: null,
    context: {
      action: "The comment was removed from MxTrove.",
      location: "Comment on “Eternal Light”",
      reason: "hate",
    },
    is_read: false,
    created_at: "2026-08-12T10:00:00.000Z",
  },
};

describe("moderation notification presentation", () => {
  it("explains the action, location, and human-readable reason without a moderator actor", () => {
    expect(getNotificationHeading(moderationNotification)).toBe("Moderation decision");
    expect(getNotificationMessage(moderationNotification)).toBe("The comment was removed from MxTrove.");
    expect(getModerationNotificationDetails(moderationNotification)).toEqual({
      location: "Comment on “Eternal Light”",
      reason: "Hateful content",
    });
  });

  it("remains understandable when an older client receives no structured context", () => {
    const withoutContext = {
      ...moderationNotification,
      notification: { ...moderationNotification.notification, context: undefined },
    };

    expect(getNotificationMessage(withoutContext)).toBe("A moderation action was taken on your content.");
    expect(getModerationNotificationDetails(withoutContext)).toEqual({
      location: "MxTrove",
      reason: "Policy enforcement",
    });
  });
});
