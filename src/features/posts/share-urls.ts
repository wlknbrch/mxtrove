function appendVersion(url: URL, updatedAt?: string | null) {
  if (updatedAt) {
    url.searchParams.set("v", updatedAt);
  }
  return url.toString();
}

export function buildPublicReleaseShareUrl(
  origin: string,
  postId: string,
  updatedAt?: string | null,
) {
  return appendVersion(
    new URL(`/social/post/${encodeURIComponent(postId)}`, origin),
    updatedAt,
  );
}

export function buildPublicTrackShareUrl(
  origin: string,
  postId: string,
  releaseTrackId: string,
  updatedAt?: string | null,
) {
  return appendVersion(
    new URL(
      `/social/post/${encodeURIComponent(postId)}/track/${encodeURIComponent(releaseTrackId)}`,
      origin,
    ),
    updatedAt,
  );
}
