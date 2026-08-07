import { useMutation, useQuery } from "@tanstack/react-query";
import { ExternalLink, Music2, PlusCircle, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Tabs } from "@/components/ui/tabs";
import { getCloudStorageProvider } from "@/features/cloud-providers/provider-registry";
import { useCloudUploadProvider } from "@/features/cloud-providers/use-cloud-upload-provider";
import {
  getCloudConnection,
  deleteAssetRecord,
  getAssetDeletionBlockers,
  getAssetReferenceSummary,
  upsertCloudConnection,
} from "@/features/drive/api";
import { UploadDropzone } from "@/features/drive/components/upload-dropzone";
import { buildCloudConnectionUpsert, getStoredDriveFolders } from "@/features/drive/google-drive-connection";
import { useGoogleDriveProvider } from "@/features/drive/use-google-drive-provider";
import { createSong, deleteSong, getLibraryDashboard, updateSongVersionPreview } from "@/features/library/api";
import {
  generateAutomaticPreviewFromSourceAsset,
  uploadOriginalWithAutomaticPreview,
} from "@/features/media-processing/automatic-preview";
import { deletePost, listResolvedPosts } from "@/features/posts/api";
import { useAppViewer } from "@/hooks/use-app-viewer";
import { needsVersionPlaybackRepair } from "@/lib/playback-health";
import { queryClient } from "@/lib/query-client";
import type { Asset } from "@/types/domain";

function formatDeletionBlockers(blockers: string[]) {
  if (blockers.length === 1) {
    return blockers[0];
  }

  if (blockers.length === 2) {
    return `${blockers[0]} and ${blockers[1]}`;
  }

  return `${blockers.slice(0, -1).join(", ")}, and ${blockers.at(-1)}`;
}

