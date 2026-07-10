import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { FolderOpen, Heart, MessageCircle, Play, SkipForward } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/page-header";
import { usePlayerStore } from "@/components/audio/player-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ResolvedImage } from "@/components/ui/resolved-image";
import { Textarea } from "@/components/ui/textarea";
import { useAppViewer } from "@/hooks/use-app-viewer";
import { getArtworkAssetUrls } from "@/lib/asset-urls";
import { queryClient } from "@/lib/query-client";

import { addCommentToPost, getResolvedPostById, togglePostHeart } from "@/features/posts/api";
import { buildPostPlaybackTracks } from "@/features/posts/post-playback";

export function PostDetailPage() {
  const { postId = "" } = useParams();
  const viewer = useAppViewer();
  const enqueue = usePlayerStore((state) => state.enqueue);
  const form = useForm<{ body: string }>({ defaultValues: { body: "" } });

  const postQuery = useQuery({
    queryKey: ["post", postId],
    queryFn: () => getResolvedPostById(postId, viewer.userId),
    enabled: Boolean(postId),
  });

  const commentMutation = useMutation({
    mutationFn: async (body: string) => {
      if (!viewer.userId) {
        throw new Error("Please sign in first.");
      }

      return addCommentToPost({
        postId,
        authorId: viewer.userId,
        values: { body, parent_comment_id: null },
      });
    },
    onSuccess: async () => {
      form.reset();
      await queryClient.invalidateQueries({ queryKey: ["post", postId] });
      toast.success("Comment added.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not add comment.");
    },
  });

  const heartMutation = useMutation({
    mutationFn: async () => {
      if (!viewer.userId) {
        throw new Error("Please sign in first.");
      }
      if (!item) {
        throw new Error("This post is unavailable.");
      }

      return togglePostHeart({
        postId,
        profileId: viewer.userId,
        active: !item.viewerHasHearted,
      });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["post", postId] }),
        queryClient.invalidateQueries({ queryKey: ["player-post", postId] }),
        queryClient.invalidateQueries({ queryKey: ["home-feed"] }),
        queryClient.invalidateQueries({ queryKey: ["explore-feed"] }),
        item?.owner?.id
          ? queryClient.invalidateQueries({ queryKey: ["profile-posts", item.owner.id] })
          : Promise.resolve(),
      ]);
      toast.success(item?.viewerHasHearted ? "Heart removed." : "Heart sent.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not heart this post.");
    },
  });

  const item = postQuery.data;
  const playbackTracks = item ? buildPostPlaybackTracks(item) : [];
  const canOpenSongWorkspace =
    Boolean(item?.single?.song?.id) && item?.owner?.id === viewer.userId;
  const isOwnPost = Boolean(item?.owner?.id && viewer.userId === item.owner.id);

  if (postQuery.isPending) {
    return (
      <Card>
        <CardTitle>Loading post</CardTitle>
        <CardDescription className="mt-2">
          Pulling the release, comments, and playback context together.
        </CardDescription>
      </Card>
    );
  }

  if (!item) {
    return (
      <Card>
        <CardTitle>Post unavailable</CardTitle>
        <CardDescription className="mt-2">
          This post is not available anymore or it has been made private.
        </CardDescription>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={item.owner ? `@${item.owner.username}` : "Post"}
        title={item.post.title}
        description={item.post.description ?? "Release details, public comments, and version-aware playback."}
        actions={
          <Button
            variant={item.viewerHasHearted ? "primary" : "secondary"}
            onClick={() => void heartMutation.mutateAsync()}
            disabled={heartMutation.isPending || isOwnPost}
            aria-label={isOwnPost ? "You cannot heart your own post" : item.viewerHasHearted ? "Remove heart" : "Heart this post"}
          >
            <Heart className="size-4" />
            {item.heartCount}
          </Button>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <Card>
          <div className="grid gap-5 md:grid-cols-[220px_minmax(0,1fr)]">
            <div className="relative aspect-square overflow-hidden rounded-[24px] border border-border bg-white/4">
              {getArtworkAssetUrls(item.artwork).length > 0 ? (
                <ResolvedImage
                  src={getArtworkAssetUrls(item.artwork)}
                  alt={item.post.title}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-accent/40 via-accent-secondary/20 to-background" />
              )}
            </div>
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="neutral">{item.post.post_type}</Badge>
                {item.single?.featuredVersion ? <Badge variant="cyan">{item.single.featuredVersion.production_stage}</Badge> : null}
              </div>
              <div className="flex flex-wrap items-center gap-5 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-2">
                  <Heart className="size-4" />
                  {item.heartCount}
                </span>
                <span className="inline-flex items-center gap-2">
                  <MessageCircle className="size-4" />
                  {item.commentCount}
                </span>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={() => {
                    if (playbackTracks.length > 0) {
                      enqueue(playbackTracks, playbackTracks[0].id);
                    }
                  }}
                  disabled={playbackTracks.length === 0}
                >
                  <Play className="size-4" />
                  {item.post.post_type === "single" ? "Play" : "Play release"}
                </Button>
                {playbackTracks.length > 1 ? (
                  <Button
                    variant="ghost"
                    onClick={() => enqueue(playbackTracks, playbackTracks[0].id)}
                  >
                    <SkipForward className="size-4" />
                    Queue all tracks
                  </Button>
                ) : null}
                {canOpenSongWorkspace ? (
                  <Link to={`/library/songs/${item.single!.song!.id}`}>
                    <Button variant="secondary">
                      <FolderOpen className="size-4" />
                      Open full version in library
                    </Button>
                  </Link>
                ) : null}
              </div>
              {canOpenSongWorkspace ? (
                <p className="text-sm text-muted-foreground">
                  Public posts use the shared playback file. Your full private source version remains in the song workspace.
                </p>
              ) : null}
              {item.single ? (
                <div className="rounded-[22px] border border-border bg-white/3 p-4">
                  <p className="font-medium">Single timeline</p>
                  <div className="mt-3 space-y-3">
                    {item.single.previousVersion ? (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Previous</span>
                        <span>{item.single.previousVersion.version_label}</span>
                      </div>
                    ) : null}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Current</span>
                      <span>{item.single.featuredVersion?.version_label}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Playback</span>
                      <span>{playbackTracks.length ? "Ready to play" : "No shared playback file available"}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {item.single.featuredVersion?.changelog ?? "No changelog yet."}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="rounded-[22px] border border-border bg-white/3 p-4">
                  <p className="font-medium">Tracklist</p>
                  <div className="mt-3 space-y-3">
                    {item.releaseTracks.map((track) => {
                      const playbackTrack = playbackTracks.find((entry) => entry.id === track.track.id) ?? null;
                      return (
                        <div key={track.track.id} className="flex flex-wrap items-center justify-between gap-3 rounded-[18px] border border-border bg-white/4 px-4 py-3">
                          <div className="min-w-0">
                            <p className="truncate">
                              {track.track.track_number}. {track.track.track_title}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {track.version?.version_label ?? "No mapped version"}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="neutral">{track.track.production_stage ?? "Playback"}</Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={!playbackTrack}
                              onClick={() => {
                                if (playbackTrack) {
                                  enqueue([playbackTrack], playbackTrack.id);
                                }
                              }}
                            >
                              <Play className="size-4" />
                              Play
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Comments</CardTitle>
              <CardDescription className="mt-2">
                Comments belong to the post, not to each individual single version.
              </CardDescription>
            </div>
          </CardHeader>
          <div className="space-y-4">
            {item.comments.map((comment) => (
              <div key={comment.id} className="rounded-[18px] border border-border bg-white/3 px-4 py-3">
                <p className="font-medium">{comment.author?.display_name ?? "Unknown artist"}</p>
                <p className="mt-2 text-sm text-muted-foreground">{comment.body}</p>
              </div>
            ))}
          </div>

          <form
            className="mt-5 grid gap-3"
            onSubmit={form.handleSubmit(async (values) => {
              await commentMutation.mutateAsync(values.body);
            })}
          >
            <Textarea placeholder="Leave feedback on the release as a whole" {...form.register("body")} />
            <div className="flex justify-end">
              <Button type="submit" disabled={commentMutation.isPending}>Comment</Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
