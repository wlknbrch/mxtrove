import { useMediaDuration } from "@/hooks/use-media-duration";
import { formatDuration } from "@/lib/utils";

export function PlaybackDuration({
  src,
  fallbackDurationSeconds,
}: {
  src: string | string[] | null | undefined;
  fallbackDurationSeconds?: number | null;
}) {
  const durationSeconds = useMediaDuration(src, fallbackDurationSeconds);

  return <>{formatDuration(durationSeconds)}</>;
}
