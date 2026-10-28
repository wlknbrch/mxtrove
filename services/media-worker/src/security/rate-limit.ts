export interface RateLimitPolicy {
  bucket: string;
  limit: number;
  windowMs: number;
}

export function selectRateLimitPolicy(method: string, pathname: string): RateLimitPolicy | null {
  if (pathname === "/healthz") {
    return null;
  }
  if (pathname.startsWith("/social/") || pathname.startsWith("/og/")) {
    return { bucket: "social", limit: 120, windowMs: 60_000 };
  }
  if (method === "GET" || method === "HEAD") {
    if (pathname === "/v1/public-media") {
      return { bucket: "public-media", limit: 1200, windowMs: 60_000 };
    }
    if (pathname.startsWith("/v1/protected-media/")) {
      return { bucket: "media-read", limit: 600, windowMs: 60_000 };
    }
    return { bucket: "read", limit: 240, windowMs: 60_000 };
  }
  if (
    pathname.includes("/attachments")
    || pathname.endsWith("/input")
    || pathname === "/v1/media/jobs"
    || pathname === "/v1/media/analyze-song"
  ) {
    return { bucket: "upload", limit: 30, windowMs: 60_000 };
  }
  return { bucket: "mutation", limit: 120, windowMs: 60_000 };
}
