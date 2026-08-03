import { useInfiniteQuery, useMutation, useQuery } from "@tanstack/react-query";
import { ArrowUpRight, CheckCircle2, LoaderCircle, MailOpen, MessageCircleMore, UserRound } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import {
  getUnreadNotificationCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type ResolvedNotification,
} from "@/features/notifications/api";
import { useAppViewer } from "@/hooks/use-app-viewer";
import { queryClient } from "@/lib/query-client";
import { cn, formatRelativeTime } from "@/lib/utils";

function getNotificationHeading(entry: ResolvedNotification) {
  switch (entry.notification.type) {
    case "follow":
      return "New follower";
    case "post_heart":
      return "Post heart";
    case "version_heart":
      return "Song heart";
    case "comment_heart":
      return "Comment heart";
    case "comment":
      return "New comment";
    case "comment_reply":
      return "Reply";
    case "single_version":
      return "Release update";
    case "message":
      return "Direct message";
    case "project_invite":
      return "Project invitation";
    case "project_invite_accepted":
      return "Invitation accepted";
    case "project_member_removed":
      return "Project member update";
    case "project_role_changed":
      return "Project role changed";
    case "project_feedback":
      return "New project feedback";
    case "project_feedback_reply":
      return "Feedback reply";
    case "project_feedback_resolved":
      return "Feedback resolved";
    case "project_version_uploaded":
      return "New project version";
    case "project_status_changed":
      return "Project status changed";
    case "message_attachment":
      return "New attachment";
    case "share_link_review":
      return "Share-link review";
    default:
      return "Notification";
  }
}

function getNotificationMessage(entry: ResolvedNotification) {
  const actorName = entry.actor?.display_name ?? "Someone";

  switch (entry.notification.type) {
    case "follow":
      return `${actorName} started following you.`;
    case "post_heart":
      return `${actorName} hearted one of your public posts.`;
    case "version_heart":
      return `${actorName} hearted one of your shared songs.`;
    case "comment_heart":
      return `${actorName} hearted a comment you wrote.`;
    case "comment":
      return `${actorName} commented on one of your posts.`;
    case "comment_reply":
      return `${actorName} replied to a comment you wrote.`;
    case "single_version":
      return `${actorName} published or updated a release you might want to hear.`;
    case "message":
      return `${actorName} sent you a direct message.`;
    case "project_invite":
      return `${actorName} invited you to collaborate on a project.`;
    case "project_invite_accepted":
      return `${actorName} accepted a project invitation.`;
    case "project_member_removed":
      return "A collaboration project's membership changed.";
    case "project_role_changed":
      return "Your role in a collaboration project changed.";
    case "project_feedback":
      return `${actorName} left feedback in a collaboration project.`;
    case "project_feedback_reply":
      return `${actorName} replied to project feedback.`;
    case "project_feedback_resolved":
      return `${actorName} resolved a feedback thread.`;
    case "project_version_uploaded":
      return `${actorName} uploaded a new project version.`;
    case "project_status_changed":
      return "A collaboration project moved to a new stage.";
    case "message_attachment":
      return `${actorName} sent a protected attachment.`;
    case "share_link_review":
      return "Someone reviewed content through a private share link.";
    default:
      return `${actorName} triggered a notification.`;
  }
}

function getPrimaryNotificationTarget(entry: ResolvedNotification) {
  if (entry.notification.type === "project_invite") {
    return {
      label: "Review invitation",
      to: "/invites",
      icon: MailOpen,
    };
  }

  if (entry.notification.project_id) {
    return {
      label: "Open project",
      to: `/projects/${entry.notification.project_id}`,
      icon: ArrowUpRight,
    };
  }
  if (entry.notification.conversation_id) {
    return {
      label: "Open conversation",
      to: `/messages/${entry.notification.conversation_id}`,
      icon: MessageCircleMore,
    };
  }

  if (entry.notification.post_id) {
    return {
      label: "Open release",
      to: `/post/${entry.notification.post_id}`,
      icon: ArrowUpRight,
    };
  }

  if (entry.actor?.username) {
    return {
      label: "Open profile",
      to: `/@${entry.actor.username}`,
      icon: UserRound,
    };
  }

  return null;
}

