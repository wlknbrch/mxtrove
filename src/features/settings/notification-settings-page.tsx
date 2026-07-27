import { useMutation, useQuery } from "@tanstack/react-query";
import { Bell, BellOff, CheckCircle2, Send, Smartphone, Vibrate } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentProfile } from "@/features/profile/api";
import { sendPushTestNotification } from "@/features/media-processing/api";
import { SettingsSidebar } from "@/features/settings/settings-shell";
import { useAppViewer } from "@/hooks/use-app-viewer";
import { envState } from "@/lib/env";
import { subscribeCurrentDeviceToPush, supportsWebPush, unsubscribeCurrentDeviceFromPush } from "@/lib/pwa";
import { queryClient } from "@/lib/query-client";

import {
  getNotificationPreferences,
  listPushSubscriptions,
  savePushSubscription,
  setPushSubscriptionActive,
  updateNotificationPreferences,
} from "@/features/notifications/api";

import type { NotificationPreferences } from "@/types/domain";

const notificationPreferenceRows: Array<{
  key: keyof Pick<
    NotificationPreferences,
    | "follows_enabled"
    | "post_hearts_enabled"
    | "version_hearts_enabled"
    | "comments_enabled"
    | "replies_enabled"
    | "messages_enabled"
    | "single_updates_enabled"
    | "project_invites_enabled"
    | "project_feedback_enabled"
    | "project_activity_enabled"
    | "message_attachments_enabled"
    | "privacy_safe_push"
  >;
  label: string;
  description: string;
}> = [
  {
    key: "messages_enabled",
    label: "Direct messages",
    description: "New direct messages and unread conversation nudges.",
  },
  {
    key: "comments_enabled",
    label: "Comments",
    description: "New comments on your public posts.",
  },
  {
    key: "replies_enabled",
    label: "Replies",
    description: "Replies to comments you wrote.",
  },
  {
    key: "post_hearts_enabled",
    label: "Post hearts",
    description: "People hearting your public posts.",
  },
  {
    key: "version_hearts_enabled",
    label: "Version hearts",
    description: "People hearting the featured version of a single.",
  },
  {
    key: "follows_enabled",
    label: "New followers",
    description: "Follow activity across the social graph.",
  },
  {
    key: "single_updates_enabled",
    label: "Single updates",
    description: "Version updates and public release events.",
  },
  {
    key: "project_invites_enabled",
    label: "Project invitations",
    description: "New collaboration invitations and accepted invites.",
  },
  {
    key: "project_feedback_enabled",
    label: "Project feedback",
    description: "New feedback, replies, and resolved review threads.",
  },
  {
    key: "project_activity_enabled",
    label: "Project activity",
    description: "Version uploads, role changes, and project status changes.",
  },
  {
    key: "message_attachments_enabled",
    label: "Message attachments",
    description: "Protected media arriving in direct or project conversations.",
  },
  {
    key: "privacy_safe_push",
    label: "Private lock-screen copy",
    description: "Keep project and message push text generic so private details stay out of lock-screen previews.",
  },
];

function DeviceStatusBadge({ enabled }: { enabled: boolean }) {
  return enabled ? <Badge variant="success">Live</Badge> : <Badge variant="neutral">Off</Badge>;
}

