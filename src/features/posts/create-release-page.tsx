import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, Disc3, FolderOpen, GripVertical, ImagePlus, PlusCircle, ShieldCheck } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ResolvedImage } from "@/components/ui/resolved-image";
import { Select } from "@/components/ui/select";
import { Tabs } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  createAssetRecord,
  updateAssetPublicLinks,
} from "@/features/drive/api";
import { getCloudStorageProvider } from "@/features/cloud-providers/provider-registry";
import { useCloudUploadProvider } from "@/features/cloud-providers/use-cloud-upload-provider";
import { createSong, getLibraryDashboard } from "@/features/library/api";
import { generateProtectedPreviewFromSourceAsset } from "@/features/media-processing/automatic-preview";
import { createReleasePost } from "@/features/posts/api";
import { getPostDraft } from "@/features/posts/drafts-api";
import {
  hasMeaningfulReleaseDraft,
  isReleasePostDraftPayload,
  postDraftSchemaVersion,
  type ReleasePostDraftPayload,
} from "@/features/posts/drafts";
import { usePostDraftAutosave } from "@/features/posts/use-post-draft-autosave";
import { useAppViewer } from "@/hooks/use-app-viewer";
import { getArtworkAssetUrls } from "@/lib/asset-urls";
import { queryClient } from "@/lib/query-client";
import type { CloudProvider, SongVersion, Visibility } from "@/types/domain";

function getReleaseCreateErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string" &&
    (error as { message: string }).message.trim()
  ) {
    return (error as { message: string }).message;
  }

  return "Could not create release.";
}

function getLatestSongVersion(songId: string, versions: SongVersion[]) {
  return (
    versions
      .filter((version) => version.song_id === songId)
      .sort((left, right) => right.version_number - left.version_number)[0] ?? null
  );
}

function getTrackStatus(version: SongVersion | null) {
  if (!version) {
    return {
      label: "Needs version",
      description: "Create the first version in the song workspace.",
      badgeVariant: "warning" as const,
    };
  }

  if (!version.preview_asset_id) {
    return {
      label: "Needs playback",
      description: "Upload a shared playback file before using this in a public release.",
      badgeVariant: "warning" as const,
    };
  }

  return {
    label: "Ready",
    description: `${version.version_label} is mapped and has a playback file.`,
    badgeVariant: "success" as const,
  };
}

function SortableTrackRow({
  id,
  title,
  subtitle,
  statusLabel,
}: {
  id: string;
  title: string;
  subtitle: string;
  statusLabel: string;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className="flex items-center justify-between gap-4 rounded-[22px] border border-white/[0.08] bg-white/[0.03] px-4 py-3"
    >
      <div className="min-w-0">
        <p className="font-medium">{title}</p>
        <p className="truncate text-sm text-muted-foreground">{subtitle}</p>
      </div>
      <div className="flex items-center gap-3">
        <Badge variant={statusLabel === "Ready" ? "success" : "warning"}>{statusLabel}</Badge>
        <button type="button" className="rounded-full p-2 text-muted-foreground" {...attributes} {...listeners}>
          <GripVertical className="size-4" />
        </button>
      </div>
    </div>
  );
}