export function NotificationsPage() {
  const viewer = useAppViewer();
  const navigate = useNavigate();
  const [markingNotificationId, setMarkingNotificationId] = useState<string | null>(null);
  const notificationsQuery = useInfiniteQuery({
    queryKey: ["notifications", viewer.userId],
    queryFn: ({ pageParam }) => listNotifications(viewer.userId!, { offset: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextOffset ?? undefined,
    enabled: Boolean(viewer.userId),
  });
  const unreadQuery = useQuery({
    queryKey: ["notifications-unread", viewer.userId],
    queryFn: () => getUnreadNotificationCount(viewer.userId!),
    enabled: Boolean(viewer.userId),
  });
  const notifications = useMemo(
    () => notificationsQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [notificationsQuery.data],
  );
  const totalCount = notificationsQuery.data?.pages[0]?.total ?? notifications.length;

  const markAllMutation = useMutation({
    mutationFn: () => markAllNotificationsRead(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["notifications", viewer.userId] });
      await queryClient.invalidateQueries({ queryKey: ["notifications-unread", viewer.userId] });
      toast.success("Notifications marked as read.");
    },
  });
  const markReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      setMarkingNotificationId(notificationId);
      await markNotificationRead(notificationId);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["notifications", viewer.userId] });
      await queryClient.invalidateQueries({ queryKey: ["notifications-unread", viewer.userId] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not mark this notification as read.");
    },
    onSettled: () => {
      setMarkingNotificationId(null);
    },
  });
  const unreadCount = unreadQuery.data ?? 0;

  async function handleOpenTarget(entry: ResolvedNotification, to: string) {
    if (!entry.notification.is_read) {
      await markReadMutation.mutateAsync(entry.notification.id);
    }

    navigate(to);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Notifications"
        title="Everything that needs your attention"
        description="Follows, hearts, comments, single updates, and new messages all collect here."
        actions={
          <Button
            variant="secondary"
            disabled={markAllMutation.isPending || unreadCount === 0}
            onClick={() => void markAllMutation.mutateAsync()}
          >
            Mark all read
          </Button>
        }
      />

      <div className="flex flex-wrap gap-3">
        <Badge variant="accent">{unreadCount} unread</Badge>
        <Badge variant="neutral">{totalCount} total</Badge>
        <Badge variant="neutral">{notifications.length} loaded</Badge>
      </div>

      <div className="space-y-4">
        {notifications.map((entry) => {
          const actorPath = entry.actor?.username ? `/@${entry.actor.username}` : null;
          const primaryTarget = getPrimaryNotificationTarget(entry);
          const showPrimaryAction = primaryTarget && primaryTarget.to !== actorPath;
          const isMarkingRead = markingNotificationId === entry.notification.id;

          return (
            <Card
              key={entry.notification.id}
              className={cn(
                "space-y-4",
                !entry.notification.is_read && "border-accent/24 bg-[linear-gradient(180deg,rgba(var(--accent-rgb),0.08),rgba(255,255,255,0.02))]",
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <CardTitle className="text-lg">{getNotificationHeading(entry)}</CardTitle>
                    <Badge variant={entry.notification.is_read ? "neutral" : "accent"}>
                      {entry.notification.is_read ? "Read" : "Unread"}
                    </Badge>
                  </div>
                  <CardDescription>
                    {formatRelativeTime(entry.notification.created_at)}
                  </CardDescription>
                </div>
              </div>

              <div className="rounded-[22px] border border-white/[0.06] bg-white/[0.02] px-4 py-4">
                <p className="text-sm leading-7 text-muted-foreground">{getNotificationMessage(entry)}</p>
                {actorPath ? (
                  <button
                    type="button"
                    className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-accent-secondary transition-colors hover:text-foreground"
                    onClick={() => void handleOpenTarget(entry, actorPath)}
                  >
                    {entry.actor?.display_name ?? "Open profile"}
                    <ArrowUpRight className="size-4" />
                  </button>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-3">
                {showPrimaryAction ? (
                  <Button
                    variant="secondary"
                    onClick={() => void handleOpenTarget(entry, primaryTarget.to)}
                  >
                    <primaryTarget.icon className="size-4" />
                    {primaryTarget.label}
                  </Button>
                ) : null}
                {!entry.notification.is_read ? (
                  <Button
                    variant="ghost"
                    onClick={() => void markReadMutation.mutateAsync(entry.notification.id)}
                    disabled={isMarkingRead}
                  >
                    <CheckCircle2 className="size-4" />
                    Mark read
                  </Button>
                ) : null}
              </div>
            </Card>
          );
        })}
        {!notifications.length && !notificationsQuery.isPending ? (
          <EmptyState
            icon={MailOpen}
            title="No notifications yet"
            description="New follows, project activity, messages, and release responses will appear here."
          />
        ) : null}
        {notificationsQuery.hasNextPage ? (
          <div className="flex justify-center pt-2">
            <Button
              variant="secondary"
              disabled={notificationsQuery.isFetchingNextPage}
              onClick={() => void notificationsQuery.fetchNextPage()}
            >
              {notificationsQuery.isFetchingNextPage ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : null}
              Load older notifications
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
