import { useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  BookOpenText,
  FolderOpen,
  Heart,
  Info,
  MessageCircle,
  MoreHorizontal,
  PencilLine,
  Pause,
  Play,
  Reply,
  Share2,
  SkipForward,
  Trash2,
} from "lucide-react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import { usePlayerStore } from "@/components/audio/player-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FullscreenArtwork } from "@/components/ui/fullscreen-artwork";
import { PlaybackDuration } from "@/components/ui/playback-duration";
import { ResolvedImage } from "@/components/ui/resolved-image";
import { Tabs } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAppViewer } from "@/hooks/use-app-viewer";
import { useLocalDraft } from "@/hooks/use-local-draft";
import { getArtworkAssetUrls } from "@/lib/asset-urls";
import { shareWithSystemDialog } from "@/lib/native-share";
import { queryClient } from "@/lib/query-client";
import { cn, formatDuration, formatRelativeTime } from "@/lib/utils";
import {
  ContentRemovalDialog,
  type AdminRemovalTarget,
} from "@/features/admin/content-removal-dialog";
import { removePublicContent, type AdminRemovalReason } from "@/features/admin/api";
import { useAdminRole } from "@/features/admin/use-admin-role";

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
import {
  buildPostPlaybackTracks,
  getPlaybackQueueDurationSeconds,
  getReleasePlaybackSelection,
  getReleaseTrackVersionId,
} from "@/features/posts/post-playback";
import { sortCommentThreads, type CommentSortMode } from "@/features/posts/comment-sorting";
import { ReleaseMoreInfoDialog } from "@/features/posts/release-more-info-dialog";
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

function CommentActionsMenu({ children, label }: { children: ReactNode; label: string }) {
  return (
    <details className="group/actions relative">
      <summary className="flex size-8 cursor-pointer list-none items-center justify-center rounded-full text-muted-foreground transition hover:bg-white/[0.06] hover:text-foreground marker:hidden">
        <MoreHorizontal className="size-4" />
        <span className="sr-only">{label}</span>
      </summary>
      <div className="absolute right-0 top-9 z-30 flex min-w-36 flex-col gap-1 rounded-[14px] border border-border bg-surface-strong p-1.5 shadow-[0_18px_54px_rgba(0,0,0,0.48)]">
        {children}
      </div>
    </details>
  );
}

