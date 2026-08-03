import { describe, expect, it } from "vitest";

import { InMemoryRateLimiter, selectRateLimitPolicy } from "./rate-limit.js";

describe("worker rate limiting", () => {
  it("uses separate policies for media reads, uploads, and social cards", () => {
    expect(selectRateLimitPolicy("GET", "/healthz")).toBeNull();
    expect(selectRateLimitPolicy("GET", "/v1/protected-media/asset")?.bucket).toBe("media-read");
    expect(selectRateLimitPolicy("PUT", "/v1/media/jobs/job/input")?.bucket).toBe("upload");
    expect(selectRateLimitPolicy("POST", "/v1/media/analyze-song")?.bucket).toBe("upload");
    expect(selectRateLimitPolicy("GET", "/og/post/id.png")?.bucket).toBe("social");
  });

  it("rejects requests over the window limit and resets afterwards", () => {
    const limiter = new InMemoryRateLimiter();
    const policy = { bucket: "test", limit: 2, windowMs: 1000 };

    expect(limiter.check("test:client", policy, 100).allowed).toBe(true);
    expect(limiter.check("test:client", policy, 200).allowed).toBe(true);
    expect(limiter.check("test:client", policy, 300).allowed).toBe(false);
    expect(limiter.check("test:client", policy, 1100).allowed).toBe(true);
  });
});
