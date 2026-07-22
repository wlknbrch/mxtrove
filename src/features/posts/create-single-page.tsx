import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, Disc3, ShieldCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Link, useNavigate } from "react-router-dom";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ResolvedImage } from "@/components/ui/resolved-image";
import { Select } from "@/components/ui/select";
import { Tabs } from "@/components/ui/tabs";
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
import { createSong, getLibraryDashboard, createSongVersion } from "@/features/library/api";
import { MediaProcessingStatusCard } from "@/features/media-processing/media-processing-status-card";
import {
  generateAutomaticPreviewFromSourceAsset,
  uploadOriginalWithAutomaticPreview,
} from "@/features/media-processing/automatic-preview";
import {
  createSinglePost,
  findSinglePostBySongId,
  publishSingleVersion,
} from "@/features/posts/api";
import { useAppViewer } from "@/hooks/use-app-viewer";
import { getArtworkAssetUrls } from "@/lib/asset-urls";
import { productionStages } from "@/lib/constants";
import { queryClient } from "@/lib/query-client";
import { cn } from "@/lib/utils";
import type { Asset, MediaProcessingJob, Song } from "@/types/domain";

const steps = [
  { id: 1, label: "Single info" },
  { id: 2, label: "Cover & preview" },
  { id: 3, label: "Details" },
  { id: 4, label: "Review" },
];

