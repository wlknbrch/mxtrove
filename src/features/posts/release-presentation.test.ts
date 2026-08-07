import { describe, expect, it } from "vitest";

import {
  parseReleaseCredits,
  parseReleaseExternalLinks,
  mergePrimaryReleaseUrl,
  ReleasePresentationValidationError,
  validateOptionalHttpsUrl,
} from "@/features/posts/release-presentation";

describe("release presentation parsing", () => {
  it("normalizes human-readable credit roles", () => {
    expect(parseReleaseCredits("Mina Cole | Mix Engineer")).toEqual([{
      profile_id: null,
      display_name: "Mina Cole",
      role: "mix_engineer",
      position: 1,
    }]);
  });

  it("reports the exact invalid credit line", () => {
    expect(() => parseReleaseCredits("Ari | producer\nMina | wizard"))
      .toThrowError(/Credit line 2 uses an unknown role/);
  });

  it("accepts a plain HTTPS URL and supplies safe defaults", () => {
    expect(parseReleaseExternalLinks("https://example.com/release")).toEqual([{
      label: "Release link",
      url: "https://example.com/release",
      platform: "other",
      position: 1,
    }]);
  });

  it("rejects insecure URLs before saving", () => {
    expect(() => validateOptionalHttpsUrl("http://example.com"))
      .toThrowError(new ReleasePresentationValidationError("releaseUrl", "External links must start with https://."));
  });

  it("keeps the dedicated release URL as the primary external link", () => {
    const links = parseReleaseExternalLinks("Website | https://example.com | website");

    expect(mergePrimaryReleaseUrl("https://music.example/release", links).map((link) => link.url)).toEqual([
      "https://music.example/release",
      "https://example.com/",
    ]);
  });
});
