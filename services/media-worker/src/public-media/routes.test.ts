import Fastify from "fastify";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getDropboxPublicMediaUrl, registerPublicMediaRoutes } from "./routes.js";

const fetchMock = vi.fn<typeof fetch>();

async function buildApp() {
  const app = Fastify();
  await registerPublicMediaRoutes(app);
  await app.ready();
  return app;
}

describe("public media proxy validation", () => {
  it("accepts public Dropbox HTTPS links", () => {
    expect(getDropboxPublicMediaUrl("https://www.dropbox.com/scl/fi/id/preview.mp3?raw=1"))
      .toBe("https://www.dropbox.com/scl/fi/id/preview.mp3?raw=1");
  });

  it("rejects non-Dropbox and credential-bearing links", () => {
    expect(getDropboxPublicMediaUrl("https://example.com/file.mp3")).toBeNull();
    expect(getDropboxPublicMediaUrl("https://user:pass@dropbox.com/file.mp3")).toBeNull();
    expect(getDropboxPublicMediaUrl("http://dropbox.com/file.mp3")).toBeNull();
  });
});

describe("public media transient google responses", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
  });

  afterEach(async () => {
    await app?.close();
    vi.unstubAllGlobals();
  });

  it("retries fresh previews against the alternate download host instead of streaming a bare 410", async () => {
    app = await buildApp();
    fetchMock
      .mockResolvedValueOnce(new Response("gone", { status: 410 }))
      .mockResolvedValueOnce(new Response("audio", { status: 200, headers: { "Content-Type": "audio/mpeg" } }));

    const response = await app.inject({ method: "GET", url: "/v1/public-media?fileId=abcdefghijklmnopqrst&kind=audio" });

    expect(response.statusCode).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[1][0])).toContain("drive.usercontent.google.com/download");
    expect(response.body).toBe("audio");
  });

  it("answers 502 when both google hosts stay transient so clients retry instead of caching a 410", async () => {
    app = await buildApp();
    fetchMock
      .mockResolvedValueOnce(new Response("gone", { status: 410 }))
      .mockResolvedValueOnce(new Response("gone too", { status: 410 }));

    const response = await app.inject({ method: "GET", url: "/v1/public-media?fileId=abcdefghijklmnopqrst&kind=audio" });

    expect(response.statusCode).toBe(502);
    expect(response.json().error).toContain("not publicly readable yet");
  });

  it("passes successful and non-transient upstream statuses through unchanged", async () => {
    app = await buildApp();
    fetchMock
      .mockResolvedValueOnce(new Response("audio", { status: 200, headers: { "Content-Type": "audio/mpeg" } }))
      .mockResolvedValueOnce(new Response("missing", { status: 404 }));

    const healthy = await app.inject({ method: "GET", url: "/v1/public-media?fileId=abcdefghijklmnopqrst&kind=audio" });
    expect(healthy.statusCode).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const missing = await app.inject({ method: "GET", url: "/v1/public-media?fileId=abcdefghijklmnopqrst&kind=audio" });
    expect(missing.statusCode).toBe(404);
  });
});
