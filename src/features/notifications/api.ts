import { demoNotifications, demoProfiles } from "@/lib/demo-data";
import { createDemoDelay, isDemoModeEnabled, requireSupabase } from "@/lib/service-utils";
import type { Notification, NotificationPreferences, Profile, PushSubscriptionRecord } from "@/types/domain";
import { serializePushSubscription } from "@/lib/pwa";

export interface ResolvedNotification {
  notification: Notification;
  actor: Profile | null;
}

export const NOTIFICATIONS_PAGE_SIZE = 20;

export interface NotificationsPageResult {
  items: ResolvedNotification[];
  total: number;
  nextOffset: number | null;
}

export async function listNotifications(
  viewerId: string,
  options: { offset?: number; limit?: number } = {},
): Promise<NotificationsPageResult> {
  const offset = Math.max(0, options.offset ?? 0);
  const limit = Math.max(1, options.limit ?? NOTIFICATIONS_PAGE_SIZE);

  if (isDemoModeEnabled()) {
    await createDemoDelay();
    const matchingNotifications = demoNotifications.filter(
      (notification) => notification.recipient_id === viewerId,
    );
    const items = matchingNotifications.slice(offset, offset + limit).map((notification) => ({
      notification,
      actor: demoProfiles.find((profile) => profile.id === notification.actor_id) ?? null,
    })) satisfies ResolvedNotification[];

    return {
      items,
      total: matchingNotifications.length,
      nextOffset: offset + items.length < matchingNotifications.length
        ? offset + items.length
        : null,
    };
  }

  const client = requireSupabase();
  const { data, error, count } = await client
    .from("notifications")
    .select("*, actor:profiles!notifications_actor_id_fkey(*)", { count: "exact" })
    .eq("recipient_id", viewerId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw error;
  }

  const items = ((data ?? []) as Array<ResolvedNotification>).map((row) => ({
    notification: row.notification ?? (row as unknown as Notification),
    actor: (row as unknown as { actor: Profile | null }).actor ?? null,
  }));
  const total = count ?? items.length;

  return {
    items,
    total,
    nextOffset: offset + items.length < total ? offset + items.length : null,
  };
}

export async function getUnreadNotificationCount(viewerId: string) {
  if (isDemoModeEnabled()) {
    await createDemoDelay(120);
    return demoNotifications.filter(
      (notification) => notification.recipient_id === viewerId && !notification.is_read,
    ).length;
  }

  const client = requireSupabase();
  const { count, error } = await client
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("recipient_id", viewerId)
    .eq("is_read", false);

  if (error) {
    throw error;
  }

  return count ?? 0;
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

export async function getNotificationPreferences(profileId: string) {
  if (isDemoModeEnabled()) {
    await createDemoDelay(120);
    return {
      profile_id: profileId,
      push_enabled: false,
      follows_enabled: true,
      post_hearts_enabled: true,
      version_hearts_enabled: true,
      comments_enabled: true,
      replies_enabled: true,
      messages_enabled: true,
      single_updates_enabled: true,
      project_invites_enabled: true,
      project_feedback_enabled: true,
      project_activity_enabled: true,
      message_attachments_enabled: true,
      privacy_safe_push: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } satisfies NotificationPreferences;
  }

  const client = requireSupabase();
  const { data, error } = await client
    .from("notification_preferences")
    .select("*")
    .eq("profile_id", profileId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as NotificationPreferences | null;
}

export async function updateNotificationPreferences(
  profileId: string,
  updates: Partial<NotificationPreferences>,
) {
  if (isDemoModeEnabled()) {
    await createDemoDelay(120);
    return {
      profile_id: profileId,
      push_enabled: Boolean(updates.push_enabled),
      follows_enabled: updates.follows_enabled ?? true,
      post_hearts_enabled: updates.post_hearts_enabled ?? true,
      version_hearts_enabled: updates.version_hearts_enabled ?? true,
      comments_enabled: updates.comments_enabled ?? true,
      replies_enabled: updates.replies_enabled ?? true,
      messages_enabled: updates.messages_enabled ?? true,
      single_updates_enabled: updates.single_updates_enabled ?? true,
      project_invites_enabled: updates.project_invites_enabled ?? true,
      project_feedback_enabled: updates.project_feedback_enabled ?? true,
      project_activity_enabled: updates.project_activity_enabled ?? true,
      message_attachments_enabled: updates.message_attachments_enabled ?? true,
      privacy_safe_push: updates.privacy_safe_push ?? true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } satisfies NotificationPreferences;
  }

  const client = requireSupabase();
  const { data, error } = await client
    .from("notification_preferences")
    .update(updates)
    .eq("profile_id", profileId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as NotificationPreferences;
}

export async function listPushSubscriptions(profileId: string) {
  if (isDemoModeEnabled()) {
    await createDemoDelay(120);
    return [] as PushSubscriptionRecord[];
  }

  const client = requireSupabase();
  const { data, error } = await client
    .from("push_subscriptions")
    .select("*")
    .eq("profile_id", profileId)
    .order("updated_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as PushSubscriptionRecord[];
}

export async function savePushSubscription(input: {
  profileId: string;
  subscription: PushSubscription;
  deviceLabel?: string | null;
}) {
  if (isDemoModeEnabled()) {
    await createDemoDelay(120);
    return {
      id: crypto.randomUUID(),
      profile_id: input.profileId,
      ...serializePushSubscription(input.subscription),
      user_agent: navigator.userAgent,
      device_label: input.deviceLabel ?? navigator.platform ?? "Browser device",
      is_active: true,
      last_success_at: null,
      last_failure_at: null,
      failure_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } satisfies PushSubscriptionRecord;
  }

  const client = requireSupabase();
  const serialized = serializePushSubscription(input.subscription);
  const { data, error } = await client
    .from("push_subscriptions")
    .upsert(
      {
        profile_id: input.profileId,
        endpoint: serialized.endpoint,
        p256dh: serialized.p256dh,
        auth: serialized.auth,
        user_agent: navigator.userAgent,
        device_label: input.deviceLabel ?? navigator.platform ?? "Browser device",
        is_active: true,
        last_failure_at: null,
        failure_count: 0,
      },
      {
        onConflict: "endpoint",
      },
    )
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as PushSubscriptionRecord;
}

export async function setPushSubscriptionActive(input: {
  profileId: string;
  endpoint: string;
  isActive: boolean;
}) {
  if (isDemoModeEnabled()) {
    await createDemoDelay(120);
    return;
  }

  const client = requireSupabase();
  const { error } = await client
    .from("push_subscriptions")
    .update({
      is_active: input.isActive,
      last_failure_at: input.isActive ? null : new Date().toISOString(),
    })
    .eq("profile_id", input.profileId)
    .eq("endpoint", input.endpoint);

  if (error) {
    throw error;
  }
}
