export interface RateLimitPolicy {
  bucket: string;
  limit: number;
  windowMs: number;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
}

export function selectRateLimitPolicy(method: string, pathname: string): RateLimitPolicy | null {
  if (pathname === "/healthz" || pathname === "/readyz") {
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

export class InMemoryRateLimiter {
  private readonly entries = new Map<string, RateLimitEntry>();

  check(key: string, policy: RateLimitPolicy, now = Date.now()): RateLimitResult {
    const existing = this.entries.get(key);
    const entry = !existing || existing.resetAt <= now
      ? { count: 0, resetAt: now + policy.windowMs }
      : existing;
    entry.count += 1;
    this.entries.set(key, entry);

    return {
      allowed: entry.count <= policy.limit,
      limit: policy.limit,
      remaining: Math.max(0, policy.limit - entry.count),
      retryAfterSeconds: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
    };
  }

  prune(now = Date.now()) {
    for (const [key, entry] of this.entries) {
      if (entry.resetAt <= now) {
        this.entries.delete(key);
      }
    }
  }
}
