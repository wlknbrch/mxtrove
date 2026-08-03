import { describe, expect, it } from "vitest";

import { isListedOnProfile } from "@/features/profile/profile-post-visibility";

describe("profile post visibility", () => {
  it.each(["public", "followers"] as const)("lists %s releases on profiles when database access permits it", (visibility) => {
    expect(isListedOnProfile(visibility)).toBe(true);
  });

  it.each(["private", "unlisted"] as const)("keeps %s releases off profile listings", (visibility) => {
    expect(isListedOnProfile(visibility)).toBe(false);
  });
});
