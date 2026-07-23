import sharp from "sharp";
import { beforeAll, describe, expect, it } from "vitest";

let buildCardSvg: typeof import("./routes.js").buildCardSvg;

beforeAll(async () => {
  process.env.SUPABASE_URL ||= "https://example.supabase.co";
  process.env.SUPABASE_SECRET_KEY ||= "test-service-role-key";
  process.env.PROTECTED_MEDIA_SIGNING_SECRET ||= "test-signing-secret-with-enough-entropy";
  ({ buildCardSvg } = await import("./routes.js"));
});

describe("social preview cards", () => {
  it("renders a 1200x630 PNG and escapes untrusted release text", async () => {
    const svg = buildCardSvg({
      eyebrow: "single release",
      title: `<script>alert("x")</script>`,
      subtitle: "Kai & Luna",
      description: "A public release with its own MxShare card.",
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
});