export function NotificationSettingsPage() {
  const viewer = useAppViewer();
  const profileQuery = useQuery({
    queryKey: ["profile", viewer.userId],
    queryFn: () => getCurrentProfile(viewer.userId),
    enabled: Boolean(viewer.userId),
  });
  const preferencesQuery = useQuery({
    queryKey: ["notification-preferences", viewer.userId],
    queryFn: () => getNotificationPreferences(viewer.userId!),
    enabled: Boolean(viewer.userId),
  });
  const subscriptionsQuery = useQuery({
    queryKey: ["push-subscriptions", viewer.userId],
    queryFn: () => listPushSubscriptions(viewer.userId!),
    enabled: Boolean(viewer.userId),
  });

  const profile = profileQuery.data ?? null;
  const publicProfilePath = profile?.username ? `/@${profile.username}` : null;
  const browserCanPush = supportsWebPush();
  const preferences = preferencesQuery.data ?? null;
  const activeDeviceCount = (subscriptionsQuery.data ?? []).filter((entry) => entry.is_active).length;
  const driveReady = true;

  const togglePreferenceMutation = useMutation({
    mutationFn: async (input: {
      key: keyof NotificationPreferences;
      value: boolean;
    }) => {
      if (!viewer.userId) {
        throw new Error("Please sign in first.");
      }

      return updateNotificationPreferences(viewer.userId, {
        [input.key]: input.value,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["notification-preferences", viewer.userId] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not update notification preferences.");
    },
  });

  const enablePushMutation = useMutation({
    mutationFn: async () => {
      if (!viewer.userId) {
        throw new Error("Please sign in first.");
      }

      const subscription = await subscribeCurrentDeviceToPush();
      await savePushSubscription({
        profileId: viewer.userId,
        subscription,
      });
      await updateNotificationPreferences(viewer.userId, {
        push_enabled: true,
      });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["push-subscriptions", viewer.userId] }),
        queryClient.invalidateQueries({ queryKey: ["notification-preferences", viewer.userId] }),
      ]);
      toast.success("Push notifications enabled for this browser.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not enable push notifications.");
    },
  });

  const disablePushMutation = useMutation({
    mutationFn: async () => {
      if (!viewer.userId) {
        throw new Error("Please sign in first.");
      }

      const endpoint = await unsubscribeCurrentDeviceFromPush();
      if (endpoint) {
        await setPushSubscriptionActive({
          profileId: viewer.userId,
          endpoint,
          isActive: false,
        });
      }
      await updateNotificationPreferences(viewer.userId, {
        push_enabled: false,
      });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["push-subscriptions", viewer.userId] }),
        queryClient.invalidateQueries({ queryKey: ["notification-preferences", viewer.userId] }),
      ]);
      toast.success("Push notifications disabled on this browser.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not disable push notifications.");
    },
  });

  const testPushMutation = useMutation({
    mutationFn: () => sendPushTestNotification(),
    onSuccess: () => {
      toast.success("Test push sent.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not send a test push.");
    },
  });

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Settings"
        title="Notification settings"
        description="Choose what should interrupt you, keep browser push on the devices that matter, and leave the rest on in-app unread counts."
      />

      <div className="grid gap-6 2xl:grid-cols-[310px_minmax(0,1fr)_360px]">
        <div className="hidden min-w-0 2xl:block">
          <SettingsSidebar driveReady={driveReady} />
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <Badge variant={preferences?.push_enabled ? "success" : "neutral"}>
                    {preferences?.push_enabled ? "Push enabled" : "Push off"}
                  </Badge>
                  <Badge variant={browserCanPush ? "accent" : "warning"}>
                    {browserCanPush ? "Browser supports push" : "Browser lacks push support"}
                  </Badge>
                </div>
                <div>
                  <CardTitle className="text-3xl md:text-[2.2rem]">Delivery controls</CardTitle>
                  <CardDescription className="mt-3 max-w-3xl text-base leading-7">
                    MxShare keeps unread badges in-app, but push should stay deliberate. Enable it per device, then
                    decide which events deserve a real interruption.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            {!envState.hasWebPushKey ? (
              <div className="rounded-[18px] border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
                Add `VITE_WEB_PUSH_PUBLIC_KEY` before testing real browser push subscriptions.
              </div>
            ) : null}

            <div className="grid gap-4 md:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
              <div className="space-y-4">
                <div className="rounded-[24px] border border-white/[0.06] bg-white/[0.02] p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Bell className="size-5 text-accent-secondary" />
                      <p className="font-medium">This browser</p>
                    </div>
                    <DeviceStatusBadge enabled={Boolean(preferences?.push_enabled)} />
                  </div>
                  <p className="text-sm leading-7 text-muted-foreground">
                    Turn browser push on when you want message or release activity outside the app shell. Leave it off
                    if the in-app notification center is enough.
                  </p>
                  <div className="mt-4 grid min-w-0 gap-3 sm:flex sm:flex-wrap">
                    <Button
                      className="w-full sm:w-auto"
                      onClick={() => void enablePushMutation.mutateAsync()}
                      disabled={enablePushMutation.isPending || !browserCanPush || !envState.hasWebPushKey}
                    >
                      <Vibrate className="size-4" />
                      Enable push here
                    </Button>
                    <Button
                      variant="secondary"
                      className="w-full sm:w-auto"
                      onClick={() => void disablePushMutation.mutateAsync()}
                      disabled={disablePushMutation.isPending || !browserCanPush}
                    >
                      <BellOff className="size-4" />
                      Disable on this device
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full sm:w-auto"
                      onClick={() => void testPushMutation.mutateAsync()}
                      disabled={testPushMutation.isPending || !preferences?.push_enabled}
                    >
                      <Send className="size-4" />
                      Send test push
                    </Button>
                  </div>
                </div>

                <div className="space-y-3">
                  {notificationPreferenceRows.map((row) => {
                    const enabled = Boolean(preferences?.[row.key]);
                    return (
                      <button
                        key={row.key}
                        type="button"
                        className="w-full rounded-[22px] border border-white/[0.06] bg-white/[0.02] p-4 text-left transition-colors hover:border-accent/22 hover:bg-white/[0.04]"
                        onClick={() =>
                          void togglePreferenceMutation.mutateAsync({
                            key: row.key,
                            value: !enabled,
                          })
                        }
                      >
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div className="min-w-0">
                            <p className="font-medium">{row.label}</p>
                            <p className="mt-2 text-sm leading-7 text-muted-foreground">{row.description}</p>
                          </div>
                          <div className="md:shrink-0">
                            <Badge variant={enabled ? "success" : "neutral"}>{enabled ? "On" : "Off"}</Badge>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-[24px] border border-white/[0.06] bg-white/[0.02] p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-accent-secondary/75">Active devices</p>
                  <p className="mt-3 font-display text-4xl tracking-[-0.04em]">{activeDeviceCount}</p>
                  <p className="mt-2 text-sm leading-7 text-muted-foreground">
                    Devices currently allowed to receive push payloads from the worker.
                  </p>
                </div>

                <div className="rounded-[24px] border border-white/[0.06] bg-white/[0.02] p-4">
                  <div className="mb-3 flex items-center gap-3">
                    <Smartphone className="size-5 text-accent-secondary" />
                    <p className="font-medium">Registered subscriptions</p>
                  </div>
                  <div className="space-y-3 text-sm text-muted-foreground">
                    {subscriptionsQuery.data?.length ? (
                      subscriptionsQuery.data.map((entry) => (
                        <div key={entry.id} className="rounded-[18px] border border-white/[0.05] bg-white/[0.02] px-4 py-3">
                          <div className="flex items-center justify-between gap-3">
                            <p className="truncate font-medium text-foreground">
                              {entry.device_label ?? entry.user_agent ?? "Browser subscription"}
                            </p>
                            <DeviceStatusBadge enabled={entry.is_active} />
                          </div>
                          <p className="mt-2 truncate text-xs uppercase tracking-[0.18em] text-muted-foreground/80">
                            {entry.endpoint}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p>No push subscriptions registered yet.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Readiness</CardTitle>
                <CardDescription className="mt-2">
                  The minimum stack needed before test notifications can really land.
                </CardDescription>
              </div>
            </CardHeader>
            <div className="space-y-3">
              {[
                {
                  label: "Browser supports service workers and PushManager",
                  ready: browserCanPush,
                },
                {
                  label: "App has a VAPID public key",
                  ready: envState.hasWebPushKey,
                },
                {
                  label: "At least one active device is registered",
                  ready: activeDeviceCount > 0,
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-start gap-3 rounded-[20px] border border-white/[0.06] bg-white/[0.02] px-4 py-3"
                >
                  <CheckCircle2 className={`mt-0.5 size-4 ${item.ready ? "text-success" : "text-muted-foreground"}`} />
                  <div>
                    <p>{item.label}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{item.ready ? "Healthy." : "Still missing."}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>How this should feel</CardTitle>
                <CardDescription className="mt-2">
                  Push is meant for important moments, not constant background noise.
                </CardDescription>
              </div>
            </CardHeader>
            <div className="space-y-3 text-sm leading-7 text-muted-foreground">
              <p>Keep direct messages and replies on if collaboration is time-sensitive.</p>
              <p>Turn hearts off if you only care about comments, follows, and DMs.</p>
              <p>Use the in-app Notifications screen for everything else when you do not need browser interruption.</p>
            </div>
            <div className="mt-4">
              <Link to="/notifications">
                <Button variant="secondary">Open notification center</Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
