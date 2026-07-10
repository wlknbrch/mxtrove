import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { useAppViewer } from "@/hooks/use-app-viewer";
import { formatRelativeTime } from "@/lib/utils";

import { listNotifications, markAllNotificationsRead } from "@/features/notifications/api";

export function NotificationsPage() {
  const viewer = useAppViewer();
  const notificationsQuery = useQuery({
    queryKey: ["notifications", viewer.userId],
    queryFn: () => listNotifications(viewer.userId!),
    enabled: Boolean(viewer.userId),
  });

  const markAllMutation = useMutation({
    mutationFn: () => markAllNotificationsRead(),
    onSuccess: () => {
      toast.success("Notifications marked as read.");
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Notifications"
        title="Everything that needs your attention"
        description="Follows, hearts, comments, single updates, and new messages all collect here."
        actions={
          <Button variant="secondary" onClick={() => void markAllMutation.mutateAsync()}>
            Mark all read
          </Button>
        }
      />

      <div className="space-y-4">
        {notificationsQuery.data?.map((entry) => (
          <Card key={entry.notification.id}>
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg capitalize">{entry.notification.type.replace("_", " ")}</CardTitle>
                <CardDescription className="mt-2">
                  {entry.actor?.display_name ?? "Someone"} · {formatRelativeTime(entry.notification.created_at)}
                </CardDescription>
              </div>
              <Badge variant={entry.notification.is_read ? "neutral" : "accent"}>
                {entry.notification.is_read ? "Read" : "Unread"}
              </Badge>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
