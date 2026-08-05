import { useEffect, useState } from "react";

import { isInlineAssetUrl, shouldFetchPublicMediaAsBlob } from "@/lib/asset-urls";

const resolvedMediaUrlCache = new Map<string, string | null>();
const pendingMediaUrlCache = new Map<string, Promise<string | null>>();

function normalizeCandidates(input: string | string[] | null | undefined) {
  const values = Array.isArray(input) ? input : input ? [input] : [];
  return values.filter((value, index, entries): value is string => Boolean(value) && entries.indexOf(value) === index);
}

function getMediaCacheKey(candidates: string[], mediaType: "audio" | "image") {
  return `${mediaType}:${candidates.join("|")}`;
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

  return null;
}

export function prefetchResolvedMediaSource(
  input: string | string[] | null | undefined,
  mediaType: "audio" | "image",
) {
  const candidates = normalizeCandidates(input);
  if (!candidates.length) {
    return Promise.resolve(null);
  }

  const cacheKey = getMediaCacheKey(candidates, mediaType);
  if (resolvedMediaUrlCache.has(cacheKey)) {
    return Promise.resolve(resolvedMediaUrlCache.get(cacheKey) ?? null);
  }

  const existing = pendingMediaUrlCache.get(cacheKey);
  if (existing) {
    return existing;
  }

  const pending = resolveMediaUrl(candidates, mediaType).then((nextUrl) => {
    pendingMediaUrlCache.delete(cacheKey);
    resolvedMediaUrlCache.set(cacheKey, nextUrl);
    return nextUrl;
  });
  pendingMediaUrlCache.set(cacheKey, pending);
  return pending;
}

export function useResolvedMediaSource(
  input: string | string[] | null | undefined,
  mediaType: "audio" | "image",
) {
  const candidates = normalizeCandidates(input);
  const cacheKey = getMediaCacheKey(candidates, mediaType);
  const [resolvedMedia, setResolvedMedia] = useState<{
    cacheKey: string;
    url: string | null;
    isResolving: boolean;
  }>(() => ({
    cacheKey,
    url: candidates.length ? resolvedMediaUrlCache.get(cacheKey) ?? null : null,
    isResolving: candidates.length > 0 && !resolvedMediaUrlCache.has(cacheKey),
  }));

  useEffect(() => {
    if (!candidates.length) {
      setResolvedMedia({ cacheKey, url: null, isResolving: false });
      return;
    }

    const cached = resolvedMediaUrlCache.get(cacheKey);
    if (typeof cached !== "undefined") {
      setResolvedMedia({ cacheKey, url: cached, isResolving: false });
      return;
    }

    // Do not let a previous track's resolved URL leak into the next render
    // while a proxied media candidate is still being fetched.
    setResolvedMedia({ cacheKey, url: null, isResolving: true });
    let cancelled = false;
    const pending = prefetchResolvedMediaSource(candidates, mediaType);

    void pending.then((nextUrl) => {
      if (!cancelled) {
        setResolvedMedia({ cacheKey, url: nextUrl, isResolving: false });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [cacheKey, mediaType]);

  if (resolvedMedia.cacheKey === cacheKey) {
    return {
      url: resolvedMedia.url,
      isResolving: resolvedMedia.isResolving,
    };
  }

  return {
    url: resolvedMediaUrlCache.get(cacheKey) ?? null,
    isResolving: candidates.length > 0 && !resolvedMediaUrlCache.has(cacheKey),
  };
}

export function useResolvedMediaUrl(
  input: string | string[] | null | undefined,
  mediaType: "audio" | "image",
) {
  return useResolvedMediaSource(input, mediaType).url;
}
