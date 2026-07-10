import { demoNotifications, demoProfiles } from "@/lib/demo-data";
import { createDemoDelay, isDemoModeEnabled, requireSupabase } from "@/lib/service-utils";
import type { Notification, Profile } from "@/types/domain";

export interface ResolvedNotification {
  notification: Notification;
  actor: Profile | null;
}

export async function listNotifications(viewerId: string) {
  if (isDemoModeEnabled()) {
    await createDemoDelay();
    return demoNotifications.map((notification) => ({
      notification,
      actor: demoProfiles.find((profile) => profile.id === notification.actor_id) ?? null,
    })) satisfies ResolvedNotification[];
  }

  const client = requireSupabase();
  const { data, error } = await client
    .from("notifications")
    .select("*, actor:profiles!notifications_actor_id_fkey(*)")
    .eq("recipient_id", viewerId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return ((data ?? []) as Array<ResolvedNotification>).map((row) => ({
    notification: row.notification ?? (row as unknown as Notification),
    actor: (row as unknown as { actor: Profile | null }).actor ?? null,
  }));
}

export async function markNotificationRead(notificationId: string) {
  if (isDemoModeEnabled()) {
    await createDemoDelay(120);
    return;
  }

  const client = requireSupabase();
  const { error } = await client.rpc("mark_notification_read", {
    notification_id: notificationId,
  });

  if (error) {
    throw error;
  }
}

export async function markAllNotificationsRead() {
  if (isDemoModeEnabled()) {
    await createDemoDelay(120);
    return;
  }

  const client = requireSupabase();
  const { error } = await client.rpc("mark_all_notifications_read");

  if (error) {
    throw error;
  }
}
