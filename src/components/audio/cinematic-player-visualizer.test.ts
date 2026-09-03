import { describe, expect, it } from "vitest";

import {
  sampleWaveformDynamics,
  smoothWaveformDynamics,
} from "@/components/audio/cinematic-player-visualizer";
import type { WaveformDataV1 } from "@/types/domain";

function createWaveform(peaks: Array<[number, number]>): WaveformDataV1 {
  return {
    version: 1,
    durationSeconds: 10,
    sourceSampleRate: 44_100,
    analysisSampleRate: 8000,
    bucketCount: peaks.length,
    peaks,
  };
}

describe("sampleWaveformDynamics", () => {
  it("returns animated fallback motion when no waveform exists", () => {
    const first = sampleWaveformDynamics(null, 2, 10);
    const second = sampleWaveformDynamics(null, 2.5, 10);

    expect(first.energy).toBeGreaterThan(0.2);
    expect(first.body).toBeGreaterThan(0.2);
    expect(second).not.toEqual(first);
  });

  it("raises visual energy and beat response around a waveform transient", () => {
    const quietPeaks = Array.from({ length: 80 }, () => [-0.08, 0.08] as [number, number]);
    const transientPeaks = quietPeaks.map((peak) => [...peak] as [number, number]);
    transientPeaks[40] = [-1, 1];
    transientPeaks[41] = [-0.86, 0.86];
    const waveform = createWaveform(transientPeaks);

    const quiet = sampleWaveformDynamics(waveform, 2, 10);
    const transient = sampleWaveformDynamics(waveform, 5.05, 10);

    expect(transient.energy).toBeGreaterThan(quiet.energy);
    expect(transient.detail).toBeGreaterThan(quiet.detail);
    expect(transient.beat).toBeGreaterThan(quiet.beat);
  });

  it("clamps positions beyond the track duration to the final bucket", () => {
    const waveform = createWaveform([
      [-0.1, 0.1],
      [-0.25, 0.25],
      [-0.7, 0.7],
    ]);

    expect(sampleWaveformDynamics(waveform, 99, 10))
      .toEqual(sampleWaveformDynamics(waveform, 10, 10));
  });

  it("blends brightness changes while keeping beat attacks responsive", () => {
    const quiet = { energy: 0.2, body: 0.2, detail: 0.1, beat: 0 };
    const loud = { energy: 1, body: 0.9, detail: 0.8, beat: 1 };
    const first = smoothWaveformDynamics(quiet, loud, 1 / 30);

    expect(first.energy).toBeGreaterThan(quiet.energy);
    expect(first.energy).toBeLessThan(loud.energy);
    expect(first.beat).toBeGreaterThan(first.energy - quiet.energy);

    const release = smoothWaveformDynamics(first, quiet, 1 / 30);
    expect(release.energy).toBeGreaterThan(quiet.energy);
    expect(release.beat).toBeGreaterThan(0);
  });
});
