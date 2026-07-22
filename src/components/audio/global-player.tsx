import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  ChevronDown,
  ChevronUp,
  Heart,
  ListMusic,
  Pause,
  Play,
  Repeat2,
  SkipBack,
  SkipForward,
  Volume2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { PlaybackDuration } from "@/components/ui/playback-duration";
import { ResolvedImage } from "@/components/ui/resolved-image";
import { Waveform } from "@/components/audio/waveform";
import { useAppViewer } from "@/hooks/use-app-viewer";
import { useResolvedMediaUrl } from "@/hooks/use-resolved-media-url";
import { queryClient } from "@/lib/query-client";
import { cn } from "@/lib/utils";
import { formatDuration } from "@/lib/utils";
import { usePlayerStore } from "@/components/audio/player-store";
import { getResolvedPostById, togglePostHeart } from "@/features/posts/api";

export function GlobalPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const viewer = useAppViewer();
  const [currentTime, setCurrentTime] = useState(0);
  const [loadedDuration, setLoadedDuration] = useState<number | null>(null);
  const [volume, setVolume] = useState(0.8);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const {
    queue,
    activeTrackId,
    isPlaying,
    repeatMode,
    isQueueOpen,
    playTrack,
    playNext,
    playPrevious,
    toggle,
    setPlaying,
    cycleRepeatMode,
    toggleQueue,
    closeQueue,
  } = usePlayerStore();

  const activeTrack = useMemo(
    () => queue.find((track) => track.id === activeTrackId) ?? null,
    [activeTrackId, queue],
  );
  const activeTrackIndex = useMemo(
    () => queue.findIndex((track) => track.id === activeTrackId),
    [activeTrackId, queue],
  );
  const resolvedAudioSrc = useResolvedMediaUrl(
    activeTrack?.srcCandidates ?? activeTrack?.src ?? null,
    "audio",
  );
  const activePostId = activeTrack?.postId ?? null;
  const playerPostQuery = useQuery({
    queryKey: ["player-post", activePostId],
    queryFn: () => getResolvedPostById(activePostId!, viewer.userId),
    enabled: Boolean(activePostId),
  });
  const heartMutation = useMutation({
    mutationFn: async () => {
      if (!viewer.userId) {
        throw new Error("Please sign in first.");
      }
      if (!activePostId) {
        throw new Error("No playable post is attached to this track.");
      }

      return togglePostHeart({
        postId: activePostId,
        profileId: viewer.userId,
        active: !playerPostQuery.data?.viewerHasHearted,
      });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["player-post", activePostId] }),
        queryClient.invalidateQueries({ queryKey: ["post", activePostId] }),
        queryClient.invalidateQueries({ queryKey: ["home-feed"] }),
        queryClient.invalidateQueries({ queryKey: ["explore-feed"] }),
        playerPostQuery.data?.owner?.id
          ? queryClient.invalidateQueries({
              queryKey: ["profile-posts", playerPostQuery.data.owner.id],
            })
          : Promise.resolve(),
      ]);
      toast.success(playerPostQuery.data?.viewerHasHearted ? "Heart removed." : "Heart sent.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not update the heart.");
    },
  });

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    audio.volume = volume;
  }, [volume]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !activeTrack) {
      return;
    }

    if (!resolvedAudioSrc) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      return;
    }

    if (audio.src !== resolvedAudioSrc) {
      audio.pause();
      audio.src = resolvedAudioSrc;
      audio.load();
      setCurrentTime(0);
      setLoadedDuration(null);
    }

    if (isPlaying) {
      void audio.play().catch(() => {
        toast.error("This track could not be played in the browser.");
      });
    } else {
      audio.pause();
    }
  }, [activeTrack, isPlaying, resolvedAudioSrc]);

  useEffect(() => {
    setCurrentTime(0);
    setLoadedDuration(null);
  }, [activeTrackId]);

  useEffect(() => {
    if (isCollapsed && isQueueOpen) {
      closeQueue();
    }
  }, [closeQueue, isCollapsed, isQueueOpen]);

  if (!activeTrack) {
    return null;
  }

  const displayDuration =
    loadedDuration && Number.isFinite(loadedDuration)
      ? loadedDuration
      : activeTrack.durationSeconds ?? null;
  const progressPercent =
    displayDuration && displayDuration > 0
      ? Math.min((currentTime / displayDuration) * 100, 100)
      : 0;
  const hasPreviousTrack =
    activeTrackIndex > 0 || (repeatMode === "all" && queue.length > 1);
  const hasNextTrack =
    (activeTrackIndex >= 0 && activeTrackIndex < queue.length - 1) ||
    (repeatMode === "all" && queue.length > 1);
  const isHearted = Boolean(playerPostQuery.data?.viewerHasHearted);
  const isOwnPost = Boolean(playerPostQuery.data?.owner?.id && viewer.userId === playerPostQuery.data.owner.id);
  const repeatLabel =
    repeatMode === "off"
      ? "Repeat off"
      : repeatMode === "all"
        ? "Repeat queue"
        : "Repeat current track";

  function handleSeek(nextTime: number) {
    const audio = audioRef.current;
    setCurrentTime(nextTime);

    if (audio) {
      audio.currentTime = nextTime;
    }
  }

  function handlePreviousClick() {
    const audio = audioRef.current;

    if (audio && currentTime > 3) {
      audio.currentTime = 0;
      setCurrentTime(0);
      return;
    }

    playPrevious();
  }

  function handleEnded() {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    if (repeatMode === "one") {
      audio.currentTime = 0;
      setCurrentTime(0);
      void audio.play().catch(() => {
        toast.error("This track could not be replayed in the browser.");
      });
      return;
    }

    if (activeTrackIndex >= 0 && activeTrackIndex < queue.length - 1) {
      playNext();
      return;
    }

    if (repeatMode === "all" && queue[0]) {
      playTrack(queue[0].id);
      return;
    }

    audio.currentTime = 0;
    setCurrentTime(0);
    setPlaying(false);
  }

  function toggleCollapsed() {
    setIsCollapsed((current) => !current);
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[radial-gradient(circle_at_center_top,rgba(157,92,255,0.14),transparent_28%),linear-gradient(180deg,rgba(8,6,19,0.96),rgba(7,5,17,0.98))] shadow-[0_-24px_60px_rgba(0,0,0,0.42)] backdrop-blur-2xl">
      {isQueueOpen && !isCollapsed ? (
        <div className="mx-auto max-w-[1600px] px-4 pt-4 md:px-8">
          <div className="rounded-[28px] border border-border bg-[linear-gradient(180deg,rgba(18,14,35,0.96),rgba(11,9,24,0.95))] p-5 shadow-[0_26px_64px_rgba(3,0,14,0.42)]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-medium">Playback queue</p>
                <p className="text-sm text-muted-foreground">
                  {queue.length} track{queue.length === 1 ? "" : "s"} lined up
                </p>
              </div>
              <Button variant="ghost" size="sm" className="rounded-full" onClick={toggleQueue}>
                Close
              </Button>
            </div>
            <div className="mt-4 grid gap-2">
              {queue.map((track, index) => {
                const isActive = track.id === activeTrackId;

                return (
                  <button
                    key={track.id}
                    type="button"
                    className={cn(
                      "flex items-center justify-between gap-4 rounded-[20px] border border-border px-4 py-3 text-left transition-colors hover:bg-white/6",
                      isActive && "border-accent/20 bg-accent/10",
                    )}
                    onClick={() => {
                      playTrack(track.id);
                      closeQueue();
                    }}
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {index + 1}. {track.title}
                      </p>
                      <p className="truncate text-sm text-muted-foreground">
                        {track.versionLabel ? `${track.versionLabel} • ` : ""}
                        {track.artistName}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      <PlaybackDuration
                        src={track.srcCandidates ?? track.src}
                        fallbackDurationSeconds={track.durationSeconds ?? null}
                      />
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
      <audio
        ref={audioRef}
        onEnded={handleEnded}
        onError={() => {
          toast.error("MxShare could not load this audio source.");
        }}
        onLoadedMetadata={(event) => {
          const duration = event.currentTarget.duration;
          setLoadedDuration(Number.isFinite(duration) ? duration : null);
        }}
        onDurationChange={(event) => {
          const duration = event.currentTarget.duration;
          setLoadedDuration(Number.isFinite(duration) ? duration : null);
        }}
        preload="metadata"
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
      />
      <div
        className={cn(
          "mx-auto max-w-[1660px] px-4 pt-3 md:px-8",
          isCollapsed ? "pb-3 md:pb-4" : "pb-4 md:pb-5",
        )}
      >
        {isCollapsed ? (
          <div className="velvet-hero overflow-hidden rounded-[28px] border border-border bg-[linear-gradient(180deg,rgba(12,9,25,0.96),rgba(7,6,18,0.96))] px-4 py-3 shadow-[0_-10px_40px_rgba(0,0,0,0.12)] md:px-5">
            <div className="mb-3 h-1 overflow-hidden rounded-full bg-white/[0.08]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-accent to-accent-secondary"
                style={{ width: `${Math.max(progressPercent, 0)}%` }}
              />
            </div>
            <div className="flex items-center gap-3">
              <div className="size-12 overflow-hidden rounded-[16px] border border-border bg-[radial-gradient(circle_at_top,rgba(157,92,255,0.3),rgba(255,255,255,0.04)_55%,rgba(10,8,24,0.94))] shadow-[0_12px_28px_rgba(7,3,20,0.24)]">
                {activeTrack.artworkUrl ? (
                  <ResolvedImage
                    className="size-full object-cover"
                    src={activeTrack.artworkUrl}
                    alt={activeTrack.title}
                  />
                ) : null}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{activeTrack.title}</p>
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {activeTrack.artistName}
                  {activeTrack.versionLabel ? ` • ${activeTrack.versionLabel}` : ""}
                </p>
              </div>

              <span className="hidden text-xs text-muted-foreground sm:inline">
                {formatDuration(currentTime)} / {formatDuration(displayDuration)}
              </span>

              <Button
                size="sm"
                className="size-11 rounded-full border-accent/35 p-0 shadow-[0_14px_34px_rgba(111,58,225,0.32)]"
                onClick={toggle}
                aria-label={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? <Pause className="size-4" /> : <Play className="size-4" />}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="rounded-full border border-white/8 bg-white/[0.03]"
                onClick={toggleCollapsed}
                aria-label="Expand player"
                aria-pressed={!isCollapsed}
              >
                <ChevronUp className="size-4" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="velvet-hero overflow-hidden rounded-[30px] border border-border bg-[linear-gradient(180deg,rgba(12,9,25,0.96),rgba(7,6,18,0.96))] px-4 py-4 shadow-[0_-10px_40px_rgba(0,0,0,0.12)] md:px-6 md:py-5">
            <div className="grid gap-5 xl:grid-cols-[1.05fr_minmax(520px,1.5fr)_0.95fr] xl:items-center">
              <div className="flex min-w-0 items-center gap-4">
                <div className="size-18 overflow-hidden rounded-[24px] border border-border bg-[radial-gradient(circle_at_top,rgba(157,92,255,0.3),rgba(255,255,255,0.04)_55%,rgba(10,8,24,0.94))] shadow-[0_16px_42px_rgba(7,3,20,0.32)]">
                  {activeTrack.artworkUrl ? (
                    <ResolvedImage
                      className="size-full object-cover"
                      src={activeTrack.artworkUrl}
                      alt={activeTrack.title}
                    />
                  ) : null}
                </div>
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-[0.28em] text-accent-secondary/78">Now playing</p>
                  <p className="mt-2 truncate text-xl font-medium text-foreground">{activeTrack.title}</p>
                  <p className="mt-1 truncate text-sm text-muted-foreground">
                    {activeTrack.artistName}
                    {activeTrack.versionLabel ? ` • ${activeTrack.versionLabel}` : ""}
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-center gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-full border border-white/8 bg-white/[0.03]"
                    onClick={handlePreviousClick}
                    disabled={!hasPreviousTrack && currentTime <= 3}
                    aria-label="Previous track"
                  >
                    <SkipBack className="size-4" />
                  </Button>
                  <Button
                    size="sm"
                    className="size-16 rounded-full border-accent/45 p-0 shadow-[0_18px_48px_rgba(111,58,225,0.44)]"
                    onClick={toggle}
                    aria-label={isPlaying ? "Pause" : "Play"}
                  >
                    {isPlaying ? <Pause className="size-4" /> : <Play className="size-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-full border border-white/8 bg-white/[0.03]"
                    onClick={playNext}
                    disabled={!hasNextTrack}
                    aria-label="Next track"
                  >
                    <SkipForward className="size-4" />
                  </Button>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="min-w-10 text-right">{formatDuration(currentTime)}</span>
                  <div className="relative flex-1">
                    <div className="rounded-full border border-white/8 bg-white/[0.035] px-4 py-3">
                      <Waveform
                        waveform={activeTrack.waveform ?? null}
                        durationSeconds={displayDuration}
                        currentTime={currentTime}
                        onSeek={handleSeek}
                        disabled={!displayDuration}
                        barCount={56}
                        trackClassName="h-8"
                      />
                    </div>
                  </div>
                  <span className="min-w-10">{formatDuration(displayDuration)}</span>
                </div>
              </div>

              <div className="flex flex-col gap-3 xl:items-end">
                <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "rounded-full border border-white/8 bg-white/[0.03]",
                      isHearted && "border-accent/15 bg-accent/10 text-accent-secondary",
                      isOwnPost && "opacity-55",
                    )}
                    onClick={() => void heartMutation.mutateAsync()}
                    disabled={heartMutation.isPending || !activePostId || isOwnPost}
                    aria-label={isOwnPost ? "You cannot heart your own post" : isHearted ? "Remove heart" : "Heart this post"}
                    aria-pressed={isHearted}
                  >
                    <Heart className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "rounded-full border border-white/8 bg-white/[0.03]",
                      isQueueOpen && "border-white/12 bg-white/8 text-foreground",
                    )}
                    onClick={toggleQueue}
                    aria-label={isQueueOpen ? "Hide queue" : "Show queue"}
                    aria-pressed={isQueueOpen}
                  >
                    <ListMusic className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "rounded-full border border-white/8 bg-white/[0.03]",
                      repeatMode !== "off" && "border-white/12 bg-white/8 text-foreground",
                    )}
                    onClick={cycleRepeatMode}
                  aria-label={repeatLabel}
                >
                  <Repeat2 className="size-4" />
                  {repeatMode === "one" ? <span className="text-[10px] font-semibold">1</span> : null}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-full border border-white/8 bg-white/[0.03]"
                  onClick={toggleCollapsed}
                  aria-label="Collapse player"
                  aria-pressed={!isCollapsed}
                >
                  <ChevronDown className="size-4" />
                </Button>
              </div>
                <div className="flex w-full items-center gap-3 rounded-full border border-white/8 bg-white/[0.03] px-4 py-3 xl:max-w-[260px]">
                  <Volume2 className="size-4 text-muted-foreground" />
                  <input
                    className={cn("accent-accent w-full")}
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={volume}
                    onChange={(event) => setVolume(Number(event.currentTarget.value))}
                  />
                </div>
                <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                  {activeTrackIndex + 1} / {queue.length} in queue
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
