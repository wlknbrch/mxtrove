import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowRightLeft, CheckCircle2, Cloud, FolderKanban, RefreshCcw, ShieldCheck, Star, Unplug } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { getCloudProviderLabel, getCloudStorageStatus } from "@/features/cloud-providers/status";
import { SettingsSidebar } from "@/features/settings/settings-shell";
import { useAppViewer } from "@/hooks/use-app-viewer";
import { envState } from "@/lib/env";
import { queryClient } from "@/lib/query-client";

import {
  getCloudConnections,
  getProtectedMediaQuota,
  listOwnedAssets,
  rewriteLegacyDropboxAssetPaths,
  setDefaultCloudProvider,
  updateAssetProviderReference,
  upsertCloudConnection,
} from "@/features/drive/api";
import { getCloudStorageProvider } from "@/features/cloud-providers/provider-registry";
import { buildCloudConnectionUpsert } from "@/features/drive/google-drive-connection";
import type { CloudProvider } from "@/types/domain";

const providerOptions: Array<{
  id: CloudProvider;
  name: string;
  helper: string;
  enabled: () => boolean;
}> = [
  {
    id: "google_drive",
    name: "Google Drive",
    helper: "drive.file scope with public preview support.",
    enabled: () => envState.hasGoogleDrive,
  },
  {
    id: "dropbox",
    name: "Dropbox",
    helper: "PKCE, resumable uploads, direct shared preview links.",
    enabled: () => envState.hasDropbox,
  },
  {
    id: "onedrive",
    name: "OneDrive",
    helper: "Microsoft Graph PKCE and resumable upload sessions.",
    enabled: () => envState.hasOneDrive,
  },
];

