import { useMutation, useQuery } from "@tanstack/react-query";
import {
  ArrowUpRight,
  ExternalLink,
  FolderKanban,
  LibraryBig,
  Music2,
  Pencil,
  PlusCircle,
  Search,
  Trash2,
} from "lucide-react";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
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
import { listProjects } from "@/features/projects/api";
import { getCurrentProfile } from "@/features/profile/api";
import { useAppViewer } from "@/hooks/use-app-viewer";
import { needsVersionPlaybackRepair } from "@/lib/playback-health";
import { queryClient } from "@/lib/query-client";
import { readPersistentValue, writePersistentValue } from "@/lib/persistent-ui-state";
import type { Asset } from "@/types/domain";

const libraryTabs = ["songs", "versions", "posts", "projects", "assets"] as const;
type LibraryTab = (typeof libraryTabs)[number];
type LibraryHeaderMode = "quick-add" | "search";
const LIBRARY_TAB_STORAGE_KEY = "mxtrove:library:active-tab";

export function LibraryPage() {
  const viewer = useAppViewer();
  const navigate = useNavigate();
  const provider = useGoogleDriveProvider();
  const cloudUpload = useCloudUploadProvider(viewer.userId);
  const [activeTab, setActiveTab] = useState<LibraryTab>(() =>
    readPersistentValue(LIBRARY_TAB_STORAGE_KEY, libraryTabs, "songs"),
  );
  const [title, setTitle] = useState("");
  const [headerMode, setHeaderMode] = useState<LibraryHeaderMode>("quick-add");
  const deferredSearch = useDeferredValue(title.trim().toLowerCase());

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
  const projectsQuery = useQuery({
    queryKey: ["projects", viewer.userId],
    queryFn: () => listProjects(viewer.userId!),
    enabled: Boolean(viewer.userId) && (["projects", "assets"].includes(activeTab) || headerMode === "search"),
  });
  const profileQuery = useQuery({
    queryKey: ["current-profile", viewer.userId],
    queryFn: () => getCurrentProfile(viewer.userId),
    enabled: Boolean(viewer.userId) && activeTab === "assets",
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
      if (referenceSummary.sourceVersionCount > 0) {
        throw new Error(
          `This original is still required by ${referenceSummary.sourceVersionCount} song version${referenceSummary.sourceVersionCount === 1 ? "" : "s"}. Remap or delete those versions before removing their source file.`,
        );
      }

      // Nullable references are detached by the database before the provider file is removed.
      // This keeps posts valid even when cloud cleanup fails afterwards.
      await deleteAssetRecord(asset.id);

      let cloudCleanupWarning: string | null = null;
      try {
        const assetProvider = getCloudStorageProvider(asset.provider);
        if (!(await assetProvider.restoreSession())) {
          await assetProvider.connect(viewer.userId ?? undefined);
        }
        await assetProvider.deleteFile(asset.remote_file_id);
      } catch (error) {
        const message = error instanceof Error ? error.message.toLowerCase() : "";
        if (!message.includes("could not find") && !message.includes("not find")) {
          cloudCleanupWarning = "The MxTrove record was removed, but the provider file could not be deleted. You can remove that orphaned file directly in your cloud storage.";
        }
      }

      return { blockers, cloudCleanupWarning };
    },
    onSuccess: async ({ blockers, cloudCleanupWarning }) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["library", viewer.userId] }),
        queryClient.invalidateQueries({ queryKey: ["library-posts", viewer.userId] }),
        queryClient.invalidateQueries({ queryKey: ["post"] }),
        queryClient.invalidateQueries({ queryKey: ["home-feed"] }),
        queryClient.invalidateQueries({ queryKey: ["explore-feed"] }),
        queryClient.invalidateQueries({ queryKey: ["profile-posts"] }),
        queryClient.invalidateQueries({ queryKey: ["current-profile", viewer.userId] }),
        queryClient.invalidateQueries({ queryKey: ["projects", viewer.userId] }),
      ]);
      if (cloudCleanupWarning) {
        toast.warning(cloudCleanupWarning);
      } else if (blockers.length > 0) {
        toast.success("Asset deleted and linked surfaces updated.");
      } else {
        toast.success("Asset deleted.");
      }
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
  const projects = projectsQuery.data ?? [];
  const songsById = useMemo(() => new Map(songs.map((song) => [song.id, song])), [songs]);
  const postUsageByAssetId = useMemo(() => {
    const usage = new Map<string, Map<string, { id: string; title: string }>>();
    const addUsage = (assetId: string | null | undefined, postId: string, postTitle: string) => {
      if (!assetId) return;
      const linkedPosts = usage.get(assetId) ?? new Map<string, { id: string; title: string }>();
      linkedPosts.set(postId, { id: postId, title: postTitle });
      usage.set(assetId, linkedPosts);
    };

    posts.forEach((item) => {
      const postTitle = item.post.title;
      const postId = item.post.id;
      addUsage(item.post.artwork_asset_id, postId, postTitle);
      addUsage(item.artwork?.id, postId, postTitle);
      addUsage(item.single?.featuredVersion?.source_asset_id, postId, postTitle);
      addUsage(item.single?.featuredVersion?.preview_asset_id, postId, postTitle);
      addUsage(item.single?.previewAsset?.id, postId, postTitle);
      item.releaseTracks.forEach((track) => {
        addUsage(track.track.preview_asset_id, postId, postTitle);
        addUsage(track.previewAsset?.id, postId, postTitle);
        addUsage(track.version?.source_asset_id, postId, postTitle);
        addUsage(track.version?.preview_asset_id, postId, postTitle);
      });
    });

    return usage;
  }, [posts]);
  const privateUsageByAssetId = useMemo(() => {
    const usage = new Map<string, Map<string, { label: string; to: string }>>();
    const addUsage = (assetId: string | null | undefined, key: string, label: string, to: string) => {
      if (!assetId) return;
      const links = usage.get(assetId) ?? new Map<string, { label: string; to: string }>();
      links.set(key, { label, to });
      usage.set(assetId, links);
    };

    songs.forEach((song) => {
      addUsage(song.default_artwork_asset_id, `song-artwork:${song.id}`, `${song.title} · default artwork`, `/library/songs/${song.id}`);
    });
    versions.forEach((version) => {
      const songTitle = songsById.get(version.song_id)?.title ?? "Unknown song";
      const label = `${songTitle} · ${version.version_label}`;
      addUsage(version.source_asset_id, `version-source:${version.song_id}:${version.version_label}`, `${label} · source`, `/library/songs/${version.song_id}`);
      addUsage(version.preview_asset_id, `version-preview:${version.song_id}:${version.version_label}`, `${label} · preview`, `/library/songs/${version.song_id}`);
    });
    projects.forEach((item) => {
      addUsage(
        item.project.artwork_asset_id,
        `project:${item.project.id}`,
        `${item.project.title} · project artwork`,
        `/projects/${item.project.id}`,
      );
    });
    if (profileQuery.data?.avatar_asset_id) {
      addUsage(
        profileQuery.data.avatar_asset_id,
        `profile:${profileQuery.data.id}`,
        "Your public profile avatar",
        `/@${profileQuery.data.username}`,
      );
    }

    return usage;
  }, [profileQuery.data, projects, songs, songsById, versions]);
  const searchResults = useMemo(() => {
    if (headerMode !== "search" || !deferredSearch) return null;
    const matches = (...values: Array<string | null | undefined>) =>
      values.some((value) => value?.toLowerCase().includes(deferredSearch));

    return {
      songs: songs.filter((song) => matches(song.title, song.notes, song.lyrics, song.musical_key)),
      versions: versions.filter((version) => {
        const song = songsById.get(version.song_id);
        return matches(song?.title, version.version_label, version.production_stage, version.changelog);
      }),
      posts: posts.filter((item) => matches(item.post.title, item.post.description, item.post.post_type)),
      projects: projects.filter((item) => matches(item.project.title, item.project.description, item.project.status)),
      assets: assets.filter((asset) => matches(asset.display_name, asset.filename, asset.asset_type, asset.provider)),
    };
  }, [assets, deferredSearch, headerMode, posts, projects, songs, songsById, versions]);
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
      profileId: connectionQuery.data?.capabilities.profile_scoped_folders ? viewer.userId : null,
    });
  }, [connectionQuery.data?.provider_account_email, provider, storedDriveFolders, viewer.userId]);

  async function refreshDriveSetup() {
    if (!viewer.userId) {
      throw new Error("Please sign in first.");
    }

    const result = await provider.connect(viewer.userId);
    await upsertCloudConnection(buildCloudConnectionUpsert(viewer.userId, result));
    await queryClient.invalidateQueries({ queryKey: ["cloud-connection", viewer.userId] });
    return result.folders;
  }

  async function resolvePreviewFolderId() {
    const cachedFolders = provider.getCachedFolders(viewer.userId);
    const activeFolders = cachedFolders
      ?? ((await provider.restoreSession())
        ? await provider.ensureRootStructure(viewer.userId ?? undefined)
        : await refreshDriveSetup());
    return activeFolders.audioPreviewsFolderId;
  }

  function submitQuickAdd() {
    if (!createSongMutation.isPending && title.trim()) {
      void createSongMutation.mutateAsync();
    }
  }

  function selectLibraryTab(nextTab: LibraryTab) {
    setActiveTab(nextTab);
    writePersistentValue(LIBRARY_TAB_STORAGE_KEY, nextTab);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Private library"
        title="Your working archive"
        description="Songs stay private here until you deliberately publish a public single, EP, or album preview."
        actions={
          <form
            className="flex max-w-3xl flex-wrap items-center justify-end gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              if (headerMode === "quick-add") submitQuickAdd();
            }}
          >
            {repairPlan.length > 0 ? (
              <Button
                variant="secondary"
                type="button"
                onClick={() => void repairPlaybackMutation.mutateAsync()}
                disabled={repairPlaybackMutation.isPending}
              >
                Repair playback ({repairPlan.length})
              </Button>
            ) : null}
            <div className="inline-flex rounded-full border border-border bg-surface-soft p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]" aria-label="Library command mode">
              <button
                type="button"
                className={`relative flex size-10 items-center justify-center rounded-full transition-[background-color,color,box-shadow,transform] ${headerMode === "quick-add" ? "bg-accent text-white shadow-[0_8px_24px_rgba(var(--accent-rgb),0.28)]" : "text-muted-foreground hover:bg-surface hover:text-foreground"}`}
                onClick={() => {
                  setHeaderMode("quick-add");
                  setTitle("");
                }}
                aria-pressed={headerMode === "quick-add"}
                aria-label="Quick-add a song"
                title="Quick-add a song"
              >
                <PlusCircle className="size-[18px]" aria-hidden="true" />
              </button>
              <button
                type="button"
                className={`relative flex size-10 items-center justify-center rounded-full transition-[background-color,color,box-shadow,transform] ${headerMode === "search" ? "bg-accent text-white shadow-[0_8px_24px_rgba(var(--accent-rgb),0.28)]" : "text-muted-foreground hover:bg-surface hover:text-foreground"}`}
                onClick={() => {
                  setHeaderMode("search");
                  setTitle("");
                }}
                aria-pressed={headerMode === "search"}
                aria-label="Search your library"
                title="Search your library"
              >
                <Search className="size-[18px]" aria-hidden="true" />
              </button>
            </div>
            <Input
              placeholder={headerMode === "quick-add" ? "Quick-add a song" : "Search songs, versions, posts, projects, and assets"}
              value={title}
              onChange={(event) => setTitle(event.currentTarget.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && headerMode === "quick-add") {
                  event.preventDefault();
                  submitQuickAdd();
                }
              }}
              aria-label={headerMode === "quick-add" ? "Quick-add a song" : "Search the private library"}
              className="min-w-[min(100%,18rem)] flex-1"
            />
            <Button
              type={headerMode === "quick-add" ? "submit" : "button"}
              disabled={headerMode === "quick-add" ? createSongMutation.isPending || !title.trim() : !title.trim()}
              onClick={headerMode === "search"
                ? () => document.getElementById("library-search-results")?.scrollIntoView({ behavior: "smooth", block: "start" })
                : undefined}
            >
              {headerMode === "quick-add" ? <PlusCircle className="size-4" /> : <Search className="size-4" />}
              {headerMode === "quick-add" ? "Add & open" : "Search library"}
            </Button>
          </form>
        }
      />

      <Tabs
        value={activeTab}
        onValueChange={(nextTab) => {
          if (!libraryTabs.includes(nextTab as LibraryTab)) return;
          selectLibraryTab(nextTab as LibraryTab);
          setHeaderMode("quick-add");
          setTitle("");
        }}
        wrap
        items={[
          { value: "songs", label: `Songs (${songs.length})` },
          { value: "versions", label: `Versions (${versions.length})` },
          { value: "posts", label: `Posts (${posts.length})` },
          { value: "projects", label: "Projects" },
          { value: "assets", label: `Assets (${assets.length})` },
        ]}
      />

      {headerMode === "search" ? (
        !deferredSearch ? (
          <EmptyState
            icon={Search}
            title="Search your entire private library"
            description="Find songs, versions, posts, collaboration projects, and cloud assets from one place."
          />
        ) : searchResults ? (
          <div id="library-search-results" className="scroll-mt-28 space-y-5" aria-live="polite">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                {Object.values(searchResults).reduce((total, entries) => total + entries.length, 0)} result{Object.values(searchResults).reduce((total, entries) => total + entries.length, 0) === 1 ? "" : "s"} for “{title.trim()}”
              </p>
              <Button variant="ghost" size="sm" onClick={() => setTitle("")}>Clear search</Button>
            </div>
            {searchResults.songs.map((song) => (
              <Link key={`song:${song.id}`} to={`/library/songs/${song.id}`} className="block">
                <Card className="transition-colors hover:border-accent/35">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0"><Badge variant="cyan">Song</Badge><p className="mt-2 truncate font-medium">{song.title}</p><p className="mt-1 truncate text-sm text-muted-foreground">{song.notes || "Private song workspace"}</p></div>
                    <ArrowUpRight className="size-5 shrink-0 text-accent-secondary" />
                  </div>
                </Card>
              </Link>
            ))}
            {searchResults.versions.map((version) => (
              <Link key={`version:${version.id}`} to={`/library/songs/${version.song_id}`} className="block">
                <Card className="transition-colors hover:border-accent/35">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0"><Badge variant="neutral">Version</Badge><p className="mt-2 truncate font-medium">{songsById.get(version.song_id)?.title ?? "Unknown song"} · {version.version_label}</p><p className="mt-1 truncate text-sm text-muted-foreground">Version {version.version_number} · {version.production_stage}{version.changelog ? ` · ${version.changelog}` : ""}</p></div>
                    <ArrowUpRight className="size-5 shrink-0 text-accent-secondary" />
                  </div>
                </Card>
              </Link>
            ))}
            {searchResults.posts.map((item) => (
              <Link key={`post:${item.post.id}`} to={`/post/${item.post.id}`} className="block">
                <Card className="transition-colors hover:border-accent/35"><div className="flex items-center justify-between gap-4"><div className="min-w-0"><Badge variant="accent">Post</Badge><p className="mt-2 truncate font-medium">{item.post.title}</p><p className="mt-1 truncate text-sm text-muted-foreground">{item.post.post_type} · {item.post.visibility}</p></div><ArrowUpRight className="size-5 shrink-0 text-accent-secondary" /></div></Card>
              </Link>
            ))}
            {searchResults.projects.map((item) => (
              <Link key={`project:${item.project.id}`} to={`/projects/${item.project.id}`} className="block">
                <Card className="transition-colors hover:border-accent/35"><div className="flex items-center justify-between gap-4"><div className="min-w-0"><Badge variant="warning">Project</Badge><p className="mt-2 truncate font-medium">{item.project.title}</p><p className="mt-1 truncate text-sm text-muted-foreground">{item.project.project_type.replace("_", " ")} · {item.project.status}</p></div><ArrowUpRight className="size-5 shrink-0 text-accent-secondary" /></div></Card>
              </Link>
            ))}
            {searchResults.assets.map((asset) => (
              <button
                key={`asset:${asset.id}`}
                type="button"
                className="block w-full text-left"
                onClick={() => {
                  selectLibraryTab("assets");
                  setHeaderMode("quick-add");
                  setTitle("");
                  window.setTimeout(() => document.getElementById(`asset-${asset.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 0);
                }}
              >
                <Card className="transition-colors hover:border-accent/35"><div className="flex items-center justify-between gap-4"><div className="min-w-0"><Badge variant="neutral">Asset</Badge><p className="mt-2 truncate font-medium">{asset.display_name ?? asset.filename}</p><p className="mt-1 truncate text-sm text-muted-foreground">{asset.asset_type} · {asset.provider.replace("_", " ")}</p></div><ArrowUpRight className="size-5 shrink-0 text-accent-secondary" /></div></Card>
              </button>
            ))}
            {Object.values(searchResults).every((entries) => entries.length === 0) ? (
              <EmptyState icon={Search} title="Nothing matched" description="Try part of a title, filename, version label, stage, or project name." />
            ) : null}
          </div>
        ) : null
      ) : null}

      {headerMode === "quick-add" && activeTab === "songs" ? (
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

      {headerMode === "quick-add" && activeTab === "songs" ? (
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

      {headerMode === "quick-add" && activeTab === "versions" ? (
        versions.length ? (
          <div className="grid gap-4 xl:grid-cols-2">
            {versions.map((version) => {
              const song = songsById.get(version.song_id);
              const sourceAsset = assetsById.get(version.source_asset_id);
              const previewAsset = version.preview_asset_id ? assetsById.get(version.preview_asset_id) : null;
              return (
                <Card key={version.id}>
                  <div className="flex h-full flex-col gap-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-xs uppercase tracking-[0.2em] text-accent-secondary/80">{song?.title ?? "Unknown song"}</p>
                        <CardTitle className="mt-2 break-words">{version.version_label}</CardTitle>
                        <p className="mt-2 text-sm text-muted-foreground">
                          Version {version.version_number} · {version.production_stage}
                        </p>
                      </div>
                      <Badge variant={version.is_published ? "success" : "neutral"}>
                        {version.is_published ? "Published" : "Private"}
                      </Badge>
                    </div>
                    <div className="grid gap-3 rounded-[20px] border border-border bg-surface-soft p-4 text-sm sm:grid-cols-2">
                      <div className="min-w-0">
                        <p className="text-xs uppercase tracking-[0.16em] text-subtle-foreground">Source</p>
                        <p className="mt-1 truncate text-muted-foreground" title={sourceAsset?.filename}>{sourceAsset?.display_name ?? sourceAsset?.filename ?? "Missing source asset"}</p>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs uppercase tracking-[0.16em] text-subtle-foreground">Playback</p>
                        <p className="mt-1 truncate text-muted-foreground" title={previewAsset?.filename}>{previewAsset?.display_name ?? previewAsset?.filename ?? "No preview attached"}</p>
                      </div>
                    </div>
                    {version.changelog ? <p className="text-sm leading-6 text-muted-foreground">{version.changelog}</p> : null}
                    <Link to={`/library/songs/${version.song_id}`} className="mt-auto self-start">
                      <Button variant="secondary">
                        Open {song?.title ?? "song"} workspace
                        <ArrowUpRight className="size-4" />
                      </Button>
                    </Link>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <EmptyState icon={LibraryBig} title="No versions yet" description="Open a song workspace to turn an uploaded asset into a labeled version." />
        )
      ) : null}

      {headerMode === "quick-add" && activeTab === "posts" ? (
        posts.length ? (
          <div className="space-y-4">
            {posts.map((item) => {
              const editPath = `/post/${item.post.id}/edit`;

              return (
                <Card key={item.post.id}>
                  <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_max-content] lg:items-center">
                    <div className="min-w-0 space-y-2">
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

                    <div className="flex flex-nowrap items-center justify-start gap-2 lg:justify-end">
                      <Link to={`/post/${item.post.id}`}>
                        <Button variant="secondary" className="whitespace-nowrap">
                          <ExternalLink className="size-4" />
                          <span className="hidden min-[420px]:inline">Open post</span>
                        </Button>
                      </Link>
                      <Link to={editPath}>
                        <Button variant="ghost" className="whitespace-nowrap">
                          <Pencil className="size-4" />
                          <span className="hidden min-[420px]:inline">
                            {item.post.post_type === "single" ? "Edit post" : "Edit release"}
                          </span>
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        className="whitespace-nowrap"
                        onClick={() => {
                          if (!window.confirm(`Delete the post "${item.post.title}"?`)) {
                            return;
                          }

                          void deletePostMutation.mutateAsync(item.post.id);
                        }}
                        disabled={deletePostMutation.isPending}
                      >
                        <Trash2 className="size-4" />
                        <span className="hidden min-[420px]:inline">Delete</span>
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

      {headerMode === "quick-add" && activeTab === "projects" ? (
        projects.length ? (
          <div className="grid gap-4 xl:grid-cols-2">
            {projects.map((item) => (
              <Link key={item.project.id} to={`/projects/${item.project.id}`} className="group">
                <Card className="h-full transition-[transform,border-color] group-hover:-translate-y-0.5 group-hover:border-accent/35">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex size-12 shrink-0 items-center justify-center rounded-[18px] border border-accent/20 bg-accent/12 text-accent-secondary"><FolderKanban className="size-5" /></div>
                    <div className="flex flex-wrap justify-end gap-2"><Badge variant="accent">{item.project.project_type.replace("_", " ")}</Badge><Badge variant="neutral">{item.viewerRole}</Badge></div>
                  </div>
                  <CardTitle className="mt-5">{item.project.title}</CardTitle>
                  <CardDescription className="mt-2 line-clamp-2 min-h-10">{item.project.description || "Private collaboration room"}</CardDescription>
                  <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-border pt-4 text-xs text-muted-foreground">
                    <span>{item.members.length} member{item.members.length === 1 ? "" : "s"}</span>
                    <span>·</span>
                    <span>{item.openFeedbackCount} open feedback</span>
                    <span>·</span>
                    <span>{item.project.status}</span>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        ) : projectsQuery.isPending ? (
          <Card><p className="text-sm text-muted-foreground">Loading collaboration projects…</p></Card>
        ) : (
          <EmptyState
            icon={FolderKanban}
            title="No collaboration projects yet"
            description="Projects are private collaboration rooms created from the Projects screen. Publishing a release does not create one automatically."
            actionLabel="Create a project"
            onAction={() => navigate("/projects/new")}
          />
        )
      ) : null}

      {headerMode === "quick-add" && activeTab === "assets" ? (
        assets.length ? (
          <div className="space-y-4">
            {assets.map((asset) => {
              const linkedPosts = [...(postUsageByAssetId.get(asset.id)?.values() ?? [])];
              const privateLinks = [...(privateUsageByAssetId.get(asset.id)?.values() ?? [])];
              const isReferenced = linkedPosts.length > 0 || privateLinks.length > 0;
              const isRequiredSource = versions.some((version) => version.source_asset_id === asset.id);
              return (
              <Card key={asset.id} className="scroll-mt-28" >
                <div id={`asset-${asset.id}`} className="absolute -top-28" aria-hidden="true" />
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <p className="font-medium">{asset.display_name ?? asset.filename}</p>
                    <p className="text-sm text-muted-foreground">
                      {asset.asset_type} · {asset.file_extension} · {asset.access_mode}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <Badge variant={linkedPosts.length ? "success" : privateLinks.length ? "warning" : "neutral"}>
                        {linkedPosts.length
                          ? `Used by ${linkedPosts.length} post${linkedPosts.length === 1 ? "" : "s"}`
                          : privateLinks.length
                            ? "Used in your private library"
                            : "Unused"}
                      </Badge>
                    </div>
                    {linkedPosts.length || privateLinks.length ? (
                      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs">
                        {linkedPosts.map((post) => (
                          <Link key={post.id} to={`/post/${post.id}`} className="inline-flex min-w-0 items-center gap-1.5 text-accent-secondary underline decoration-accent/30 underline-offset-4 hover:decoration-accent-secondary">
                            <span className="max-w-72 truncate">{post.title}</span><ArrowUpRight className="size-3.5 shrink-0" />
                          </Link>
                        ))}
                        {privateLinks.map((usage) => (
                          <Link key={`${usage.to}:${usage.label}`} to={usage.to} className="inline-flex min-w-0 items-center gap-1.5 text-muted-foreground underline decoration-border-strong underline-offset-4 hover:text-foreground">
                            <span className="max-w-72 truncate">{usage.label}</span><ArrowUpRight className="size-3.5 shrink-0" />
                          </Link>
                        ))}
                      </div>
                    ) : null}
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
                              await assetProvider.connect(viewer.userId ?? undefined);
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
                        if (isRequiredSource) {
                          toast.error("This original is still the required source of a song version. Remap or delete that version before removing the file.");
                          return;
                        }
                        const impact = isReferenced
                          ? " This removes the asset from every linked post and private surface. Artwork may disappear and playback previews may become unavailable."
                          : "";
                        if (!window.confirm(`Delete the asset "${asset.display_name ?? asset.filename}"?${impact}`)) {
                          return;
                        }

                        void deleteAssetMutation.mutateAsync(asset);
                      }}
                      disabled={deleteAssetMutation.isPending}
                      title={isRequiredSource ? "Original source files remain protected while a song version depends on them." : isReferenced ? "Linked nullable references will be removed automatically after confirmation." : undefined}
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
            title="No assets yet"
            description="Audio, artwork, and avatars connected to your account will appear here."
          />
        )
      ) : null}
    </div>
  );
}
