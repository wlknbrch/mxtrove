import sharp from "sharp";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

let buildCardSvg: typeof import("./routes.js").buildCardSvg;
let getPublicAssetUrls: typeof import("./routes.js").getPublicAssetUrls;
let resolvePublicAssetImageDataUrl: typeof import("./routes.js").resolvePublicAssetImageDataUrl;

beforeAll(async () => {
  process.env.SUPABASE_URL ||= "https://example.supabase.co";
  process.env.SUPABASE_SECRET_KEY ||= "test-service-role-key";
  process.env.PROTECTED_MEDIA_SIGNING_SECRET ||= "test-signing-secret-with-enough-entropy";
  ({
    buildCardSvg,
    getPublicAssetUrls,
    resolvePublicAssetImageDataUrl,
  } = await import("./routes.js"));
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("social preview cards", () => {
  it("renders a 1200x630 PNG and escapes untrusted release text", async () => {
    const svg = buildCardSvg({
      eyebrow: "single release",
      title: `<script>alert("x")</script>`,
      subtitle: "Kai & Luna",
      description: "A public release with its own MxTrove card.",
      imageDataUrl: null,
    });

    expect(svg).not.toContain("<script>");
    expect(svg).toContain("&lt;script&gt;");
    expect(svg).toContain("Kai &amp; Luna");

    const png = await sharp(Buffer.from(svg)).png().toBuffer();
    const metadata = await sharp(png).metadata();
    expect(metadata).toMatchObject({
      format: "png",
      width: 1200,
      height: 630,
    });
  });

  it("renders embedded artwork into the final PNG", async () => {
    const artwork = await sharp({
      create: {
        width: 40,
        height: 40,
        channels: 3,
        background: "#ff2100",
      },
    }).png().toBuffer();
    const svg = buildCardSvg({
      eyebrow: "album release",
      title: "Visible artwork",
      subtitle: "MxTrove artist",
      description: "The cover must survive the SVG-to-PNG render.",
      imageDataUrl: `data:image/png;base64,${artwork.toString("base64")}`,
    });
    const png = await sharp(Buffer.from(svg)).png().toBuffer();
    const pixel = await sharp(png)
      .extract({ left: 278, top: 314, width: 1, height: 1 })
      .removeAlpha()
      .raw()
      .toBuffer();

    expect([...pixel]).toEqual([255, 33, 0]);
  });

  it("builds multiple public artwork candidates for Google Drive releases", () => {
    const urls = getPublicAssetUrls({
      provider: "google_drive",
      remote_file_id: "1AbCdEfGhIjKlMnOpQrStUvwxYZ",
      share_url: "https://drive.google.com/uc?export=download&id=1AbCdEfGhIjKlMnOpQrStUvwxYZ",
      view_url: "https://drive.google.com/file/d/1AbCdEfGhIjKlMnOpQrStUvwxYZ/view",
      thumbnail_url: "https://lh3.googleusercontent.com/stale-private-thumb",
    });

    const proxyUrl = new URL(urls[0]!);
    expect(proxyUrl.origin).toBe("https://example.supabase.co");
    expect(proxyUrl.pathname).toBe("/functions/v1/drive-media");
    expect(proxyUrl.searchParams.get("fileId")).toBe("1AbCdEfGhIjKlMnOpQrStUvwxYZ");
    expect(proxyUrl.searchParams.get("kind")).toBe("image");
    expect(proxyUrl.searchParams.get("size")).toBe("w1200");
    expect(urls).toContain("https://lh3.googleusercontent.com/stale-private-thumb");
    expect(urls).toContain(
      "https://drive.google.com/thumbnail?id=1AbCdEfGhIjKlMnOpQrStUvwxYZ&sz=w1200",
    );
    expect(urls).toContain(
      "https://lh3.googleusercontent.com/d/1AbCdEfGhIjKlMnOpQrStUvwxYZ=w1200",
    );
    expect(urls).toContain(
      "https://drive.usercontent.google.com/download?id=1AbCdEfGhIjKlMnOpQrStUvwxYZ&export=view&authuser=0",
    );
  });

  it("routes Dropbox artwork through the public media proxy first", () => {
    const sourceUrl = "https://www.dropbox.com/scl/fi/abc123/cover.png?rlkey=public&raw=1";
    const urls = getPublicAssetUrls({
      provider: "dropbox",
      remote_file_id: "id:dropbox-cover",
      share_url: sourceUrl,
      view_url: "https://www.dropbox.com/scl/fi/abc123/cover.png?rlkey=public&dl=0",
      thumbnail_url: null,
    });

    const proxyUrl = new URL(urls[0]!);
    expect(proxyUrl.origin).toBe("https://example.supabase.co");
    expect(proxyUrl.pathname).toBe("/functions/v1/drive-media");
    expect(proxyUrl.searchParams.get("provider")).toBe("dropbox");
    expect(proxyUrl.searchParams.get("kind")).toBe("image");
    expect(proxyUrl.searchParams.get("url")).toBe(sourceUrl);
  });

  it("falls back to the next artwork candidate when the first link is stale", async () => {
    const png = await sharp({
      create: {
        width: 40,
        height: 40,
        channels: 3,
        background: "#9d5cff",
      },
    }).png().toBuffer();

    const fetchMock = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response("<html>expired thumbnail</html>", {
          status: 200,
          headers: { "content-type": "text/html; charset=utf-8" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(png, {
          status: 200,
          headers: { "content-type": "application/octet-stream" },
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const imageDataUrl = await resolvePublicAssetImageDataUrl({
      provider: "google_drive",
      remote_file_id: "1AbCdEfGhIjKlMnOpQrStUvwxYZ",
      share_url: "https://drive.google.com/uc?export=download&id=1AbCdEfGhIjKlMnOpQrStUvwxYZ",
      view_url: "https://drive.google.com/file/d/1AbCdEfGhIjKlMnOpQrStUvwxYZ/view",
      thumbnail_url: "https://lh3.googleusercontent.com/stale-private-thumb",
    });

    expect(imageDataUrl).toMatch(/^data:image\/png;base64,/);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain(
      "example.supabase.co/functions/v1/drive-media",
    );
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain(
      "lh3.googleusercontent.com/stale-private-thumb",
    );
  });
});
