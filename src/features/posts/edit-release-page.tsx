import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, Disc3, FolderOpen, GripVertical, ImagePlus, Save, ShieldCheck } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ResolvedImage } from "@/components/ui/resolved-image";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  createAssetRecord,
  getCloudConnection,
  updateAssetPublicLinks,
  upsertCloudConnection,
} from "@/features/drive/api";
import { buildCloudConnectionUpsert, getStoredDriveFolders } from "@/features/drive/google-drive-connection";
import { useGoogleDriveProvider } from "@/features/drive/use-google-drive-provider";
import { getLibraryDashboard } from "@/features/library/api";
import { getResolvedPostById, updateReleasePost, updateSinglePost } from "@/features/posts/api";
import { useAppViewer } from "@/hooks/use-app-viewer";
import { getArtworkAssetUrls } from "@/lib/asset-urls";
import { queryClient } from "@/lib/query-client";
import type { SongVersion } from "@/types/domain";

type EditableTrack = {
  songId: string;
  trackTitle: string;
  songVersionId: string | null;
};

function getSongVersions(songId: string, versions: SongVersion[]) {
  return versions
    .filter((version) => version.song_id === songId)
    .sort((left, right) => right.version_number - left.version_number);
}

function getLatestSongVersion(songId: string, versions: SongVersion[]) {
  return getSongVersions(songId, versions)[0] ?? null;
}

function getTrackStatus(version: SongVersion | null, isPublic: boolean) {
  if (!version) {
    return {
      label: "Needs version",
      description: "Create at least one version for this song in the song workspace.",
      badgeVariant: "warning" as const,
    };
  }

  if (isPublic && !version.preview_asset_id) {
    return {
      label: "Needs playback",
      description: "Public releases need a generated playback file from the private original.",
      badgeVariant: "warning" as const,
    };
  }

  return {
    label: "Ready",
    description: `${version.version_label} is linked for this release slot.`,
    badgeVariant: "success" as const,
  };
}

