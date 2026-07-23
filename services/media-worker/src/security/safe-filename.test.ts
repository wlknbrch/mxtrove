import { describe, expect, it } from "vitest";

import {
  safeContentDispositionFilename,
  sanitizeIncomingFilename,
} from "./safe-filename.js";

describe("safe media filenames", () => {
  it("decodes a client filename and removes path and header control characters", () => {
    expect(
      sanitizeIncomingFilename("..%2Fmix%5C%22final%22%0D%0AContent-Type%3Atext%2Fhtml.wav"),
    ).toBe(".._mix__final___Content-Type:text_html.wav");
  });

  it("normalizes whitespace, bounds length, and always returns a fallback", () => {
    expect(sanitizeIncomingFilename("  vocal   take 03.wav  ")).toBe("vocal take 03.wav");
    expect(sanitizeIncomingFilename("\n\r/\\\"")).toBe("_____");
    expect(sanitizeIncomingFilename("a".repeat(300))).toHaveLength(180);
    expect(sanitizeIncomingFilename(undefined)).toBe("attachment");
  });

  it("produces a filename that cannot break Content-Disposition", () => {
    const safe = safeContentDispositionFilename("cover\"\r\nX-Evil: yes.png");
    expect(safe).not.toMatch(/[\r\n"\\/]/);
    expect(safe).toContain("cover_");
  });
});
