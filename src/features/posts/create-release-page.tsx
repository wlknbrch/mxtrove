import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, Disc3, FolderOpen, GripVertical, PlusCircle, ShieldCheck } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Tabs } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { createSong, getLibraryDashboard } from "@/features/library/api";
import { createReleasePost } from "@/features/posts/api";
import { useAppViewer } from "@/hooks/use-app-viewer";
import { queryClient } from "@/lib/query-client";
import type { SongVersion } from "@/types/domain";

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
  const [postType, setPostType] = useState<"ep" | "album">(kind);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [releaseUrl, setReleaseUrl] = useState("");
  const [visibility, setVisibility] = useState<"private" | "public">("public");
  const [selectedSongIds, setSelectedSongIds] = useState<string[]>([]);
  const [quickSongTitle, setQuickSongTitle] = useState("");
  const sensors = useSensors(useSensor(PointerSensor));

  useEffect(() => {
    setPostType(kind);
  }, [kind]);

  const libraryQuery = useQuery({
    queryKey: ["library", viewer.userId],
    queryFn: () => getLibraryDashboard(viewer.userId!),
    enabled: Boolean(viewer.userId),
  });

  const songs = libraryQuery.data?.songs ?? [];
  const versions = libraryQuery.data?.versions ?? [];
  const selectedSongs = useMemo(
    () =>
      selectedSongIds
        .map((songId) => songs.find((song) => song.id === songId))
        .filter(Boolean),
    [selectedSongIds, songs],
  );

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

      await createReleasePost({
        ownerId: viewer.userId,
        postType,
        title: title.trim(),
        description: description.trim(),
        releaseUrl: releaseUrl.trim() || undefined,
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
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["explore-feed"] }),
        queryClient.invalidateQueries({ queryKey: ["home-feed"] }),
      ]);
      toast.success(`${postType.toUpperCase()} created.`);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not create release.");
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
            </div>
            <label className="mt-5 grid gap-2">
              <span className="text-sm font-medium">Description</span>
              <Textarea value={description} onChange={(event) => setDescription(event.currentTarget.value)} />
            </label>
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
              <div className="overflow-hidden rounded-[26px] border border-white/[0.08] bg-[radial-gradient(circle_at_top,rgba(157,92,255,0.22),rgba(255,255,255,0.02)_60%,rgba(255,255,255,0.01))] p-5">
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