export function CreateReleasePage({
  kind,
}: {
  kind: "ep" | "album";
}) {
  const viewer = useAppViewer();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedDraftId = searchParams.get("draft");
  const artworkInputId = useId();
  const artworkInputRef = useRef<HTMLInputElement | null>(null);
  const restoredDraftId = useRef<string | null>(null);
  const [postType, setPostType] = useState<"ep" | "album">(kind);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [releaseUrl, setReleaseUrl] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("public");
  const [selectedSongIds, setSelectedSongIds] = useState<string[]>([]);
  const [quickSongTitle, setQuickSongTitle] = useState("");
  const [artworkAssetId, setArtworkAssetId] = useState<string | null>(null);
  const [uploadProviderId, setUploadProviderId] = useState<CloudProvider | null>(null);
  const [draftHydrated, setDraftHydrated] = useState(() => !requestedDraftId);
  const {
    provider,
    providerId,
    storedFolders: storedDriveFolders,
    connectionsQuery,
    ensureFolders,
  } = useCloudUploadProvider(viewer.userId, uploadProviderId);
  const sensors = useSensors(useSensor(PointerSensor));

  useEffect(() => {
    setPostType(kind);
  }, [kind]);

  const libraryQuery = useQuery({
    queryKey: ["library", viewer.userId],
    queryFn: () => getLibraryDashboard(viewer.userId!),
    enabled: Boolean(viewer.userId),
  });
  const draftQuery = useQuery({
    queryKey: ["post-draft", requestedDraftId],
    queryFn: () => getPostDraft(requestedDraftId!),
    enabled: Boolean(requestedDraftId && viewer.userId),
  });

  useEffect(() => {
    if (!requestedDraftId || restoredDraftId.current === requestedDraftId || !draftQuery.isFetched) return;

    if (draftQuery.isError) {
      restoredDraftId.current = requestedDraftId;
      setDraftHydrated(true);
      toast.error("The draft could not be loaded.");
      return;
    }

    const draft = draftQuery.data;
    if (!draft || !isReleasePostDraftPayload(draft.payload)) {
      restoredDraftId.current = requestedDraftId;
      setDraftHydrated(true);
      toast.error("This release draft is unavailable or uses an unsupported format.");
      return;
    }

    setPostType(draft.payload.kind);
    setTitle(draft.payload.title);
    setDescription(draft.payload.description);
    setReleaseUrl(draft.payload.releaseUrl);
    setVisibility(draft.payload.visibility);
    setSelectedSongIds(draft.payload.selectedSongIds);
    setQuickSongTitle(draft.payload.quickSongTitle);
    setArtworkAssetId(draft.payload.artworkAssetId);
    setUploadProviderId(draft.payload.uploadProviderId);
    restoredDraftId.current = requestedDraftId;
    setDraftHydrated(true);
  }, [draftQuery.data, draftQuery.isError, draftQuery.isFetched, requestedDraftId]);

  const songs = libraryQuery.data?.songs ?? [];
  const versions = libraryQuery.data?.versions ?? [];
  const assets = libraryQuery.data?.assets ?? [];
  const availableArtwork = useMemo(
    () => assets.filter((asset) => asset.asset_type === "cover_artwork"),
    [assets],
  );
  const selectedSongs = useMemo(
    () =>
      selectedSongIds
        .map((songId) => songs.find((song) => song.id === songId))
        .filter(Boolean),
    [selectedSongIds, songs],
  );
  const selectedArtwork = useMemo(() => {
    const explicitArtwork = availableArtwork.find((asset) => asset.id === artworkAssetId) ?? null;
    if (explicitArtwork) {
      return explicitArtwork;
    }

    const firstSongArtworkId = selectedSongs.find((song) => song?.default_artwork_asset_id)?.default_artwork_asset_id;
    return firstSongArtworkId
      ? availableArtwork.find((asset) => asset.id === firstSongArtworkId) ?? null
      : null;
  }, [artworkAssetId, availableArtwork, selectedSongs]);
  const draftPayload = useMemo<ReleasePostDraftPayload>(() => ({
    schemaVersion: postDraftSchemaVersion,
    kind: postType,
    title,
    description,
    releaseUrl,
    visibility,
    selectedSongIds,
    quickSongTitle,
    artworkAssetId,
    uploadProviderId: providerId,
  }), [
    artworkAssetId,
    description,
    postType,
    providerId,
    quickSongTitle,
    releaseUrl,
    selectedSongIds,
    title,
    visibility,
  ]);
  const draftAutosave = usePostDraftAutosave({
    ownerId: viewer.userId ?? "",
    initialDraftId: requestedDraftId,
    postType,
    title: title.trim(),
    currentStep: 1,
    payload: draftPayload,
    isMeaningful: hasMeaningfulReleaseDraft(draftPayload),
    enabled: Boolean(viewer.userId && draftHydrated),
  });

  async function resolveArtworkFolder() {
    return (await ensureFolders()).artworkFolderId;
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

  const artworkUploadMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!viewer.userId) {
        throw new Error("Please sign in first.");
      }

      const artworkFolderId = await resolveArtworkFolder();
      const upload =
        file.size > 20 * 1024 * 1024
          ? await provider.uploadResumable({ file, parentFolderId: artworkFolderId })
          : await provider.uploadFile({ file, parentFolderId: artworkFolderId });
      const publicArtwork = await provider.createPublicPreview(upload.fileId);
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
      return asset;
    },
    onSuccess: async (asset) => {
      setArtworkAssetId(asset.id);
      await queryClient.invalidateQueries({ queryKey: ["library", viewer.userId] });
      toast.success("Artwork uploaded.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not upload artwork.");
    },
  });

  const createSongMutation = useMutation({
    mutationFn: async () => {
      if (!viewer.userId || !quickSongTitle.trim()) {
        throw new Error("Add a song title first.");
      }

      return createSong(viewer.userId, {
        title: quickSongTitle.trim(),
        notes: "",
        default_artwork_asset_id: null,
      });
    },
    onSuccess: async (song) => {
      await queryClient.invalidateQueries({ queryKey: ["library", viewer.userId] });
      setQuickSongTitle("");
      setSelectedSongIds((current) => (current.includes(song.id) ? current : [...current, song.id]));
      toast.success("Song shell created. Open the workspace to upload files and build the first version.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not create song.");
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!viewer.userId) {
        throw new Error("Please sign in first.");
      }
      if (selectedSongs.length === 0) {
        throw new Error("Add at least one song to the release.");
      }

      const resolvedTracks = selectedSongs.map((song) => {
        const latestVersion = getLatestSongVersion(song!.id, versions);
        return {
          song: song!,
          latestVersion,
          status: getTrackStatus(latestVersion),
        };
      });

      if (resolvedTracks.some((track) => !track.latestVersion)) {
        throw new Error("Every selected song needs at least one version before it can join an EP or album.");
      }

      if (visibility === "public" && resolvedTracks.some((track) => !track.latestVersion?.preview_asset_id)) {
        throw new Error("Public releases need a shared playback file for every selected track.");
      }

      const post = await createReleasePost({
        postType,
        title: title.trim(),
        description: description.trim(),
        releaseUrl: releaseUrl.trim() || undefined,
        artworkAssetId: artworkAssetId ?? selectedArtwork?.id ?? null,
        visibility,
        tracks: resolvedTracks.map(({ song, latestVersion }, index) => ({
          song_id: song.id,
          song_version_id: latestVersion?.id ?? null,
          preview_asset_id: latestVersion?.preview_asset_id ?? null,
          track_title: song.title,
          track_number: index + 1,
          production_stage: latestVersion?.production_stage ?? null,
        })),
      });

      if (visibility === "followers" || visibility === "unlisted") {
        for (const { latestVersion } of resolvedTracks) {
          if (!latestVersion || latestVersion.protected_preview_asset_id) continue;
          const sourceAsset = assets.find((asset) => asset.id === latestVersion.source_asset_id);
          if (!sourceAsset) {
            throw new Error(`The private source for ${latestVersion.version_label} is missing.`);
          }
          const sourceProvider = getCloudStorageProvider(sourceAsset.provider);
          if (!(await sourceProvider.restoreSession())) {
            throw new Error(
              `Reconnect ${sourceAsset.provider.replace("_", " ")} before generating protected playback.`,
            );
          }
          await generateProtectedPreviewFromSourceAsset({
            provider: sourceProvider,
            sourceAsset,
            songVersionId: latestVersion.id,
            purpose: "post_preview",
            postId: post.id,
          });
        }
      }

      return post;
    },
    onSuccess: async (post) => {
      await draftAutosave.completeDraft().catch(() => {
        toast.warning("The release was published, but its saved draft could not be removed.");
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["explore-feed"] }),
        queryClient.invalidateQueries({ queryKey: ["home-feed"] }),
        queryClient.invalidateQueries({ queryKey: ["library-posts", viewer.userId] }),
      ]);
      toast.success(`${postType.toUpperCase()} created.`);
      navigate(`/post/${post.id}`);
    },
    onError: (error) => {
      toast.error(getReleaseCreateErrorMessage(error));
    },
  });

  const handleDragEnd = (event: DragEndEvent) => {
    if (!event.over || event.active.id === event.over.id) {
      return;
    }

    setSelectedSongIds((current) => {
      const oldIndex = current.indexOf(String(event.active.id));
      const newIndex = current.indexOf(String(event.over?.id));
      return arrayMove(current, oldIndex, newIndex);
    });
  };

  const readyTrackCount = selectedSongs.filter((song) => {
    const latestVersion = getLatestSongVersion(song!.id, versions);
    return Boolean(latestVersion?.preview_asset_id);
  }).length;

  if (requestedDraftId && !draftHydrated) {
    return (
      <Card>
        <CardTitle>Restoring your release draft…</CardTitle>
        <CardDescription className="mt-2">
          Track order, artwork, provider, and release metadata are being reconnected.
        </CardDescription>
      </Card>
    );
  }

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
        title={`Publish an ${postType.toUpperCase()}`}
        description="Choose songs from your library, set one visible version per track, and keep later reorder changes from bumping the public feed."
        actions={
          <div className="flex w-full flex-wrap items-center gap-3 md:w-auto">
            <Badge variant={draftAutosave.status === "error" ? "warning" : "neutral"}>
              {draftAutosave.status === "saving"
                ? "Saving draft…"
                : draftAutosave.status === "saved"
                  ? "Draft saved"
                  : draftAutosave.status === "error"
                    ? "Draft save failed"
                    : "Autosave ready"}
            </Badge>
            <Tabs
              value={postType}
              onValueChange={(nextValue) => {
                if (nextValue === "single") {
                  navigate("/create/single");
                  return;
                }

                const normalized = nextValue === "album" ? "album" : "ep";
                setPostType(normalized);
                navigate(`/create/${normalized}`);
              }}
              className="w-full md:w-auto"
              items={[
                { value: "single", label: "Single" },
                { value: "ep", label: "EP" },
                { value: "album", label: "Album" },
              ]}
            />
          </div>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Release basics</CardTitle>
                <CardDescription className="mt-2 text-base leading-7">
                  Tracks can be reordered, renamed, or replaced later without generating public version history.
                </CardDescription>
              </div>
            </CardHeader>
            <div className="grid gap-5 md:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-sm font-medium">Release type</span>
                <Select value={postType} onChange={(event) => setPostType(event.currentTarget.value as typeof postType)}>
                  <option value="ep">EP</option>
                  <option value="album">Album</option>
                </Select>
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-medium">Visibility</span>
                <Select value={visibility} onChange={(event) => setVisibility(event.currentTarget.value as typeof visibility)}>
                  <option value="public">Public</option>
                  <option value="followers">Followers only</option>
                  <option value="unlisted">Invite link only</option>
                  <option value="private">Private</option>
                </Select>
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-medium">Title</span>
                <Input value={title} onChange={(event) => setTitle(event.currentTarget.value)} />
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-medium">External release URL</span>
                <Input value={releaseUrl} onChange={(event) => setReleaseUrl(event.currentTarget.value)} />
              </label>
              <label className="grid gap-2 md:col-span-2">
                <span className="text-sm font-medium">Artwork</span>
                <Select value={artworkAssetId ?? ""} onChange={(event) => setArtworkAssetId(event.currentTarget.value || null)}>
                  <option value="">Use first selected song artwork / none</option>
                  {availableArtwork.map((asset) => (
                    <option key={asset.id} value={asset.id}>
                      {asset.display_name ?? asset.filename}
                    </option>
                  ))}
                </Select>
              </label>
            </div>
            <label className="mt-5 grid gap-2">
              <span className="text-sm font-medium">Description</span>
              <Textarea value={description} onChange={(event) => setDescription(event.currentTarget.value)} />
            </label>
            <div className="mt-5 flex flex-wrap gap-3">
              <Select
                className="min-h-11 w-auto"
                aria-label="Artwork upload provider"
                value={providerId}
                onChange={(event) => setUploadProviderId(event.currentTarget.value as CloudProvider)}
              >
                {(connectionsQuery.data ?? [])
                  .filter((connection) => connection.connection_status === "connected")
                  .map((connection) => (
                    <option key={connection.provider} value={connection.provider}>
                      {connection.provider.replace("_", " ")}
                      {connection.is_default ? " · default" : ""}
                    </option>
                  ))}
              </Select>
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
                htmlFor={storedDriveFolders && !artworkUploadMutation.isPending ? artworkInputId : undefined}
                role="button"
                tabIndex={storedDriveFolders && !artworkUploadMutation.isPending ? 0 : -1}
                aria-disabled={!storedDriveFolders || artworkUploadMutation.isPending}
                onKeyDown={handleArtworkPickerKeyDown}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 text-sm font-medium text-foreground transition hover:bg-white/[0.06] aria-disabled:pointer-events-none aria-disabled:opacity-50"
              >
                <ImagePlus className="size-4" />
                {selectedArtwork ? "Upload new artwork" : "Upload artwork"}
              </label>
              {!storedDriveFolders ? (
                <Link to="/settings/storage">
                  <Button variant="ghost">Connect storage for artwork uploads</Button>
                </Link>
              ) : null}
            </div>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Track selection</CardTitle>
                <CardDescription className="mt-2 text-base leading-7">
                  Add songs from the library or create a new song shell here, then jump into its workspace to upload the private source, shared playback file, and artwork.
                </CardDescription>
              </div>
            </CardHeader>

            <div className="rounded-[22px] border border-white/[0.06] bg-white/[0.02] p-4">
              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
                <Input
                  placeholder={`Quick-add a song for this ${postType.toUpperCase()}`}
                  value={quickSongTitle}
                  onChange={(event) => setQuickSongTitle(event.currentTarget.value)}
                />
                <Button onClick={() => void createSongMutation.mutateAsync()} disabled={createSongMutation.isPending}>
                  <PlusCircle className="size-4" />
                  Add song shell
                </Button>
              </div>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                New shells are auto-selected here, and you can open each one below to finish the actual uploads.
              </p>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              {songs.map((song) => {
                const active = selectedSongIds.includes(song.id);
                const latestVersion = getLatestSongVersion(song.id, versions);
                const status = getTrackStatus(latestVersion);

                return (
                  <Button
                    key={song.id}
                    variant={active ? "primary" : "secondary"}
                    onClick={() => {
                      setSelectedSongIds((current) =>
                        active ? current.filter((id) => id !== song.id) : [...current, song.id],
                      );
                    }}
                    className="gap-3"
                  >
                    <span>{song.title}</span>
                    <Badge variant={status.badgeVariant}>{status.label}</Badge>
                  </Button>
                );
              })}
            </div>

            <div className="mt-5 space-y-4">
              {selectedSongs.length ? (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={selectedSongIds} strategy={verticalListSortingStrategy}>
                    {selectedSongs.map((song, index) => {
                      const latestVersion = getLatestSongVersion(song!.id, versions);
                      const status = getTrackStatus(latestVersion);
                      return (
                        <div key={song!.id} className="space-y-3">
                          <SortableTrackRow
                            id={song!.id}
                            title={`${index + 1}. ${song!.title}`}
                            subtitle={
                              latestVersion
                                ? `${latestVersion.version_label} · ${latestVersion.production_stage}`
                                : "No version created yet"
                            }
                            statusLabel={status.label}
                          />
                          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[20px] border border-white/[0.05] bg-white/[0.02] px-4 py-3 text-sm text-muted-foreground">
                            <span>{status.description}</span>
                            <Link to={`/library/songs/${song!.id}`}>
                              <Button variant="ghost" size="sm">
                                <FolderOpen className="size-4" />
                                Open workspace
                              </Button>
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </SortableContext>
                </DndContext>
              ) : (
                <div className="rounded-[22px] border border-white/[0.06] bg-white/[0.02] px-4 py-4 text-sm leading-7 text-muted-foreground">
                  No tracks selected yet. Add songs above, then upload files in the linked workspace for each one.
                </div>
              )}
            </div>
          </Card>

          <Card>
            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={() => void createMutation.mutateAsync()} disabled={createMutation.isPending}>
                Create {postType.toUpperCase()}
              </Button>
              <Badge variant="neutral">Track count: {selectedSongIds.length}</Badge>
              <Badge variant={readyTrackCount === selectedSongIds.length && selectedSongIds.length > 0 ? "success" : "warning"}>
                Ready tracks: {readyTrackCount}/{selectedSongIds.length}
              </Badge>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <div className="space-y-4">
              <div className="overflow-hidden rounded-[26px] border border-white/[0.08] bg-[radial-gradient(circle_at_top,rgba(var(--accent-rgb),0.22),rgba(255,255,255,0.02)_60%,rgba(255,255,255,0.01))] p-5">
                {selectedArtwork ? (
                  <ResolvedImage
                    src={getArtworkAssetUrls(selectedArtwork)}
                    alt={title.trim() || `Untitled ${postType.toUpperCase()}`}
                    className="mb-5 aspect-square w-full rounded-[22px] object-cover"
                  />
                ) : null}
                <Disc3 className="size-10 text-accent-secondary" />
                <p className="mt-4 font-display text-3xl tracking-[-0.03em]">{title.trim() || `Untitled ${postType.toUpperCase()}`}</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {postType.toUpperCase()} · {visibility} · {selectedSongIds.length} track{selectedSongIds.length === 1 ? "" : "s"}
                </p>
              </div>

              <div className="rounded-[22px] border border-white/[0.06] bg-white/[0.02] px-4 py-4">
                <p className="text-xs uppercase tracking-[0.22em] text-accent-secondary/75">Selected songs</p>
                <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                  {selectedSongs.length ? (
                    selectedSongs.map((song, index) => {
                      const latestVersion = getLatestSongVersion(song!.id, versions);
                      const status = getTrackStatus(latestVersion);
                      return (
                        <p key={song!.id}>
                          {index + 1}. {song!.title} · {status.label}
                        </p>
                      );
                    })
                  ) : (
                    <p>No tracks selected yet.</p>
                  )}
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-accent-secondary" />
                <p className="font-medium">Release behavior</p>
              </div>
              <div className="space-y-2 text-sm leading-7 text-muted-foreground">
                <p>Track order can change later without generating public version updates.</p>
                <p>Public releases only stay healthy if every selected track has a shared playback file.</p>
                <p>The actual audio and artwork setup still lives in each song workspace so singles, EPs, and albums all reuse the same source of truth.</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
