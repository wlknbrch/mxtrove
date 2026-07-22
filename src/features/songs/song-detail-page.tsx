import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { FolderOpen, ImagePlus, Play, Trash2 } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useForm } from "react-hook-form";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/page-header";
import { usePlayerStore } from "@/components/audio/player-store";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ResolvedImage } from "@/components/ui/resolved-image";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { UploadDropzone } from "@/features/drive/components/upload-dropzone";
import {
  createAssetRecord,
  getCloudConnection,
  updateAssetPublicLinks,
  upsertCloudConnection,
} from "@/features/drive/api";
import { buildCloudConnectionUpsert, getStoredDriveFolders } from "@/features/drive/google-drive-connection";
import { useGoogleDriveProvider } from "@/features/drive/use-google-drive-provider";
import {
  createSongVersion,
  deleteSongVersion,
  getSongDetail,
  updateSong,
  updateSongVersionPreview,
} from "@/features/library/api";
import { MediaProcessingStatusCard } from "@/features/media-processing/media-processing-status-card";
import {
  generateAutomaticPreviewFromSourceAsset,
  uploadOriginalWithAutomaticPreview,
} from "@/features/media-processing/automatic-preview";
import { useAppViewer } from "@/hooks/use-app-viewer";
import { getArtworkAssetUrls, getPreviewPlaybackUrl, getPreviewPlaybackUrls } from "@/lib/asset-urls";
import { productionStages } from "@/lib/constants";
import { hasUsablePreviewAsset, needsVersionPlaybackRepair } from "@/lib/playback-health";
import { queryClient } from "@/lib/query-client";
import { isDemoModeEnabled } from "@/lib/service-utils";
import { getAssetWaveform } from "@/lib/waveform";
import { songSchema, type SongFormValues, versionSchema, type VersionFormValues } from "@/lib/validators";
import { cn } from "@/lib/utils";
import type { Asset, MediaProcessingJob } from "@/types/domain";

const privatePlaybackUrlCache = new Map<string, string>();

