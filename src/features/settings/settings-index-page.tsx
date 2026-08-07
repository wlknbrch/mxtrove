import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, ExternalLink, HardDrive, UserRound } from "lucide-react";
import { Link } from "react-router-dom";

import { PageHeader } from "@/components/layout/page-header";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCloudProviderLabel, getCloudStorageStatus } from "@/features/cloud-providers/status";
import { getAssetById, getCloudConnections } from "@/features/drive/api";
import { getCurrentProfile } from "@/features/profile/api";
import { SettingsSidebar } from "@/features/settings/settings-shell";
import { useAppViewer } from "@/hooks/use-app-viewer";
import { getAvatarAssetUrls } from "@/lib/asset-urls";

function countConnectedLinks(profile: Awaited<ReturnType<typeof getCurrentProfile>> | null | undefined) {
  return [
    profile?.website_url,
    profile?.instagram_url,
    profile?.spotify_url,
    profile?.youtube_url,
    profile?.support_url,
  ].filter(Boolean).length;
}

export function SettingsIndexPage() {
  const viewer = useAppViewer();

  const profileQuery = useQuery({
    queryKey: ["profile", viewer.userId],
    queryFn: () => getCurrentProfile(viewer.userId),
    enabled: Boolean(viewer.userId),
  });

  const connectionsQuery = useQuery({
    queryKey: ["cloud-connections", viewer.userId],
    queryFn: () => getCloudConnections(viewer.userId!),
    enabled: Boolean(viewer.userId),
  });

  const avatarAssetQuery = useQuery({
    queryKey: ["asset", profileQuery.data?.avatar_asset_id],
    queryFn: () => getAssetById(profileQuery.data!.avatar_asset_id!),
    enabled: Boolean(profileQuery.data?.avatar_asset_id),
  });

  const profile = profileQuery.data ?? null;
  const connectedLinks = countConnectedLinks(profile);
  const {
    activeConnection,
    activeFolders,
    connectedConnections,
    storageReady,
  } = getCloudStorageStatus(connectionsQuery.data);
  const activeProviderName = getCloudProviderLabel(activeConnection?.provider);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Settings"
        title="Control room"
        description="Manage your public identity, keep your preferred cloud storage healthy, and make sure the surfaces fans see stay polished."
      />

      <div className="grid gap-6 xl:grid-cols-[310px_minmax(0,1fr)]">
        <SettingsSidebar />

        <div className="min-w-0 space-y-6">
          <div className="grid min-w-0 gap-6 min-[1800px]:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <div>
                    <CardTitle>Launch checklist</CardTitle>
                    <CardDescription className="mt-2">
                      The quickest pass before sharing the app or publishing new music.
                    </CardDescription>
                  </div>
                </CardHeader>
                <div className="space-y-3">
                  {[
                    {
                      label: "Public profile has a clean display name, bio, and working links",
                      ready: Boolean(profile?.display_name && profile?.username && profile?.bio?.trim()),
                    },
                    {
                      label: "At least one cloud provider is connected and upload-ready",
                      ready: storageReady,
                    },
                    {
                      label: "Avatar is visible across the shell and profile",
                      ready: Boolean(profile?.avatar_asset_id),
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="flex items-start gap-3 rounded-[20px] border border-white/[0.06] bg-white/[0.02] px-4 py-3"
                    >
                      <CheckCircle2 className={`mt-0.5 size-4 ${item.ready ? "text-success" : "text-muted-foreground"}`} />
                      <div className="space-y-1">
                        <p>{item.label}</p>
                        <p className="text-sm text-muted-foreground">{item.ready ? "Looks good." : "Still needs attention."}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card>
                <CardHeader>
                  <div>
                    <CardTitle>Quick links</CardTitle>
                    <CardDescription className="mt-2">
                      Jump straight to the two settings flows you will use most.
                    </CardDescription>
                  </div>
                </CardHeader>
                <div className="space-y-3">
                  <Link
                    to="/settings/profile"
                    className="flex items-center justify-between rounded-[20px] border border-white/[0.06] bg-white/[0.02] px-4 py-4 transition-colors hover:border-accent/25 hover:bg-white/[0.04]"
                  >
                    <div>
                      <p className="font-medium">Profile settings</p>
                      <p className="mt-1 text-sm text-muted-foreground">Names, bio, avatar, and platform links.</p>
                    </div>
                    <ExternalLink className="size-4 text-accent-secondary" />
                  </Link>
                  <Link
                    to="/settings/storage"
                    className="flex items-center justify-between rounded-[20px] border border-white/[0.06] bg-white/[0.02] px-4 py-4 transition-colors hover:border-accent/25 hover:bg-white/[0.04]"
                  >
                    <div>
                      <p className="font-medium">Cloud storage setup</p>
                      <p className="mt-1 text-sm text-muted-foreground">Connect providers, choose a default, and inspect the active folder map.</p>
                    </div>
                    <ExternalLink className="size-4 text-accent-secondary" />
                  </Link>
                </div>
              </Card>
            </div>

            <Card className="min-w-0 overflow-hidden">
              <div className="rounded-[28px] border border-accent/20 bg-[radial-gradient(circle_at_top,rgba(var(--accent-rgb),0.28),rgba(255,255,255,0.02)_58%,rgba(255,255,255,0.01))] p-5">
                <div className="flex items-center gap-4">
                  <Avatar
                    alt={profile?.display_name ?? "Current profile"}
                    src={getAvatarAssetUrls(avatarAssetQuery.data)}
                    initials={(profile?.display_name ?? viewer.email ?? "MX").slice(0, 2).toUpperCase()}
                    className="size-18 text-base"
                  />
                  <div className="min-w-0">
                    <p className="truncate font-display text-3xl tracking-[-0.03em]">{profile?.display_name ?? "Your profile"}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {profile?.username ? `@${profile.username}` : viewer.email ?? "Complete your public profile"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-5 grid min-w-0 gap-4">
                <div className="min-w-0 rounded-[24px] border border-white/[0.06] bg-white/[0.02] p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-accent-secondary/75">Bio</p>
                  <p className="mt-3 break-words text-sm leading-7 text-muted-foreground">
                    {profile?.bio?.trim() || "Add a short intro so people landing on your profile understand your sound immediately."}
                  </p>
                </div>

                <div className="min-w-0 rounded-[24px] border border-white/[0.06] bg-white/[0.02] p-4">
                  <div className="mb-3 flex flex-wrap items-center gap-3">
                    <p className="text-xs uppercase tracking-[0.22em] text-accent-secondary/75">Public links</p>
                    <Badge variant="accent">{connectedLinks} connected</Badge>
                  </div>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p className="break-all">{profile?.website_url ?? "Website missing"}</p>
                    <p className="break-all">{profile?.support_url ?? "Support link missing"}</p>
                    <p className="break-all">{profile?.spotify_url ?? "Spotify link missing"}</p>
                  </div>
                </div>

                <div className="min-w-0 rounded-[24px] border border-white/[0.06] bg-white/[0.02] p-4">
                  <div className="mb-3 flex flex-wrap items-center gap-3">
                    <p className="text-xs uppercase tracking-[0.22em] text-accent-secondary/75">Storage status</p>
                    <Badge variant={storageReady ? "success" : "warning"}>{storageReady ? "Connected" : "Needs setup"}</Badge>
                  </div>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p className="break-all">Provider: {activeConnection ? activeProviderName : "Not connected"}</p>
                    <p className="break-all">Account: {activeConnection?.provider_account_email ?? "Not connected"}</p>
                    <p>Root folder: {activeFolders?.rootFolderId ? "MxTrove" : "Pending"}</p>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          <Card className="overflow-hidden">
            <CardHeader>
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <Badge variant={storageReady ? "success" : "warning"}>
                    {storageReady ? "Systems ready" : "Action needed"}
                  </Badge>
                  <Badge variant="accent">{connectedLinks} public links</Badge>
                </div>
                <div>
                  <CardTitle className="text-3xl md:text-[2.2rem]">Your two live surfaces</CardTitle>
                  <CardDescription className="mt-3 max-w-4xl text-base leading-7">
                    The most important settings surfaces are your public profile and your cloud routing. Both are
                    shown here with their current readiness so you can fix issues quickly.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-[26px] border border-border bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.015))] p-5">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex size-11 items-center justify-center rounded-2xl bg-accent/12 text-accent-secondary">
                    <UserRound className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium">Profile surface</p>
                    <p className="text-sm text-muted-foreground">Public-facing identity and artist links.</p>
                  </div>
                </div>
                <div className="space-y-3 text-sm text-muted-foreground">
                  <p className="truncate">Display name: {profile?.display_name ?? "Not set yet"}</p>
                  <p className="truncate">Username: {profile?.username ? `@${profile.username}` : "Pending"}</p>
                  <p>Bio: {profile?.bio?.trim() ? "Ready" : "Still empty"}</p>
                </div>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Link to="/settings/profile">
                    <Button size="sm">Edit profile</Button>
                  </Link>
                </div>
              </div>

              <div className="rounded-[26px] border border-border bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.015))] p-5">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex size-11 items-center justify-center rounded-2xl bg-accent/12 text-accent-secondary">
                    <HardDrive className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium">Cloud storage routing</p>
                    <p className="text-sm text-muted-foreground">The home for originals, playback files, artwork, and avatars.</p>
                  </div>
                </div>
                <div className="space-y-3 text-sm text-muted-foreground">
                  <p className="truncate">Active provider: {activeConnection ? activeProviderName : "Not connected"}</p>
                  <p className="truncate">Connected providers: {connectedConnections.length}</p>
                  <p className="truncate">Root folder: {activeFolders?.rootFolderId ? "MxTrove" : "Pending"}</p>
                </div>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Link to="/settings/storage">
                    <Button size="sm">{storageReady ? "Manage storage" : "Connect storage"}</Button>
                  </Link>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
