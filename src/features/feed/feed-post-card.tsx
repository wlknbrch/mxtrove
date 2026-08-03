import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowUpRight, Crown, Globe2, Heart, MessageCircle, Play, SkipForward, Sparkles } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FullscreenArtwork } from "@/components/ui/fullscreen-artwork";
import { PlaybackDuration } from "@/components/ui/playback-duration";
import { getAssetById } from "@/features/drive/api";
import { useAppViewer } from "@/hooks/use-app-viewer";
import { getArtworkAssetUrls, getAvatarAssetUrls } from "@/lib/asset-urls";
import { queryClient } from "@/lib/query-client";
import { cn, formatDuration, formatRelativeTime } from "@/lib/utils";
import { usePlayerStore } from "@/components/audio/player-store";
import { Waveform } from "@/components/audio/waveform";
import { buildPostPlaybackTracks, getPlaybackQueueDurationSeconds } from "@/features/posts/post-playback";
import { togglePostHeart } from "@/features/posts/api";
import { SongMetadataBadges } from "@/features/songs/song-metadata";

import type { ResolvedPostCard } from "@/features/posts/types";

export function FeedPostCard({
  item,
  compact = false,
  spotlight = false,
}: {
  item: ResolvedPostCard;
  compact?: boolean;
  spotlight?: boolean;
}) {
  const navigate = useNavigate();
  const viewer = useAppViewer();
  const enqueue = usePlayerStore((state) => state.enqueue);
  const playbackTracks = buildPostPlaybackTracks(item);
  const releaseDurationSeconds = getPlaybackQueueDurationSeconds(playbackTracks);
  const isSpotlight = spotlight && !compact;
  const isOwnPost = Boolean(viewer.userId && item.owner?.id === viewer.userId);
  const ownerAvatarQuery = useQuery({
    queryKey: ["asset", item.owner?.avatar_asset_id],
    queryFn: () => getAssetById(item.owner!.avatar_asset_id!),
    enabled: Boolean(item.owner?.avatar_asset_id),
  });
  const heartMutation = useMutation({
    mutationFn: async () => {
      if (!viewer.userId) {
        throw new Error("Please sign in first.");
      }

      return togglePostHeart({
        postId: item.post.id,
        profileId: viewer.userId,
        active: !item.viewerHasHearted,
      });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["home-feed"] }),
        queryClient.invalidateQueries({ queryKey: ["explore-feed"] }),
        queryClient.invalidateQueries({ queryKey: ["post", item.post.id] }),
        queryClient.invalidateQueries({ queryKey: ["player-post", item.post.id] }),
        item.owner?.id
          ? queryClient.invalidateQueries({ queryKey: ["profile-posts", item.owner.id] })
          : Promise.resolve(),
      ]);
      toast.success(item.viewerHasHearted ? "Heart removed." : "Heart sent.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not update the heart.");
    },
  });
  const eventLabel =
    item.feedEvent?.event_type === "single_update"
      ? "Version update"
      : item.post.post_type === "single"
        ? "New single release"
        : item.post.post_type === "ep"
          ? "EP release"
          : "Album release";
  const sideTitle = item.feedEvent?.event_type === "single_update"
    ? "What's new"
    : item.post.post_type === "album" || item.post.post_type === "ep"
      ? "Includes"
      : "Public release";
  const sideNotes =
    item.feedEvent?.event_type === "single_update"
      ? [
          item.single?.featuredVersion?.production_stage
            ? `${item.single.featuredVersion.production_stage} stage`
            : null,
          item.single?.previousVersion
            ? `From ${item.single.previousVersion.version_label}`
            : "First public version",
          playbackTracks.length ? "Playback refreshed" : "Playback unavailable",
        ]
      : item.post.post_type === "album" || item.post.post_type === "ep"
        ? item.releaseTracks.slice(0, 4).map((track) => track.track.track_title)
        : [
            item.single?.featuredVersion?.version_label
              ? `${item.single.featuredVersion.version_label}`
              : "Single release",
            playbackTracks.length ? "Playback live" : "Playback pending",
            "Artist-led post",
          ];
  const spotlightNotes = [
    item.single?.featuredVersion?.version_label
      ? `Version ${item.single.featuredVersion.version_label}`
      : `${item.post.post_type.toUpperCase()} release`,
    item.single?.previousVersion
      ? `Previous ${item.single.previousVersion.version_label}`
      : playbackTracks.length > 1
        ? `${playbackTracks.length} playable tracks${releaseDurationSeconds ? ` • ${formatDuration(releaseDurationSeconds)}` : ""}`
        : "Spotlight release",
    item.single?.featuredVersion?.production_stage
      ? `${item.single.featuredVersion.production_stage} stage`
      : item.releaseTracks.length > 0
        ? `${item.releaseTracks.length} tracks ready`
        : "Fresh activity",
  ];
  const noteItems = isSpotlight ? spotlightNotes : sideNotes;

  return (
    <Card
      className={cn(
        "overflow-hidden border-border/90 px-4 py-4 md:px-5",
        isSpotlight &&
          "velvet-hero border-accent/20 bg-[radial-gradient(circle_at_top_right,rgba(var(--accent-rgb),0.18),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.015))]",
      )}
    >
      <div className="flex items-start gap-4">
        <Avatar
          alt={item.owner?.display_name ?? "Profile"}
          src={getAvatarAssetUrls(ownerAvatarQuery.data)}
          initials={item.owner?.display_name?.slice(0, 2).toUpperCase()}
          className={cn(isSpotlight ? "size-14" : "size-12")}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <Link
              to={item.owner ? `/@${item.owner.username}` : "#"}
              className={cn("inline-flex items-center gap-2 font-medium", isSpotlight && "text-lg")}
            >
              {item.owner?.display_name ?? "Unknown artist"}
              <Sparkles className="size-3.5 text-accent-secondary" />
            </Link>
            <span className="text-sm text-subtle-foreground">
              {formatRelativeTime(item.feedEvent?.created_at ?? item.post.activity_at)}
            </span>
            <span className="inline-flex items-center gap-1 text-xs uppercase tracking-[0.22em] text-muted-foreground">
              <Globe2 className="size-3" />
              Public
            </span>
            {item.feedEvent?.event_type === "single_update" ? (
              <Badge variant="accent">Updated single</Badge>
            ) : null}
          </div>

          {item.post.description ? (
            <p className="mt-3 max-w-3xl break-words text-sm leading-7 text-muted-foreground">{item.post.description}</p>
          ) : null}

          <div
            className={cn(
              "mt-5 rounded-[30px] border border-border bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.015))] p-3 md:p-4",
              isSpotlight && "rounded-[32px] border-accent/15 bg-[linear-gradient(180deg,rgba(255,255,255,0.035),rgba(255,255,255,0.02))]",
            )}
          >
            <div
              className={cn(
                "grid gap-4 xl:gap-5",
                compact
                  ? "md:grid-cols-[148px_minmax(0,1fr)]"
                  : isSpotlight
                    ? "xl:grid-cols-[360px_minmax(0,1fr)_190px]"
                    : "xl:grid-cols-[240px_minmax(0,1fr)_190px]",
              )}
            >
              <FullscreenArtwork
                src={getArtworkAssetUrls(item.artwork)}
                alt={item.post.title}
                className={cn(
                  "relative overflow-hidden rounded-[26px] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(var(--accent-rgb),0.32),rgba(255,255,255,0.03)_55%,rgba(10,8,24,0.92))]",
                  isSpotlight ? "aspect-[0.96]" : "aspect-square",
                )}
                imageClassName="absolute inset-0 h-full w-full object-cover"
              >
                <div className="absolute left-3 top-3 z-10">
                  <Badge variant={item.feedEvent?.event_type === "single_update" ? "accent" : "neutral"}>
                    {item.post.post_type}
                  </Badge>
                </div>
                {getArtworkAssetUrls(item.artwork).length === 0 ? (
                  <div className="absolute inset-0 bg-gradient-to-br from-accent/40 via-accent-secondary/20 to-background" />
                ) : null}
                <div className="absolute inset-x-3 bottom-3 z-10 flex items-center justify-between gap-3 rounded-full border border-white/10 bg-[rgba(10,8,24,0.7)] px-3 py-2 text-[0.7rem] uppercase tracking-[0.18em] text-accent-secondary/85 backdrop-blur-xl">
                  <span className="min-w-0 flex-1 truncate">{eventLabel}</span>
                  <span className="shrink-0 text-white/70">
                    {playbackTracks.length > 0
                      ? `${playbackTracks.length} track${playbackTracks.length === 1 ? "" : "s"}${!item.single && releaseDurationSeconds ? ` • ${formatDuration(releaseDurationSeconds)}` : ""}`
                      : "No audio"}
                  </span>
                </div>
              </FullscreenArtwork>
              <div className="flex min-w-0 flex-col justify-between gap-4">
                <div className="space-y-4">
                  <p className="text-xs uppercase tracking-[0.28em] text-accent-secondary/82">{eventLabel}</p>
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <Link
                      to={`/post/${item.post.id}`}
                      className={cn(
                        "min-w-0 break-words font-display font-semibold tracking-[-0.04em]",
                        isSpotlight ? "text-5xl leading-none md:text-6xl" : "text-3xl leading-none",
                      )}
                    >
                      {item.post.title}
                    </Link>
                    {!item.single && releaseDurationSeconds ? (
                      <Badge variant="neutral">{formatDuration(releaseDurationSeconds)} total</Badge>
                    ) : null}
                    {item.single?.featuredVersion?.production_stage ? (
                      <Badge variant="cyan">{item.single.featuredVersion.production_stage}</Badge>
                    ) : null}
                  </div>
                  {item.single?.previousVersion ? (
                    <p className="break-words text-sm leading-7 text-muted-foreground">
                      Version: {item.single.featuredVersion?.version_label} · Previous:{" "}
                      {item.single.previousVersion.version_label}
                    </p>
                  ) : item.releaseTracks.length > 0 ? (
                    <p className="break-words text-sm leading-7 text-muted-foreground">
                      {item.releaseTracks.length} tracks ready for playback
                      {releaseDurationSeconds ? ` across ${formatDuration(releaseDurationSeconds)}.` : "."}
                    </p>
                  ) : playbackTracks.length > 0 ? (
                    <p className="break-words text-sm leading-7 text-muted-foreground">
                      Playback is ready and stays tied to the exact version the artist published.
                    </p>
                  ) : null}
                </div>

                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      onClick={() => {
                        if (playbackTracks.length > 0) {
                          enqueue(playbackTracks, playbackTracks[0].id);
                        }
                      }}
                      disabled={playbackTracks.length === 0}
                      className={cn("rounded-full", isSpotlight && "min-h-12 px-5 text-base")}
                    >
                      <Play className="size-4" />
                      {playbackTracks.length > 0 ? "Play" : "Playback unavailable"}
                    </Button>
                    {playbackTracks.length > 1 ? (
                      <Button
                        variant="ghost"
                        className="rounded-full border border-white/8"
                        onClick={() => enqueue(playbackTracks, playbackTracks[0].id)}
                      >
                        <SkipForward className="size-4" />
                        Queue all tracks
                      </Button>
                    ) : null}
                    {item.single?.featuredVersion?.version_label ? (
                      <span className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-2 text-xs uppercase tracking-[0.22em] text-accent-secondary/85">
                        {item.single.featuredVersion.version_label}
                      </span>
                    ) : null}
                    <SongMetadataBadges song={item.single?.song} />
                  </div>

                  <div
                    className={cn(
                      "waveform rounded-[26px] border border-white/10 bg-[linear-gradient(90deg,rgba(var(--accent-rgb),0.18),rgba(255,255,255,0.04),rgba(var(--accent-rgb),0.1))] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]",
                      isSpotlight ? "h-28" : "h-20",
                    )}
                  >
                    <div className="flex h-full items-center gap-3">
                      <span className="shrink-0 text-xs text-muted-foreground">
                        <PlaybackDuration
                          src={playbackTracks[0]?.srcCandidates ?? playbackTracks[0]?.src ?? null}
                          fallbackDurationSeconds={playbackTracks[0]?.durationSeconds ?? null}
                        />
                      </span>
                      <Waveform
                        waveform={playbackTracks[0]?.waveform ?? null}
                        durationSeconds={playbackTracks[0]?.durationSeconds ?? null}
                        barCount={isSpotlight ? 96 : 80}
                        variant="preview"
                        className="min-w-0 h-full flex-1"
                        trackClassName="h-full w-full"
                        showFallbackLine={false}
                        disabled
                      />
                      <span className="hidden shrink-0 text-[11px] uppercase tracking-[0.26em] text-accent-secondary/80 md:inline">
                        Preview
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-muted-foreground">
                    <div className="flex flex-wrap items-center gap-5">
                      <button
                        type="button"
                        className={cn(
                          "inline-flex items-center gap-2 hover:text-foreground disabled:cursor-not-allowed disabled:hover:text-muted-foreground",
                          item.viewerHasHearted && "text-accent",
                          isOwnPost && "opacity-55",
                        )}
                        onClick={() => void heartMutation.mutateAsync()}
                        disabled={heartMutation.isPending || isOwnPost}
                        aria-pressed={item.viewerHasHearted}
                        aria-label={isOwnPost ? "You cannot heart your own post" : item.viewerHasHearted ? "Remove heart" : "Heart this post"}
                      >
                        <Heart className="size-4" />
                        {item.heartCount}
                      </button>
                      <button
                        type="button"
                        className="inline-flex items-center gap-2 hover:text-foreground"
                        onClick={() => navigate(`/post/${item.post.id}`)}
                      >
                        <MessageCircle className="size-4" />
                        {item.commentCount}
                      </button>
                    </div>
                    <Link
                      to={`/post/${item.post.id}`}
                      className="inline-flex items-center gap-2 text-sm text-accent-secondary transition-colors hover:text-white"
                    >
                      Open release
                      <ArrowUpRight className="size-4" />
                    </Link>
                  </div>
                </div>
              </div>
              {!compact ? (
                <div
                  className={cn(
                    "hidden xl:flex xl:flex-col xl:gap-4 xl:border-l xl:border-white/8 xl:pl-5",
                    isSpotlight ? "justify-between" : "justify-start",
                  )}
                >
                  <div>
                    <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-accent-secondary/75">
                      {isSpotlight ? <Crown className="size-3.5" /> : null}
                      {isSpotlight ? "Spotlight" : sideTitle}
                    </p>
                    <p className="mt-3 text-sm leading-7 text-muted-foreground">
                      {isSpotlight ? "Handpicked release" : "Public context"}
                    </p>
                  </div>
                  <div className="space-y-3">
                    {noteItems.map((note) =>
                      note ? (
                        <div
                          key={note}
                          className="break-words rounded-[18px] border border-white/6 bg-white/[0.025] px-3 py-3 text-sm leading-6 text-muted-foreground"
                        >
                          {note}
                        </div>
                      ) : null,
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