export function StorageSettingsPage() {
  const viewer = useAppViewer();
  const [migrationAssetId, setMigrationAssetId] = useState("");
  const [migrationTarget, setMigrationTarget] = useState<CloudProvider>("dropbox");
  const connectionsQuery = useQuery({
    queryKey: ["cloud-connections", viewer.userId],
    queryFn: () => getCloudConnections(viewer.userId!),
    enabled: Boolean(viewer.userId),
  });
  const assetsQuery = useQuery({
    queryKey: ["owned-assets", viewer.userId],
    queryFn: () => listOwnedAssets(viewer.userId!),
    enabled: Boolean(viewer.userId),
  });
  const quotaQuery = useQuery({
    queryKey: ["protected-media-quota", viewer.userId],
    queryFn: () => getProtectedMediaQuota(viewer.userId!),
    enabled: Boolean(viewer.userId),
  });
  const {
    activeConnection,
    activeFolders: storedFolders,
    connectedConnections,
    storageReady,
  } = getCloudStorageStatus(connectionsQuery.data);
  const activeProviderName = getCloudProviderLabel(activeConnection?.provider);
  const activeProvider = activeConnection
    ? getCloudStorageProvider(activeConnection.provider)
    : null;
  const activeProviderOption = providerOptions.find(
    (option) => option.id === activeConnection?.provider,
  );
  const needsRepair = Boolean(
    activeConnection?.connection_status === "connected" && !storedFolders,
  );
  const folderRows = [
    {
      label: "Profile workspace",
      helper: "A private provider folder scoped to this MxTrove profile.",
      value: storedFolders?.rootFolderId ? "MxTrove / Profiles / your profile" : "Pending",
    },
    {
      label: "Originals",
      helper: "Private source audio files.",
      value: storedFolders?.audioOriginalsFolderId ? "Audio / Originals" : "Pending",
    },
    {
      label: "Previews",
      helper: "Public playback files only.",
      value: storedFolders?.audioPreviewsFolderId ? "Audio / Previews" : "Pending",
    },
    {
      label: "Artwork",
      helper: "Public cover art and visuals.",
      value: storedFolders?.artworkFolderId
        ? activeConnection?.provider === "google_drive" ? "Artwork" : "Artwork / Covers"
        : "Pending",
    },
    {
      label: "Avatars",
      helper: "Public profile images.",
      value: storedFolders?.avatarsFolderId ? "Artwork / Avatars" : "Pending",
    },
  ];

  const connectMutation = useMutation({
    mutationFn: async (providerId: CloudProvider = "google_drive") => {
      if (!viewer.userId) {
        throw new Error("Please sign in first.");
      }

      const activeProvider = getCloudStorageProvider(providerId);
      const result = await activeProvider.connect(viewer.userId);
      const existingConnection = (connectionsQuery.data ?? []).find(
        (entry) => entry.provider === providerId,
      );
      const connection = await upsertCloudConnection({
        ...buildCloudConnectionUpsert(viewer.userId, result),
        is_default:
          existingConnection?.is_default
          ?? !(connectionsQuery.data ?? []).some((entry) => entry.connection_status === "connected"),
      });
      if (providerId === "dropbox") {
        await rewriteLegacyDropboxAssetPaths(viewer.userId);
      }
      return connection;
    },
    onSuccess: async (connection) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["cloud-connection", viewer.userId] }),
        queryClient.invalidateQueries({ queryKey: ["cloud-connections", viewer.userId] }),
        queryClient.invalidateQueries({ queryKey: ["owned-assets", viewer.userId] }),
      ]);
      toast.success(`${providerOptions.find((option) => option.id === connection.provider)?.name ?? "Cloud provider"} connected.`);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not connect the cloud provider.");
    },
  });
  const defaultMutation = useMutation({
    mutationFn: setDefaultCloudProvider,
    onSuccess: async (_result, providerId) => {
      queryClient.setQueryData(
        ["cloud-connections", viewer.userId],
        (current: typeof connectionsQuery.data) =>
          current?.map((connection) => ({
            ...connection,
            is_default:
              connection.connection_status === "connected"
              && connection.provider === providerId,
          })),
      );
      await queryClient.invalidateQueries({ queryKey: ["cloud-connections", viewer.userId] });
      toast.success("Default upload provider updated.");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not update the default provider."),
  });
  const migrationMutation = useMutation({
    mutationFn: async () => {
      if (!viewer.userId) throw new Error("Please sign in first.");
      const asset = (assetsQuery.data ?? []).find((entry) => entry.id === migrationAssetId);
      if (!asset) throw new Error("Choose an asset to migrate.");
      if (asset.provider === migrationTarget) throw new Error("Choose a different destination provider.");

      const sourceProvider = getCloudStorageProvider(asset.provider);
      const targetProvider = getCloudStorageProvider(migrationTarget);
      const destinationConnection = (connectionsQuery.data ?? []).find(
        (entry) => entry.provider === migrationTarget && entry.connection_status === "connected",
      );
      if (!destinationConnection) throw new Error("Connect the destination provider first.");

      if (!(await sourceProvider.restoreSession())) {
        const sourceResult = await sourceProvider.connect(viewer.userId);
        await upsertCloudConnection({
          ...buildCloudConnectionUpsert(viewer.userId, sourceResult),
          is_default: Boolean(
            (connectionsQuery.data ?? []).find((entry) => entry.provider === asset.provider)?.is_default,
          ),
        });
      }
      let targetFolders;
      if (!(await targetProvider.restoreSession())) {
        const targetResult = await targetProvider.connect(viewer.userId);
        targetFolders = targetResult.folders;
        await upsertCloudConnection({
          ...buildCloudConnectionUpsert(viewer.userId, targetResult),
          is_default: destinationConnection.is_default,
        });
      } else {
        targetFolders = await targetProvider.ensureRootStructure(viewer.userId);
      }

      if (!window.confirm(
        `Move "${asset.display_name ?? asset.filename}" from ${asset.provider} to ${migrationTarget}? The source is deleted only after the new reference is saved.`,
      )) {
        throw new DOMException("Migration cancelled.", "AbortError");
      }

      const targetFolderId =
        asset.asset_type === "audio_original"
          ? targetFolders.audioOriginalsFolderId
          : asset.asset_type === "audio_preview"
            ? targetFolders.audioPreviewsFolderId
            : asset.asset_type === "avatar"
              ? targetFolders.avatarsFolderId
              : targetFolders.artworkFolderId;
      const sourceBlob = await sourceProvider.getPrivateFileBlob(asset.remote_file_id);
      const file = new File([sourceBlob], asset.filename, {
        type: asset.mime_type || sourceBlob.type || "application/octet-stream",
        lastModified: Date.now(),
      });
      let upload = file.size > 20 * 1024 * 1024
        ? await targetProvider.uploadResumable({ file, parentFolderId: targetFolderId })
        : await targetProvider.uploadFile({ file, parentFolderId: targetFolderId });

      if (asset.access_mode === "public") {
        const publicPreview = await targetProvider.createPublicPreview(upload.fileId);
        upload = {
          ...upload,
          shareUrl: publicPreview.shareUrl,
          viewUrl: publicPreview.viewUrl,
        };
      }

      await updateAssetProviderReference({
        assetId: asset.id,
        upload,
        accessMode: asset.access_mode,
      });
      const sourceDeleted = await sourceProvider
        .deleteFile(asset.remote_file_id)
        .then(() => true)
        .catch(() => false);
      return { sourceDeleted };
    },
    onSuccess: async ({ sourceDeleted }) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["owned-assets", viewer.userId] }),
        queryClient.invalidateQueries({ queryKey: ["library", viewer.userId] }),
        queryClient.invalidateQueries({ queryKey: ["asset"] }),
        queryClient.invalidateQueries({ queryKey: ["post"] }),
      ]);
      setMigrationAssetId("");
      if (sourceDeleted) {
        toast.success("Asset moved and its references were preserved.");
      } else {
        toast.warning("Asset moved, but the old provider copy could not be deleted. Remove that copy manually.");
      }
    },
    onError: (error) => {
      if (error instanceof DOMException && error.name === "AbortError") return;
      toast.error(error instanceof Error ? error.message : "Could not migrate this asset.");
    },
  });

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Settings"
        title="Cloud storage"
        description="Connect one or more personal providers, choose a default, and keep every private original in the account you control."
      />

      <div className="grid gap-6 xl:grid-cols-[270px_minmax(320px,1.15fr)_minmax(260px,0.85fr)]">
        <SettingsSidebar />

        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Connected providers</CardTitle>
                <CardDescription className="mt-2">
                  Tokens remain in this browser session. Supabase stores only account metadata, folder references, status, and capabilities.
                </CardDescription>
              </div>
            </CardHeader>
            <div className="grid gap-4 md:grid-cols-2 min-[1800px]:grid-cols-3">
              {providerOptions.map((option) => {
                const connection = (connectionsQuery.data ?? []).find((entry) => entry.provider === option.id);
                return (
                  <div key={option.id} className="rounded-[24px] border border-border bg-white/[0.025] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex size-11 items-center justify-center rounded-[16px] bg-accent/12 text-accent-secondary">
                        <Cloud className="size-5" />
                      </div>
                      {connection?.is_default ? <Badge variant="accent">Default</Badge> : null}
                    </div>
                    <h2 className="mt-4 font-display text-2xl">{option.name}</h2>
                    <p className="mt-2 min-h-12 text-sm leading-6 text-muted-foreground">{option.helper}</p>
                    <p className="mt-3 truncate text-xs text-subtle-foreground">
                      {connection?.provider_account_email ?? (option.enabled() ? "Ready to connect" : "Client ID missing")}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        disabled={!option.enabled() || connectMutation.isPending}
                        onClick={() => connectMutation.mutate(option.id)}
                      >
                        {connection ? "Reconnect" : "Connect"}
                      </Button>
                      {connection && !connection.is_default ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => defaultMutation.mutate(option.id)}
                          disabled={defaultMutation.isPending}
                        >
                          <Star className="size-3.5" />
                          Set default
                        </Button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="mt-4 text-xs leading-6 text-muted-foreground">
              Browser-to-browser provider migration is intentionally explicit: download from the current provider, confirm, then upload to another connected provider. No server-side master transfer is performed.
            </p>
            <p className="mt-2 text-xs leading-6 text-muted-foreground">
              New uploads use a profile-specific workspace, so several MxTrove profiles can safely connect the same provider account. Existing files remain in their original folders and keep their saved IDs and links.
            </p>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle className="inline-flex items-center gap-3">
                  <ShieldCheck className="size-5 text-accent-secondary" />
                  Protected derivative quota
                </CardTitle>
                <CardDescription className="mt-2">
                  Collaboration previews and private attachments live on the MxTrove VPS. Private originals never count here.
                </CardDescription>
              </div>
            </CardHeader>
            {quotaQuery.data ? (
              <div className="grid gap-4 md:grid-cols-2">
                <QuotaMeter
                  label="All protected media"
                  used={quotaQuery.data.used_bytes + quotaQuery.data.reserved_bytes}
                  limit={quotaQuery.data.protected_limit_bytes}
                />
                <QuotaMeter
                  label="Message attachments"
                  used={quotaQuery.data.attachment_used_bytes + quotaQuery.data.attachment_reserved_bytes}
                  limit={quotaQuery.data.attachment_limit_bytes}
                />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Quota usage will appear after the V2 migration is applied.</p>
            )}
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle className="inline-flex items-center gap-3">
                  <ArrowRightLeft className="size-5 text-accent-secondary" />
                  Move an existing asset
                </CardTitle>
                <CardDescription className="mt-2">
                  The transfer runs in this browser. MxTrove keeps the existing asset ID so songs, posts, artwork, and avatars remain linked.
                </CardDescription>
              </div>
            </CardHeader>
            <div className="grid gap-4 min-[1800px]:grid-cols-[minmax(0,1fr)_200px_auto]">
              <label className="grid gap-2">
                <span className="text-sm font-medium">Asset</span>
                <Select value={migrationAssetId} onChange={(event) => setMigrationAssetId(event.currentTarget.value)}>
                  <option value="">Choose an asset</option>
                  {(assetsQuery.data ?? []).map((asset) => (
                    <option key={asset.id} value={asset.id}>
                      {asset.display_name ?? asset.filename} · {asset.provider}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-medium">Destination</span>
                <Select
                  value={migrationTarget}
                  onChange={(event) => setMigrationTarget(event.currentTarget.value as CloudProvider)}
                >
                  {providerOptions.map((option) => (
                    <option key={option.id} value={option.id}>{option.name}</option>
                  ))}
                </Select>
              </label>
              <Button
                className="self-end"
                disabled={!migrationAssetId || migrationMutation.isPending}
                onClick={() => migrationMutation.mutate()}
              >
                <ArrowRightLeft className="size-4" />
                {migrationMutation.isPending ? "Moving…" : "Move asset"}
              </Button>
            </div>
          </Card>

          <Card>
            <CardHeader>
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  {storageReady ? (
                    <Badge variant="success">Connected</Badge>
                  ) : needsRepair ? (
                    <Badge variant="warning">Needs repair</Badge>
                  ) : (
                    <Badge variant="warning">Not connected</Badge>
                  )}
                  <Badge variant="accent">{activeConnection ? activeProviderName : "Choose a provider"}</Badge>
                </div>
                <div>
                  <CardTitle className="text-3xl md:text-[2.2rem]">Connection status</CardTitle>
                  <CardDescription className="mt-3 max-w-3xl text-base leading-7">
                    MxTrove uses your selected personal cloud provider for originals, previews, artwork, and avatars.
                    Originals stay private, while only media you explicitly publish receives a shareable provider link.
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
                      {activeConnection?.provider_account_email ?? "No cloud account linked yet."}
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
                    <p>1. Connect Google Drive, Dropbox, or OneDrive.</p>
                    <p>2. MxTrove creates a dedicated root folder.</p>
                    <p>3. Choose a default provider for future uploads.</p>
                  </div>
                </div>

                <div className="rounded-[26px] border border-border bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.015))] p-5">
                  <div className="mb-3 flex items-center gap-3">
                    <ShieldCheck className="size-5 text-accent-secondary" />
                    <p className="font-medium">Storage rules</p>
                  </div>
                  <div className="space-y-2 text-sm leading-7 text-muted-foreground">
                    <p>Originals remain private in your chosen cloud.</p>
                    <p>Public playback uses explicit preview files only.</p>
                    <p>Disconnecting clears only that provider's current browser session.</p>
                  </div>
                </div>
              </div>
            </div>

            {needsRepair ? (
              <div className="mt-5 rounded-[18px] border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
                The saved {activeProviderName} setup looks incomplete or points to missing folders. Reconnect once to rebuild the
                dedicated MxTrove folder structure before uploading again.
              </div>
            ) : null}

            {!activeConnection && !providerOptions.some((option) => option.enabled()) ? (
              <div className="mt-5 rounded-[18px] border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
                Add at least one provider client ID to enable Google Drive, Dropbox, or OneDrive connections.
              </div>
            ) : null}

            <div className="mt-6 flex flex-wrap gap-3">
              {activeConnection ? (
                <>
                  <Button
                    onClick={() => void connectMutation.mutateAsync(activeConnection.provider)}
                    disabled={connectMutation.isPending || !activeProviderOption?.enabled()}
                  >
                    <RefreshCcw className="size-4" />
                    {needsRepair ? `Repair ${activeProviderName}` : `Reconnect ${activeProviderName}`}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      void activeProvider?.disconnect().then(() => {
                        toast.success(`Current ${activeProviderName} session cleared.`);
                      });
                    }}
                  >
                    <Unplug className="size-4" />
                    Disconnect session
                  </Button>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Choose any available provider in the panel above.</p>
              )}
            </div>
          </Card>
        </div>

        <div className="min-w-0 space-y-6">
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
                  label: "At least one cloud account linked",
                  ready: connectedConnections.length > 0,
                },
                {
                  label: "Default upload provider selected",
                  ready: connectedConnections.some((connection) => connection.is_default),
                },
                {
                  label: "Active MxTrove folder structure complete",
                  ready: storageReady,
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
              <p>Uploads reuse the active provider structure instead of asking for setup again.</p>
              <p>Artwork and avatars share the same public-ready pipeline.</p>
              <p>Public profile surfaces can safely point to the assets you decide to expose.</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function formatStorageBytes(bytes: number) {
  if (bytes < 1024 ** 2) return `${Math.max(0, bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}

function QuotaMeter({ label, used, limit }: { label: string; used: number; limit: number }) {
  const ratio = limit > 0 ? Math.min(1, used / limit) : 0;
  return (
    <div className="rounded-[22px] border border-border bg-surface-soft p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium">{label}</p>
        <span className="text-xs text-muted-foreground">
          {formatStorageBytes(used)} / {formatStorageBytes(limit)}
        </span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-background-muted">
        <div
          className="h-full rounded-full bg-[linear-gradient(90deg,var(--accent),var(--accent-secondary))]"
          style={{ width: `${Math.max(2, ratio * 100)}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{Math.round(ratio * 100)}% used or reserved</p>
    </div>
  );
}