function SortableTrackEditor({
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

export function EditReleasePage() {
  const { postId = "" } = useParams();
  const viewer = useAppViewer();
  const provider = useGoogleDriveProvider();
  const sensors = useSensors(useSensor(PointerSensor));
  const artworkInputId = useId();
  const artworkInputRef = useRef<HTMLInputElement | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [releaseUrl, setReleaseUrl] = useState("");
  const [artworkAssetId, setArtworkAssetId] = useState<string | null>(null);
  const [singleSongVersionId, setSingleSongVersionId] = useState<string | null>(null);
  const [tracks, setTracks] = useState<EditableTrack[]>([]);

  const postQuery = useQuery({
    queryKey: ["post", postId],
    queryFn: () => getResolvedPostById(postId, viewer.userId),
    enabled: Boolean(postId),
  });

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

  const item = postQuery.data;
  const songs = libraryQuery.data?.songs ?? [];
  const versions = libraryQuery.data?.versions ?? [];
  const artworkAssets = (libraryQuery.data?.assets ?? []).filter((asset) => asset.asset_type === "cover_artwork");
  const storedDriveFolders = getStoredDriveFolders(connectionQuery.data);
  const isOwner = Boolean(item?.owner?.id && item.owner.id === viewer.userId);
  const singleSong = item?.single?.song ?? null;
  const singleAvailableVersions = singleSong ? getSongVersions(singleSong.id, versions) : [];
  const selectedSingleVersion = singleSong
    ? ((singleSongVersionId
        ? singleAvailableVersions.find((entry) => entry.id === singleSongVersionId) ?? null
        : singleAvailableVersions[0] ?? null) ?? null)
    : null;
  const singleTrackStatus =
    item?.post.post_type === "single"
      ? getTrackStatus(selectedSingleVersion, item.post.visibility === "public")
      : null;

  useEffect(() => {
    provider.hydrateConnection({
      email: connectionQuery.data?.provider_account_email ?? null,
      folders: storedDriveFolders,
    });
  }, [connectionQuery.data?.provider_account_email, provider, storedDriveFolders]);

  useEffect(() => {
    if (!item) {
      return;
    }

    setTitle(item.post.title);
    setDescription(item.post.description ?? "");
    setReleaseUrl(item.post.release_url ?? "");
    setArtworkAssetId(item.post.artwork_asset_id ?? null);
    if (item.post.post_type === "single") {
      setSingleSongVersionId(item.single?.featuredVersion?.id ?? null);
      setTracks([]);
      return;
    }

    setSingleSongVersionId(null);
    setTracks(
      item.releaseTracks.map((track) => ({
        songId: track.track.song_id,
        trackTitle: track.track.track_title,
        songVersionId: track.track.song_version_id,
      })),
    );
  }, [item]);

  async function refreshDriveSetup() {
    if (!viewer.userId) {
      throw new Error("Please sign in first.");
    }

    const result = await provider.connect();
    await upsertCloudConnection(buildCloudConnectionUpsert(viewer.userId, result));
    await queryClient.invalidateQueries({ queryKey: ["cloud-connection", viewer.userId] });
    return result.folders;
  }

  async function resolveDriveFolder() {
    const cachedFolders = provider.getCachedFolders();
    const activeFolders = cachedFolders ?? storedDriveFolders ?? (await refreshDriveSetup());
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

  const artworkUploadMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!viewer.userId) {
        throw new Error("Please sign in first.");
      }

      const artworkFolderId = await resolveDriveFolder();
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
      return asset;
    },
    onSuccess: async (asset) => {
      setArtworkAssetId(asset.id);
      await queryClient.invalidateQueries({ queryKey: ["library", viewer.userId] });
      toast.success("Artwork uploaded. Save changes to attach it to the release.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not upload artwork.");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!item) {
        throw new Error("Release not found.");
      }
      if (!isOwner) {
        throw new Error("Only the release owner can edit this post.");
      }
      if (item.post.post_type === "single") {
        if (!singleSong) {
          throw new Error("This post is no longer linked to a song.");
        }
        if (!selectedSingleVersion) {
          throw new Error("Choose a version for this single before saving.");
        }
        if (item.post.visibility === "public" && !selectedSingleVersion.preview_asset_id) {
          throw new Error("Public singles need a playback-ready preview for the selected version.");
        }

        await updateSinglePost({
          postId,
          title: title.trim(),
          description: description.trim(),
          releaseUrl: releaseUrl.trim() || undefined,
          artworkAssetId,
          featuredVersionId: selectedSingleVersion.id,
        });
        return;
      }

      if (!tracks.length) {
        throw new Error("Keep at least one track in the release.");
      }

      const resolvedTracks = tracks.map((track, index) => {
        const version =
          (track.songVersionId
            ? versions.find((entry) => entry.id === track.songVersionId) ?? null
            : getLatestSongVersion(track.songId, versions)) ?? null;

        if (!version) {
          throw new Error("Every release track needs a linked version.");
        }
        if (item.post.visibility === "public" && !version.preview_asset_id) {
          throw new Error("Public releases need a playback file for every linked track version.");
        }

        return {
          song_id: track.songId,
          song_version_id: version.id,
          preview_asset_id: version.preview_asset_id ?? null,
          track_title: track.trackTitle.trim() || songs.find((song) => song.id === track.songId)?.title || "Untitled track",
          track_number: index + 1,
          production_stage: version.production_stage,
        };
      });

      await updateReleasePost({
        postId,
        title: title.trim(),
        description: description.trim(),
        releaseUrl: releaseUrl.trim() || undefined,
        artworkAssetId,
        tracks: resolvedTracks,
      });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["post", postId] }),
        queryClient.invalidateQueries({ queryKey: ["player-post", postId] }),
        queryClient.invalidateQueries({ queryKey: ["library", viewer.userId] }),
        queryClient.invalidateQueries({ queryKey: ["library-posts"] }),
        queryClient.invalidateQueries({ queryKey: ["home-feed"] }),
        queryClient.invalidateQueries({ queryKey: ["explore-feed"] }),
        item?.owner?.id
          ? queryClient.invalidateQueries({ queryKey: ["profile-posts", item.owner.id] })
          : Promise.resolve(),
      ]);
      toast.success(item?.post.post_type === "single" ? "Post updated." : "Release updated.");
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : item?.post.post_type === "single"
            ? "Could not update the post."
            : "Could not update the release.",
      );
    },
  });

  function handleDragEnd(event: DragEndEvent) {
    if (!event.over || event.active.id === event.over.id) {
      return;
    }

    setTracks((current) => {
      const oldIndex = current.findIndex((track) => track.songId === String(event.active.id));
      const newIndex = current.findIndex((track) => track.songId === String(event.over?.id));
      return arrayMove(current, oldIndex, newIndex);
    });
  }

  if (postQuery.isPending) {
    return (
      <Card>
        <CardTitle>Loading release</CardTitle>
        <CardDescription className="mt-2">Gathering track order, versions, and editable post details.</CardDescription>
      </Card>
    );
  }

  if (!item) {
    return (
      <Card>
        <CardTitle>Release unavailable</CardTitle>
        <CardDescription className="mt-2">
          This post is not available anymore.
        </CardDescription>
      </Card>
    );
  }

  if (!isOwner) {
    return (
      <Card>
        <CardTitle>Release unavailable</CardTitle>
        <CardDescription className="mt-2">
          Only the owner can edit this post.
        </CardDescription>
      </Card>
    );
  }

  const selectedArtwork = artworkAssets.find((asset) => asset.id === artworkAssetId) ?? item.artwork ?? null;
  const isSinglePost = item.post.post_type === "single";
  const releaseTrackCount = isSinglePost ? (singleSong ? 1 : 0) : tracks.length;
  const readyTrackCount = isSinglePost
    ? singleTrackStatus?.label === "Ready"
      ? 1
      : 0
    : tracks.filter((track) => {
        const version =
          (track.songVersionId
            ? versions.find((entry) => entry.id === track.songVersionId) ?? null
            : getLatestSongVersion(track.songId, versions)) ?? null;
        return Boolean(version?.preview_asset_id);
      }).length;

  return (
    <div className="space-y-8">
      <Link
        to={`/post/${item.post.id}`}
        className="inline-flex items-center gap-2 text-sm text-accent-secondary transition-colors hover:text-white"
      >
        <ArrowLeft className="size-4" />
        Back to release
      </Link>

      <PageHeader
        eyebrow="Release editor"
        title={isSinglePost ? "Edit single post" : `Edit ${item.post.post_type.toUpperCase()}`}
        description={
          isSinglePost
            ? "Update the live post metadata and switch which version powers the single without leaving the release editor."
            : "Reorder tracks, remap versions, rename slots, and update the release metadata without creating fake public version history."
        }
        actions={
          <Button onClick={() => void updateMutation.mutateAsync()} disabled={updateMutation.isPending || !isOwner}>
            <Save className="size-4" />
            Save changes
          </Button>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>{isSinglePost ? "Post metadata" : "Release metadata"}</CardTitle>
                <CardDescription className="mt-2 text-base leading-7">
                  {isSinglePost
                    ? "These changes update the existing single post in place while keeping the song workspace separate."
                    : "These changes update the existing public post instead of generating a new one."}
                </CardDescription>
              </div>
            </CardHeader>

            <div className="grid gap-5 md:grid-cols-2">
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
                  <option value="">Keep current / no artwork</option>
                  {artworkAssets.map((asset) => (
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
                {selectedArtwork ? "Upload replacement artwork" : "Upload artwork"}
              </label>
              {!storedDriveFolders ? (
                <Link to="/settings/storage">
                  <Button variant="ghost">Connect Drive for artwork uploads</Button>
                </Link>
              ) : null}
            </div>
          </Card>

          {isSinglePost ? (
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Single version</CardTitle>
                  <CardDescription className="mt-2 text-base leading-7">
                    Choose which private version powers this post. Deep file and version management still lives in the song workspace.
                  </CardDescription>
                </div>
              </CardHeader>

              <div className="grid gap-4 rounded-[20px] border border-white/[0.05] bg-white/[0.02] p-4 md:grid-cols-[minmax(0,1fr)_260px_auto]">
                <div className="grid gap-2">
                  <span className="text-sm font-medium">Song</span>
                  <div className="rounded-[18px] border border-white/[0.08] bg-white/[0.03] px-4 py-3">
                    <p className="font-medium">{singleSong?.title ?? "Song unavailable"}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {singleTrackStatus?.description ?? "Create or upload a version in the song workspace first."}
                    </p>
                  </div>
                </div>

                <label className="grid gap-2">
                  <span className="text-sm font-medium">Linked version</span>
                  <Select
                    value={singleSongVersionId ?? selectedSingleVersion?.id ?? ""}
                    onChange={(event) => setSingleSongVersionId(event.currentTarget.value || null)}
                    disabled={!singleAvailableVersions.length}
                  >
                    {!singleAvailableVersions.length ? <option value="">No versions available yet</option> : null}
                    {singleAvailableVersions.map((entry) => (
                      <option key={entry.id} value={entry.id}>
                        {entry.version_label} · {entry.production_stage}
                      </option>
                    ))}
                  </Select>
                </label>

                {singleSong ? (
                  <div className="flex items-end">
                    <Link to={`/library/songs/${singleSong.id}`} className="w-full">
                      <Button variant="ghost" className="w-full">
                        <FolderOpen className="size-4" />
                        Open full version in library
                      </Button>
                    </Link>
                  </div>
                ) : null}
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <Badge variant={singleTrackStatus?.badgeVariant ?? "warning"}>
                  {singleTrackStatus?.label ?? "Needs version"}
                </Badge>
                {selectedSingleVersion ? (
                  <span className="text-sm text-muted-foreground">
                    {selectedSingleVersion.version_label} · {selectedSingleVersion.production_stage}
                  </span>
                ) : (
                  <span className="text-sm text-muted-foreground">
                    No playback-ready version is linked yet.
                  </span>
                )}
              </div>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Track editor</CardTitle>
                  <CardDescription className="mt-2 text-base leading-7">
                    Each slot can point to a different song version, and the order can move without creating public feed noise.
                  </CardDescription>
                </div>
              </CardHeader>

              <div className="mt-5 flex flex-wrap gap-3">
                {songs.map((song) => {
                  const active = tracks.some((track) => track.songId === song.id);
                  return (
                    <Button
                      key={song.id}
                      variant={active ? "primary" : "secondary"}
                      onClick={() => {
                        setTracks((current) => {
                          if (active) {
                            return current.filter((track) => track.songId !== song.id);
                          }

                          const latestVersion = getLatestSongVersion(song.id, versions);
                          return [
                            ...current,
                            {
                              songId: song.id,
                              trackTitle: song.title,
                              songVersionId: latestVersion?.id ?? null,
                            },
                          ];
                        });
                      }}
                    >
                      {song.title}
                    </Button>
                  );
                })}
              </div>

              <div className="mt-5 space-y-4">
                {tracks.length ? (
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={tracks.map((track) => track.songId)} strategy={verticalListSortingStrategy}>
                      {tracks.map((track, index) => {
                        const song = songs.find((entry) => entry.id === track.songId) ?? null;
                        const availableVersions = getSongVersions(track.songId, versions);
                        const version =
                          (track.songVersionId
                            ? availableVersions.find((entry) => entry.id === track.songVersionId) ?? null
                            : availableVersions[0] ?? null) ?? null;
                        const status = getTrackStatus(version, item.post.visibility === "public");

                        return (
                          <div key={track.songId} className="space-y-3">
                            <SortableTrackEditor
                              id={track.songId}
                              title={`${index + 1}. ${track.trackTitle.trim() || song?.title || "Untitled track"}`}
                              subtitle={
                                version
                                  ? `${version.version_label} · ${version.production_stage}`
                                  : "No version linked yet"
                              }
                              statusLabel={status.label}
                            />

                            <div className="grid gap-4 rounded-[20px] border border-white/[0.05] bg-white/[0.02] p-4 md:grid-cols-[minmax(0,1fr)_240px_auto]">
                              <label className="grid gap-2">
                                <span className="text-sm font-medium">Track title</span>
                                <Input
                                  value={track.trackTitle}
                                  onChange={(event) => {
                                    const nextTrackTitle = event.currentTarget.value;
                                    setTracks((current) =>
                                      current.map((entry) =>
                                        entry.songId === track.songId
                                          ? { ...entry, trackTitle: nextTrackTitle }
                                          : entry,
                                      ),
                                    );
                                  }}
                                />
                              </label>

                              <label className="grid gap-2">
                                <span className="text-sm font-medium">Linked version</span>
                                <Select
                                  value={track.songVersionId ?? ""}
                                  onChange={(event) => {
                                    const nextSongVersionId = event.currentTarget.value || null;
                                    setTracks((current) =>
                                      current.map((entry) =>
                                        entry.songId === track.songId
                                          ? { ...entry, songVersionId: nextSongVersionId }
                                          : entry,
                                      ),
                                    );
                                  }}
                                >
                                  <option value="">Use latest available version</option>
                                  {availableVersions.map((entry) => (
                                    <option key={entry.id} value={entry.id}>
                                      {entry.version_label} · {entry.production_stage}
                                    </option>
                                  ))}
                                </Select>
                              </label>

                              <div className="flex items-end">
                                <Link to={`/library/songs/${track.songId}`} className="w-full">
                                  <Button variant="ghost" className="w-full">
                                    <FolderOpen className="size-4" />
                                    Open workspace
                                  </Button>
                                </Link>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </SortableContext>
                  </DndContext>
                ) : (
                  <div className="rounded-[22px] border border-white/[0.06] bg-white/[0.02] px-4 py-4 text-sm leading-7 text-muted-foreground">
                    No tracks selected. Add songs from your library above to keep editing this release.
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <div className="space-y-4">
              <div className="overflow-hidden rounded-[26px] border border-white/[0.08] bg-[radial-gradient(circle_at_top,rgba(157,92,255,0.22),rgba(255,255,255,0.02)_60%,rgba(255,255,255,0.01))] p-5">
                {selectedArtwork ? (
                  <ResolvedImage
                    src={getArtworkAssetUrls(selectedArtwork)}
                    alt={title || item.post.title}
                    className="mb-5 aspect-square w-full rounded-[22px] object-cover"
                  />
                ) : (
                  <div className="mb-5 flex aspect-square items-center justify-center rounded-[22px] border border-white/[0.08] bg-white/[0.03]">
                    <ImagePlus className="size-10 text-accent-secondary" />
                  </div>
                )}
                <Disc3 className="size-10 text-accent-secondary" />
                <p className="mt-4 font-display text-3xl tracking-[-0.03em]">{title.trim() || item.post.title}</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {item.post.post_type.toUpperCase()} · {item.post.visibility} · {releaseTrackCount} track{releaseTrackCount === 1 ? "" : "s"}
                </p>
              </div>

              <div className="rounded-[22px] border border-white/[0.06] bg-white/[0.02] px-4 py-4">
                <p className="text-xs uppercase tracking-[0.22em] text-accent-secondary/75">Readiness snapshot</p>
                <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                  <p>Track count: {releaseTrackCount}</p>
                  <p>Ready playback tracks: {readyTrackCount}/{releaseTrackCount}</p>
                  {isSinglePost ? (
                    <p>
                      {selectedSingleVersion
                        ? `Current version: ${selectedSingleVersion.version_label}`
                        : "No version linked yet."}
                    </p>
                  ) : null}
                  <p>{releaseUrl.trim() ? "External release link set." : "No external release link set."}</p>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-accent-secondary" />
                <p className="font-medium">Editing rules</p>
              </div>
              <div className="space-y-2 text-sm leading-7 text-muted-foreground">
                {isSinglePost ? (
                  <>
                    <p>Metadata updates happen in place on the existing single post.</p>
                    <p>Public singles still need a playback-ready preview for whichever version you choose.</p>
                    <p>Deep audio work remains inside the song workspace so the post editor stays focused on public-facing release details.</p>
                  </>
                ) : (
                  <>
                    <p>Changing order or mapped versions updates the release in place.</p>
                    <p>Every public track still needs a playback-ready version.</p>
                    <p>Deep audio work remains inside each song workspace so the release stays a thin orchestration layer.</p>
                  </>
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
