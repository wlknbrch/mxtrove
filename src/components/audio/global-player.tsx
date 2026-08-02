import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { PlaybackDuration } from "@/components/ui/playback-duration";
import { ResolvedImage } from "@/components/ui/resolved-image";
import { shouldReportPlaybackError } from "@/components/audio/playback-error";
import { Waveform } from "@/components/audio/waveform";
import { useAppViewer } from "@/hooks/use-app-viewer";
import {
  useResolvedMediaSource,
  useResolvedMediaUrl,
} from "@/hooks/use-resolved-media-url";
import { queryClient } from "@/lib/query-client";
import { cn } from "@/lib/utils";
import { formatDuration } from "@/lib/utils";
import { usePlayerStore } from "@/components/audio/player-store";
import { useAppearance } from "@/features/appearance/appearance-provider";
import { createProtectedMediaReadUrl } from "@/features/media-processing/api";
import { getResolvedPostById, togglePostHeart, toggleVersionHeart } from "@/features/posts/api";

const STALL_RECOVERY_DELAY_MS = 7_000;
const MAX_SOURCE_RELOADS = 1;

function normalizeMediaSource(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  try {
    return new URL(value, window.location.origin).toString();
  } catch {
    return value;
  }
}

function getTrackSources(track: {
  src: string;
  srcCandidates?: string[] | null;
} | null) {
  if (!track) {
    return [];
  }

  return [...(track.srcCandidates ?? []), track.src].filter(
    (source, index, sources): source is string =>
      Boolean(source) && sources.indexOf(source) === index,
  );
}