export function LibraryPage() {
  const viewer = useAppViewer();
  const navigate = useNavigate();
  const provider = useGoogleDriveProvider();
  const cloudUpload = useCloudUploadProvider(viewer.userId);
  const [activeTab, setActiveTab] = useState("songs");
  const [title, setTitle] = useState("");

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
  const postsQuery = useQuery({
    queryKey: ["library-posts", viewer.userId],
    queryFn: () =>
      listResolvedPosts({
        ownerId: viewer.userId!,
        viewerId: viewer.userId,
      }),
    enabled: Boolean(viewer.userId),
  });

  const createSongMutation = useMutation({
    mutationFn: async () => {
      if (!viewer.userId || !title.trim()) {
        throw new Error("Add a song title first.");
      }

      return createSong(viewer.userId, {
        title: title.trim(),
        notes: "",
        default_artwork_asset_id: null,
      });
    },
    onSuccess: async (song) => {
      await queryClient.invalidateQueries({ queryKey: ["library", viewer.userId] });
      setTitle("");
      toast.success("Song created. Open the workspace to add files and versions.");
      navigate(`/library/songs/${song.id}`);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not create song.");
    },
  });

  const uploadSongMutation = useMutation({
    mutationFn: async ({
      file,
      signal,
      onProgress,
    }: {
      file: File;
      signal?: AbortSignal;
      onProgress?: (progress: number) => void;
    }) => {
      if (!viewer.userId) {
        throw new Error("Please sign in first.");
      }
      if (!cloudUpload.connection) {
        throw new Error("Connect a cloud provider before dropping an audio file into the library.");
      }

      const filenameWithoutExtension = file.name.replace(/\.[^.]+$/, "").trim();
      const song = await createSong(viewer.userId, {
        title: filenameWithoutExtension || "Untitled song",
        notes: "",
        default_artwork_asset_id: null,
      });

      try {
        const folders = await cloudUpload.ensureFolders();
        const result = await uploadOriginalWithAutomaticPreview({
          ownerId: viewer.userId,
          provider: cloudUpload.provider,
          originalFile: file,
          songId: song.id,
          originalsFolderId: folders.audioOriginalsFolderId,
          previewsFolderId: folders.audioPreviewsFolderId,
          signal,
          onProgress,
        });

        return { song, result };
      } catch (error) {
        await queryClient.invalidateQueries({ queryKey: ["library", viewer.userId] });
        navigate(`/library/songs/${song.id}`);
        throw new Error(
          `The song workspace was created, but the audio upload did not finish. ${error instanceof Error ? error.message : "Retry the upload in the workspace."}`,
        );
      }
    },
    onSuccess: async ({ song, result }) => {
      await queryClient.invalidateQueries({ queryKey: ["library", viewer.userId] });
      if (result.automationError) {
        toast.warning("Song added. The original is safe, but preview generation still needs attention.");
      } else {
        toast.success("Song and audio assets added. Set up the first version in the workspace.");
      }
      navigate(`/library/songs/${song.id}`, {
        state: {
          uploadedSourceAssetId: result.originalAsset.id,
          uploadedPreviewAssetId: result.previewAsset?.id ?? null,
        },
      });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not add this audio file.");
    },
  });

  const deleteAssetMutation = useMutation({
    mutationFn: async (asset: Asset) => {
      const referenceSummary = await getAssetReferenceSummary(asset.id);
      const blockers = getAssetDeletionBlockers(referenceSummary);
      if (blockers.length > 0) {
        throw new Error(`This asset is still linked to ${formatDeletionBlockers(blockers)}.`);
      }

      try {
        const assetProvider = getCloudStorageProvider(asset.provider);
        if (!(await assetProvider.restoreSession())) {
          await assetProvider.connect();
        }
        await assetProvider.deleteFile(asset.remote_file_id);
      } catch (error) {
        const message = error instanceof Error ? error.message.toLowerCase() : "";
        if (!message.includes("could not find") && !message.includes("not find")) {
          throw error;
        }
      }

      await deleteAssetRecord(asset.id);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["library", viewer.userId] }),
        queryClient.invalidateQueries({ queryKey: ["post"] }),
        queryClient.invalidateQueries({ queryKey: ["home-feed"] }),
        queryClient.invalidateQueries({ queryKey: ["explore-feed"] }),
      ]);
      toast.success("Asset deleted.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not delete this asset.");
    },
  });

  const deletePostMutation = useMutation({
    mutationFn: async (postId: string) => {
      await deletePost(postId);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["library-posts", viewer.userId] }),
        queryClient.invalidateQueries({ queryKey: ["post"] }),
        queryClient.invalidateQueries({ queryKey: ["home-feed"] }),
        queryClient.invalidateQueries({ queryKey: ["explore-feed"] }),
        queryClient.invalidateQueries({ queryKey: ["profile-posts"] }),
      ]);
      toast.success("Post deleted.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not delete this post.");
    },
  });
  const deleteSongMutation = useMutation({
    mutationFn: async (songId: string) => {
      await deleteSong(songId);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["library", viewer.userId] }),
        queryClient.invalidateQueries({ queryKey: ["song-detail"] }),
      ]);
      toast.success("Song deleted.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not delete this song.");
    },
  });
  const repairPlaybackMutation = useMutation({
    mutationFn: async () => {
      if (!viewer.userId) {
        throw new Error("Please sign in first.");
      }
      if (repairPlan.length === 0) {
        throw new Error("No songs need playback or waveform repair right now.");
      }

      const previewFolderId = await resolvePreviewFolderId();

      for (const plan of repairPlan) {
        const result = await generateAutomaticPreviewFromSourceAsset({
          ownerId: viewer.userId,
          provider,
          sourceAsset: plan.sourceAsset,
          songId: plan.songId,
          previewFolderId,
        });

        await Promise.all(
          plan.versionIds.map((versionId) =>
            updateSongVersionPreview({
              versionId,
              previewAssetId: result.previewAsset.id,
            }),
          ),
        );
      }
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["library", viewer.userId] }),
        queryClient.invalidateQueries({ queryKey: ["library-posts", viewer.userId] }),
        queryClient.invalidateQueries({ queryKey: ["post"] }),
        queryClient.invalidateQueries({ queryKey: ["home-feed"] }),
        queryClient.invalidateQueries({ queryKey: ["explore-feed"] }),
        queryClient.invalidateQueries({ queryKey: ["profile-posts"] }),
      ]);
      toast.success("Playback files and waveforms repaired for the affected songs.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not repair the affected songs.");
    },
  });

  const songs = libraryQuery.data?.songs ?? [];
  const versions = libraryQuery.data?.versions ?? [];
  const assets = libraryQuery.data?.assets ?? [];
  const posts = postsQuery.data ?? [];
  const storedDriveFolders = getStoredDriveFolders(connectionQuery.data);
  const assetsById = useMemo(
    () => new Map(assets.map((asset) => [asset.id, asset])),
    [assets],
  );
  const repairPlan = useMemo(() => {
    const plans = new Map<
      string,
      {
        sourceAsset: Asset;
        songId: string;
        versionIds: string[];
      }
    >();

    versions.forEach((version) => {
      if (!version.preview_asset_id) {
        return;
      }

      if (!needsVersionPlaybackRepair(version, assetsById)) {
        return;
      }

      const sourceAsset = assetsById.get(version.source_asset_id) ?? null;
      if (!sourceAsset || sourceAsset.asset_type !== "audio_original") {
        return;
      }

      const existing = plans.get(sourceAsset.id);
      if (existing) {
        existing.versionIds.push(version.id);
        return;
      }

      plans.set(sourceAsset.id, {
        sourceAsset,
        songId: version.song_id,
        versionIds: [version.id],
      });
    });

    return [...plans.values()];
  }, [assetsById, versions]);

  useEffect(() => {
    provider.hydrateConnection({
      email: connectionQuery.data?.provider_account_email ?? null,
      folders: storedDriveFolders,
    });
  }, [connectionQuery.data?.provider_account_email, provider, storedDriveFolders]);

  async function refreshDriveSetup() {
    if (!viewer.userId) {
      throw new Error("Please sign in first.");
    }

    const result = await provider.connect();
    await upsertCloudConnection(buildCloudConnectionUpsert(viewer.userId, result));
    await queryClient.invalidateQueries({ queryKey: ["cloud-connection", viewer.userId] });
    return result.folders;
  }

  async function resolvePreviewFolderId() {
    const cachedFolders = provider.getCachedFolders();
    const activeFolders = cachedFolders ?? storedDriveFolders ?? (await refreshDriveSetup());
    return activeFolders.audioPreviewsFolderId;
  }

  function submitQuickAdd() {
    if (!createSongMutation.isPending && title.trim()) {
      void createSongMutation.mutateAsync();
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Private library"
        title="Your working archive"
        description="Songs stay private here until you deliberately publish a public single, EP, or album preview."
        actions={
          <form
            className="flex flex-wrap items-center gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              submitQuickAdd();
            }}
          >
            <Button
              variant="secondary"
              type="button"
              onClick={() => void repairPlaybackMutation.mutateAsync()}
              disabled={repairPlaybackMutation.isPending || repairPlan.length === 0}
            >
              Repair playback{repairPlan.length > 0 ? ` (${repairPlan.length})` : ""}
            </Button>
            <Input
              placeholder="Quick-add a song"
              value={title}
              onChange={(event) => setTitle(event.currentTarget.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  submitQuickAdd();
                }
              }}
              aria-label="Quick-add a song"
            />
            <Button type="submit" disabled={createSongMutation.isPending || !title.trim()}>
              <PlusCircle className="size-4" />
              Add & open
            </Button>
          </form>
        }
      />

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        wrap
        items={[
          { value: "songs", label: `Songs (${songs.length})` },
          { value: "versions", label: `Versions (${versions.length})` },
          { value: "posts", label: `Posts (${posts.length})` },
          { value: "projects", label: "Projects" },
          { value: "assets", label: `Assets (${assets.length})` },
        ]}
      />

      {activeTab === "songs" ? (
        <UploadDropzone
          compact
          multiple
          parentFolderId={cloudUpload.storedFolders?.audioOriginalsFolderId ?? "library-drop"}
          disabled={!cloudUpload.connection || uploadSongMutation.isPending}
          onMultipleFiles={(files) => navigate("/library/import", { state: { files } })}
          onUpload={async (input) => {
            const { result } = await uploadSongMutation.mutateAsync({
              file: input.file,
              signal: input.signal,
              onProgress: input.onProgress,
            });
            return {
              fileId: result.originalAsset.remote_file_id,
              filename: result.originalAsset.filename,
              mimeType: result.originalAsset.mime_type,
              bytes: result.originalAsset.bytes ?? input.file.size,
              parentFolderId: result.originalAsset.remote_parent_folder_id ?? input.parentFolderId,
              shareUrl: result.originalAsset.share_url,
              viewUrl: result.originalAsset.view_url,
              thumbnailUrl: result.originalAsset.thumbnail_url,
            };
          }}
        />
      ) : null}

      {activeTab === "songs" ? (
        songs.length ? (
          <div className="grid gap-5 xl:grid-cols-2">
            {songs.map((song) => {
              const songVersions = versions.filter((version) => version.song_id === song.id);
              const latestVersion =
                songVersions
                  .slice()
                  .sort((left, right) => right.version_number - left.version_number)[0] ?? null;
              const hasReadyPlayback = latestVersion ? !needsVersionPlaybackRepair(latestVersion, assetsById) : false;
              const needsRepair = songVersions.some(
                (version) => Boolean(version.preview_asset_id) && needsVersionPlaybackRepair(version, assetsById),
              );

              return (
                <Card key={song.id}>
                  <CardHeader>
                    <div>
                      <CardTitle>{song.title}</CardTitle>
                      <CardDescription className="mt-2">
                        {song.notes || "No private notes yet. Open the workspace to upload the original, generate the preview, attach artwork, and build versions."}
                      </CardDescription>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="neutral">{songVersions.length} versions</Badge>
                      <Badge variant={hasReadyPlayback ? "success" : "warning"}>
                        {hasReadyPlayback ? "Ready" : needsRepair ? "Needs repair" : "Needs setup"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <div className="space-y-3">
                    {songVersions.length ? (
                      songVersions.slice(0, 3).map((version) => (
                        <div
                          key={version.id}
                          className="flex items-center justify-between rounded-[18px] border border-border bg-white/3 px-4 py-3"
                        >
                          <div>
                            <p className="font-medium">{version.version_label}</p>
                            <p className="text-sm text-muted-foreground">{version.production_stage}</p>
                          </div>
                          <Link to={`/library/songs/${song.id}`}>
                            <Button variant="ghost">Open workspace</Button>
                          </Link>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-[18px] border border-border bg-white/3 px-4 py-4 text-sm leading-7 text-muted-foreground">
                        This song is still an empty shell. Add the original file, let the worker generate the public preview, and attach artwork in the song workspace before using it in a release.
                      </div>
                    )}
                    <div className="flex flex-wrap gap-3">
                      <Link to={`/library/songs/${song.id}`}>
                        <Button variant="secondary">Edit song and upload files</Button>
                      </Link>
                      <Button
                        variant="ghost"
                        onClick={() => {
                          if (!window.confirm(`Delete the song "${song.title}" and its private workspace?`)) {
                            return;
                          }

                          void deleteSongMutation.mutateAsync(song.id);
                        }}
                        disabled={deleteSongMutation.isPending}
                      >
                        <Trash2 className="size-4" />
                        Delete song
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon={Music2}
            title="No songs in the library yet"
            description="Create a private song first, then add versions, previews, artwork, and release plans."
          />
        )
      ) : null}

      {activeTab === "versions" ? (
        <div className="space-y-4">
          {versions.map((version) => (
            <Card key={version.id}>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium">{version.version_label}</p>
                  <p className="text-sm text-muted-foreground">{version.changelog || version.production_stage}</p>
                </div>
                <Badge variant={version.is_published ? "success" : "neutral"}>
                  {version.is_published ? "Published" : "Private"}
                </Badge>
              </div>
            </Card>
          ))}
        </div>
      ) : null}

      {activeTab === "posts" ? (
        posts.length ? (
          <div className="space-y-4">
            {posts.map((item) => {
              const editPath = `/post/${item.post.id}/edit`;

              return (
                <Card key={item.post.id}>
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <CardTitle>{item.post.title}</CardTitle>
                        <Badge variant={item.post.visibility === "public" ? "accent" : "neutral"}>
                          {item.post.visibility}
                        </Badge>
                        <Badge variant="cyan">{item.post.post_type}</Badge>
                      </div>
                      <CardDescription>
                        {item.post.description || "No post description yet."}
                      </CardDescription>
                      <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                        <span>{item.heartCount} hearts</span>
                        <span>{item.commentCount} comments</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <Link to={`/post/${item.post.id}`}>
                        <Button variant="secondary">
                          <ExternalLink className="size-4" />
                          Open post
                        </Button>
                      </Link>
                      <Link to={editPath}>
                        <Button variant="ghost">
                          {item.post.post_type === "single" ? "Edit post" : "Edit release"}
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        onClick={() => {
                          if (!window.confirm(`Delete the post "${item.post.title}"?`)) {
                            return;
                          }

                          void deletePostMutation.mutateAsync(item.post.id);
                        }}
                        disabled={deletePostMutation.isPending}
                      >
                        <Trash2 className="size-4" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon={Music2}
            title="No posts yet"
            description="Your private drafts and public releases will appear here once you publish or save them."
          />
        )
      ) : null}

      {activeTab === "projects" ? (
        <Card>
          <CardTitle>Projects</CardTitle>
          <CardDescription className="mt-3">
            Release projects are created from the Create EP / Album routes and then appear here as reusable working sets.
          </CardDescription>
        </Card>
      ) : null}

      {activeTab === "assets" ? (
        assets.length ? (
          <div className="space-y-4">
            {assets.map((asset) => (
              <Card key={asset.id}>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="font-medium">{asset.display_name ?? asset.filename}</p>
                    <p className="text-sm text-muted-foreground">
                      {asset.asset_type} · {asset.file_extension} · {asset.access_mode}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Badge variant={asset.access_mode === "public" ? "accent" : "neutral"}>
                      {asset.access_mode}
                    </Badge>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        void (async () => {
                          try {
                            const assetProvider = getCloudStorageProvider(asset.provider);
                            if (!(await assetProvider.restoreSession())) {
                              await assetProvider.connect();
                            }
                            const url = asset.view_url ?? await assetProvider.getViewUrl(asset.remote_file_id);
                            if (!url) throw new Error("This provider did not return a file view URL.");
                            window.open(url, "_blank", "noopener,noreferrer");
                          } catch (error) {
                            toast.error(error instanceof Error ? error.message : "Could not open this cloud asset.");
                          }
                        })();
                      }}
                    >
                      <ExternalLink className="size-4" />
                      Open in {asset.provider === "google_drive" ? "Drive" : asset.provider === "dropbox" ? "Dropbox" : "OneDrive"}
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        if (!window.confirm(`Delete the asset "${asset.display_name ?? asset.filename}"?`)) {
                          return;
                        }

                        void deleteAssetMutation.mutateAsync(asset);
                      }}
                      disabled={deleteAssetMutation.isPending}
                    >
                      <Trash2 className="size-4" />
                      Delete
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Music2}
            title="No assets yet"
            description="Audio, artwork, and avatars connected to your account will appear here."
          />
        )
      ) : null}
    </div>
  );
}
