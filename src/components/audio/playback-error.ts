export function shouldReportPlaybackError({
  expectedTrackId,
  activeTrackId,
  loadedTrackId,
  expectedSource,
  currentSource,
  isPlaying,
  isPaused,
}: {
  expectedTrackId: string | null;
  activeTrackId: string | null;
  loadedTrackId: string | null;
  expectedSource: string | null;
  currentSource: string | null;
  isPlaying: boolean;
  isPaused: boolean;
}) {
  if (
    !expectedTrackId
    || activeTrackId !== expectedTrackId
    || loadedTrackId !== expectedTrackId
    || !isPlaying
    || !isPaused
  ) {
    return false;
  }

  return !expectedSource || currentSource === expectedSource;
}
