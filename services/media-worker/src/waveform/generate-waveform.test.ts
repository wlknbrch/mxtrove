import { describe, expect, it } from "vitest";

import { generateWaveformFromPcm } from "./generate-waveform.js";

describe("generateWaveformFromPcm", () => {
  it("generates detailed normalized min/max peaks", () => {
    const pcm = Buffer.alloc(16);
    [-32768, -16384, 0, 16384, 32767, 12000, -12000, 0].forEach((sample, index) => {
      pcm.writeInt16LE(sample, index * 2);
    });

    const waveform = generateWaveformFromPcm(pcm, 1);

    expect(waveform.version).toBe(1);
    expect(waveform.bucketCount).toBe(6);
    expect(waveform.peaks).toHaveLength(6);
    expect(Math.min(...waveform.peaks.map(([min]) => min))).toBe(-1);
    expect(Math.max(...waveform.peaks.map(([, max]) => max))).toBeGreaterThan(0.99);
  });

  it("returns a valid silent bucket for empty input", () => {
    expect(generateWaveformFromPcm(Buffer.alloc(0), 0)).toMatchObject({
      bucketCount: 1,
      peaks: [[0, 0]],
    });
  });
});
