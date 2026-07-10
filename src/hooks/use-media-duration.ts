import { useEffect, useMemo, useState } from "react";

import { useResolvedMediaUrl } from "@/hooks/use-resolved-media-url";

const mediaDurationCache = new Map<string, number | null>();
const pendingMediaDurationCache = new Map<string, Promise<number | null>>();

async function resolveMediaDuration(src: string) {
  const audio = new Audio();
  audio.preload = "metadata";

  return new Promise<number | null>((resolve) => {
    const cleanup = () => {
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("error", handleError);
      audio.src = "";
    };

    const handleLoadedMetadata = () => {
      const duration = audio.duration;
      cleanup();
      resolve(Number.isFinite(duration) ? duration : null);
    };

    const handleError = () => {
      cleanup();
      resolve(null);
    };

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("error", handleError);
    audio.src = src;
  });
}

export function useMediaDuration(
  input: string | string[] | null | undefined,
  fallbackDurationSeconds?: number | null,
) {
  const resolvedSrc = useResolvedMediaUrl(input, "audio");
  const [durationSeconds, setDurationSeconds] = useState<number | null>(
    typeof fallbackDurationSeconds === "number" ? fallbackDurationSeconds : null,
  );
  const normalizedFallback = useMemo(
    () => (typeof fallbackDurationSeconds === "number" ? fallbackDurationSeconds : null),
    [fallbackDurationSeconds],
  );

  useEffect(() => {
    if (normalizedFallback !== null) {
      setDurationSeconds(normalizedFallback);
    }
  }, [normalizedFallback]);

  useEffect(() => {
    if (!resolvedSrc) {
      return;
    }

    const cachedDuration = mediaDurationCache.get(resolvedSrc);
    if (typeof cachedDuration !== "undefined") {
      setDurationSeconds(cachedDuration);
      return;
    }

    let cancelled = false;
    const pending =
      pendingMediaDurationCache.get(resolvedSrc) ?? resolveMediaDuration(resolvedSrc);

    pendingMediaDurationCache.set(resolvedSrc, pending);

    void pending.then((nextDuration) => {
      pendingMediaDurationCache.delete(resolvedSrc);
      mediaDurationCache.set(resolvedSrc, nextDuration);

      if (!cancelled) {
        setDurationSeconds(nextDuration);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [resolvedSrc]);

  return durationSeconds;
}