export function SongDetailPage() {
  const { songId = "" } = useParams();
  const viewer = useAppViewer();
  const provider = useGoogleDriveProvider();
  const enqueue = usePlayerStore((state) => state.enqueue);
  const artworkInputId = useId();
  const artworkInputRef = useRef<HTMLInputElement | null>(null);
  const [mediaProcessingJob, setMediaProcessingJob] = useState<MediaProcessingJob | null>(null);
  const [mediaProcessingError, setMediaProcessingError] = useState<string | null>(null);

  const songQuery = useQuery({
    queryKey: ["song-detail", songId],
    queryFn: () => getSongDetail(songId),
    enabled: Boolean(songId),
  });

  const connectionQuery = useQuery({
    queryKey: ["cloud-connection", viewer.userId],
    queryFn: () => getCloudConnection(viewer.userId!),
    enabled: Boolean(viewer.userId),
  });

  const songForm = useForm<SongFormValues>({
    resolver: zodResolver(songSchema),
    defaultValues: {
      title: "",
      notes: "",
      default_artwork_asset_id: null,
    },
  });

  const versionForm = useForm<VersionFormValues>({
    resolver: zodResolver(versionSchema),
    defaultValues: {
      version_label: "",
      production_stage: "Demo",
      changelog: "",
      source_asset_id: "",
      preview_asset_id: null,
    },
  });

  const song = songQuery.data?.song ?? null;
  const versions = songQuery.data?.versions ?? [];
  const assets = songQuery.data?.assets ?? [];
  const assetsById = useMemo(
    () => new Map(assets.map((asset) => [asset.id, asset])),
    [assets],
  );
  const storedFolders = getStoredDriveFolders(connectionQuery.data);
  const artworkAsset = song?.default_artwork_asset_id
    ? assetsById.get(song.default_artwork_asset_id) ?? null
    : null;
  const artworkUrls = getArtworkAssetUrls(artworkAsset);

  const originalAssets = useMemo(
    () => assets.filter((asset) => asset.asset_type === "audio_original"),
    [assets],
  );
  const playbackAssets = useMemo(
    () => assets.filter((asset) => asset.asset_type === "audio_preview"),
    [assets],
  );
  const artworkAssets = useMemo(
    () => assets.filter((asset) => asset.asset_type === "cover_artwork"),
    [assets],
  );
  const selectedSourceAssetId =
    versionForm.watch("source_asset_id") || versions[0]?.source_asset_id || originalAssets[0]?.id || "";
  const selectedSourceAsset = selectedSourceAssetId
    ? assetsById.get(selectedSourceAssetId) ?? null
    : null;
  const repairableVersions = useMemo(
    () =>
      versions.filter(
        (version) =>
          version.source_asset_id === selectedSourceAssetId &&
          needsVersionPlaybackRepair(version, assetsById),
      ),
    [assetsById, selectedSourceAssetId, versions],
  );

  useEffect(() => {
    provider.hydrateConnection({
      email: connectionQuery.data?.provider_account_email ?? null,
      folders: storedFolders,
    });
  }, [connectionQuery.data?.provider_account_email, provider, storedFolders]);

  useEffect(() => {
    if (!song) {
      return;
    }

    songForm.reset({
      title: song.title,
      notes: song.notes ?? "",
      default_artwork_asset_id: song.default_artwork_asset_id,
    });
  }, [song, songForm]);

  async function refreshSongQueries() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["song-detail", songId] }),
      queryClient.invalidateQueries({ queryKey: ["library", viewer.userId] }),
    ]);
  }

  async function refreshDriveSetup() {
    if (!viewer.userId) {
      throw new Error("Please sign in first.");
    }

    const result = await provider.connect();
    await upsertCloudConnection(buildCloudConnectionUpsert(viewer.userId, result));
    await queryClient.invalidateQueries({ queryKey: ["cloud-connection", viewer.userId] });
    return result.folders;
  }

  async function resolveDriveFolder(target: "originals" | "previews" | "artwork") {
    const cachedFolders = provider.getCachedFolders();
    const activeFolders = cachedFolders ?? storedFolders ?? (await refreshDriveSetup());

    if (target === "originals") {
      return activeFolders.audioOriginalsFolderId;
    }

    if (target === "previews") {
      return activeFolders.audioPreviewsFolderId;
    }

    return activeFolders.artworkFolderId;
  }

  function syncSongArtwork(assetId: string | null) {
    songForm.setValue("default_artwork_asset_id", assetId, { shouldDirty: true, shouldValidate: true });
  }

  async function persistSong(values: SongFormValues) {
    const updatedSong = await updateSong(songId, values);
    await refreshSongQueries();
    return updatedSong;
  }

  const saveSongMutation = useMutation({
    mutationFn: async (values: SongFormValues) => persistSong(values),
    onSuccess: () => {
      toast.success("Song details saved.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not update this song.");
    },
  });

  const createVersionMutation = useMutation({
    mutationFn: async (values: VersionFormValues) => createSongVersion(songId, values),
    onSuccess: async () => {
      await refreshSongQueries();
      versionForm.reset({
        version_label: "",
        production_stage: versionForm.getValues("production_stage") || "Demo",
        changelog: "",
        source_asset_id: "",
        preview_asset_id: null,
      });
      toast.success("Version added.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not create version.");
    },
  });
  const deleteVersionMutation = useMutation({
    mutationFn: async (versionId: string) => deleteSongVersion(versionId),
    onSuccess: async () => {
      await Promise.all([
        refreshSongQueries(),
        queryClient.invalidateQueries({ queryKey: ["home-feed"] }),
        queryClient.invalidateQueries({ queryKey: ["explore-feed"] }),
        queryClient.invalidateQueries({ queryKey: ["profile-posts"] }),
        queryClient.invalidateQueries({ queryKey: ["post"] }),
      ]);
      toast.success("Version deleted.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not delete this version.");
    },
  });

  async function uploadOriginalWithAutomation(file: File, signal?: AbortSignal, onProgress?: (progress: number) => void) {
    if (!viewer.userId) {
      throw new Error("Please sign in first.");
    }

    setMediaProcessingError(null);
    setMediaProcessingJob(null);
    const originalsFolderId = await resolveDriveFolder("originals");
    const previewsFolderId = await resolveDriveFolder("previews");
    const result = await uploadOriginalWithAutomaticPreview({
      ownerId: viewer.userId,
      provider,
      originalFile: file,
      originalsFolderId,
      previewsFolderId,
      signal,
      onProgress,
      onJobChange: setMediaProcessingJob,
    });

    versionForm.setValue("source_asset_id", result.originalAsset.id, { shouldDirty: true, shouldValidate: true });
    if (result.previewAsset) {
      versionForm.setValue("preview_asset_id", result.previewAsset.id, { shouldDirty: true, shouldValidate: true });
    }

    await refreshSongQueries();

    if (result.automationError) {
      setMediaProcessingError(result.automationError);
      toast.warning("Private source uploaded. Automatic preview generation needs attention.");
    } else if (result.previewAsset) {
      toast.success("Private source uploaded and playback preview generated automatically.");
    } else {
      toast.success("Private source uploaded.");
    }

    return {
      fileId: result.originalAsset.remote_file_id,
      filename: result.originalAsset.filename,
      mimeType: result.originalAsset.mime_type,
      bytes: result.originalAsset.bytes ?? file.size,
      parentFolderId: result.originalAsset.remote_parent_folder_id ?? originalsFolderId,
      shareUrl: result.originalAsset.share_url,
      viewUrl: result.originalAsset.view_url,
      thumbnailUrl: result.originalAsset.thumbnail_url,
    };
  }

  async function generatePreviewFromSourceAsset(sourceAsset: Asset) {
    if (!viewer.userId) {
      throw new Error("Please sign in first.");
    }

    setMediaProcessingError(null);
    setMediaProcessingJob(null);
    const previewFolderId = await resolveDriveFolder("previews");
    const result = await generateAutomaticPreviewFromSourceAsset({
      ownerId: viewer.userId,
      provider,
      sourceAsset,
      previewFolderId,
      onJobChange: setMediaProcessingJob,
    });

    versionForm.setValue("source_asset_id", sourceAsset.id, { shouldDirty: true, shouldValidate: true });
    versionForm.setValue("preview_asset_id", result.previewAsset.id, { shouldDirty: true, shouldValidate: true });
    const impactedVersions = versions.filter(
      (version) => version.source_asset_id === sourceAsset.id && needsVersionPlaybackRepair(version, assetsById),
    );
    if (impactedVersions.length > 0) {
      await Promise.all(
        impactedVersions.map((version) =>
          updateSongVersionPreview({
            versionId: version.id,
            previewAssetId: result.previewAsset.id,
          }),
        ),
      );
    }
    await refreshSongQueries();
    toast.success(
      impactedVersions.length > 0
        ? `Playback repaired for ${impactedVersions.length} version${impactedVersions.length === 1 ? "" : "s"}.`
        : "Playback preview and waveform generated from the selected source.",
    );
  }

  const artworkUploadMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!viewer.userId) {
        throw new Error("Please sign in first.");
      }

      const artworkFolderId = await resolveDriveFolder("artwork");
      const upload =
        file.size > 20 * 1024 * 1024
          ? await provider.uploadResumable({ file, parentFolderId: artworkFolderId })
          : await provider.uploadFile({ file, parentFolderId: artworkFolderId });
      const publicArtwork = await provider.makePublicPreview(upload.fileId);
      const asset = await createAssetRecord({
        ownerId: viewer.userId,
        assetType: "cover_artwork",
        accessMode: "public",
        upload: {
          ...upload,
          shareUrl: publicArtwork.shareUrl,
          viewUrl: publicArtwork.viewUrl,
        },
      });
      await updateAssetPublicLinks({
        assetId: asset.id,
        accessMode: "public",
        shareUrl: publicArtwork.shareUrl,
        viewUrl: publicArtwork.viewUrl,
      });

      const nextValues = {
        ...songForm.getValues(),
        default_artwork_asset_id: asset.id,
      };

      syncSongArtwork(asset.id);
      await persistSong(nextValues);
      return asset;
    },
    onSuccess: () => {
      toast.success("Artwork uploaded.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not upload artwork.");
    },
  });

  function handleArtworkPickerKeyDown(event: KeyboardEvent<HTMLLabelElement>) {
    if (!viewer.userId || artworkUploadMutation.isPending) {
      return;
    }

    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    artworkInputRef.current?.click();
  }

  async function getPrivatePlaybackUrl(assetId: string) {
    const asset = assetsById.get(assetId);
    if (!asset) {
      throw new Error("The source asset for this version could not be found.");
    }

    if (isDemoModeEnabled()) {
      const demoPlaybackUrl = asset.view_url ?? asset.share_url;
      if (demoPlaybackUrl) {
        return demoPlaybackUrl;
      }
    }

    if (privatePlaybackUrlCache.has(asset.remote_file_id)) {
      return privatePlaybackUrlCache.get(asset.remote_file_id)!;
    }

    const blob = await provider.getPrivateFileBlob(asset.remote_file_id);
    const blobUrl = URL.createObjectURL(blob);
    privatePlaybackUrlCache.set(asset.remote_file_id, blobUrl);
    return blobUrl;
  }

  async function playVersion(versionId: string, mode: "source" | "playback") {
    const version = versions.find((entry) => entry.id === versionId);
    if (!version) {
      throw new Error("This version could not be found.");
    }

    const targetAssetId = mode === "source" ? version.source_asset_id : version.preview_asset_id;
    if (!targetAssetId) {
      throw new Error(mode === "source" ? "No source asset is linked to this version." : "No public playback file is linked to this version.");
    }

    const targetAsset = assetsById.get(targetAssetId);
    if (!targetAsset) {
      throw new Error("The linked asset for this version could not be found.");
    }

    const src =
      mode === "source"
        ? await getPrivatePlaybackUrl(targetAssetId)
        : hasUsablePreviewAsset(targetAsset)
          ? getPreviewPlaybackUrl(targetAsset)
          : null;

    if (!src) {
      throw new Error("This asset is not browser-playable right now.");
    }

    enqueue(
      [
        {
          id: `${version.id}-${mode}`,
          title: song?.title ?? "Song",
          artistName: viewer.email ?? "Current artist",
          artworkUrl: artworkUrls,
          src,
          srcCandidates: mode === "playback" ? getPreviewPlaybackUrls(targetAsset) : [src],
          durationSeconds: targetAsset.duration_seconds ?? null,
          waveform: mode === "playback" ? getAssetWaveform(targetAsset) : null,
          versionLabel: `${version.version_label} • ${mode === "source" ? "Private source" : "Public playback"}`,
        },
      ],
      `${version.id}-${mode}`,
    );
  }

  if (!song) {
    return (
      <Card>
        <CardTitle>Song unavailable</CardTitle>
        <CardDescription className="mt-2">
          This song could not be found or you no longer have access to it.
        </CardDescription>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Song workspace"
        title={song.title}
        description={song.notes ?? "Upload the private source, generate the public playback file, and keep artwork attached to the same song."}
        actions={
          <Link to="/library">
            <Button variant="secondary">
              <FolderOpen className="size-4" />
              Back to library
            </Button>
          </Link>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Song details</CardTitle>
              <CardDescription className="mt-2">
                Keep the library title, internal notes, and default artwork aligned before you build versions or attach the song to a release.
              </CardDescription>
            </div>
          </CardHeader>

          <form
            className="space-y-5"
            onSubmit={songForm.handleSubmit(async (values) => {
              await saveSongMutation.mutateAsync(values);
            })}
          >
            <div className="grid gap-5 lg:grid-cols-[200px_minmax(0,1fr)]">
              <div className="space-y-3">
                <div className="relative aspect-square overflow-hidden rounded-[26px] border border-border bg-[radial-gradient(circle_at_top,rgba(157,92,255,0.3),rgba(255,255,255,0.04)_55%,rgba(10,8,24,0.94))]">
                  {artworkUrls.length > 0 ? (
                    <ResolvedImage
                      src={artworkUrls}
                      alt={song.title}
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  ) : null}
                </div>

                <input
                  id={artworkInputId}
                  ref={artworkInputRef}
                  className="sr-only"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(event) => {
                    const file = event.currentTarget.files?.[0];
                    event.currentTarget.value = "";
                    if (file) {
                      void artworkUploadMutation.mutateAsync(file);
                    }
                  }}
                />
                <label
                  htmlFor={artworkUploadMutation.isPending || !viewer.userId ? undefined : artworkInputId}
                  role="button"
                  tabIndex={artworkUploadMutation.isPending || !viewer.userId ? -1 : 0}
                  aria-disabled={artworkUploadMutation.isPending || !viewer.userId}
                  onKeyDown={handleArtworkPickerKeyDown}
                  className={cn(
                    buttonVariants({ variant: "secondary" }),
                    "w-full",
                    artworkUploadMutation.isPending || !viewer.userId ? "pointer-events-none opacity-50" : "cursor-pointer",
                  )}
                >
                  <ImagePlus className="size-4" />
                  {artworkAsset ? "Replace artwork" : "Upload artwork"}
                </label>
              </div>

              <div className="space-y-4">
                <label className="grid gap-2">
                  <span className="text-sm font-medium">Song title</span>
                  <Input placeholder="Song title" {...songForm.register("title")} />
                  {songForm.formState.errors.title ? (
                    <p className="text-sm text-danger">{songForm.formState.errors.title.message}</p>
                  ) : null}
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-medium">Private notes</span>
                  <Textarea
                    placeholder="Production notes, release thoughts, or what still needs work."
                    {...songForm.register("notes")}
                  />
                  {songForm.formState.errors.notes ? (
                    <p className="text-sm text-danger">{songForm.formState.errors.notes.message}</p>
                  ) : null}
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-medium">Default artwork</span>
                  <Select
                    value={songForm.watch("default_artwork_asset_id") ?? ""}
                    onChange={(event) => syncSongArtwork(event.currentTarget.value || null)}
                  >
                    <option value="">No artwork linked yet</option>
                    {artworkAssets.map((asset) => (
                      <option key={asset.id} value={asset.id}>
                        {asset.display_name ?? asset.filename}
                      </option>
                    ))}
                  </Select>
                </label>

                <div className="flex flex-wrap gap-3">
                  <Button type="submit" disabled={saveSongMutation.isPending}>
                    Save song
                  </Button>
                  {storedFolders ? (
                    <Badge variant="success">Drive ready</Badge>
                  ) : (
                    <Link to="/settings/storage">
                      <Button variant="ghost" size="sm">Complete Drive setup</Button>
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </form>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Asset uploads</CardTitle>
              <CardDescription className="mt-2">
                A quick-added song becomes usable here: add the private source once and let MxShare generate the browser-safe public playback file for you.
              </CardDescription>
            </div>
          </CardHeader>

          <div className="space-y-5">
            {!storedFolders ? (
              <div className="rounded-[22px] border border-accent/18 bg-accent/8 px-4 py-4">
                <p className="font-medium">Google Drive setup required</p>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">
                  Connect Drive once in Settings so this workspace can route source audio, playback files, and artwork into the same dedicated folder system.
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Link to="/settings/storage">
                    <Button size="sm">Open Google Drive setup</Button>
                  </Link>
                  <Button variant="ghost" size="sm" onClick={() => void connectionQuery.refetch()}>
                    Refresh status
                  </Button>
                </div>
              </div>
            ) : null}

            <UploadDropzone
              title="Private source upload"
              description="Keep the original private in Drive. MxShare will also generate the public MP3 preview automatically for the current workspace."
              parentFolderId={storedFolders?.audioOriginalsFolderId ?? ""}
              disabled={!storedFolders}
              onUpload={(input) => uploadOriginalWithAutomation(input.file, input.signal, input.onProgress)}
            />

              <div className="rounded-[22px] border border-white/[0.08] bg-white/[0.03] px-4 py-4">
                <p className="font-medium">Generated public playback</p>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">
                  Manual preview uploads are disabled. MxShare always generates the public MP3 preview and waveform from the selected private source.
                </p>
                {repairableVersions.length > 0 ? (
                  <p className="mt-2 text-sm leading-7 text-accent-secondary">
                    {repairableVersions.length} version{repairableVersions.length === 1 ? "" : "s"} linked to this source still need a repaired playback file or waveform.
                  </p>
                ) : null}
                <div className="mt-4 flex flex-wrap gap-3">
                <Button
                  variant="secondary"
                  disabled={!storedFolders || !selectedSourceAsset}
                  onClick={() => {
                    if (!selectedSourceAsset) {
                      return;
                    }

                    void generatePreviewFromSourceAsset(selectedSourceAsset).catch((error) => {
                      const message =
                        error instanceof Error
                          ? error.message
                          : "Could not generate the playback preview from this source.";
                      setMediaProcessingError(message);
                      toast.error(message);
                    });
                  }}
                >
                  {playbackAssets.length ? "Regenerate playback file" : "Generate playback file"}
                </Button>
                {selectedSourceAsset ? (
                  <Badge variant="neutral" className="max-w-full truncate" title={selectedSourceAsset.id}>
                    Source: {selectedSourceAsset.display_name ?? selectedSourceAsset.filename}
                  </Badge>
                ) : null}
              </div>
            </div>

            <MediaProcessingStatusCard
              job={mediaProcessingJob}
              error={mediaProcessingError}
              title="Automatic playback preview"
              emptyMessage="Upload a private source here and the worker will generate the public MP3 preview plus waveform for you."
            />

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-[20px] border border-white/[0.06] bg-white/[0.02] px-4 py-4">
                <p className="text-xs uppercase tracking-[0.24em] text-accent-secondary/75">Sources</p>
                <p className="mt-3 font-display text-3xl tracking-[-0.04em]">{originalAssets.length}</p>
              </div>
              <div className="rounded-[20px] border border-white/[0.06] bg-white/[0.02] px-4 py-4">
                <p className="text-xs uppercase tracking-[0.24em] text-accent-secondary/75">Playback files</p>
                <p className="mt-3 font-display text-3xl tracking-[-0.04em]">{playbackAssets.length}</p>
              </div>
              <div className="rounded-[20px] border border-white/[0.06] bg-white/[0.02] px-4 py-4">
                <p className="text-xs uppercase tracking-[0.24em] text-accent-secondary/75">Artwork</p>
                <p className="mt-3 font-display text-3xl tracking-[-0.04em]">{artworkAssets.length}</p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Versions</CardTitle>
              <CardDescription className="mt-2">
                Each version keeps its own label, production stage, changelog, private source, and optional public playback file.
              </CardDescription>
            </div>
          </CardHeader>
          <div className="space-y-4">
            {versions.length ? (
              versions.map((version) => {
                const sourceAsset = assetsById.get(version.source_asset_id) ?? null;
                const playbackAsset = version.preview_asset_id ? assetsById.get(version.preview_asset_id) ?? null : null;
                const playbackReady = hasUsablePreviewAsset(playbackAsset);
                const playbackNeedsRepair = needsVersionPlaybackRepair(version, assetsById);

                return (
                  <div key={version.id} className="rounded-[22px] border border-border bg-white/3 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-medium">{version.version_label}</h2>
                      <Badge variant={version.is_published ? "accent" : "neutral"}>
                        {version.is_published ? "Published" : "Private"}
                      </Badge>
                      <Badge variant="cyan">{version.production_stage}</Badge>
                      <Badge variant={!playbackNeedsRepair && playbackReady ? "success" : "warning"}>
                        {!playbackNeedsRepair && playbackReady ? "Playback ready" : "Needs playback repair"}
                      </Badge>
                    </div>
                    <p className="mt-3 text-sm text-muted-foreground">{version.changelog || "No changelog yet."}</p>
                    <div className="mt-3 grid gap-2 text-sm text-subtle-foreground">
                      <p>Private source: {sourceAsset?.display_name ?? sourceAsset?.filename ?? version.source_asset_id}</p>
                      <p>
                        Public playback: {playbackAsset?.display_name ?? playbackAsset?.filename ?? "No playback file yet"}
                      </p>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <Button
                        variant="secondary"
                        onClick={() => {
                          void playVersion(version.id, "source").catch((error) => {
                            toast.error(error instanceof Error ? error.message : "Could not play this source version.");
                          });
                        }}
                      >
                        <Play className="size-4" />
                        Play private source
                      </Button>
                      <Button
                        variant="ghost"
                        disabled={!hasUsablePreviewAsset(playbackAsset)}
                        onClick={() => {
                          void playVersion(version.id, "playback").catch((error) => {
                            toast.error(error instanceof Error ? error.message : "Could not play this public playback file.");
                          });
                        }}
                      >
                        <Play className="size-4" />
                        Play public file
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => {
                          if (!window.confirm(`Delete the version "${version.version_label}"?`)) {
                            return;
                          }

                          void deleteVersionMutation.mutateAsync(version.id);
                        }}
                        disabled={deleteVersionMutation.isPending}
                      >
                        <Trash2 className="size-4" />
                        Delete version
                      </Button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="rounded-[22px] border border-border bg-white/3 px-4 py-4 text-sm leading-7 text-muted-foreground">
                This song does not have a version yet. Upload at least the private source, then create the first version from the form on the right.
              </div>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Add a version</CardTitle>
              <CardDescription className="mt-2">
                Pick from the assets you already uploaded in this workspace. The public playback file is optional for private work and recommended before public release.
              </CardDescription>
            </div>
          </CardHeader>

          <form
            className="grid gap-4"
            onSubmit={versionForm.handleSubmit(async (values) => {
              await createVersionMutation.mutateAsync(values);
            })}
          >
            <label className="grid gap-2">
              <span className="text-sm font-medium">Version label</span>
              <Input placeholder="Mix 2" {...versionForm.register("version_label")} />
              {versionForm.formState.errors.version_label ? (
                <p className="text-sm text-danger">{versionForm.formState.errors.version_label.message}</p>
              ) : null}
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-medium">Production stage</span>
              <Select {...versionForm.register("production_stage")}>
                {productionStages.map((stage) => (
                  <option key={stage} value={stage}>
                    {stage}
                  </option>
                ))}
              </Select>
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-medium">Private source</span>
              <Select
                value={versionForm.watch("source_asset_id")}
                onChange={(event) => versionForm.setValue("source_asset_id", event.currentTarget.value, { shouldDirty: true, shouldValidate: true })}
              >
                <option value="">Select a private source asset</option>
                {originalAssets.map((asset) => (
                  <option key={asset.id} value={asset.id}>
                    {asset.display_name ?? asset.filename}
                  </option>
                ))}
              </Select>
              {versionForm.formState.errors.source_asset_id ? (
                <p className="text-sm text-danger">{versionForm.formState.errors.source_asset_id.message}</p>
              ) : null}
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-medium">Public playback file</span>
              <Select
                value={versionForm.watch("preview_asset_id") ?? ""}
                onChange={(event) =>
                  versionForm.setValue("preview_asset_id", event.currentTarget.value || null, {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }
              >
                <option value="">No public playback file attached yet</option>
                {playbackAssets.map((asset) => (
                  <option key={asset.id} value={asset.id}>
                    {asset.display_name ?? asset.filename}
                  </option>
                ))}
              </Select>
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-medium">Changelog</span>
              <Textarea placeholder="What changed in this version?" {...versionForm.register("changelog")} />
            </label>

            <Button type="submit" disabled={createVersionMutation.isPending}>
              Add version
            </Button>
          </form>

          <div className="mt-6 rounded-[20px] border border-border bg-white/3 p-4">
            <p className="font-medium">Workspace assets</p>
            <div className="mt-3 space-y-2 text-sm text-muted-foreground">
              {[...originalAssets, ...playbackAssets, ...artworkAssets].length ? (
                [...originalAssets, ...playbackAssets, ...artworkAssets].slice(0, 8).map((asset: Asset) => (
                  <p key={asset.id} className="truncate">
                    {asset.display_name ?? asset.filename} · {asset.asset_type}
                  </p>
                ))
              ) : (
                <p>No assets uploaded yet.</p>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
