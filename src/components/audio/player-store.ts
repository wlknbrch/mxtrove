import { create } from "zustand";

export interface PlaybackTrack {
  id: string;
  postId?: string | null;
  releaseTrackId?: string | null;
  versionId?: string | null;
  title: string;
  artistName: string;
  artworkUrl?: string | string[] | null;
  src: string;
  srcCandidates?: string[] | null;
  protectedAssetId?: string | null;
  durationSeconds?: number | null;
  waveform?: import("@/types/domain").WaveformDataV1 | null;
  lyrics?: string | null;
  versionLabel?: string | null;
  queueGroupLabel?: string | null;
}

interface PlayerState {
  queue: PlaybackTrack[];
  activeTrackId: string | null;
  isPlaying: boolean;
  repeatMode: "off" | "all" | "one";
  isQueueOpen: boolean;
  isSurfaceHidden: boolean;
  currentTimeSeconds: number;
  requestedSeekSeconds: number | null;
  enqueue: (tracks: PlaybackTrack[], startTrackId?: string, autoPlay?: boolean) => void;
  playTrack: (trackId: string) => void;
  setPlaying: (isPlaying: boolean) => void;
  setCurrentTimeSeconds: (seconds: number) => void;
  toggle: () => void;
  playNext: () => void;
  playPrevious: () => void;
  cycleRepeatMode: () => void;
  toggleQueue: () => void;
  closeQueue: () => void;
  setSurfaceHidden: (hidden: boolean) => void;
  requestSeek: (seconds: number) => void;
  consumeSeekRequest: () => void;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  queue: [],
  activeTrackId: null,
  isPlaying: false,
  repeatMode: "off",
  isQueueOpen: false,
  isSurfaceHidden: false,
  currentTimeSeconds: 0,
  requestedSeekSeconds: null,
  enqueue: (tracks, startTrackId, autoPlay = true) =>
    set({
      queue: tracks,
      activeTrackId: startTrackId ?? tracks[0]?.id ?? null,
      isPlaying: autoPlay && tracks.length > 0,
      isQueueOpen: false,
      currentTimeSeconds: 0,
    }),
  playTrack: (trackId) => set({ activeTrackId: trackId, isPlaying: true, currentTimeSeconds: 0 }),
  setPlaying: (isPlaying) => set({ isPlaying }),
  setCurrentTimeSeconds: (seconds) => set({ currentTimeSeconds: Math.max(0, seconds) }),
  toggle: () => set((state) => ({ isPlaying: !state.isPlaying })),
  playNext: () => {
    const { queue, activeTrackId, repeatMode } = get();
    const index = queue.findIndex((track) => track.id === activeTrackId);

    if (index === -1) {
      if (queue[0]) {
        set({ activeTrackId: queue[0].id, isPlaying: true });
      }
      return;
    }

    if (index >= 0 && index < queue.length - 1) {
      set({ activeTrackId: queue[index + 1].id, isPlaying: true, currentTimeSeconds: 0 });
      return;
    }

    if (repeatMode === "all" && queue[0]) {
      set({ activeTrackId: queue[0].id, isPlaying: true, currentTimeSeconds: 0 });
    }
  },
  playPrevious: () => {
    const { queue, activeTrackId, repeatMode } = get();
    const index = queue.findIndex((track) => track.id === activeTrackId);

    if (index > 0) {
      set({ activeTrackId: queue[index - 1].id, isPlaying: true, currentTimeSeconds: 0 });
      return;
    }

    if (index === 0 && repeatMode === "all" && queue.length > 1) {
      set({ activeTrackId: queue[queue.length - 1].id, isPlaying: true, currentTimeSeconds: 0 });
    }
  },
  cycleRepeatMode: () =>
    set((state) => ({
      repeatMode:
        state.repeatMode === "off"
          ? "all"
          : state.repeatMode === "all"
            ? "one"
            : "off",
    })),
  toggleQueue: () => set((state) => ({ isQueueOpen: !state.isQueueOpen })),
  closeQueue: () => set({ isQueueOpen: false }),
  setSurfaceHidden: (hidden) => set({ isSurfaceHidden: hidden }),
  requestSeek: (seconds) => set({ requestedSeekSeconds: Math.max(0, seconds) }),
  consumeSeekRequest: () => set({ requestedSeekSeconds: null }),
}));
