import { zodResolver } from "@hookform/resolvers/zod";
import { describe, expect, it } from "vitest";
import { profileSchema, songSchema, type ProfileFormInput } from "./validators";

describe("patched Zod/resolver form contracts", () => {
  it("keeps profile input strings separate from the normalized nullable submission", async () => {
    const input: ProfileFormInput = { display_name: " Fixture Artist ", username: "fixture_artist", website_url: "", instagram_url: "", spotify_url: "", youtube_url: "", support_url: "" };
    const result = await zodResolver(profileSchema)(input, undefined, { fields: {}, shouldUseNativeValidation: false });
    expect(result.errors).toEqual({});
    expect(result.values).toMatchObject({ display_name: "Fixture Artist", website_url: null, instagram_url: null });
    expect(profileSchema.safeParse({ ...input, website_url: "javascript:alert(1)" }).success).toBe(false);
  });

  it("normalizes empty/numeric tempo and retains validation messages", () => {
    expect(songSchema.parse({ title: "Track", tempo_bpm: "" }).tempo_bpm).toBeNull();
    expect(songSchema.parse({ title: "Track", tempo_bpm: "123.5" }).tempo_bpm).toBe(123.5);
    expect(songSchema.parse({ title: "Track", tempo_bpm: 120 }).tempo_bpm).toBe(120);
    const invalid = songSchema.safeParse({ title: "Track", tempo_bpm: "not a tempo" });
    expect(invalid.success).toBe(false);
    if (!invalid.success) expect(invalid.error.issues[0].message).toBe("Please enter a valid tempo.");
    expect(songSchema.safeParse({ title: "Track", tempo_bpm: 401 }).success).toBe(false);
    expect(songSchema.safeParse({ title: "Track", lyrics: "x".repeat(50_001) }).success).toBe(false);
  });
});