export function GlobalPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const loadedTrackIdRef = useRef<string | null>(null);
  const playbackErrorTimeoutRef = useRef<number | null>(null);
  const lastPlaybackErrorKeyRef = useRef<string | null>(null);
  const stallRecoveryTimeoutRef = useRef<number | null>(null);
  const pendingResumeSecondsRef = useRef(0);
  const sourceReloadCountRef = useRef(0);
  const protectedRefreshTrackIdRef = useRef<string | null>(null);
  const recoveryInFlightRef = useRef(false);
  const navigate = useNavigate();
  const viewer = useAppViewer();
  const { settings: appearance, updateSettings: updateAppearance } = useAppearance();
  const [currentTime, setCurrentTime] = useState(0);
  const [loadedDuration, setLoadedDuration] = useState<number | null>(null);
  const [volume, setVolume] = useState(() =>
    appearance.remember_volume ? appearance.player_volume : 0.8,
  );
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [sourceSelection, setSourceSelection] = useState<{
    trackId: string | null;
    candidateIndex: number;
    refreshedUrl: string | null;
  }>({
    trackId: null,
    candidateIndex: 0,
    refreshedUrl: null,
  });
  const hasAdjustedVolume = useRef(false);
  const {
    queue,
    activeTrackId,
    isPlaying,
    repeatMode,
    isQueueOpen,
    isSurfaceHidden,
    playTrack,
    playNext,
    playPrevious,
    toggle,
    setPlaying,
    setCurrentTimeSeconds,
    cycleRepeatMode,
    toggleQueue,
    closeQueue,
    requestedSeekSeconds,
    consumeSeekRequest,
  } = usePlayerStore();

  const activeTrack = useMemo(
    () => queue.find((track) => track.id === activeTrackId) ?? null,
    [activeTrackId, queue],
  );
  const activeTrackIndex = useMemo(
    () => queue.findIndex((track) => track.id === activeTrackId),
    [activeTrackId, queue],
  );
  const trackSources = useMemo(() => getTrackSources(activeTrack), [activeTrack]);
  const selectedCandidateIndex =
    sourceSelection.trackId === activeTrackId
      ? sourceSelection.candidateIndex
      : 0;
  const refreshedSource =
    sourceSelection.trackId === activeTrackId
      ? sourceSelection.refreshedUrl
      : null;
  const selectedAudioSource =
    refreshedSource ?? trackSources[selectedCandidateIndex] ?? null;
  const {
    url: resolvedAudioSrc,
    isResolving: isResolvingAudioSrc,
  } = useResolvedMediaSource(
    selectedAudioSource,
    "audio",
  );
  const resolvedArtworkUrl = useResolvedMediaUrl(activeTrack?.artworkUrl ?? null, "image");
  const activePostId = activeTrack?.postId ?? null;
  const displayDuration =
    loadedDuration && Number.isFinite(loadedDuration)
      ? loadedDuration
      : activeTrack?.durationSeconds ?? null;
  const playerPostQuery = useQuery({
    queryKey: ["player-post", activePostId],
    queryFn: () => getResolvedPostById(activePostId!, viewer.userId),
    enabled: Boolean(activePostId),
  });
  const activeReleaseTrack = playerPostQuery.data?.releaseTracks.find(
    (entry) =>
      entry.track.song_version_id === activeTrack?.versionId
      || entry.version?.id === activeTrack?.versionId,
  ) ?? null;
  const heartsIndividualTrack = Boolean(
    playerPostQuery.data
    && playerPostQuery.data.post.post_type !== "single"
    && activeReleaseTrack?.version?.id,
  );
  const activeHeartState = heartsIndividualTrack
    ? Boolean(activeReleaseTrack?.viewerHasHeartedVersion)
    : Boolean(playerPostQuery.data?.viewerHasHearted);
  const heartMutation = useMutation({
    mutationFn: async () => {
      if (!viewer.userId) {
        throw new Error("Please sign in first.");
      }
      if (!activePostId) {
        throw new Error("No playable post is attached to this track.");
      }

      if (heartsIndividualTrack && activeReleaseTrack?.version?.id) {
        const result = await toggleVersionHeart({
          versionId: activeReleaseTrack.version.id,
          profileId: viewer.userId,
          active: !activeReleaseTrack.viewerHasHeartedVersion,
        });
        return { ...result, target: "song" as const };
      }

      const result = await togglePostHeart({
        postId: activePostId,
        profileId: viewer.userId,
        active: !playerPostQuery.data?.viewerHasHearted,
      });
      return { ...result, target: "release" as const };
    },
    onSuccess: async (result) => {
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
      toast.success(
        result.viewerHasHearted
          ? `${result.target === "song" ? "Song" : "Release"} hearted.`
          : "Heart removed.",
      );
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not update the heart.");
    },
  });

  function clearPendingPlaybackError() {
    if (playbackErrorTimeoutRef.current !== null) {
      window.clearTimeout(playbackErrorTimeoutRef.current);
      playbackErrorTimeoutRef.current = null;
    }
  }

  function clearStallRecovery() {
    if (stallRecoveryTimeoutRef.current !== null) {
      window.clearTimeout(stallRecoveryTimeoutRef.current);
      stallRecoveryTimeoutRef.current = null;
    }
  }

  function schedulePlaybackError(message: string, error?: unknown) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return;
    }

    clearPendingPlaybackError();
    const expectedTrackId = activeTrackId;
    const expectedSource = normalizeMediaSource(resolvedAudioSrc);

    playbackErrorTimeoutRef.current = window.setTimeout(() => {
      playbackErrorTimeoutRef.current = null;
      const audio = audioRef.current;
      const playerState = usePlayerStore.getState();

      if (!audio) {
        return;
      }

      const currentSource = normalizeMediaSource(audio.currentSrc || audio.src);
      if (!shouldReportPlaybackError({
        expectedTrackId,
        activeTrackId: playerState.activeTrackId,
        loadedTrackId: loadedTrackIdRef.current,
        expectedSource,
        currentSource,
        isPlaying: playerState.isPlaying,
        isPaused: audio.paused,
      })) {
        return;
      }

      const errorKey = `${expectedTrackId}:${currentSource ?? "unresolved"}`;
      if (lastPlaybackErrorKeyRef.current === errorKey) {
        return;
      }

      lastPlaybackErrorKeyRef.current = errorKey;
      toast.error(message);
    }, 700);
  }

  function playCurrentAudio(audio: HTMLAudioElement, expectedTrackId: string, message: string) {
    const playerState = usePlayerStore.getState();
    if (
      loadedTrackIdRef.current !== expectedTrackId
      || playerState.activeTrackId !== expectedTrackId
      || !playerState.isPlaying
    ) {
      return;
    }

    void audio.play().catch((error) => {
      schedulePlaybackError(message, error);
    });
  }

  async function recoverPlayback(reason: "error" | "stall" | "unresolved") {
    if (recoveryInFlightRef.current || !activeTrack) {
      return false;
    }

    const playerState = usePlayerStore.getState();
    if (
      playerState.activeTrackId !== activeTrack.id
      || !playerState.isPlaying
    ) {
      return false;
    }

    recoveryInFlightRef.current = true;
    clearStallRecovery();
    const audio = audioRef.current;
    pendingResumeSecondsRef.current = Math.max(
      audio?.currentTime ?? 0,
      playerState.currentTimeSeconds,
    );

    try {
      const nextCandidateIndex = selectedCandidateIndex + 1;
      if (!refreshedSource && nextCandidateIndex < trackSources.length) {
        sourceReloadCountRef.current = 0;
        setSourceSelection({
          trackId: activeTrack.id,
          candidateIndex: nextCandidateIndex,
          refreshedUrl: null,
        });
        return true;
      }

      if (
        activeTrack.protectedAssetId
        && protectedRefreshTrackIdRef.current !== activeTrack.id
      ) {
        protectedRefreshTrackIdRef.current = activeTrack.id;
        try {
          const freshUrl = await createProtectedMediaReadUrl(activeTrack.protectedAssetId);
          if (usePlayerStore.getState().activeTrackId !== activeTrack.id) {
            return true;
          }
          sourceReloadCountRef.current = 0;
          setSourceSelection({
            trackId: activeTrack.id,
            candidateIndex: selectedCandidateIndex,
            refreshedUrl: freshUrl,
          });
          return true;
        } catch {
          // Fall through to one same-source reconnect before reporting failure.
        }
      }

      if (
        audio
        && resolvedAudioSrc
        && sourceReloadCountRef.current < MAX_SOURCE_RELOADS
      ) {
        sourceReloadCountRef.current += 1;
        audio.pause();
        audio.load();
        return true;
      }

      return false;
    } finally {
      recoveryInFlightRef.current = false;
      if (reason !== "error") {
        lastPlaybackErrorKeyRef.current = null;
      }
    }
  }

  function scheduleStallRecovery() {
    if (stallRecoveryTimeoutRef.current !== null) {
      return;
    }

    stallRecoveryTimeoutRef.current = window.setTimeout(() => {
      stallRecoveryTimeoutRef.current = null;
      const audio = audioRef.current;
      const playerState = usePlayerStore.getState();
      if (
        !audio
        || !playerState.isPlaying
        || audio.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA
      ) {
        return;
      }

      void recoverPlayback("stall").then((recovered) => {
        if (!recovered) {
          schedulePlaybackError(
            "Playback was interrupted. Check the connection and try again.",
          );
        }
      });
    }, STALL_RECOVERY_DELAY_MS);
  }

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    audio.volume = volume;
  }, [volume]);

  useEffect(() => {
    if (appearance.remember_volume && !hasAdjustedVolume.current) {
      setVolume(appearance.player_volume);
    }
  }, [appearance.player_volume, appearance.remember_volume]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !activeTrack) {
      return;
    }

    if (!resolvedAudioSrc) {
      if (isResolvingAudioSrc) {
        return;
      }

      if (loadedTrackIdRef.current === activeTrack.id) {
        if (isPlaying) {
          void audio.play().catch((error) => {
            schedulePlaybackError("This track could not be played in the browser.", error);
          });
        } else {
          audio.pause();
        }
        return;
      }

      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      loadedTrackIdRef.current = null;
      return;
    }

    const nextResolvedSrc = normalizeMediaSource(resolvedAudioSrc);
    const currentLoadedSrc = normalizeMediaSource(audio.currentSrc || audio.src);
    const shouldReloadTrack =
      loadedTrackIdRef.current !== activeTrack.id
      || currentLoadedSrc !== nextResolvedSrc;

    if (shouldReloadTrack) {
      const trackChanged = loadedTrackIdRef.current !== activeTrack.id;
      const resumeAt = trackChanged
        ? 0
        : Math.max(
            pendingResumeSecondsRef.current,
            audio.currentTime,
            usePlayerStore.getState().currentTimeSeconds,
          );
      clearPendingPlaybackError();
      clearStallRecovery();
      lastPlaybackErrorKeyRef.current = null;
      audio.pause();
      audio.src = resolvedAudioSrc;
      audio.load();
      loadedTrackIdRef.current = activeTrack.id;
      pendingResumeSecondsRef.current = resumeAt;
      if (trackChanged) {
        setCurrentTime(0);
        setCurrentTimeSeconds(0);
      }
      setLoadedDuration(null);
    }

    if (isPlaying && audio.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
      playCurrentAudio(audio, activeTrack.id, "This track could not be played in the browser.");
    } else {
      if (!isPlaying) {
        audio.pause();
      }
    }
  }, [
    activeTrack,
    isPlaying,
    isResolvingAudioSrc,
    resolvedAudioSrc,
    setCurrentTimeSeconds,
  ]);

  useEffect(() => {
    clearPendingPlaybackError();
    clearStallRecovery();
    lastPlaybackErrorKeyRef.current = null;
    pendingResumeSecondsRef.current = 0;
    sourceReloadCountRef.current = 0;
    protectedRefreshTrackIdRef.current = null;
    setSourceSelection({
      trackId: activeTrackId,
      candidateIndex: 0,
      refreshedUrl: null,
    });
    setCurrentTime(0);
    setCurrentTimeSeconds(0);
    setLoadedDuration(null);
  }, [activeTrackId]);

  useEffect(() => () => {
    clearPendingPlaybackError();
    clearStallRecovery();
  }, []);

  useEffect(() => {
    if (
      !activeTrack
      || isResolvingAudioSrc
      || resolvedAudioSrc
      || !selectedAudioSource
    ) {
      return;
    }

    void recoverPlayback("unresolved").then((recovered) => {
      if (!recovered) {
        schedulePlaybackError("MxTrove could not resolve this audio source.");
      }
    });
  }, [
    activeTrack,
    isResolvingAudioSrc,
    resolvedAudioSrc,
    selectedAudioSource,
  ]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || requestedSeekSeconds === null) {
      return;
    }

    const applySeek = () => {
      const nextTime = Number.isFinite(audio.duration)
        ? Math.min(requestedSeekSeconds, audio.duration)
        : requestedSeekSeconds;
      audio.currentTime = nextTime;
      setCurrentTime(nextTime);
      setCurrentTimeSeconds(nextTime);
      consumeSeekRequest();
    };

    if (audio.readyState >= HTMLMediaElement.HAVE_METADATA) {
      applySeek();
      return;
    }

    audio.addEventListener("loadedmetadata", applySeek, { once: true });
    return () => audio.removeEventListener("loadedmetadata", applySeek);
  }, [consumeSeekRequest, requestedSeekSeconds, resolvedAudioSrc]);

  useEffect(() => {
    if (isCollapsed && isQueueOpen) {
      closeQueue();
    }
  }, [closeQueue, isCollapsed, isQueueOpen]);

  useEffect(() => {
    if (!activeTrack || !("mediaSession" in navigator)) {
      return;
    }

    navigator.mediaSession.metadata = new MediaMetadata({
      title: activeTrack.title,
      artist: activeTrack.artistName,
      album: activeTrack.queueGroupLabel ?? "MxTrove",
      artwork: [
        {
          src: resolvedArtworkUrl ?? `${window.location.origin}/mxtrove-icon-512.png`,
          sizes: "512x512",
        },
      ],
    });

    const setHandler = (
      action: MediaSessionAction,
      handler: MediaSessionActionHandler | null,
    ) => {
      try {
        navigator.mediaSession.setActionHandler(action, handler);
      } catch {
        // Some browsers expose Media Session while omitting individual actions.
      }
    };

    setHandler("play", () => setPlaying(true));
    setHandler("pause", () => setPlaying(false));
    setHandler("previoustrack", () => {
      const audio = audioRef.current;
      if (audio && audio.currentTime > 3) {
        handleSeek(0);
        return;
      }
      playPrevious();
    });
    setHandler("nexttrack", playNext);
    setHandler("seekbackward", (details) => {
      const audio = audioRef.current;
      if (audio) {
        handleSeek(Math.max(0, audio.currentTime - (details.seekOffset ?? 10)));
      }
    });
    setHandler("seekforward", (details) => {
      const audio = audioRef.current;
      if (audio) {
        handleSeek(
          Math.min(
            Number.isFinite(audio.duration) ? audio.duration : Number.MAX_SAFE_INTEGER,
            audio.currentTime + (details.seekOffset ?? 10),
          ),
        );
      }
    });
    setHandler("seekto", (details) => {
      if (typeof details.seekTime === "number") {
        handleSeek(details.seekTime);
      }
    });
    setHandler("stop", () => {
      handleSeek(0);
      setPlaying(false);
    });

    return () => {
      for (const action of [
        "play",
        "pause",
        "previoustrack",
        "nexttrack",
        "seekbackward",
        "seekforward",
        "seekto",
        "stop",
      ] satisfies MediaSessionAction[]) {
        setHandler(action, null);
      }
    };
  }, [
    activeTrack,
    playNext,
    playPrevious,
    resolvedArtworkUrl,
    setPlaying,
  ]);

  useEffect(() => {
    if (!("mediaSession" in navigator)) {
      return;
    }

    navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
  }, [isPlaying]);

  useEffect(() => {
    if (
      !("mediaSession" in navigator)
      || !displayDuration
      || displayDuration <= 0
      || !Number.isFinite(currentTime)
    ) {
      return;
    }

    try {
      navigator.mediaSession.setPositionState({
        duration: displayDuration,
        playbackRate: audioRef.current?.playbackRate ?? 1,
        position: Math.min(Math.max(currentTime, 0), displayDuration),
      });
    } catch {
      // Position state is additive and unsupported on a few mobile browsers.
    }
  }, [currentTime, displayDuration]);

  if (!activeTrack) {
    return null;
  }

  const progressPercent =
    displayDuration && displayDuration > 0
      ? Math.min((currentTime / displayDuration) * 100, 100)
      : 0;
  const hasPreviousTrack =
    activeTrackIndex > 0 || (repeatMode === "all" && queue.length > 1);
  const hasNextTrack =
    (activeTrackIndex >= 0 && activeTrackIndex < queue.length - 1) ||
    (repeatMode === "all" && queue.length > 1);
  const isHearted = activeHeartState;
  const isOwnPost = Boolean(playerPostQuery.data?.owner?.id && viewer.userId === playerPostQuery.data.owner.id);
  const canOpenActivePost = Boolean(activePostId);
  const repeatLabel =
    repeatMode === "off"
      ? "Repeat off"
      : repeatMode === "all"
        ? "Repeat queue"
        : "Repeat current track";

  function handleSeek(nextTime: number) {
    const audio = audioRef.current;
    setCurrentTime(nextTime);
    setCurrentTimeSeconds(nextTime);

    if (audio) {
      audio.currentTime = nextTime;
    }
  }

  function handleSeekFromPosition(clientX: number, element: HTMLElement) {
    if (!displayDuration || displayDuration <= 0) {
      return;
    }

    const bounds = element.getBoundingClientRect();
    if (bounds.width <= 0) {
      return;
    }

    const ratio = Math.min(Math.max((clientX - bounds.left) / bounds.width, 0), 1);
    handleSeek(displayDuration * ratio);
  }

  function handlePreviousClick() {
    const audio = audioRef.current;

    if (audio && currentTime > 3) {
      audio.currentTime = 0;
      setCurrentTime(0);
      setCurrentTimeSeconds(0);
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
      setCurrentTimeSeconds(0);
      void audio.play().catch((error) => {
        schedulePlaybackError("This track could not be replayed in the browser.", error);
      });
      return;
    }

    if (
      appearance.autoplay_next &&
      activeTrackIndex >= 0 &&
      activeTrackIndex < queue.length - 1
    ) {
      playNext();
      return;
    }

    if (appearance.autoplay_next && repeatMode === "all" && queue[0]) {
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

  function openActivePost() {
    if (!activePostId) {
      return;
    }

    navigate(`/post/${activePostId}`);
  }

  function changeVolume(nextVolume: number) {
    hasAdjustedVolume.current = true;
    setVolume(nextVolume);
  }

  function persistVolume() {
    if (
      !appearance.remember_volume ||
      Math.abs(appearance.player_volume - volume) < 0.001
    ) {
      return;
    }

    void updateAppearance({ ...appearance, player_volume: volume }).catch(() => {
      toast.error("MxTrove could not remember this volume level.");
    });
  }

  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+5.75rem)] z-40 border-t border-white/10 bg-[radial-gradient(circle_at_center_top,rgba(var(--accent-rgb),0.14),transparent_28%),linear-gradient(180deg,rgba(8,6,19,0.96),rgba(7,5,17,0.98))] shadow-[0_-24px_60px_rgba(0,0,0,0.42)] backdrop-blur-2xl transition-opacity xl:bottom-0",
        isSurfaceHidden && "pointer-events-none opacity-0 xl:pointer-events-auto xl:opacity-100",
      )}
    >
      {isQueueOpen && !isCollapsed ? (
        <div className="mx-auto hidden max-w-[1600px] px-4 pt-4 md:px-8 xl:block">
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
            <div className="mt-4 grid max-h-[min(48dvh,480px)] gap-2 overflow-y-auto overscroll-contain pr-1">
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
      {isQueueOpen && !isCollapsed
        ? createPortal(
            <div className="fixed inset-0 z-[70] xl:hidden">
              <button
                type="button"
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={closeQueue}
                aria-label="Close playback queue"
              />
              <section
                role="dialog"
                aria-modal="true"
                aria-label="Playback queue"
                className="absolute inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+1rem)] max-h-[min(72dvh,620px)] overflow-hidden rounded-[30px] border border-border bg-[linear-gradient(180deg,rgba(18,14,35,0.99),rgba(9,7,21,0.99))] shadow-[0_28px_90px_rgba(0,0,0,0.62)]"
              >
                <div className="flex items-center justify-between border-b border-white/8 px-5 py-4">
                  <div>
                    <p className="font-medium">Playback queue</p>
                    <p className="text-sm text-muted-foreground">
                      {queue.length} track{queue.length === 1 ? "" : "s"}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-full border border-white/8"
                    onClick={closeQueue}
                  >
                    Close
                  </Button>
                </div>
                <div className="max-h-[calc(min(72dvh,620px)-5.25rem)] overflow-y-auto p-3">
                  {queue.map((track, index) => (
                    <button
                      key={track.id}
                      type="button"
                      className={cn(
                        "mb-2 flex w-full min-w-0 items-center justify-between gap-3 rounded-[19px] border border-white/8 px-4 py-3 text-left",
                        track.id === activeTrackId && "border-accent/30 bg-accent/12",
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
                          {track.artistName}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        <PlaybackDuration
                          src={track.srcCandidates ?? track.src}
                          fallbackDurationSeconds={track.durationSeconds ?? null}
                        />
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            </div>,
            document.body,
          )
        : null}
      <audio
        ref={audioRef}
        onEnded={handleEnded}
        onError={() => {
          void recoverPlayback("error").then((recovered) => {
            if (!recovered) {
              schedulePlaybackError("MxTrove could not load this audio source.");
            }
          });
        }}
        onCanPlay={() => {
          clearPendingPlaybackError();
          clearStallRecovery();
          const audio = audioRef.current;
          const expectedTrackId = loadedTrackIdRef.current;
          if (audio && expectedTrackId) {
            playCurrentAudio(audio, expectedTrackId, "This track could not be played in the browser.");
          }
        }}
        onPlaying={() => {
          clearPendingPlaybackError();
          clearStallRecovery();
          sourceReloadCountRef.current = 0;
          lastPlaybackErrorKeyRef.current = null;
        }}
        onProgress={clearStallRecovery}
        onWaiting={scheduleStallRecovery}
        onStalled={scheduleStallRecovery}
        onLoadedMetadata={(event) => {
          clearPendingPlaybackError();
          const duration = event.currentTarget.duration;
          setLoadedDuration(Number.isFinite(duration) ? duration : null);
          const resumeAt = pendingResumeSecondsRef.current;
          if (resumeAt > 0) {
            event.currentTarget.currentTime = Number.isFinite(duration)
              ? Math.min(resumeAt, duration)
              : resumeAt;
            setCurrentTime(event.currentTarget.currentTime);
            setCurrentTimeSeconds(event.currentTarget.currentTime);
            pendingResumeSecondsRef.current = 0;
          }
        }}
        onDurationChange={(event) => {
          const duration = event.currentTarget.duration;
          setLoadedDuration(Number.isFinite(duration) ? duration : null);
        }}
        preload="auto"
        onTimeUpdate={(event) => {
          clearStallRecovery();
          const nextTime = event.currentTarget.currentTime;
          setCurrentTime(nextTime);
          setCurrentTimeSeconds(nextTime);
        }}
      />
      <div
        className={cn(
          "mx-auto max-w-[1660px] px-4 pt-3 md:px-8",
          isCollapsed ? "pb-3 md:pb-4" : "pb-4 md:pb-5",
        )}
      >
        {isCollapsed ? (
          <div className="velvet-hero overflow-hidden rounded-[28px] border border-border bg-[linear-gradient(180deg,rgba(12,9,25,0.96),rgba(7,6,18,0.96))] px-4 py-3 shadow-[0_-10px_40px_rgba(0,0,0,0.12)] md:px-5">
            <button
              type="button"
              className="mb-3 block w-full disabled:cursor-default"
              onClick={(event) => handleSeekFromPosition(event.clientX, event.currentTarget)}
              disabled={!displayDuration}
              aria-label="Seek through the current track"
            >
              <div className="h-1 overflow-hidden rounded-full bg-white/[0.08]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-accent to-accent-secondary"
                  style={{ width: `${Math.max(progressPercent, 0)}%` }}
                />
              </div>
            </button>
            <div className="flex items-center gap-3">
              {canOpenActivePost ? (
                <button
                  type="button"
                  className="size-12 overflow-hidden rounded-[16px] border border-border bg-[radial-gradient(circle_at_top,rgba(var(--accent-rgb),0.3),rgba(255,255,255,0.04)_55%,rgba(10,8,24,0.94))] shadow-[0_12px_28px_rgba(7,3,20,0.24)] transition-[transform,border-color] hover:scale-[1.02] hover:border-accent/25"
                  onClick={openActivePost}
                  aria-label="Open current release"
                >
                  {activeTrack.artworkUrl ? (
                    <ResolvedImage
                      className="size-full object-cover"
                      src={activeTrack.artworkUrl}
                      alt={activeTrack.title}
                    />
                  ) : null}
                </button>
              ) : (
                <div className="size-12 overflow-hidden rounded-[16px] border border-border bg-[radial-gradient(circle_at_top,rgba(var(--accent-rgb),0.3),rgba(255,255,255,0.04)_55%,rgba(10,8,24,0.94))] shadow-[0_12px_28px_rgba(7,3,20,0.24)]">
                  {activeTrack.artworkUrl ? (
                    <ResolvedImage
                      className="size-full object-cover"
                      src={activeTrack.artworkUrl}
                      alt={activeTrack.title}
                    />
                  ) : null}
                </div>
              )}

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
                className="size-11 rounded-full border-accent/35 p-0 shadow-[0_14px_34px_rgba(var(--accent-rgb),0.32)]"
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
            <div className="mb-4 flex items-center justify-end xl:hidden">
              <Button
                variant="ghost"
                size="sm"
                className="rounded-full border border-white/8 bg-white/[0.03] px-3"
                onClick={toggleCollapsed}
                aria-label="Collapse player"
                aria-pressed={!isCollapsed}
              >
                <ChevronDown className="size-4" />
              </Button>
            </div>
            <div className="grid gap-5 xl:grid-cols-[1.05fr_minmax(520px,1.5fr)_0.95fr] xl:items-center">
              <div className="flex min-w-0 items-center gap-4">
                {canOpenActivePost ? (
                  <button
                    type="button"
                    className="size-18 overflow-hidden rounded-[24px] border border-border bg-[radial-gradient(circle_at_top,rgba(var(--accent-rgb),0.3),rgba(255,255,255,0.04)_55%,rgba(10,8,24,0.94))] shadow-[0_16px_42px_rgba(7,3,20,0.32)] transition-[transform,border-color] hover:scale-[1.01] hover:border-accent/25"
                    onClick={openActivePost}
                    aria-label="Open current release"
                  >
                    {activeTrack.artworkUrl ? (
                      <ResolvedImage
                        className="size-full object-cover"
                        src={activeTrack.artworkUrl}
                        alt={activeTrack.title}
                      />
                    ) : null}
                  </button>
                ) : (
                  <div className="size-18 overflow-hidden rounded-[24px] border border-border bg-[radial-gradient(circle_at_top,rgba(var(--accent-rgb),0.3),rgba(255,255,255,0.04)_55%,rgba(10,8,24,0.94))] shadow-[0_16px_42px_rgba(7,3,20,0.32)]">
                    {activeTrack.artworkUrl ? (
                      <ResolvedImage
                        className="size-full object-cover"
                        src={activeTrack.artworkUrl}
                        alt={activeTrack.title}
                      />
                    ) : null}
                  </div>
                )}
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
                    className="size-16 rounded-full border-accent/45 p-0 shadow-[0_18px_48px_rgba(var(--accent-rgb),0.44)]"
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
                      {appearance.show_waveforms ? (
                        <Waveform
                          waveform={activeTrack.waveform ?? null}
                          durationSeconds={displayDuration}
                          currentTime={currentTime}
                          onSeek={handleSeek}
                          disabled={!displayDuration}
                          barCount={56}
                          trackClassName="h-8"
                        />
                      ) : (
                        <button
                          type="button"
                          className="block h-8 w-full disabled:cursor-default"
                          disabled={!displayDuration}
                          onClick={(event) =>
                            handleSeekFromPosition(event.clientX, event.currentTarget)
                          }
                          aria-label="Seek through the current track"
                        >
                          <span className="block h-2 overflow-hidden rounded-full bg-white/[0.08]">
                            <span
                              className="block h-full rounded-full bg-gradient-to-r from-accent to-accent-secondary"
                              style={{ width: `${Math.max(progressPercent, 0)}%` }}
                            />
                          </span>
                        </button>
                      )}
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
                    aria-label={
                      isOwnPost
                        ? `You cannot heart your own ${heartsIndividualTrack ? "song" : "post"}`
                        : isHearted
                          ? `Remove ${heartsIndividualTrack ? "song" : "release"} heart`
                          : `Heart this ${heartsIndividualTrack ? "song" : "release"}`
                    }
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
                  className="hidden rounded-full border border-white/8 bg-white/[0.03] xl:inline-flex"
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
                    onChange={(event) => changeVolume(Number(event.currentTarget.value))}
                    onPointerUp={persistVolume}
                    onKeyUp={persistVolume}
                    onBlur={persistVolume}
                    aria-label="Playback volume"
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
