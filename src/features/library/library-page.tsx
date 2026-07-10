import { useMutation, useQuery } from "@tanstack/react-query";
import { Music2, PlusCircle } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Tabs } from "@/components/ui/tabs";
import { useAppViewer } from "@/hooks/use-app-viewer";
import { queryClient } from "@/lib/query-client";

import { createSong, getLibraryDashboard } from "@/features/library/api";

export function LibraryPage() {
  const viewer = useAppViewer();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("songs");
  const [title, setTitle] = useState("");

  const libraryQuery = useQuery({
    queryKey: ["library", viewer.userId],
    queryFn: () => getLibraryDashboard(viewer.userId!),
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

  const songs = libraryQuery.data?.songs ?? [];
  const versions = libraryQuery.data?.versions ?? [];
  const assets = libraryQuery.data?.assets ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Private library"
        title="Your working archive"
        description="Songs stay private here until you deliberately publish a public single, EP, or album preview."
        actions={
          <div className="flex items-center gap-3">
            <Input
              placeholder="Quick-add a song"
              value={title}
              onChange={(event) => setTitle(event.currentTarget.value)}
            />
            <Button onClick={() => void createSongMutation.mutateAsync()}>
              <PlusCircle className="size-4" />
              Add & open
            </Button>
          </div>
        }
      />

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        items={[
          { value: "songs", label: `Songs (${songs.length})` },
          { value: "versions", label: `Versions (${versions.length})` },
          { value: "projects", label: "Projects" },
          { value: "assets", label: `Assets (${assets.length})` },
        ]}
      />

      {activeTab === "songs" ? (
        songs.length ? (
          <div className="grid gap-5 xl:grid-cols-2">
            {songs.map((song) => {
              const songVersions = versions.filter((version) => version.song_id === song.id);
              const latestVersion =
                songVersions
                  .slice()
                  .sort((left, right) => right.version_number - left.version_number)[0] ?? null;
              const hasReadyPlayback = Boolean(latestVersion?.preview_asset_id);
              return (
                <Card key={song.id}>
                  <CardHeader>
                    <div>
                      <CardTitle>{song.title}</CardTitle>
                      <CardDescription className="mt-2">
                        {song.notes || "No private notes yet. Open the workspace to upload files, add artwork, and build versions."}
                      </CardDescription>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="neutral">{songVersions.length} versions</Badge>
                      <Badge variant={hasReadyPlayback ? "success" : "warning"}>
                        {hasReadyPlayback ? "Ready" : "Needs setup"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <div className="space-y-3">
                    {songVersions.length ? (
                      songVersions.slice(0, 3).map((version) => (
                        <div key={version.id} className="flex items-center justify-between rounded-[18px] border border-border bg-white/3 px-4 py-3">
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
                        This song is still an empty shell. Add the original file, optional public playback file, and artwork
                        in the song workspace before using it in a release.
                      </div>
                    )}
                    <Link to={`/library/songs/${song.id}`}>
                      <Button variant="secondary">Edit song and upload files</Button>
                    </Link>
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

      {activeTab === "projects" ? (
        <Card>
          <CardTitle>Projects</CardTitle>
          <CardDescription className="mt-3">
            Release projects are created from the Create EP / Album routes and then appear here as reusable working sets.
          </CardDescription>
        </Card>
      ) : null}

      {activeTab === "assets" ? (
        <div className="space-y-4">
          {assets.map((asset) => (
            <Card key={asset.id}>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium">{asset.display_name ?? asset.filename}</p>
                  <p className="text-sm text-muted-foreground">
                    {asset.asset_type} · {asset.file_extension} · {asset.access_mode}
                  </p>
                </div>
                <Badge variant={asset.access_mode === "public" ? "accent" : "neutral"}>
                  {asset.access_mode}
                </Badge>
              </div>
            </Card>
          ))}
        </div>
      ) : null}
    </div>
  );
}