function getReleaseReturnDestination(currentPostId: string) {
  if (typeof window === "undefined") {
    return { path: "/", label: "Home" };
  }

  const path = window.sessionStorage.getItem("mxtrove:last-non-release-route");
  if (!path || path.startsWith(`/post/${currentPostId}`)) {
    return { path: "/", label: "Home" };
  }

  if (path === "/") return { path, label: "Home" };
  if (path.startsWith("/explore")) return { path, label: "Explore" };
  if (path.startsWith("/library")) return { path, label: "Library" };
  if (path.startsWith("/projects")) return { path, label: "Projects" };
  if (path.startsWith("/notifications")) return { path, label: "Notifications" };
  if (path.startsWith("/search")) return { path, label: "Search" };
  if (path.startsWith("/@")) return { path, label: "Profile" };

  return { path, label: "previous screen" };
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
  const adminRoleQuery = useAdminRole();
  const [adminRemovalTarget, setAdminRemovalTarget] = useState<AdminRemovalTarget | null>(null);
  const navigate = useNavigate();
  const enqueue = usePlayerStore((state) => state.enqueue);
  const activeTrackId = usePlayerStore((state) => state.activeTrackId);
  const playerQueue = usePlayerStore((state) => state.queue);
  const playerIsPlaying = usePlayerStore((state) => state.isPlaying);
  const setPlayerPlaying = usePlayerStore((state) => state.setPlaying);
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
  const [showAllReleaseTracks, setShowAllReleaseTracks] = useState(false);
  const [isMoreInfoOpen, setIsMoreInfoOpen] = useState(false);
  const [showAllComments, setShowAllComments] = useState(false);
  const [returnDestination] = useState(() => getReleaseReturnDestination(postId));

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
  const adminRemovalMutation = useMutation({
    mutationFn: ({ target, reason }: { target: AdminRemovalTarget; reason: AdminRemovalReason }) =>
      removePublicContent({ targetType: target.type, targetId: target.id, reason }),
    onSuccess: async (_, variables) => {
      setAdminRemovalTarget(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["post", postId] }),
        queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-reports"] }),
        queryClient.invalidateQueries({ queryKey: ["home-feed"] }),
        queryClient.invalidateQueries({ queryKey: ["explore-feed"] }),
        queryClient.invalidateQueries({ queryKey: ["profile-posts"] }),
      ]);
      toast.success(`${variables.target.type === "post" ? "Release" : "Comment"} removed from MxTrove.`);
      if (variables.target.type === "post") navigate("/admin");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "The content could not be removed."),
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
  const playbackSelection = getReleasePlaybackSelection(
    allPlaybackTracks,
    sharedReleaseTrack?.track.id,
  );
  const playbackTracks = playbackSelection.tracks;
  const activePlayerTrack = playerQueue.find((track) => track.id === activeTrackId) ?? null;
  const isCurrentReleaseActive = Boolean(
    activePlayerTrack?.postId && activePlayerTrack.postId === item?.post.id,
  );
  const isCurrentReleasePlaying = isCurrentReleaseActive && playerIsPlaying;
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
  const artworkUrls = getArtworkAssetUrls(item?.artwork);
  const visibleReleaseTracks = showAllReleaseTracks
    ? item?.releaseTracks ?? []
    : item?.releaseTracks.slice(0, 4) ?? [];
  const visibleCommentThreads = showAllComments ? commentThreads : commentThreads.slice(0, 1);

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
    <div className="release-detail-page relative min-h-screen">
      <div className="absolute left-4 top-4 z-30 md:left-6 xl:left-8 xl:top-6">
        <Button
          variant="ghost"
          className="h-auto rounded-none border-0 bg-transparent px-0 py-0.5 !text-[0.62rem] !font-light uppercase tracking-[0.28em] !text-[rgba(216,206,223,0.58)] shadow-none backdrop-blur-none hover:bg-transparent hover:!text-[rgba(255,255,255,0.88)]"
          onClick={() => {
            if (returnDestination.path) {
              navigate(returnDestination.path);
              return;
            }
            navigate(-1);
          }}
          aria-label={`Back to ${returnDestination.label}`}
        >
          <ArrowLeft className="size-3.5 stroke-[1.25]" />
          Back to {returnDestination.label}
        </Button>
      </div>

      <div className="release-detail-layout relative z-10 grid">
          <section className="release-detail-hero relative isolate px-5 pb-10 pt-24 md:px-8 lg:px-12 xl:min-h-[552px] xl:px-[70px] xl:pb-10 xl:pt-[104px]">
            <div
              aria-hidden="true"
              data-release-backdrop
              className="pointer-events-none absolute -left-4 -right-4 -top-4 bottom-0 -z-20 overflow-hidden md:-left-6 md:-right-6 xl:-left-12 xl:-top-6 xl:right-[calc(-1*max(1.5rem,((100vw-1720px)/2+1.5rem)))]"
            >
              {artworkUrls.length > 0 ? (
                <ResolvedImage
                  src={artworkUrls}
                  alt=""
                  aria-hidden="true"
                  loading="eager"
                  fetchPriority="high"
                  className="h-full w-full scale-[1.1] object-cover opacity-[0.7] blur-[30px] brightness-[1.16] saturate-[0.86]"
                />
              ) : (
                <div className="h-full w-full bg-[radial-gradient(circle_at_32%_25%,rgba(var(--accent-rgb),0.44),transparent_32%),linear-gradient(145deg,rgba(var(--accent-rgb),0.2),rgba(7,5,17,0.98))]" />
              )}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_44%_24%,rgba(var(--accent-rgb),0.06),transparent_34%),linear-gradient(90deg,rgba(9,7,19,0.5),rgba(11,8,20,0.3)_44%,rgba(9,7,17,0.58)),linear-gradient(180deg,rgba(10,8,19,0.04),rgba(10,8,19,0.48))]" />
            </div>
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(10,8,19,0.03),rgba(10,8,19,0.18))]" />

            <div className="mx-auto grid w-full max-w-[1060px] gap-8 lg:grid-cols-[370px_minmax(0,1fr)] lg:items-center xl:gap-12">
              <FullscreenArtwork
                src={artworkUrls}
                alt={item.post.title}
                priority
                className="relative mx-auto aspect-square w-full max-w-[370px] overflow-hidden rounded-[24px] border border-white/15 bg-white/4 shadow-[0_32px_100px_rgba(0,0,0,0.52)] [&>span]:opacity-100"
                imageClassName="absolute inset-0 h-full w-full object-cover"
              >
                {artworkUrls.length === 0 ? (
                  <div className="absolute inset-0 bg-gradient-to-br from-accent/40 via-accent-secondary/20 to-background" />
                ) : null}
              </FullscreenArtwork>
              <div className="min-w-0 space-y-5 lg:py-4">
              {item.owner?.username ? (
                <Link
                  to={`/@${item.owner.username}`}
                  className="inline-flex text-xs font-medium uppercase tracking-[0.28em] !text-[var(--accent)] transition-colors hover:!text-[var(--accent-secondary)]"
                >
                  @{item.owner.username}
                </Link>
              ) : null}
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-[0.3em] text-[#c8bdd0]">
                  {item.post.post_type} release
                </p>
                <h1 className="break-words font-display text-5xl font-semibold leading-[0.92] tracking-[-0.055em] text-[#fff8ff] md:text-6xl xl:text-[4.4rem]">
                  {item.post.title}
                </h1>
                <p className="max-w-[610px] break-words text-base leading-7 text-[#c9bfd1]">
                  {item.post.description ?? "Release details, public comments, and version-aware playback."}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs uppercase tracking-[0.14em] text-[#c2b6c9]">
                <span>{isMultiTrackRelease ? `${releaseTrackCount} tracks` : "Single track"}</span>
                {releaseDurationSeconds ? <span>•</span> : null}
                {releaseDurationSeconds ? <span>{formatDuration(releaseDurationSeconds)} total</span> : null}
                {item.single?.featuredVersion ? <Badge variant="cyan">{item.single.featuredVersion.production_stage}</Badge> : null}
              </div>
              <div className="flex flex-wrap gap-3">
                <Button
                  size="lg"
                  className="rounded-full"
                  onClick={() => {
                    if (isCurrentReleaseActive) {
                      setPlayerPlaying(!playerIsPlaying);
                      return;
                    }
                    if (playbackSelection.initialTrackId) {
                      enqueue(playbackTracks, playbackSelection.initialTrackId);
                    }
                  }}
                  disabled={playbackTracks.length === 0}
                  aria-label={isCurrentReleasePlaying ? "Pause release" : "Play release"}
                >
                  {isCurrentReleasePlaying ? <Pause className="size-4" /> : <Play className="size-4" />}
                  {isCurrentReleasePlaying ? "Pause" : "Play"}
                </Button>
                {playbackTracks.length > 1 ? (
                  <Button
                    variant="secondary"
                    size="lg"
                    className="rounded-full"
                    onClick={() => enqueue(playbackTracks, playbackTracks[0].id)}
                  >
                    <SkipForward className="size-4" />
                    Queue all tracks
                  </Button>
                ) : null}
                <Button
                  variant="secondary"
                  size="lg"
                  className="rounded-full"
                  onClick={async () => {
                    if (item.post.visibility === "unlisted" && isOwnPost) {
                      createShareMutation.mutate();
                      return;
                    }
                    const shareUrl = item.post.visibility === "public" ? publicReleaseShareUrl : window.location.href;
                    const shareResult = await shareWithSystemDialog({
                      title: item.post.title,
                      text: item.post.description ?? `Listen to ${item.post.title} on MxTrove.`,
                      url: shareUrl,
                    });
                    if (shareResult === "copied") toast.success("Native sharing is unavailable here, so the release link was copied.");
                  }}
                >
                  <Share2 className="size-4" />
                  {item.post.visibility === "unlisted" && isOwnPost ? "Create share link" : "Share"}
                </Button>
                <Button
                  variant="secondary"
                  size="lg"
                  className="size-12 rounded-full p-0"
                  onClick={() => setIsMoreInfoOpen(true)}
                  aria-label="More information about this release"
                >
                  <Info className="size-4" />
                </Button>
                <Button
                  variant={item.viewerHasHearted ? "primary" : "secondary"}
                  size="lg"
                  className="rounded-full"
                  onClick={() => void heartMutation.mutateAsync()}
                  disabled={heartMutation.isPending || isOwnPost}
                  aria-label={isOwnPost ? "You cannot heart your own post" : item.viewerHasHearted ? "Remove heart" : "Heart this post"}
                >
                  <Heart className={cn("size-4", item.viewerHasHearted && "fill-current")} />
                  {item.heartCount}
                </Button>
                {canOpenSongWorkspace ? (
                  <Link to={`/library/songs/${item.single!.song!.id}`}>
                    <Button variant="secondary">
                      <FolderOpen className="size-4" />
                      Open full version in library
                    </Button>
                  </Link>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                {isOwnPost && editPath ? (
                  <Link to={editPath}><Button variant="ghost" size="sm">{item.post.post_type === "single" ? "Edit post" : "Edit release"}</Button></Link>
                ) : null}
                {isOwnPost ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (window.confirm(`Delete the post "${item.post.title}"?`)) void deletePostMutation.mutateAsync();
                    }}
                    disabled={deletePostMutation.isPending}
                  >
                    <Trash2 className="size-4" />
                    Delete post
                  </Button>
                ) : null}
                {adminRoleQuery.data && item.post.visibility === "public" && !isOwnPost ? (
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => setAdminRemovalTarget({ type: "post", id: item.post.id, label: item.post.title })}
                  >
                    <Trash2 className="size-4" />
                    Remove from MxTrove
                  </Button>
                ) : null}
              </div>
              {canOpenSongWorkspace ? (
                <p className="text-sm text-muted-foreground">
                  Public posts use the shared playback file. Your full private source version remains in the song workspace.
                </p>
              ) : null}
              {item.single ? (
                <div className="rounded-[22px] border border-white/10 bg-black/15 p-4 backdrop-blur-sm">
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
          </section>

        {!item.single ? (
          <section className="relative z-20 border-t border-white/[0.08] bg-background px-5 py-8 md:px-8 xl:px-[70px] xl:py-9">
              <p className="text-xs font-medium uppercase tracking-[0.28em] text-[#d9ccdf]">Tracklist</p>
              {isTrackShareView ? (
                <p className="mt-3 text-sm text-muted-foreground">
                  Shared song: {sharedReleaseTrack?.track.track_title}. Playback starts there, and the complete release remains available.
                </p>
              ) : null}
              <div className="mt-7 hidden grid-cols-[40px_minmax(280px,1fr)_190px_104px_74px_44px_44px_36px] items-center gap-3 border-b border-white/[0.08] px-1 pb-4 text-[0.68rem] uppercase tracking-[0.2em] text-[#b9adbf] xl:grid">
                <span>#</span>
                <span>Title</span>
                <span>Version</span>
                <span>Status</span>
                <span className="text-right">Time</span>
                <span />
                <span />
                <span />
              </div>
              <div className="space-y-3 xl:space-y-0">
                {visibleReleaseTracks.map((track) => {
                  const playbackTrack = allPlaybackTracks.find((entry) => entry.id === track.track.id) ?? null;
                  const isSharedTrack = sharedReleaseTrack?.track.id === track.track.id;
                  const canPlayFromThisView = Boolean(playbackTrack);
                  const isActiveTrack = Boolean(
                    playbackTrack
                    && isCurrentReleaseActive
                    && playbackTrack.id === activeTrackId,
                  );
                  const isActiveTrackPlaying = isActiveTrack && playerIsPlaying;
                  return (
                    <div
                      key={track.track.id}
                      aria-current={isSharedTrack ? "true" : undefined}
                      className={cn(
                        "grid grid-cols-[48px_minmax(0,1fr)_36px_36px] gap-x-3 gap-y-4 rounded-[24px] border border-white/[0.08] bg-white/[0.035] px-4 py-4 transition-colors hover:border-accent/22 hover:bg-white/[0.05] md:px-5 xl:grid-cols-[40px_minmax(280px,1fr)_190px_104px_74px_44px_44px_36px] xl:items-center xl:gap-3 xl:rounded-none xl:border-x-0 xl:border-t-0 xl:bg-transparent xl:px-1 xl:py-[18px] xl:hover:bg-white/[0.025]",
                        isSharedTrack && "border-accent/40 bg-accent/10 shadow-[0_18px_54px_rgba(var(--accent-rgb),0.14)]",
                        isActiveTrack && "border-accent/35 bg-accent/[0.07] xl:bg-accent/[0.045]",
                      )}
                    >
                        <div className="row-span-2 flex size-12 shrink-0 items-center justify-center rounded-2xl border border-accent/22 bg-accent/12 font-display text-lg tracking-[-0.04em] text-accent-secondary xl:row-span-1 xl:size-auto xl:justify-start xl:rounded-none xl:border-0 xl:bg-transparent xl:font-sans xl:text-sm xl:text-foreground/78">
                          {track.track.track_number}
                        </div>
                        <div className="col-span-3 min-w-0 xl:col-span-1">
                          <div className="flex min-w-0 items-center gap-1">
                            <p className={cn("truncate font-medium text-[#f8f2fa]", isActiveTrack && "text-accent-secondary")}>{track.track.track_title}</p>
                            {track.track.show_lyrics && track.song?.lyrics ? (
                              <LyricsDialogTrigger
                                lyrics={track.song.lyrics}
                                title={track.song.title || track.track.track_title}
                                artistName={item.owner?.display_name}
                                variant="ghost"
                                label=""
                                className="size-7 min-h-0 shrink-0 rounded-full p-0 text-muted-foreground"
                              />
                            ) : null}
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-2 xl:hidden">
                            <Badge variant="neutral" className="max-w-[112px] truncate">{track.versionLabel ?? "Unmapped"}</Badge>
                            <Badge variant={playbackTrack ? "success" : "warning"}>{playbackTrack ? "Ready" : "Pending"}</Badge>
                          </div>
                          <div className="mt-2 xl:hidden">
                            <SongMetadataBadges song={track.song} />
                          </div>
                        </div>
                        <div className="hidden min-w-0 xl:block"><Badge variant="neutral" className="max-w-full whitespace-nowrap px-2.5 text-[0.6rem] tracking-[0.16em]">{track.versionLabel ?? "Unmapped"}</Badge></div>
                        <div className="hidden xl:block"><Badge variant={playbackTrack ? "success" : "warning"}>{playbackTrack ? "Ready" : "Pending"}</Badge></div>
                        <div className="hidden text-right text-sm text-[#c7bdcf] xl:block">
                          {playbackTrack ? (
                            <PlaybackDuration src={playbackTrack.srcCandidates ?? playbackTrack.src} fallbackDurationSeconds={playbackTrack.durationSeconds ?? null} />
                          ) : "--:--"}
                        </div>
                        <div className="col-start-2 row-start-2 flex items-center justify-start xl:col-auto xl:row-auto xl:block">
                          <VersionHeartButton
                          postId={item.post.id}
                          ownerId={item.owner?.id}
                          versionId={getReleaseTrackVersionId(track)}
                          count={track.versionHeartCount}
                          active={track.viewerHasHeartedVersion}
                        />
                        </div>
                        {item.post.visibility === "public" ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="size-9 p-0"
                            onClick={() => void shareReleaseTrack(track)}
                            aria-label={`Share ${track.track.track_title}`}
                          >
                            <Share2 className="size-4" />
                          </Button>
                        ) : <span className="hidden xl:block" />}
                        <Button
                          variant="ghost"
                          size="sm"
                          className={cn("size-9 p-0", isActiveTrack && "text-accent-secondary")}
                          disabled={!canPlayFromThisView}
                          onClick={() => {
                            if (!canPlayFromThisView || !playbackTrack) {
                              return;
                            }
                            if (isActiveTrack) {
                              setPlayerPlaying(!playerIsPlaying);
                              return;
                            }
                            enqueue(allPlaybackTracks, playbackTrack.id);
                          }}
                          aria-label={isActiveTrackPlaying ? `Pause ${track.track.track_title}` : `Play ${track.track.track_title}`}
                        >
                          {isActiveTrackPlaying ? <Pause className="size-4" /> : <Play className="size-4" />}
                        </Button>
                    </div>
                  );
                })}
              </div>
              {item.releaseTracks.length > 4 ? (
                <div className="mt-5 flex justify-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-full text-accent-secondary"
                    onClick={() => setShowAllReleaseTracks((current) => !current)}
                    aria-expanded={showAllReleaseTracks}
                  >
                    {showAllReleaseTracks ? "Show fewer tracks" : `View all ${item.releaseTracks.length} tracks`}
                  </Button>
                </div>
              ) : null}
          </section>
        ) : null}

        <section className="relative z-20 border-t border-white/[0.08] bg-background px-5 py-8 md:px-8 xl:px-[70px] xl:py-10">
          <CardHeader className="mb-4">
            <div className="flex w-full flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
              <p className="text-xs font-medium uppercase tracking-[0.28em] text-[#d9ccdf]">Comments</p>
              <CardDescription className="mt-3 max-w-xl text-sm leading-6 text-[#bcb1c4]">
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
                className="w-full rounded-[18px] p-1 lg:max-w-sm [&_button]:px-3 [&_button]:py-2 [&_button]:text-xs"
                stretch
              />
            </div>
          </CardHeader>
          <div className="space-y-4">
            {visibleCommentThreads.map(({ comment, replies }) => {
              const isOwnComment = viewer.userId === comment.author_id;
              const isDeleted = Boolean(comment.deleted_at);
              const authorPath = comment.author?.username ? `/@${comment.author.username}` : null;

              return (
                <div key={comment.id} className="space-y-2 rounded-[16px] border border-border bg-white/3 px-3 py-3">
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
                          className="min-h-8 px-2 text-xs"
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
                          className="min-h-8 px-2 text-xs"
                          onClick={() => {
                            setReplyTargetId(replyTargetId === comment.id ? null : comment.id);
                          }}
                        >
                          <Reply className="size-4" />
                          Reply
                        </Button>
                        {isOwnComment || (adminRoleQuery.data && !isOwnComment) ? (
                          <CommentActionsMenu label="More comment actions">
                          {isOwnComment ? (
                            <>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="justify-start"
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
                              className="justify-start"
                              onClick={() => void deleteCommentMutation.mutateAsync(comment.id)}
                              disabled={deleteCommentMutation.isPending}
                            >
                              <Trash2 className="size-4" />
                              Delete
                            </Button>
                            </>
                          ) : null}
                        {adminRoleQuery.data && !isOwnComment ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="justify-start text-muted-foreground hover:bg-danger/10 hover:text-danger"
                            onClick={() => setAdminRemovalTarget({
                              type: "comment",
                              id: comment.id,
                              label: comment.body,
                            })}
                          >
                            <Trash2 className="size-4" />
                            Moderate
                          </Button>
                        ) : null}
                          </CommentActionsMenu>
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
                                  {ownReply || (adminRoleQuery.data && !ownReply) ? (
                                    <CommentActionsMenu label="More reply actions">
                                    {ownReply ? (
                                      <>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="justify-start"
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
                                        className="justify-start"
                                        onClick={() => void deleteCommentMutation.mutateAsync(reply.id)}
                                        disabled={deleteCommentMutation.isPending}
                                      >
                                        <Trash2 className="size-4" />
                                        Delete
                                      </Button>
                                      </>
                                    ) : null}
                                  {adminRoleQuery.data && !ownReply ? (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="justify-start text-muted-foreground hover:bg-danger/10 hover:text-danger"
                                      onClick={() => setAdminRemovalTarget({
                                        type: "comment",
                                        id: reply.id,
                                        label: reply.body,
                                      })}
                                    >
                                      <Trash2 className="size-4" />
                                      Moderate
                                    </Button>
                                  ) : null}
                                    </CommentActionsMenu>
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

          {item.comments.length > 1 ? (
            <div className="mt-4 flex justify-center">
              <Button
                variant="ghost"
                size="sm"
                className="rounded-full text-xs text-accent-secondary"
                onClick={() => setShowAllComments((current) => !current)}
                aria-expanded={showAllComments}
              >
                {showAllComments ? "Show fewer comments" : "View all comments"}
              </Button>
            </div>
          ) : null}

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
        </section>
      </div>

      <ReleaseMoreInfoDialog
        item={item}
        open={isMoreInfoOpen}
        shareUrl={publicReleaseShareUrl || window.location.href}
        releaseAccess={isOwnPost ? {
          freshUrl: freshShareUrl,
          links: shareLinksQuery.data ?? [],
          isCreating: createShareMutation.isPending,
          revokingId: revokeShareMutation.isPending ? revokeShareMutation.variables ?? null : null,
          onCreate: () => createShareMutation.mutate(),
          onRevoke: (linkId) => revokeShareMutation.mutate(linkId),
        } : undefined}
        onOpenChange={setIsMoreInfoOpen}
      />
      <ContentRemovalDialog
        target={adminRemovalTarget}
        pending={adminRemovalMutation.isPending}
        onClose={() => {
          if (!adminRemovalMutation.isPending) setAdminRemovalTarget(null);
        }}
        onConfirm={(reason) => {
          if (adminRemovalTarget) adminRemovalMutation.mutate({ target: adminRemovalTarget, reason });
        }}
      />
    </div>
  );
}