export function CreateSinglePage() {
  const viewer = useAppViewer();
  const provider = useGoogleDriveProvider();
  const navigate = useNavigate();
  const artworkInputId = useId();
  const artworkInputRef = useRef<HTMLInputElement | null>(null);

  const [step, setStep] = useState(1);
  const [existingSongId, setExistingSongId] = useState("");
  const [newSongTitle, setNewSongTitle] = useState("");
  const [versionLabel, setVersionLabel] = useState("Demo");
  const [productionStage, setProductionStage] = useState("Demo");
  const [description, setDescription] = useState("");
  const [postTitle, setPostTitle] = useState("");
  const [visibility, setVisibility] = useState<"private" | "public">("public");
  const [uploadedOriginal, setUploadedOriginal] = useState<Asset | null>(null);
  const [uploadedPreview, setUploadedPreview] = useState<Asset | null>(null);
  const [uploadedArtwork, setUploadedArtwork] = useState<Asset | null>(null);
  const [mediaProcessingJob, setMediaProcessingJob] = useState<MediaProcessingJob | null>(null);
  const [mediaProcessingError, setMediaProcessingError] = useState<string | null>(null);

  const libraryQuery = useQuery({
    queryKey: ["library", viewer.userId],
    queryFn: () => getLibraryDashboard(viewer.userId!),
    enabled: Boolean(viewer.userId),
  });
  const connectionQuery = useQuery({
    queryKey: ["cloud-connection", viewer.userId],
    queryFn: () => getCloudConnection(viewer.userId!),
    enabled: Boolean(viewer.userId),
  });
  const storedDriveFolders = getStoredDriveFolders(connectionQuery.data);

  useEffect(() => {
    provider.hydrateConnection({
      email: connectionQuery.data?.provider_account_email ?? null,
      folders: storedDriveFolders,
    });
  }, [connectionQuery.data?.provider_account_email, provider, storedDriveFolders]);

  const availableArtwork = useMemo(
    () => (libraryQuery.data?.assets ?? []).filter((asset) => asset.asset_type === "cover_artwork"),
    [libraryQuery.data?.assets],
  );
  const selectedSong = useMemo(
    () => libraryQuery.data?.songs.find((entry) => entry.id === existingSongId) ?? null,
    [existingSongId, libraryQuery.data?.songs],
  );
  const selectedSongVersions = useMemo(
    () =>
      (libraryQuery.data?.versions ?? [])
        .filter((version) => version.song_id === existingSongId)
        .slice()
        .sort((left, right) => right.version_number - left.version_number),
    [existingSongId, libraryQuery.data?.versions],
  );
  const latestSelectedVersion = selectedSongVersions[0] ?? null;
  const latestSelectedOriginalAsset = latestSelectedVersion?.source_asset_id
    ? libraryQuery.data?.assets.find((asset) => asset.id === latestSelectedVersion.source_asset_id) ?? null
    : null;
  const latestSelectedPreviewAsset = latestSelectedVersion?.preview_asset_id
    ? libraryQuery.data?.assets.find((asset) => asset.id === latestSelectedVersion.preview_asset_id) ?? null
    : null;
  const selectedSongArtworkAsset = selectedSong?.default_artwork_asset_id
    ? libraryQuery.data?.assets.find((asset) => asset.id === selectedSong.default_artwork_asset_id) ?? null
    : null;

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
    const activeFolders = cachedFolders ?? storedDriveFolders ?? (await refreshDriveSetup());

    if (target === "originals") {
      return activeFolders.audioOriginalsFolderId;
    }

    if (target === "previews") {
      return activeFolders.audioPreviewsFolderId;
    }

    return activeFolders.artworkFolderId;
  }

  function handleArtworkPickerKeyDown(event: KeyboardEvent<HTMLLabelElement>) {
    if (!storedDriveFolders) {
      return;
    }

    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    artworkInputRef.current?.click();
  }

  useEffect(() => {
    setMediaProcessingError(null);
    setMediaProcessingJob(null);

    if (!existingSongId) {
      setUploadedOriginal(null);
      setUploadedPreview(null);
      setUploadedArtwork(null);
      return;
    }

    setUploadedOriginal(latestSelectedOriginalAsset);
    setUploadedPreview(latestSelectedPreviewAsset);
    setUploadedArtwork(selectedSongArtworkAsset);

    if (!postTitle.trim() && selectedSong?.title) {
      setPostTitle(selectedSong.title);
    }
  }, [
    existingSongId,
    latestSelectedOriginalAsset,
    latestSelectedPreviewAsset,
    postTitle,
    selectedSong?.title,
    selectedSongArtworkAsset,
  ]);

  const publishMutation = useMutation({
    mutationFn: async () => {
      if (!viewer.userId) {
        throw new Error("Please sign in first.");
      }
      const selectedOriginalAsset = uploadedOriginal ?? latestSelectedOriginalAsset;
      const selectedPreviewAsset = uploadedPreview ?? latestSelectedPreviewAsset;

      if (!selectedOriginalAsset) {
        throw new Error("Upload a private original first.");
      }
      if (visibility === "public" && !selectedPreviewAsset) {
        throw new Error("Generate the public preview from the original before publishing.");
      }

      let song: Song;
      if (existingSongId) {
        if (!selectedSong) {
          throw new Error("Selected song could not be found.");
        }
        song = selectedSong;
      } else {
        song = await createSong(viewer.userId, {
          title: newSongTitle.trim(),
          notes: "",
          default_artwork_asset_id: uploadedArtwork?.id ?? null,
        });
      }

      const nextVersionLabel = versionLabel.trim();
      const nextChangelog = description.trim();
      const shouldReuseLatestVersion = Boolean(
        latestSelectedVersion &&
          existingSongId &&
          latestSelectedVersion.source_asset_id === selectedOriginalAsset.id &&
          (latestSelectedVersion.preview_asset_id ?? null) === (selectedPreviewAsset?.id ?? null) &&
          latestSelectedVersion.version_label.trim() === nextVersionLabel &&
          latestSelectedVersion.production_stage === productionStage &&
          (latestSelectedVersion.changelog ?? "") === nextChangelog,
      );

      const version = shouldReuseLatestVersion && latestSelectedVersion
        ? latestSelectedVersion
        : await createSongVersion(song.id, {
            version_label: nextVersionLabel,
            production_stage: productionStage,
            changelog: nextChangelog,
            source_asset_id: selectedOriginalAsset.id,
            preview_asset_id: selectedPreviewAsset?.id ?? null,
          });

      const existingPost = await findSinglePostBySongId(song.id);
      const post =
        existingPost ??
        (await createSinglePost({
          ownerId: viewer.userId,
          songId: song.id,
          featuredVersionId: version.id,
          values: {
            title: postTitle.trim() || song.title,
            description: description.trim(),
            visibility,
            artwork_asset_id: uploadedArtwork?.id ?? null,
          },
        }));

      if (!existingPost) {
        await queryClient.invalidateQueries({ queryKey: ["post", post.id] });
      }

      if (visibility === "public") {
        await publishSingleVersion({ versionId: version.id });
      }

      return post;
    },
    onSuccess: async (post) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["library", viewer.userId] }),
        queryClient.invalidateQueries({ queryKey: ["library-posts", viewer.userId] }),
        queryClient.invalidateQueries({ queryKey: ["home-feed"] }),
        queryClient.invalidateQueries({ queryKey: ["explore-feed"] }),
        queryClient.invalidateQueries({ queryKey: ["profile-posts"] }),
      ]);
      toast.success("Single flow completed.");
      navigate(`/post/${post.id}`);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not publish this single.");
    },
  });

  const handleArtworkUpload = async (file: File) => {
    if (!viewer.userId) {
      throw new Error("Connect Google Drive first.");
    }

    const artworkFolderId = await resolveDriveFolder("artwork");
    const upload = await provider.uploadFile({
      file,
      parentFolderId: artworkFolderId,
    });
    const publicPreview = await provider.makePublicPreview(upload.fileId);
    const asset = await createAssetRecord({
      ownerId: viewer.userId,
      assetType: "cover_artwork",
      accessMode: "public",
      upload: {
        ...upload,
        shareUrl: publicPreview.shareUrl,
        viewUrl: publicPreview.viewUrl,
      },
    });
    await updateAssetPublicLinks({
      assetId: asset.id,
      accessMode: "public",
      shareUrl: publicPreview.shareUrl,
      viewUrl: publicPreview.viewUrl,
    });
    setUploadedArtwork(asset);
    toast.success("Artwork uploaded.");
  };

  const selectedSongTitle =
    selectedSong?.title ??
    newSongTitle.trim() ??
    "";
  const releaseHeadline = postTitle.trim() || selectedSongTitle || "Untitled single";
  const completedAssets = [uploadedOriginal, uploadedPreview, uploadedArtwork].filter(Boolean).length;
  const canAdvance = step < 4;
  const canGoBack = step > 1;

  return (
    <div className="space-y-8">
      <Link
        to="/create"
        className="inline-flex items-center gap-2 text-sm text-accent-secondary transition-colors hover:text-white"
      >
        <ArrowLeft className="size-4" />
        Back to create
      </Link>

      <PageHeader
        eyebrow="Create"
        title="Publish a single"
        description="One flow for first-time singles and version updates. Existing single posts keep their comments and post hearts."
        actions={
          <Tabs
            value="single"
            onValueChange={(nextValue) => {
              const nextRoute = nextValue === "album" ? "/create/album" : nextValue === "ep" ? "/create/ep" : "/create/single";
              navigate(nextRoute);
            }}
            className="w-full md:w-auto"
            items={[
              { value: "single", label: "Single" },
              { value: "ep", label: "EP" },
              { value: "album", label: "Album" },
            ]}
          />
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <Card className="overflow-hidden p-0">
            <div className="border-b border-white/[0.06] px-6 py-5">
              <div className="grid gap-4 md:grid-cols-4">
                {steps.map((entry) => (
                  <div key={entry.id} className="flex items-center gap-3">
                    <div
                      className={`flex size-11 items-center justify-center rounded-full border ${
                        step >= entry.id
                          ? "border-accent/35 bg-[linear-gradient(135deg,rgba(157,92,255,0.96),rgba(193,126,255,0.88))] text-white shadow-[0_12px_28px_rgba(120,65,231,0.3)]"
                          : "border-border bg-white/[0.03] text-muted-foreground"
                      }`}
                    >
                      {entry.id}
                    </div>
                    <div>
                      <p className={`text-sm ${step === entry.id ? "text-foreground" : "text-muted-foreground"}`}>{entry.label}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {step === 1 ? (
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Single information</CardTitle>
                  <CardDescription className="mt-2 text-base leading-7">
                    Choose an existing library song for an update or create a brand-new one for the first public release.
                  </CardDescription>
                </div>
              </CardHeader>
              <div className="grid gap-5 md:grid-cols-2">
                <label className="grid gap-2">
                  <span className="text-sm font-medium">Existing song</span>
                  <Select value={existingSongId} onChange={(event) => setExistingSongId(event.currentTarget.value)}>
                    <option value="">Create a new song</option>
                    {libraryQuery.data?.songs.map((song) => (
                      <option key={song.id} value={song.id}>{song.title}</option>
                    ))}
                  </Select>
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-medium">New song title</span>
                  <Input
                    placeholder="Eternal Light"
                    value={newSongTitle}
                    onChange={(event) => {
                      setNewSongTitle(event.currentTarget.value);
                      if (!postTitle) {
                        setPostTitle(event.currentTarget.value);
                      }
                    }}
                    disabled={Boolean(existingSongId)}
                  />
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-medium">Version label</span>
                  <Input value={versionLabel} onChange={(event) => setVersionLabel(event.currentTarget.value)} />
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-medium">Production stage</span>
                  <Select value={productionStage} onChange={(event) => setProductionStage(event.currentTarget.value)}>
                    {productionStages.map((stage) => (
                      <option key={stage} value={stage}>{stage}</option>
                    ))}
                  </Select>
                </label>
              </div>
            </Card>
          ) : null}

          {step === 2 ? (
            <div className="space-y-6">
              {!storedDriveFolders ? (
                <Card>
                  <CardHeader>
                    <div>
                      <CardTitle>Google Drive setup required</CardTitle>
                      <CardDescription className="mt-2 text-base leading-7">
                        Prepare Drive once in Settings before uploading. MxShare will create its dedicated folder structure
                        there and reuse it for future singles.
                      </CardDescription>
                    </div>
                  </CardHeader>
                  <div className="flex flex-wrap gap-3">
                    <Link to="/settings/storage">
                      <Button>Open Google Drive setup</Button>
                    </Link>
                    <Button variant="ghost" onClick={() => void connectionQuery.refetch()}>
                      Refresh status
                    </Button>
                  </div>
                </Card>
              ) : null}

              <div className="grid gap-6 lg:grid-cols-2">
                <UploadDropzone
                  title="Private original upload"
                  description="Originals stay private in Drive and are only readable by their owner."
                  parentFolderId={storedDriveFolders?.audioOriginalsFolderId ?? ""}
                  disabled={!storedDriveFolders}
                  onUpload={async (input) => {
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
                      originalFile: input.file,
                      originalsFolderId,
                      previewsFolderId,
                      signal: input.signal,
                      onProgress: input.onProgress,
                      onJobChange: setMediaProcessingJob,
                    });
                    setUploadedOriginal(result.originalAsset);
                    if (result.previewAsset) {
                      setUploadedPreview(result.previewAsset);
                    }
                    if (result.automationError) {
                      setMediaProcessingError(result.automationError);
                      toast.warning("Original uploaded. Automatic preview generation needs attention.");
                    } else if (result.previewAsset) {
                      toast.success("Original uploaded and preview generated automatically.");
                    } else {
                      toast.success("Original uploaded.");
                    }
                    return {
                      fileId: result.originalAsset.remote_file_id,
                      filename: result.originalAsset.filename,
                      mimeType: result.originalAsset.mime_type,
                      bytes: result.originalAsset.bytes ?? input.file.size,
                      parentFolderId: result.originalAsset.remote_parent_folder_id ?? originalsFolderId,
                      shareUrl: result.originalAsset.share_url,
                      viewUrl: result.originalAsset.view_url,
                      thumbnailUrl: result.originalAsset.thumbnail_url,
                    };
                  }}
                />

                <Card className="space-y-4 p-5">
                  <div className="space-y-2">
                    <CardTitle>Generated public preview</CardTitle>
                    <CardDescription className="text-base leading-7">
                      Manual preview uploads are disabled. MxShare always derives the public MP3 and waveform from the private original.
                    </CardDescription>
                  </div>

                  <div className="rounded-[20px] border border-white/[0.08] bg-white/[0.03] px-4 py-4 text-sm leading-7 text-muted-foreground">
                    {uploadedPreview
                      ? "A generated preview is already attached to this single flow."
                      : uploadedOriginal
                        ? "Use the current original to generate or refresh the public preview."
                        : "Upload or select a private original first, then generate the public preview from it."}
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Button
                      variant="secondary"
                      disabled={!storedDriveFolders || !uploadedOriginal || !viewer.userId}
                      onClick={() => {
                        const ownerId = viewer.userId;
                        const sourceAsset = uploadedOriginal;

                        if (!ownerId || !sourceAsset) {
                          return;
                        }

                        void (async () => {
                          setMediaProcessingError(null);
                          setMediaProcessingJob(null);

                          try {
                            const previewFolderId = await resolveDriveFolder("previews");
                            const result = await generateAutomaticPreviewFromSourceAsset({
                              ownerId,
                              provider,
                              sourceAsset,
                              previewFolderId,
                              onJobChange: setMediaProcessingJob,
                            });
                            setUploadedPreview(result.previewAsset);
                            toast.success("Preview and waveform generated from the current original.");
                          } catch (error) {
                            const message =
                              error instanceof Error
                                ? error.message
                                : "Could not generate the public preview from this original.";
                            setMediaProcessingError(message);
                            toast.error(message);
                          }
                        })();
                      }}
                    >
                      {uploadedPreview ? "Regenerate preview" : "Generate preview"}
                    </Button>
                  </div>

                  {latestSelectedVersion ? (
                    <div className="rounded-[20px] border border-white/[0.08] bg-white/[0.03] px-4 py-4 text-sm text-muted-foreground">
                      Latest library version: <span className="text-foreground">{latestSelectedVersion.version_label}</span>
                    </div>
                  ) : null}
                </Card>
              </div>

              <MediaProcessingStatusCard
                job={mediaProcessingJob}
                error={mediaProcessingError}
                title="Generated playback preview"
                emptyMessage="Upload or select a private original once. MxShare will create the public MP3 preview and waveform automatically."
              />

              <Card>
                <CardHeader>
                  <div>
                    <CardTitle>Artwork</CardTitle>
                    <CardDescription className="mt-2 text-base leading-7">
                      Upload a new public cover or reuse one from your existing artwork assets.
                    </CardDescription>
                  </div>
                </CardHeader>
                <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto]">
                  <Select
                    value={uploadedArtwork?.id ?? ""}
                    onChange={(event) => {
                      const asset = availableArtwork.find((entry) => entry.id === event.currentTarget.value) ?? null;
                      setUploadedArtwork(asset);
                    }}
                  >
                    <option value="">No artwork selected</option>
                    {availableArtwork.map((asset) => (
                      <option key={asset.id} value={asset.id}>{asset.display_name ?? asset.filename}</option>
                    ))}
                  </Select>
                  <div className="flex gap-3">
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
                          void handleArtworkUpload(file);
                        }
                      }}
                    />
                    <label
                      htmlFor={storedDriveFolders ? artworkInputId : undefined}
                      role="button"
                      tabIndex={storedDriveFolders ? 0 : -1}
                      aria-disabled={!storedDriveFolders}
                      onKeyDown={handleArtworkPickerKeyDown}
                      className={cn(
                        buttonVariants({ variant: "secondary" }),
                        storedDriveFolders ? "cursor-pointer" : "pointer-events-none opacity-50",
                      )}
                    >
                      Upload artwork
                    </label>
                  </div>
                </div>
                {uploadedArtwork ? (
                  <div className="mt-4 flex items-center gap-4 rounded-[20px] border border-white/[0.08] bg-white/[0.03] p-4">
                    <ResolvedImage
                      src={getArtworkAssetUrls(uploadedArtwork)}
                      alt={uploadedArtwork.display_name ?? uploadedArtwork.filename}
                      className="size-20 rounded-[18px] object-cover"
                    />
                    <div>
                      <p className="font-medium">{uploadedArtwork.display_name ?? uploadedArtwork.filename}</p>
                      <p className="text-sm text-muted-foreground">{uploadedArtwork.id}</p>
                    </div>
                  </div>
                ) : null}
              </Card>
            </div>
          ) : null}

          {step === 3 ? (
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Release details</CardTitle>
                  <CardDescription className="mt-2 text-base leading-7">
                    Set the public post copy and decide whether this version stays private or becomes publicly playable now.
                  </CardDescription>
                </div>
              </CardHeader>
              <div className="grid gap-5">
                <label className="grid gap-2">
                  <span className="text-sm font-medium">Post title</span>
                  <Input value={postTitle} onChange={(event) => setPostTitle(event.currentTarget.value)} />
                </label>
                <label className="grid gap-2">
                  <span className="text-sm font-medium">Description / changelog context</span>
                  <Textarea value={description} onChange={(event) => setDescription(event.currentTarget.value)} />
                </label>
                <label className="grid gap-2">
                  <span className="text-sm font-medium">Visibility</span>
                  <Select value={visibility} onChange={(event) => setVisibility(event.currentTarget.value as typeof visibility)}>
                    <option value="public">Public</option>
                    <option value="private">Private</option>
                  </Select>
                </label>
              </div>
            </Card>
          ) : null}

          {step === 4 ? (
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Review</CardTitle>
                  <CardDescription className="mt-2 text-base leading-7">
                    Check the release setup before MxShare writes song version data, single post data, and optional public preview metadata.
                  </CardDescription>
                </div>
              </CardHeader>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-3 rounded-[22px] border border-white/[0.08] bg-white/[0.03] p-5">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-success" />
                    <span>Song ready</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{existingSongId ? "Existing library song update" : newSongTitle || "New song pending"}</p>
                  <Badge variant="cyan">{productionStage}</Badge>
                </div>
                <div className="space-y-3 rounded-[22px] border border-white/[0.08] bg-white/[0.03] p-5">
                  <div className="flex items-center gap-2">
                    <Sparkles className="size-4 text-accent" />
                    <span>Preview safety</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {visibility === "public"
                      ? uploadedPreview
                        ? "A generated public preview asset is attached."
                        : "Generate the public preview from the private original before publishing."
                      : "Private release: the generated preview can be attached later."}
                  </p>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <Button onClick={() => void publishMutation.mutateAsync()} disabled={publishMutation.isPending}>
                  {visibility === "public" ? "Publish single" : "Save private single draft"}
                </Button>
                <Badge
                  variant="neutral"
                  className="max-w-full truncate"
                  title={uploadedOriginal?.id ?? "missing"}
                >
                  Original asset: {uploadedOriginal?.id ?? "missing"}
                </Badge>
                <Badge
                  variant="neutral"
                  className="max-w-full truncate"
                  title={uploadedPreview?.id ?? "optional / missing"}
                >
                  Preview asset: {uploadedPreview?.id ?? "optional / missing"}
                </Badge>
              </div>
            </Card>
          ) : null}

          <Card>
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-[0.22em] text-accent-secondary/75">Step {step} of 4</p>
                <p className="text-sm text-muted-foreground">Move through the flow in order, then review before publishing.</p>
              </div>
              <div className="flex gap-3">
                <Button variant="ghost" onClick={() => setStep((current) => Math.max(1, current - 1))} disabled={!canGoBack}>
                  Back
                </Button>
                <Button variant="secondary" onClick={() => setStep((current) => Math.min(4, current + 1))} disabled={!canAdvance}>
                  Next
                </Button>
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Badge variant="accent">Artwork preview</Badge>
                <Badge variant="neutral">{visibility}</Badge>
              </div>
              <div className="overflow-hidden rounded-[26px] border border-white/[0.08] bg-background-muted">
                {uploadedArtwork ? (
                  <ResolvedImage
                    src={getArtworkAssetUrls(uploadedArtwork)}
                    alt={uploadedArtwork.display_name ?? uploadedArtwork.filename}
                    className="aspect-square w-full object-cover"
                  />
                ) : (
                  <div className="flex aspect-square items-center justify-center bg-[radial-gradient(circle_at_top,rgba(157,92,255,0.24),rgba(255,255,255,0.02)_60%,rgba(255,255,255,0.01))]">
                    <Disc3 className="size-14 text-accent-secondary/70" />
                  </div>
                )}
              </div>
              <div>
                <p className="font-display text-3xl tracking-[-0.03em]">{releaseHeadline}</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {existingSongId ? "Existing song update" : "New single"} · {versionLabel || "Unlabeled version"}
                </p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-accent-secondary" />
                <p className="font-medium">Privacy notes</p>
              </div>
              <div className="space-y-2 text-sm leading-7 text-muted-foreground">
                <p>Originals stay private in your Google Drive.</p>
                <p>Only the preview and artwork become public when you choose public visibility.</p>
                <p>You can attach a new version later without losing the post-level conversation.</p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="space-y-4">
              <p className="text-xs uppercase tracking-[0.22em] text-accent-secondary/75">Readiness</p>
              <div className="space-y-3">
                <div className="rounded-[20px] border border-white/[0.06] bg-white/[0.02] px-4 py-3">
                  <p className="text-sm text-muted-foreground">Assets attached</p>
                  <p className="mt-2 font-display text-3xl tracking-[-0.03em]">{completedAssets}/3</p>
                </div>
                <div className="rounded-[20px] border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-sm leading-7 text-muted-foreground">
                  {storedDriveFolders
                    ? "Drive setup looks healthy for this release."
                    : "Complete the Drive setup before uploads can move forward cleanly."}
                </div>
                <div className="rounded-[20px] border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-sm leading-7 text-muted-foreground">
                  {visibility === "public"
                    ? uploadedPreview
                      ? "Public playback is ready."
                      : "Generate the preview from the private original for public playback."
                    : "Private release selected. The public preview can be generated later."}
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
