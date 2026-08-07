import { describe, expect, it } from "vitest";

import { validateAppFeedback } from "@/features/legal/feedback-api";

describe("validateAppFeedback", () => {
  it("requires useful copy and reproducible context", () => {
    expect(validateAppFeedback({
      subject: "No",
      details: "Too short",
      pageContext: "",
      screenshot: null,
    })).toEqual({
      subject: "Use a subject between 3 and 120 characters.",
      details: "Describe what happened in 20 to 5,000 characters.",
      context: "Choose the affected area or attach a screenshot so the issue can be reproduced.",
    });
  });

  it("accepts an affected page without a screenshot", () => {
    expect(validateAppFeedback({
      subject: "Player skips the next track",
      details: "The next song stays paused when the app is running in the background.",
      pageContext: "Mobile player / installed app",
      screenshot: null,
    })).toEqual({});
  });

  it("rejects oversized screenshots", () => {
    const screenshot = new File([new Uint8Array(5 * 1024 * 1024 + 1)], "bug.png", {
      type: "image/png",
    });

    expect(validateAppFeedback({
      subject: "Visual problem",
      details: "The layout overlaps after opening the settings profile page.",
      pageContext: "",
      screenshot,
    }).screenshot).toBe("The screenshot must be 5 MB or smaller.");
  });
});
