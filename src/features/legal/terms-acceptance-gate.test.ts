import { describe, expect, it } from "vitest";

import { hasAcceptedCurrentTerms } from "@/features/legal/terms-acceptance-gate";

describe("Terms acceptance gate", () => {
  it("accepts only the currently published Terms version", () => {
    expect(hasAcceptedCurrentTerms({
      profile_id: "profile-1",
      terms_version: "2026-08-05",
      accepted_at: "2026-08-05T10:00:00.000Z",
    })).toBe(true);

    expect(hasAcceptedCurrentTerms({
      profile_id: "profile-1",
      terms_version: "2026-08-04",
      accepted_at: "2026-08-04T10:00:00.000Z",
    })).toBe(false);
    expect(hasAcceptedCurrentTerms(null)).toBe(false);
  });
});
