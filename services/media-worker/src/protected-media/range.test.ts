import { describe, expect, it } from "vitest";

import { parseByteRange } from "./range.js";

describe("parseByteRange", () => {
  it("parses bounded, open-ended, and suffix ranges", () => {
    expect(parseByteRange("bytes=10-19", 100)).toEqual({ start: 10, end: 19 });
    expect(parseByteRange("bytes=90-", 100)).toEqual({ start: 90, end: 99 });
    expect(parseByteRange("bytes=-12", 100)).toEqual({ start: 88, end: 99 });
  });

  it("clamps the end and rejects malformed or unsatisfiable ranges", () => {
    expect(parseByteRange("bytes=90-200", 100)).toEqual({ start: 90, end: 99 });
    expect(() => parseByteRange("bytes=100-101", 100)).toThrow("Invalid range");
    expect(() => parseByteRange("items=1-2", 100)).toThrow("Invalid range");
    expect(() => parseByteRange("bytes=8-2", 100)).toThrow("Invalid range");
  });
});
