import { useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CheckCircle2, Cloud, FolderKanban, RefreshCcw, ShieldCheck, Unplug } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentProfile } from "@/features/profile/api";
import { SettingsSidebar } from "@/features/settings/settings-shell";
import { useAppViewer } from "@/hooks/use-app-viewer";
import { envState } from "@/lib/env";
import { queryClient } from "@/lib/query-client";

import { getCloudConnection, upsertCloudConnection } from "@/features/drive/api";
import { buildCloudConnectionUpsert, getStoredDriveFolders } from "@/features/drive/google-drive-connection";
import { useGoogleDriveProvider } from "@/features/drive/use-google-drive-provider";

export function StorageSettingsPage() {
  const viewer = useAppViewer();
  const provider = useGoogleDriveProvider();
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
  const storedFolders = getStoredDriveFolders(connectionQuery.data);
  const needsRepair = Boolean(connectionQuery.data && !storedFolders);
  const profile = profileQuery.data ?? null;
  const publicProfilePath = profile?.username ? `/@${profile.username}` : null;
  const driveReady = Boolean(storedFolders);
  const folderRows = [
    {
      label: "MxShare root",
      helper: "Private home folder for all uploads.",
      value: storedFolders?.rootFolderId ?? "Pending",
    },
    {
      label: "Originals",
      helper: "Private source audio files.",
      value: storedFolders?.audioOriginalsFolderId ?? "Pending",
    },
    {
      label: "Previews",
      helper: "Public playback files only.",
      value: storedFolders?.audioPreviewsFolderId ?? "Pending",
    },
    {
      label: "Artwork",
      helper: "Public cover art and visuals.",
      value: storedFolders?.artworkFolderId ?? "Pending",
    },
    {
      label: "Avatars",
      helper: "Public profile images.",
      value: storedFolders?.avatarsFolderId ?? "Pending",
    },
  ];

  useEffect(() => {
    provider.hydrateConnection({
      email: connectionQuery.data?.provider_account_email ?? null,
      folders: storedFolders,
    });
  }, [connectionQuery.data?.provider_account_email, provider, storedFolders]);

  const connectMutation = useMutation({
    mutationFn: async () => {
      if (!viewer.userId) {
        throw new Error("Please sign in first.");
      }

      const result = await provider.connect();
      return upsertCloudConnection(buildCloudConnectionUpsert(viewer.userId, result));
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["cloud-connection", viewer.userId] });
      toast.success("Google Drive connected.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not connect Google Drive.");
    },
  });

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Settings"
        title="Google Drive setup"
        description="Connect once, let MxShare create its own Drive folder, and route future audio, artwork, and avatars into that structure."
      />

      <div className="grid gap-6 xl:grid-cols-[310px_minmax(0,1fr)_340px]">
        <SettingsSidebar driveReady={driveReady} />

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  {storedFolders ? (
                    <Badge variant="success">Connected</Badge>
                  ) : needsRepair ? (
                    <Badge variant="warning">Needs repair</Badge>
                  ) : (
                    <Badge variant="warning">Not connected</Badge>
                  )}
                  <Badge variant="accent">drive.file scope</Badge>
                </div>
                <div>
                  <CardTitle className="text-3xl md:text-[2.2rem]">Connection status</CardTitle>
                  <CardDescription className="mt-3 max-w-3xl text-base leading-7">
                    We request only the Google scope needed for files MxShare creates and manages in your Drive.
                    Originals stay private there, while only the previews and artwork you explicitly choose become public.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <div className="grid gap-4 md:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
              <div className="rounded-[26px] border border-border bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.015))] p-5">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex size-11 items-center justify-center rounded-2xl bg-accent/12 text-accent-secondary">
                    <Cloud className="size-5" />
                  </div>
                  <div>
                    <p className="font-medium">Connected account</p>
                    <p className="text-sm text-muted-foreground">
                      {connectionQuery.data?.provider_account_email ?? "No Drive account linked yet."}
                    </p>
                  </div>
                </div>
                <div className="space-y-3">
                  {folderRows.map((item) => (
                    <div
                      key={item.label}
                      className="flex items-start justify-between gap-4 rounded-[20px] border border-white/[0.06] bg-white/[0.02] px-4 py-3"
                    >
                      <div>
                        <p className="font-medium">{item.label}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{item.helper}</p>
                      </div>
                      <p className="max-w-[11rem] truncate text-right text-sm text-muted-foreground" title={item.value}>
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-[26px] border border-border bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.015))] p-5">
                  <div className="mb-3 flex items-center gap-3">
                    <FolderKanban className="size-5 text-accent-secondary" />
                    <p className="font-medium">Setup flow</p>
                  </div>
                  <div className="space-y-2 text-sm leading-7 text-muted-foreground">
                    <p>1. Connect your Google account.</p>
                    <p>2. MxShare creates a dedicated root folder.</p>
                    <p>3. Future originals, previews, artwork, and avatars reuse that structure.</p>
                  </div>
                </div>

                <div className="rounded-[26px] border border-border bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.015))] p-5">
                  <div className="mb-3 flex items-center gap-3">
                    <ShieldCheck className="size-5 text-accent-secondary" />
                    <p className="font-medium">Storage rules</p>
                  </div>
                  <div className="space-y-2 text-sm leading-7 text-muted-foreground">
                    <p>Originals remain private in Drive.</p>
                    <p>Public playback uses explicit preview files only.</p>
                    <p>Disconnecting clears only the current browser session link.</p>
                  </div>
                </div>
              </div>
            </div>

            {needsRepair ? (
              <div className="mt-5 rounded-[18px] border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
                The saved Drive setup looks incomplete or points to missing folders. Reconnect once to rebuild the
                dedicated MxShare folder structure before uploading again.
              </div>
            ) : null}

            {!envState.hasGoogleDrive ? (
              <div className="mt-5 rounded-[18px] border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
                Add `VITE_GOOGLE_DRIVE_CLIENT_ID` to enable the real Google Drive browser flow.
              </div>
            ) : null}

            <div className="mt-6 flex flex-wrap gap-3">
              <Button
                onClick={() => void connectMutation.mutateAsync()}
                disabled={connectMutation.isPending || !envState.hasGoogleDrive}
              >
                <RefreshCcw className="size-4" />
                {storedFolders
                  ? "Reconnect Google Drive"
                  : needsRepair
                    ? "Repair Google Drive setup"
                    : "Connect Google Drive"}
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  void provider.disconnect().then(() => {
                    toast.success("Current Drive session cleared.");
                  });
                }}
              >
                <Unplug className="size-4" />
                Disconnect session
              </Button>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Setup health</CardTitle>
                <CardDescription className="mt-2">
                  A quick read on whether uploads can route cleanly without another consent or repair step.
                </CardDescription>
              </div>
            </CardHeader>

            <div className="space-y-3">
              {[
                {
                  label: "Drive account linked",
                  ready: Boolean(connectionQuery.data?.provider_account_email),
                },
                {
                  label: "MxShare folder structure complete",
                  ready: driveReady,
                },
                {
                  label: "Browser env has Google client id",
                  ready: envState.hasGoogleDrive,
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-start gap-3 rounded-[20px] border border-white/[0.06] bg-white/[0.02] px-4 py-3"
                >
                  <CheckCircle2 className={`mt-0.5 size-4 ${item.ready ? "text-success" : "text-muted-foreground"}`} />
                  <div>
                    <p>{item.label}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {item.ready ? "Healthy." : "Needs attention."}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>What happens next</CardTitle>
                <CardDescription className="mt-2">
                  Once this screen is healthy, upload flows can stay lightweight.
                </CardDescription>
              </div>
            </CardHeader>
            <div className="space-y-3 text-sm leading-7 text-muted-foreground">
              <p>Single uploads can reuse the same Drive structure instead of asking for setup again.</p>
              <p>Artwork and avatars share the same public-ready pipeline.</p>
              <p>Public profile surfaces can safely point to the assets you decide to expose.</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
