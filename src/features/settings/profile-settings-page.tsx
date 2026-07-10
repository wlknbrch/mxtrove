import { useMutation, useQuery } from "@tanstack/react-query";
import { ExternalLink, Link2, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCloudConnection } from "@/features/drive/api";
import { getStoredDriveFolders } from "@/features/drive/google-drive-connection";
import { useAppViewer } from "@/hooks/use-app-viewer";
import { queryClient } from "@/lib/query-client";
import type { ProfileFormValues } from "@/lib/validators";

import { getCurrentProfile, saveProfile } from "@/features/profile/api";
import { ProfileAvatarPanel } from "@/features/profile/profile-avatar-panel";
import { ProfileFormPanel } from "@/features/profile/profile-form-panel";
import { SettingsSidebar } from "@/features/settings/settings-shell";

function toFormValues(profile: Awaited<ReturnType<typeof getCurrentProfile>> | null): Partial<ProfileFormValues> | undefined {
  if (!profile) {
    return undefined;
  }

  return {
    display_name: profile.display_name,
    username: profile.username,
    bio: profile.bio ?? "",
    location: profile.location ?? "",
    website_url: profile.website_url,
    instagram_url: profile.instagram_url,
    spotify_url: profile.spotify_url,
    youtube_url: profile.youtube_url,
    support_url: profile.support_url,
    avatar_asset_id: profile.avatar_asset_id,
  };
}

export function ProfileSettingsPage() {
  const viewer = useAppViewer();
  const profileQuery = useQuery({
    queryKey: ["profile", viewer.userId],
    queryFn: () => getCurrentProfile(viewer.userId),
    enabled: Boolean(viewer.userId),
  });
  const connectionQuery = useQuery({
    queryKey: ["cloud-connection", viewer.userId],
    queryFn: () => getCloudConnection(viewer.userId!),
    enabled: Boolean(viewer.userId),
  });

  const mutation = useMutation({
    mutationFn: async (values: Parameters<typeof saveProfile>[1]) => {
      if (!viewer.userId) {
        throw new Error("Please sign in first.");
      }

      return saveProfile(viewer.userId, values);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["profile", viewer.userId] });
      toast.success("Profile updated.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not update profile.");
    },
  });

  const profile = profileQuery.data ?? null;
  const publicProfilePath = profile?.username ? `/@${profile.username}` : null;
  const connectedLinks = [
    profile?.website_url,
    profile?.instagram_url,
    profile?.spotify_url,
    profile?.youtube_url,
    profile?.support_url,
  ].filter(Boolean).length;
  const driveReady = Boolean(getStoredDriveFolders(connectionQuery.data));

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Settings"
        title="Profile settings"
        description="Shape the public surface fans land on first: name, username, avatar, intro, and the links that turn curiosity into support."
      />

      <div className="grid gap-6 xl:grid-cols-[310px_minmax(0,1fr)_360px]">
        <SettingsSidebar driveReady={driveReady} publicProfilePath={publicProfilePath} />

        <ProfileFormPanel
          title="Public profile"
          description="Username must stay lowercase, unique, and route-safe. Everything here feeds both the public profile and profile chips across the app."
          submitLabel="Save profile"
          initialValues={toFormValues(profile)}
          onSubmit={async (values) => {
            await mutation.mutateAsync(values);
          }}
          isPending={mutation.isPending}
        />

        <div className="space-y-6">
          <ProfileAvatarPanel profile={profile} />

          <Card>
            <CardHeader>
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <Badge variant="accent">{connectedLinks} links</Badge>
                  <Badge variant={profile?.bio?.trim() ? "success" : "warning"}>
                    {profile?.bio?.trim() ? "Bio ready" : "Bio missing"}
                  </Badge>
                </div>
                <div>
                  <CardTitle>Public profile preview</CardTitle>
                  <CardDescription className="mt-2">
                    A quick check of what people will understand about you at first glance.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <div className="space-y-4">
              <div className="rounded-[24px] border border-accent/16 bg-[radial-gradient(circle_at_top,rgba(157,92,255,0.18),rgba(255,255,255,0.02)_58%,rgba(255,255,255,0.01))] p-5">
                <p className="font-display text-3xl tracking-[-0.03em]">{profile?.display_name ?? "Your display name"}</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {profile?.username ? `@${profile.username}` : "Add a route-safe username"}
                </p>
                <p className="mt-4 text-sm leading-7 text-muted-foreground">
                  {profile?.bio?.trim() || "Add a short line about your sound, your process, or the world you're building with your music."}
                </p>
              </div>

              <div className="rounded-[24px] border border-white/[0.06] bg-white/[0.02] p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Sparkles className="size-4 text-accent-secondary" />
                  <p className="font-medium">Strong profile ingredients</p>
                </div>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>{profile?.location ? `Location set: ${profile.location}` : "Location is still missing."}</p>
                  <p>{connectedLinks > 0 ? `${connectedLinks} public links connected.` : "No public links connected yet."}</p>
                  <p>{profile?.support_url ? "Support link present." : "Consider adding a support link for fans."}</p>
                </div>
              </div>

              <div className="rounded-[24px] border border-white/[0.06] bg-white/[0.02] p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-accent-secondary/75">Connected links</p>
                <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                  <p>{profile?.website_url ?? "Website missing"}</p>
                  <p>{profile?.instagram_url ?? "Instagram missing"}</p>
                  <p>{profile?.spotify_url ?? "Spotify missing"}</p>
                  <p>{profile?.support_url ?? "Support link missing"}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                {publicProfilePath ? (
                  <Link to={publicProfilePath}>
                    <Button variant="secondary">
                      Open public profile
                      <ExternalLink className="size-4" />
                    </Button>
                  </Link>
                ) : null}
                <Link to="/settings/storage">
                  <Button variant="ghost">
                    Check Drive setup
                    <Link2 className="size-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
