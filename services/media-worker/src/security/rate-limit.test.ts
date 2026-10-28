import { describe, expect, it } from "vitest";

import { selectRateLimitPolicy } from "./rate-limit.js";

describe("worker rate limiting", () => {
  it("uses separate policies for media reads, uploads, and social cards", () => {
    expect(selectRateLimitPolicy("GET", "/healthz")).toBeNull();
    expect(selectRateLimitPolicy("GET", "/readyz")?.bucket).toBe("read");
    expect(selectRateLimitPolicy("GET", "/v1/protected-media/asset")?.bucket).toBe("media-read");
    expect(selectRateLimitPolicy("PUT", "/v1/media/jobs/job/input")?.bucket).toBe("upload");
    expect(selectRateLimitPolicy("POST", "/v1/media/analyze-song")?.bucket).toBe("upload");
    expect(selectRateLimitPolicy("GET", "/og/post/id.png")?.bucket).toBe("social");
  });

});
