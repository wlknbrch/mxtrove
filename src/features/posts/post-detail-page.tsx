import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  BookOpenText,
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
  Share2,
  SkipForward,
  Trash2,
} from "lucide-react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/page-header";
import { usePlayerStore } from "@/components/audio/player-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FullscreenArtwork } from "@/components/ui/fullscreen-artwork";
import { PlaybackDuration } from "@/components/ui/playback-duration";
import { Tabs } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAppViewer } from "@/hooks/use-app-viewer";
import { useLocalDraft } from "@/hooks/use-local-draft";
import { getArtworkAssetUrls } from "@/lib/asset-urls";
import { shareWithSystemDialog } from "@/lib/native-share";
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
  toggleCommentHeart,
  togglePostHeart,
  updateCommentOnPost,
  updateSingleLyricsVisibility,
} from "@/features/posts/api";
import { buildPostPlaybackTracks, getPlaybackQueueDurationSeconds, getReleaseTrackVersionId } from "@/features/posts/post-playback";
import { sortCommentThreads, type CommentSortMode } from "@/features/posts/comment-sorting";
import { ReleaseQrCode } from "@/features/posts/release-qr-code";
import { buildPublicReleaseShareUrl, buildPublicTrackShareUrl } from "@/features/posts/share-urls";
import { LyricsDialogTrigger } from "@/features/songs/lyrics-dialog";
import { SongMetadataBadges } from "@/features/songs/song-metadata";
import type { ResolvedComment, ResolvedReleaseTrack } from "@/features/posts/types";

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
  const [searchParams] = useSearchParams();
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
  const [commentSort, setCommentSort] = useState<CommentSortMode>("relevant");
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
      const shareResult = await shareWithSystemDialog({
        title: postQuery.data?.post.title ?? "Private MxTrove release",
        text: "Listen to this private MxTrove release.",
        url,
      });
      await queryClient.invalidateQueries({ queryKey: ["post-share-links", postId] });
      if (shareResult !== "cancelled") {
        toast.success(
          shareResult === "shared"
            ? "Private release shared."
            : "Native sharing is unavailable here, so the private link was copied.",
        );
      }
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

  const commentHeartMutation = useMutation({
    mutationFn: async (comment: ResolvedComment) => {
      if (!viewer.userId) {
        throw new Error("Please sign in first.");
      }
      if (comment.author_id === viewer.userId) {
        throw new Error("You cannot heart your own comment.");
      }

      return toggleCommentHeart({
        commentId: comment.id,
        profileId: viewer.userId,
        active: !comment.viewerHasHearted,
      });
    },
    onSuccess: async (_result, comment) => {
      await queryClient.invalidateQueries({ queryKey: ["post", postId] });
      toast.success(comment.viewerHasHearted ? "Comment heart removed." : "Comment hearted.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not update this comment heart.");
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
  const singleLyricsVisibilityMutation = useMutation({
    mutationFn: async () => {
      if (!postQuery.data?.owner?.id || postQuery.data.owner.id !== viewer.userId) {
        throw new Error("Only the release owner can change lyrics visibility.");
      }
      await updateSingleLyricsVisibility({ postId, showLyrics: true });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["post", postId] }),
        queryClient.invalidateQueries({ queryKey: ["player-post", postId] }),
        queryClient.invalidateQueries({ queryKey: ["home-feed"] }),
        queryClient.invalidateQueries({ queryKey: ["explore-feed"] }),
      ]);
      toast.success("Lyrics are now visible on this release.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not enable lyrics.");
    },
  });

  const item = postQuery.data;
  const requestedTrackId = searchParams.get("track");
  const allPlaybackTracks = item ? buildPostPlaybackTracks(item) : [];
  const sharedReleaseTrack = item && !item.single && requestedTrackId
    ? item.releaseTracks.find((entry) => entry.track.id === requestedTrackId) ?? null
    : null;
  const isTrackShareView = Boolean(sharedReleaseTrack);
  const playbackTracks = isTrackShareView
    ? allPlaybackTracks.filter((track) => track.releaseTrackId === sharedReleaseTrack?.track.id)
    : allPlaybackTracks;
  const commentThreads = useMemo(
    () => sortCommentThreads(item ? buildCommentThreads(item.comments) : [], commentSort),
    [commentSort, item],
  );
  const canOpenSongWorkspace =
    Boolean(item?.single?.song?.id) && item?.owner?.id === viewer.userId;
  const isOwnPost = Boolean(item?.owner?.id && viewer.userId === item.owner.id);
  const isMultiTrackRelease = Boolean(item && !item.single);
  const releaseTrackCount = item?.releaseTracks.length ?? 0;
  const playableTrackCount = allPlaybackTracks.length;
  const releaseDurationSeconds = getPlaybackQueueDurationSeconds(allPlaybackTracks);
  const editPath = item ? `/post/${item.post.id}/edit` : null;
  const publicReleaseShareUrl = item
    ? buildPublicReleaseShareUrl(window.location.origin, item.post.id, item.post.updated_at)
    : "";

  async function shareReleaseTrack(track: ResolvedReleaseTrack) {
    if (!item || item.post.visibility !== "public") {
      toast.error("Individual song links are available for public releases.");
      return;
    }

    const shareResult = await shareWithSystemDialog({
      title: `${track.track.track_title} · ${item.owner?.display_name ?? "MxTrove"}`,
      text: `${track.track.track_title} by ${item.owner?.display_name ?? "this artist"}, from ${item.post.title} on MxTrove.`,
      url: buildPublicTrackShareUrl(
        window.location.origin,
        item.post.id,
        track.track.id,
        item.post.updated_at,
      ),
    });
    if (shareResult === "copied") {
      toast.success("Native sharing is unavailable here, so the song link was copied.");
    }
  }

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
                const shareResult = await shareWithSystemDialog({
                  title: item.post.title,
                  text: item.post.description ?? `Listen to ${item.post.title} on MxTrove.`,
                  url: shareUrl,
                });
                if (shareResult === "copied") {
                  toast.success("Native sharing is unavailable here, so the release link was copied.");
                }
              }}
            >
              <Share2 className="size-4" />
              {item.post.visibility === "unlisted" && isOwnPost ? "Create share link" : "Share"}
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
            <FullscreenArtwork
              src={getArtworkAssetUrls(item.artwork)}
              alt={item.post.title}
              className="relative aspect-square overflow-hidden rounded-[24px] border border-border bg-white/4"
              imageClassName="absolute inset-0 h-full w-full object-cover"
            >
              {getArtworkAssetUrls(item.artwork).length === 0 ? (
                <div className="absolute inset-0 bg-gradient-to-br from-accent/40 via-accent-secondary/20 to-background" />
              ) : null}
            </FullscreenArtwork>
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
                  {item.post.post_type === "single"
                    ? "Play"
                    : isTrackShareView
                      ? "Play shared song"
                      : "Play release"}
                </Button>
                {!isTrackShareView && playbackTracks.length > 1 ? (
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
                    <SongMetadataBadges song={item.single.song} />
                    {item.single.showLyrics && item.single.song?.lyrics ? (
                      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[18px] border border-accent/14 bg-accent/[0.06] px-4 py-3">
                        <div>
                          <p className="text-sm font-medium">Lyrics</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Read the complete lyrics while the song keeps playing.
                          </p>
                        </div>
                        <LyricsDialogTrigger
                          lyrics={item.single.song.lyrics}
                          title={item.single.song.title || item.post.title}
                          artistName={item.owner?.display_name}
                          variant="secondary"
                          label="Open lyrics"
                        />
                      </div>
                    ) : isOwnPost && item.single.song?.lyrics ? (
                      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[18px] border border-warning/20 bg-warning/[0.06] px-4 py-3">
                        <div>
                          <p className="text-sm font-medium">Lyrics are hidden</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            This older release has lyrics, but listeners cannot see them yet.
                          </p>
                        </div>
                        <Button
                          variant="secondary"
                          size="sm"
                          className="rounded-full"
                          onClick={() => void singleLyricsVisibilityMutation.mutateAsync()}
                          disabled={singleLyricsVisibilityMutation.isPending}
                        >
                          <BookOpenText className="size-4" aria-hidden="true" />
                          Enable lyrics
                        </Button>
                      </div>
                    ) : null}
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
                    {isTrackShareView
                      ? `Shared song: ${sharedReleaseTrack?.track.track_title}. The full release remains visible for context.`
                      : "Ordered front to back with direct per-track playback and sharing."}
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
                  const playbackTrack = allPlaybackTracks.find((entry) => entry.id === track.track.id) ?? null;
                  const isSharedTrack = sharedReleaseTrack?.track.id === track.track.id;
                  const canPlayFromThisView = Boolean(playbackTrack && (!isTrackShareView || isSharedTrack));
                  return (
                    <div
                      key={track.track.id}
                      aria-current={isSharedTrack ? "true" : undefined}
                      className={cn(
                        "grid gap-4 rounded-[24px] border border-white/[0.08] bg-white/[0.035] px-4 py-4 transition-colors hover:border-accent/22 hover:bg-white/[0.05] md:px-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center",
                        isSharedTrack && "border-accent/40 bg-accent/10 shadow-[0_18px_54px_rgba(var(--accent-rgb),0.14)]",
                        isTrackShareView && !isSharedTrack && "opacity-65",
                      )}
                    >
                      <div className="flex min-w-0 items-start gap-4">
                        <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-accent/22 bg-accent/12 font-display text-lg tracking-[-0.04em] text-accent-secondary">
                          {track.track.track_number}
                        </div>
                        <div className="min-w-0">
                          <div className="flex min-w-0 flex-wrap items-center gap-2">
                            <p className="break-words font-medium">{track.track.track_title}</p>
                            <Badge variant="neutral">{track.versionLabel ?? "Unmapped"}</Badge>
                            <Badge variant={playbackTrack ? "success" : "warning"}>
                              {playbackTrack ? "Ready" : "Pending"}
                            </Badge>
                            {isSharedTrack ? <Badge variant="accent">Shared song</Badge> : null}
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
                          <SongMetadataBadges song={track.song} className="mt-3" />
                          {track.track.show_lyrics && track.song?.lyrics ? (
                            <div className="mt-3">
                              <LyricsDialogTrigger
                                lyrics={track.song.lyrics}
                                title={track.track.track_title}
                                artistName={item.owner?.display_name}
                              />
                            </div>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                        <VersionHeartButton
                          postId={item.post.id}
                          ownerId={item.owner?.id}
                          versionId={getReleaseTrackVersionId(track)}
                          count={track.versionHeartCount}
                          active={track.viewerHasHeartedVersion}
                        />
                        {item.post.visibility === "public" ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => void shareReleaseTrack(track)}
                            aria-label={`Share ${track.track.track_title}`}
                          >
                            <Share2 className="size-4" />
                            Share
                          </Button>
                        ) : null}
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={!canPlayFromThisView}
                          onClick={() => {
                            if (canPlayFromThisView && playbackTrack) {
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
            <div className="flex w-full flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
              <CardTitle>Comments</CardTitle>
              <CardDescription className="mt-2">
                Comments belong to the post, not to each individual single version. Replies stay one level deep.
              </CardDescription>
              </div>
              <Tabs
                value={commentSort}
                onValueChange={(value) => setCommentSort(value as CommentSortMode)}
                items={[
                  { value: "relevant", label: "Relevant" },
                  { value: "chronological", label: "Chronological" },
                ]}
                className="shrink-0"
              />
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
                          variant={comment.viewerHasHearted ? "secondary" : "ghost"}
                          size="sm"
                          onClick={() => void commentHeartMutation.mutateAsync(comment)}
                          disabled={commentHeartMutation.isPending || isOwnComment}
                          aria-label={isOwnComment ? "You cannot heart your own comment" : comment.viewerHasHearted ? "Remove comment heart" : "Heart comment"}
                        >
                          <Heart className={cn("size-4", comment.viewerHasHearted && "fill-current text-accent-secondary")} />
                          {comment.heartCount}
                        </Button>
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
                                <div className="flex flex-wrap gap-2">
                                  <Button
                                    variant={reply.viewerHasHearted ? "secondary" : "ghost"}
                                    size="sm"
                                    onClick={() => void commentHeartMutation.mutateAsync(reply)}
                                    disabled={commentHeartMutation.isPending || ownReply}
                                    aria-label={ownReply ? "You cannot heart your own reply" : reply.viewerHasHearted ? "Remove reply heart" : "Heart reply"}
                                  >
                                    <Heart className={cn("size-4", reply.viewerHasHearted && "fill-current text-accent-secondary")} />
                                    {reply.heartCount}
                                  </Button>
                                  {ownReply ? (
                                    <>
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
                                    </>
                                  ) : null}
                                </div>
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
                The QR code is generated in this browser. MxTrove does not send the release URL to an
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
                Private tokens are hash-only. Save a newly generated URL now because MxTrove cannot reveal it later.
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
