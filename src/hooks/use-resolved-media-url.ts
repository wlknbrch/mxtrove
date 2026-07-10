import { useEffect, useState } from "react";

import { isInlineAssetUrl, shouldFetchPublicMediaAsBlob } from "@/lib/asset-urls";

const resolvedMediaUrlCache = new Map<string, string | null>();
const pendingMediaUrlCache = new Map<string, Promise<string | null>>();

function normalizeCandidates(input: string | string[] | null | undefined) {
  const values = Array.isArray(input) ? input : input ? [input] : [];
  return values.filter((value, index, entries): value is string => Boolean(value) && entries.indexOf(value) === index);
}

function isExpectedBlobType(blob: Blob, mediaType: "audio" | "image") {
  if (!blob.type) {
    return mediaType === "audio";
  }

  if (mediaType === "audio") {
    return blob.type.startsWith("audio/") || blob.type === "application/octet-stream";
  }

  return blob.type.startsWith("image/");
}

async function resolveMediaUrl(candidates: string[], mediaType: "audio" | "image") {
  for (const candidate of candidates) {
    if (isInlineAssetUrl(candidate) || candidate.startsWith("blob:")) {
      return candidate;
    }

    if (!shouldFetchPublicMediaAsBlob(candidate, mediaType)) {
      return candidate;
    }

    try {
      const response = await fetch(candidate, {
        credentials: "omit",
        method: "GET",
        mode: "cors",
      });

      if (!response.ok) {
        continue;
      }

      const blob = await response.blob();
      if (!isExpectedBlobType(blob, mediaType)) {
        continue;
      }

      return URL.createObjectURL(blob);
    } catch {
      continue;
    }
  }

  return candidates[0] ?? null;
}

export function useResolvedMediaUrl(
  input: string | string[] | null | undefined,
  mediaType: "audio" | "image",
) {
  const candidates = normalizeCandidates(input);
  const cacheKey = `${mediaType}:${candidates.join("|")}`;
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(() => {
    if (!candidates.length) {
      return null;
    }

    return resolvedMediaUrlCache.get(cacheKey) ?? null;
  });

  useEffect(() => {
    if (!candidates.length) {
      setResolvedUrl(null);
      return;
    }

    const cached = resolvedMediaUrlCache.get(cacheKey);
    if (typeof cached !== "undefined") {
      setResolvedUrl(cached);
      return;
    }

    let cancelled = false;
    const pending =
      pendingMediaUrlCache.get(cacheKey) ?? resolveMediaUrl(candidates, mediaType);

    pendingMediaUrlCache.set(cacheKey, pending);

    void pending.then((nextUrl) => {
      pendingMediaUrlCache.delete(cacheKey);
      resolvedMediaUrlCache.set(cacheKey, nextUrl);

      if (!cancelled) {
        setResolvedUrl(nextUrl);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [cacheKey, mediaType]);

  return resolvedUrl;
}
