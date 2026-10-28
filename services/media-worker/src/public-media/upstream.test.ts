import { describe, expect, it, vi } from "vitest";
import { fetchPublicProviderMedia, getDropboxPublicMediaUrl } from "./upstream.js";

describe("public media outbound boundary", () => {
  it.each([
    "https://127.0.0.1/secrets", "http://169.254.169.254/latest/meta-data/",
    "https://[::1]/", "https://drive.google.com.evil.test/file", "https://evil.test/?next=dropbox.com",
    "https://www.dropbox.com:8443/file", "https://user:pass@www.dropbox.com/file", "file:///etc/passwd",
  ])("rejects untrusted initial destination %s before fetch", async (url) => {
    const fetchMock = vi.fn<typeof fetch>();
    await expect(fetchPublicProviderMedia(url, {}, fetchMock)).rejects.toThrow("Unsupported public media destination");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each(["http://169.254.169.254/", "https://127.0.0.1/", "https://[::1]/", "https://evil.test/", "https://www.dropbox.com:8443/", "https://x:y@drive.google.com/"])("blocks unsafe redirect %s without a second fetch", async (location) => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response("redirect", { status: 302, headers: { Location: location } }));
    await expect(fetchPublicProviderMedia("https://www.dropbox.com/scl/fi/id/preview.mp3", {}, fetchMock)).rejects.toThrow("Unsupported public media destination");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][1]?.redirect).toBe("manual");
  });

  it("allows trusted provider CDN redirects and preserves HEAD/Range", async () => {
    const done = new Response(null, { status: 206, headers: { "Content-Range": "bytes 0-99/1000" } });
    const fetchMock = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(null, { status: 302, headers: { Location: "https://dl.dropboxusercontent.com/scl/fi/id/preview.mp3?raw=1" } }))
      .mockResolvedValueOnce(done);
    const headers = new Headers({ Range: "bytes=0-99" });
    expect(await fetchPublicProviderMedia("https://www.dropbox.com/scl/fi/id/preview.mp3", { method: "HEAD", headers }, fetchMock)).toBe(done);
    expect(fetchMock.mock.calls[1][1]?.method).toBe("HEAD");
    expect(fetchMock.mock.calls[1][1]?.headers).toBe(headers);
  });

  it("bounds redirect loops", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockImplementation(async () => new Response(null, { status: 302, headers: { Location: "/loop" } }));
    await expect(fetchPublicProviderMedia("https://drive.google.com/loop", {}, fetchMock)).rejects.toThrow("excessive public media redirects");
    expect(fetchMock).toHaveBeenCalledTimes(6);
  });

  it("builds Dropbox origin from a fixed allowlist and drops fragments", () => {
    expect(getDropboxPublicMediaUrl("https://www.dropbox.com/scl/fi/id/file.mp3?raw=1#fragment")).toBe("https://www.dropbox.com/scl/fi/id/file.mp3?raw=1");
    expect(getDropboxPublicMediaUrl("https://www.dropbox.com:8443/file")).toBeNull();
    expect(getDropboxPublicMediaUrl("https://unknown.dropbox.com/file")).toBeNull();
  });
});
