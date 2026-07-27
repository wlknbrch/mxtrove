import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Code2,
  Copy,
  ExternalLink,
  FolderOpen,
  Heart,
  Link2,
  MessageCircle,
  PencilLine,
  Play,
  Reply,
  SkipForward,
  Trash2,
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/page-header";
import { usePlayerStore } from "@/components/audio/player-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PlaybackDuration } from "@/components/ui/playback-duration";
import { ResolvedImage } from "@/components/ui/resolved-image";
import { Textarea } from "@/components/ui/textarea";
import { useAppViewer } from "@/hooks/use-app-viewer";
import { useLocalDraft } from "@/hooks/use-local-draft";
import { getArtworkAssetUrls } from "@/lib/asset-urls";
import { queryClient } from "@/lib/query-client";
import { cn, formatDuration, formatRelativeTime } from "@/lib/utils";

import {
  addCommentToPost,
  createPostShareLink,
  deleteCommentOnPost,
  deletePost,
  getResolvedPostById,
  listPostShareLinks,
  revokePostShareLink,
  toggleVersionHeart,
  togglePostHeart,
  updateCommentOnPost,
} from "@/features/posts/api";
import { buildPostPlaybackTracks, getPlaybackQueueDurationSeconds } from "@/features/posts/post-playback";
import { ReleaseQrCode } from "@/features/posts/release-qr-code";
import type { ResolvedComment } from "@/features/posts/types";

function buildCommentThreads(comments: ResolvedComment[]) {
  const repliesByParent = new Map<string, ResolvedComment[]>();

  comments.forEach((comment) => {
    if (!comment.parent_comment_id) {
      return;
    }

    const existing = repliesByParent.get(comment.parent_comment_id) ?? [];
    existing.push(comment);
    repliesByParent.set(comment.parent_comment_id, existing);
  });

  return comments
    .filter((comment) => comment.parent_comment_id === null)
    .map((comment) => ({
      comment,
      replies: repliesByParent.get(comment.id) ?? [],
    }))
    .filter((entry) => !entry.comment.deleted_at || entry.replies.some((reply) => !reply.deleted_at));
}

function buildPublicReleaseShareUrl(origin: string, postId: string, updatedAt: string) {
  const shareUrl = new URL(`/social/post/${encodeURIComponent(postId)}`, origin);
  shareUrl.searchParams.set("v", updatedAt);
  return shareUrl.toString();
}

function VersionHeartButton({
  postId,
  ownerId,
  versionId,
  count,
  active,
}: {
  postId: string;
  ownerId: string | null | undefined;
  versionId: string | null | undefined;
  count: number;
  active: boolean;
}) {
  const viewer = useAppViewer();
  const isOwnVersion = Boolean(ownerId && viewer.userId && ownerId === viewer.userId);
  const heartMutation = useMutation({
    mutationFn: async () => {
      if (!viewer.userId) {
        throw new Error("Please sign in first.");
      }
      if (!versionId) {
        throw new Error("This track is not linked to a shareable song version yet.");
      }

      return toggleVersionHeart({
        versionId,
        profileId: viewer.userId,
        active: !active,
      });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["post", postId] }),
        queryClient.invalidateQueries({ queryKey: ["home-feed"] }),
        queryClient.invalidateQueries({ queryKey: ["explore-feed"] }),
        ownerId ? queryClient.invalidateQueries({ queryKey: ["profile-posts", ownerId] }) : Promise.resolve(),
      ]);
      toast.success(active ? "Song heart removed." : "Song heart sent.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not update this song heart.");
    },
  });

  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn(
        "gap-2",
        active && "text-accent-secondary",
        isOwnVersion && "opacity-55",
      )}
      onClick={() => void heartMutation.mutateAsync()}
      disabled={heartMutation.isPending || !versionId || isOwnVersion}
      aria-pressed={active}
      aria-label={
        isOwnVersion
          ? "You cannot heart your own song"
          : active
            ? "Remove song heart"
            : "Heart this song"
      }
    >
      <Heart className={cn("size-4", active && "fill-current")} />
      {count}
    </Button>
  );
}

export function PostDetailPage() {
  const { postId = "" } = useParams();
  const viewer = useAppViewer();
  const navigate = useNavigate();
  const enqueue = usePlayerStore((state) => state.enqueue);
  const draftOwner = viewer.userId ?? "guest";
  const [commentDraft, setCommentDraft, clearCommentDraft] = useLocalDraft(
    `mxshare:draft:post-comment:${draftOwner}:${postId}`,
    "",
  );
  const [replyDrafts, setReplyDrafts] = useLocalDraft<Record<string, string>>(
    `mxshare:draft:post-replies:${draftOwner}:${postId}`,
    {},
  );
  const [replyTargetId, setReplyTargetId] = useState<string | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingBody, setEditingBody] = useState("");
  const [freshShareUrl, setFreshShareUrl] = useState<string | null>(null);

  const postQuery = useQuery({
    queryKey: ["post", postId],
    queryFn: () => getResolvedPostById(postId, viewer.userId),
    enabled: Boolean(postId),
  });
  const shareLinksQuery = useQuery({
    queryKey: ["post-share-links", postId],
    queryFn: () => listPostShareLinks(postId),
    enabled: Boolean(postId && postQuery.data?.owner?.id === viewer.userId),
  });
  const createShareMutation = useMutation({
    mutationFn: () => createPostShareLink({ postId }),
    onSuccess: async ({ share_token: token }) => {
      const url = `${window.location.origin}/share/${token}`;
      setFreshShareUrl(url);
      await navigator.clipboard.writeText(url);
      await queryClient.invalidateQueries({ queryKey: ["post-share-links", postId] });
      toast.success("Private share link copied. This token is only shown once.");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not create a share link."),
  });
  const revokeShareMutation = useMutation({
    mutationFn: revokePostShareLink,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["post-share-links", postId] });
      toast.success("Share link revoked.");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not revoke the share link."),
  });

  const commentMutation = useMutation({
    mutationFn: async (input: { body: string; parentCommentId?: string | null }) => {
      if (!viewer.userId) {
        throw new Error("Please sign in first.");
      }

      return addCommentToPost({
        postId,
        authorId: viewer.userId,
        values: { body: input.body, parent_comment_id: input.parentCommentId ?? null },
      });
    },
    onSuccess: async (_result, input) => {
      if (input.parentCommentId) {
        setReplyDrafts((current) => {
          const next = { ...current };
          delete next[input.parentCommentId!];
          return next;
        });
      } else {
        clearCommentDraft();
      }
      setReplyTargetId(null);
      await queryClient.invalidateQueries({ queryKey: ["post", postId] });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["home-feed"] }),
        queryClient.invalidateQueries({ queryKey: ["explore-feed"] }),
      ]);
      toast.success("Comment added.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not add comment.");
    },
  });

  const updateCommentMutation = useMutation({
    mutationFn: async (input: { commentId: string; body: string }) => {
      if (!viewer.userId) {
        throw new Error("Please sign in first.");
      }

      return updateCommentOnPost({
        commentId: input.commentId,
        authorId: viewer.userId,
        body: input.body,
      });
    },
    onSuccess: async () => {
      setEditingCommentId(null);
      setEditingBody("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["post", postId] }),
        queryClient.invalidateQueries({ queryKey: ["home-feed"] }),
        queryClient.invalidateQueries({ queryKey: ["explore-feed"] }),
      ]);
      toast.success("Comment updated.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not update comment.");
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      if (!viewer.userId) {
        throw new Error("Please sign in first.");
      }

      return deleteCommentOnPost({
        commentId,
        authorId: viewer.userId,
      });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["post", postId] }),
        queryClient.invalidateQueries({ queryKey: ["home-feed"] }),
        queryClient.invalidateQueries({ queryKey: ["explore-feed"] }),
      ]);
      toast.success("Comment removed.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not remove comment.");
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
  const deletePostMutation = useMutation({
    mutationFn: async () => {
      if (!postQuery.data?.owner?.id || postQuery.data.owner.id !== viewer.userId) {
        throw new Error("Only the owner can delete this post.");
      }

      await deletePost(postId);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["post", postId] }),
        queryClient.invalidateQueries({ queryKey: ["library-posts", viewer.userId] }),
        queryClient.invalidateQueries({ queryKey: ["home-feed"] }),
        queryClient.invalidateQueries({ queryKey: ["explore-feed"] }),
        queryClient.invalidateQueries({ queryKey: ["profile-posts"] }),
      ]);
      toast.success("Post deleted.");
      navigate("/library");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not delete this post.");
    },
  });

  const item = postQuery.data;
  const playbackTracks = item ? buildPostPlaybackTracks(item) : [];
  const commentThreads = useMemo(() => (item ? buildCommentThreads(item.comments) : []), [item]);
  const canOpenSongWorkspace =
    Boolean(item?.single?.song?.id) && item?.owner?.id === viewer.userId;
  const isOwnPost = Boolean(item?.owner?.id && viewer.userId === item.owner.id);
  const isMultiTrackRelease = Boolean(item && !item.single);
  const releaseTrackCount = item?.releaseTracks.length ?? 0;
  const playableTrackCount = playbackTracks.length;
  const releaseDurationSeconds = getPlaybackQueueDurationSeconds(playbackTracks);
  const editPath = item ? `/post/${item.post.id}/edit` : null;
  const publicReleaseShareUrl = item
    ? buildPublicReleaseShareUrl(window.location.origin, item.post.id, item.post.updated_at)
    : "";

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
        eyebrow={
          item.owner?.username ? (
            <Link
              to={`/@${item.owner.username}`}
              className="transition-colors hover:text-foreground"
            >
              @{item.owner.username}
            </Link>
          ) : (
            "Post"
          )
        }
        title={item.post.title}
        description={item.post.description ?? "Release details, public comments, and version-aware playback."}
        actions={
          <div className="flex flex-wrap gap-3">
            {isOwnPost && editPath ? (
              <Link to={editPath}>
                <Button variant="secondary">
                  {item.post.post_type === "single" ? "Edit post" : "Edit release"}
                </Button>
              </Link>
            ) : null}
            {isOwnPost ? (
              <Button
                variant="ghost"
                onClick={() => {
                  if (!window.confirm(`Delete the post "${item.post.title}"?`)) {
                    return;
                  }

                  void deletePostMutation.mutateAsync();
                }}
                disabled={deletePostMutation.isPending}
              >
                <Trash2 className="size-4" />
                Delete post
              </Button>
            ) : null}
            <Button
              variant="secondary"
              onClick={async () => {
                if (item.post.visibility === "unlisted" && isOwnPost) {
                  createShareMutation.mutate();
                  return;
                }
                const shareUrl = item.post.visibility === "public"
                  ? publicReleaseShareUrl
                  : window.location.href;
                await navigator.clipboard.writeText(shareUrl);
                toast.success("Release link copied.");
              }}
            >
              <Copy className="size-4" />
              {item.post.visibility === "unlisted" && isOwnPost ? "Create share link" : "Copy link"}
            </Button>
            <Button
              variant={item.viewerHasHearted ? "primary" : "secondary"}
              onClick={() => void heartMutation.mutateAsync()}
              disabled={heartMutation.isPending || isOwnPost}
              aria-label={isOwnPost ? "You cannot heart your own post" : item.viewerHasHearted ? "Remove heart" : "Heart this post"}
            >
              <Heart className="size-4" />
              {item.heartCount}
            </Button>
          </div>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="overflow-hidden">
          <div
            className={cn(
              "grid gap-5 p-5 md:p-6",
              isMultiTrackRelease ? "lg:grid-cols-[240px_minmax(0,1fr)] lg:items-start" : "md:grid-cols-[220px_minmax(0,1fr)]",
            )}
          >
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
                {isMultiTrackRelease && releaseDurationSeconds ? (
                  <span>{formatDuration(releaseDurationSeconds)} total</span>
                ) : null}
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
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Song hearts</span>
                      <VersionHeartButton
                        postId={item.post.id}
                        ownerId={item.owner?.id}
                        versionId={item.single.featuredVersion?.id}
                        count={item.single.versionHeartCount}
                        active={item.single.viewerHasHeartedVersion}
                      />
                    </div>
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
              ) : null}
            </div>
          </div>
          {!item.single ? (
            <div className="border-t border-white/[0.08] bg-[linear-gradient(180deg,rgba(var(--accent-rgb),0.08),rgba(255,255,255,0.01))] px-5 py-5 md:px-6 md:py-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="font-medium">Tracklist</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Ordered front to back with direct per-track playback.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="neutral">{releaseTrackCount} total</Badge>
                  <Badge variant={playableTrackCount > 0 ? "success" : "warning"}>
                    {playableTrackCount > 0 ? `${playableTrackCount} ready to play` : "Playback unavailable"}
                  </Badge>
                  {releaseDurationSeconds ? (
                    <Badge variant="accent">{formatDuration(releaseDurationSeconds)} total</Badge>
                  ) : null}
                </div>
              </div>
              <div className="mt-5 space-y-3">
                {item.releaseTracks.map((track) => {
                  const playbackTrack = playbackTracks.find((entry) => entry.id === track.track.id) ?? null;
                  return (
                    <div
                      key={track.track.id}
                      className="grid gap-4 rounded-[24px] border border-white/[0.08] bg-white/[0.035] px-4 py-4 transition-colors hover:border-accent/22 hover:bg-white/[0.05] md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:px-5"
                    >
                      <div className="flex min-w-0 items-start gap-4">
                        <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-accent/22 bg-accent/12 font-display text-lg tracking-[-0.04em] text-accent-secondary">
                          {track.track.track_number}
                        </div>
                        <div className="min-w-0">
                          <div className="flex min-w-0 flex-wrap items-center gap-2">
                            <p className="break-words font-medium">{track.track.track_title}</p>
                            <Badge variant="neutral">{track.version?.version_label ?? "Unmapped"}</Badge>
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                            <span>{track.version?.production_stage ?? track.track.production_stage ?? "Playback"}</span>
                            {playbackTrack ? (
                              <span className="inline-flex items-center gap-2">
                                <span className="size-1.5 rounded-full bg-accent-secondary/75" />
                                <PlaybackDuration
                                  src={playbackTrack.srcCandidates ?? playbackTrack.src}
                                  fallbackDurationSeconds={playbackTrack.durationSeconds ?? null}
                                />
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-2">
                                <span className="size-1.5 rounded-full bg-warning/80" />
                                No playback file
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 md:justify-end">
                        <Badge variant={playbackTrack ? "success" : "warning"}>
                          {playbackTrack ? "Ready" : "Pending"}
                        </Badge>
                        <VersionHeartButton
                          postId={item.post.id}
                          ownerId={item.owner?.id}
                          versionId={track.version?.id ?? track.track.song_version_id}
                          count={track.versionHeartCount}
                          active={track.viewerHasHeartedVersion}
                        />
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
          ) : null}
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Comments</CardTitle>
              <CardDescription className="mt-2">
                Comments belong to the post, not to each individual single version. Replies stay one level deep.
              </CardDescription>
            </div>
          </CardHeader>
          <div className="space-y-4">
            {commentThreads.map(({ comment, replies }) => {
              const isOwnComment = viewer.userId === comment.author_id;
              const isDeleted = Boolean(comment.deleted_at);
              const authorPath = comment.author?.username ? `/@${comment.author.username}` : null;

              return (
                <div key={comment.id} className="space-y-3 rounded-[20px] border border-border bg-white/3 px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      {authorPath ? (
                        <Link to={authorPath} className="font-medium hover:text-accent-secondary">
                          {comment.author?.display_name ?? "Unknown artist"}
                        </Link>
                      ) : (
                        <p className="font-medium">{comment.author?.display_name ?? "Unknown artist"}</p>
                      )}
                      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-muted-foreground/75">
                        {formatRelativeTime(comment.created_at)}
                      </p>
                    </div>
                    {!isDeleted ? (
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setReplyTargetId(replyTargetId === comment.id ? null : comment.id);
                          }}
                        >
                          <Reply className="size-4" />
                          Reply
                        </Button>
                        {isOwnComment ? (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingCommentId(editingCommentId === comment.id ? null : comment.id);
                                setEditingBody(comment.body);
                              }}
                            >
                              <PencilLine className="size-4" />
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => void deleteCommentMutation.mutateAsync(comment.id)}
                              disabled={deleteCommentMutation.isPending}
                            >
                              <Trash2 className="size-4" />
                              Delete
                            </Button>
                          </>
                        ) : null}
                      </div>
                    ) : null}
                  </div>

                  {editingCommentId === comment.id && !isDeleted ? (
                    <form
                      className="grid gap-3"
                      onSubmit={async (event) => {
                        event.preventDefault();
                        await updateCommentMutation.mutateAsync({
                          commentId: comment.id,
                          body: editingBody,
                        });
                      }}
                    >
                      <Textarea value={editingBody} onChange={(event) => setEditingBody(event.currentTarget.value)} />
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => {
                            setEditingCommentId(null);
                            setEditingBody("");
                          }}
                        >
                          Cancel
                        </Button>
                        <Button type="submit" disabled={updateCommentMutation.isPending || !editingBody.trim()}>
                          Save
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <p className={`text-sm leading-7 ${isDeleted ? "italic text-muted-foreground/70" : "text-muted-foreground"}`}>
                      {isDeleted ? "Comment removed." : comment.body}
                    </p>
                  )}

                  {replyTargetId === comment.id && !isDeleted ? (
                    <form
                      className="grid gap-3 rounded-[18px] border border-white/[0.06] bg-white/[0.02] p-3"
                      onSubmit={async (event) => {
                        event.preventDefault();
                        await commentMutation.mutateAsync({
                          body: replyDrafts[comment.id] ?? "",
                          parentCommentId: comment.id,
                        });
                      }}
                    >
                      <Textarea
                        placeholder={`Reply to ${comment.author?.display_name ?? "this artist"}`}
                        value={replyDrafts[comment.id] ?? ""}
                        onChange={(event) => {
                          const body = event.currentTarget.value;
                          setReplyDrafts((current) => ({
                            ...current,
                            [comment.id]: body,
                          }));
                        }}
                      />
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => {
                            setReplyTargetId(null);
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          disabled={commentMutation.isPending || !(replyDrafts[comment.id] ?? "").trim()}
                        >
                          Reply
                        </Button>
                      </div>
                    </form>
                  ) : null}

                  {replies.length ? (
                    <div className="space-y-3 border-l border-white/[0.08] pl-4">
                      {replies
                        .filter((reply) => !reply.deleted_at)
                        .map((reply) => {
                          const replyPath = reply.author?.username ? `/@${reply.author.username}` : null;
                          const ownReply = viewer.userId === reply.author_id;

                          return (
                            <div key={reply.id} className="rounded-[18px] border border-white/[0.06] bg-white/[0.02] px-4 py-3">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  {replyPath ? (
                                    <Link to={replyPath} className="font-medium hover:text-accent-secondary">
                                      {reply.author?.display_name ?? "Unknown artist"}
                                    </Link>
                                  ) : (
                                    <p className="font-medium">{reply.author?.display_name ?? "Unknown artist"}</p>
                                  )}
                                  <p className="mt-1 text-xs uppercase tracking-[0.18em] text-muted-foreground/75">
                                    {formatRelativeTime(reply.created_at)}
                                  </p>
                                </div>
                                {ownReply ? (
                                  <div className="flex gap-2">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        setEditingCommentId(editingCommentId === reply.id ? null : reply.id);
                                        setEditingBody(reply.body);
                                      }}
                                    >
                                      <PencilLine className="size-4" />
                                      Edit
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => void deleteCommentMutation.mutateAsync(reply.id)}
                                      disabled={deleteCommentMutation.isPending}
                                    >
                                      <Trash2 className="size-4" />
                                      Delete
                                    </Button>
                                  </div>
                                ) : null}
                              </div>

                              {editingCommentId === reply.id ? (
                                <form
                                  className="mt-3 grid gap-3"
                                  onSubmit={async (event) => {
                                    event.preventDefault();
                                    await updateCommentMutation.mutateAsync({
                                      commentId: reply.id,
                                      body: editingBody,
                                    });
                                  }}
                                >
                                  <Textarea value={editingBody} onChange={(event) => setEditingBody(event.currentTarget.value)} />
                                  <div className="flex justify-end gap-2">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      onClick={() => {
                                        setEditingCommentId(null);
                                        setEditingBody("");
                                      }}
                                    >
                                      Cancel
                                    </Button>
                                    <Button type="submit" disabled={updateCommentMutation.isPending || !editingBody.trim()}>
                                      Save
                                    </Button>
                                  </div>
                                </form>
                              ) : (
                                <p className="mt-2 text-sm leading-7 text-muted-foreground">{reply.body}</p>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>

          <form
            className="mt-5 grid gap-3"
            onSubmit={async (event) => {
              event.preventDefault();
              await commentMutation.mutateAsync({ body: commentDraft });
            }}
          >
            <Textarea
              placeholder="Leave feedback on the release as a whole"
              value={commentDraft}
              onChange={(event) => setCommentDraft(event.currentTarget.value)}
            />
            <div className="flex justify-end">
              {viewer.userId ? (
                <Button type="submit" disabled={commentMutation.isPending || !commentDraft.trim()}>
                  Comment
                </Button>
              ) : (
                <Link to="/login">
                  <Button type="button">Sign in to comment</Button>
                </Link>
              )}
            </div>
          </form>
        </Card>
      </div>

      {item.post.release_notes || item.credits.length || item.externalLinks.length ? (
        <div className="grid gap-5 lg:grid-cols-3">
          {item.post.release_notes ? (
            <Card>
              <p className="text-xs uppercase tracking-[0.22em] text-accent-secondary">Release notes</p>
              <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-muted-foreground">{item.post.release_notes}</p>
            </Card>
          ) : null}
          {item.credits.length ? (
            <Card>
              <h2 className="font-display text-3xl">Credits</h2>
              <div className="mt-5 space-y-3">
                {item.credits.map((credit) => (
                  <div key={credit.id} className="flex items-center justify-between gap-4">
                    <span className="truncate">{credit.display_name}</span>
                    <Badge variant="neutral">{credit.role.replace("_", " ")}</Badge>
                  </div>
                ))}
              </div>
            </Card>
          ) : null}
          {item.externalLinks.length ? (
            <Card>
              <h2 className="font-display text-3xl">Release links</h2>
              <div className="mt-5 flex flex-wrap gap-2">
                {item.externalLinks.map((link) => (
                  <a key={link.id} href={link.url} target="_blank" rel="noreferrer">
                    <Button size="sm" variant="secondary">
                      {link.label}
                      <ExternalLink className="size-3.5" />
                    </Button>
                  </a>
                ))}
              </div>
            </Card>
          ) : null}
        </div>
      ) : null}

      {item.post.visibility === "public" ? (
        <Card>
          <div className="grid items-center gap-6 md:grid-cols-[minmax(0,1fr)_auto]">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-accent-secondary">
                Take this release with you
              </p>
              <h2 className="mt-2 font-display text-3xl">Scan, share, or embed</h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
                The QR code is generated in this browser. MxShare does not send the release URL to an
                external QR service.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  onClick={async () => {
                    await navigator.clipboard.writeText(publicReleaseShareUrl);
                    toast.success("Release link copied.");
                  }}
                >
                  <Copy className="size-4" />
                  Copy release link
                </Button>
                {item.post.allow_embed ? (
                  <Button
                    variant="secondary"
                    onClick={async () => {
                      const code = `<iframe src="${window.location.origin}/embed/post/${item.post.id}" loading="lazy" allow="autoplay"></iframe>`;
                      await navigator.clipboard.writeText(code);
                      toast.success("Embed code copied.");
                    }}
                  >
                    <Code2 className="size-4" />
                    Copy embed
                  </Button>
                ) : null}
              </div>
            </div>
            <ReleaseQrCode
              url={publicReleaseShareUrl}
              title={item.post.title}
            />
          </div>
        </Card>
      ) : null}

      {isOwnPost ? (
        <Card>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-accent-secondary">Sharing</p>
              <h2 className="mt-2 font-display text-3xl">Release access</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Private tokens are hash-only. Save a newly generated URL now because MxShare cannot reveal it later.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => createShareMutation.mutate()} disabled={createShareMutation.isPending}>
                <Link2 className="size-4" />
                New private link
              </Button>
            </div>
          </div>
          {freshShareUrl ? (
            <div className="mt-4 flex items-center gap-3 rounded-[18px] border border-success/20 bg-success/5 px-4 py-3">
              <span className="min-w-0 flex-1 truncate text-sm">{freshShareUrl}</span>
              <Button size="sm" variant="ghost" onClick={() => void navigator.clipboard.writeText(freshShareUrl)}>
                <Copy className="size-4" />
              </Button>
            </div>
          ) : null}
          {(shareLinksQuery.data ?? []).length ? (
            <div className="mt-5 space-y-2">
              {shareLinksQuery.data!.map((link) => (
                <div key={link.id} className="flex flex-wrap items-center gap-3 rounded-[18px] border border-border px-4 py-3">
                  <Badge variant={link.is_active ? "success" : "neutral"}>{link.is_active ? "active" : "revoked"}</Badge>
                  <span className="text-sm text-muted-foreground">{link.use_count} opens</span>
                  <span className="text-sm text-muted-foreground">
                    {link.expires_at ? `expires ${new Date(link.expires_at).toLocaleDateString()}` : "no expiry"}
                  </span>
                  {link.is_active ? (
                    <Button
                      className="ml-auto"
                      size="sm"
                      variant="ghost"
                      onClick={() => revokeShareMutation.mutate(link.id)}
                    >
                      Revoke
                    </Button>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}
        </Card>
      ) : null}
    </div>
  );
}
