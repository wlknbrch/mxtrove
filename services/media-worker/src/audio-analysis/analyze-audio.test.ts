import { describe, expect, it } from "vitest";

import {
  AUDIO_ANALYSIS_HOP_SIZE,
  AUDIO_ANALYSIS_FRAME_SIZE,
  AUDIO_ANALYSIS_SAMPLE_RATE,
  analyzeAudioPcm,
  detectKeyFromChroma,
  detectTempoFromPcm,
  detectTempoFromOnsetEnvelope,
  roundDetectedTempoBpm,
} from "./analyze-audio.js";

function createClickTrack(tempoBpm: number, seconds = 20) {
  const samples = new Float32Array(AUDIO_ANALYSIS_SAMPLE_RATE * seconds);
  const beatIntervalSamples = AUDIO_ANALYSIS_SAMPLE_RATE * 60 / tempoBpm;
  for (let position = 0; position < samples.length; position += beatIntervalSamples) {
    const start = Math.round(position);
    for (let offset = 0; offset < 180 && start + offset < samples.length; offset += 1) {
      samples[start + offset] += Math.exp(-offset / 35)
        * Math.sin(2 * Math.PI * 90 * offset / AUDIO_ANALYSIS_SAMPLE_RATE);
    }
  }
  return samples;
}

describe("audio metadata analysis", () => {
  it("rounds the final detected tempo to whole BPM", () => {
    expect(roundDetectedTempoBpm(330.9)).toBe(331);
    expect(roundDetectedTempoBpm(120.4)).toBe(120);
    expect(roundDetectedTempoBpm(null)).toBeNull();
  });

  it("detects a regular 120 BPM onset pattern", () => {
    const hopDuration = AUDIO_ANALYSIS_HOP_SIZE / AUDIO_ANALYSIS_SAMPLE_RATE;
    const interval = Math.round(60 / (120 * hopDuration));
    const onsets = new Array<number>(320).fill(0);
    for (let index = 0; index < onsets.length; index += interval) onsets[index] = 1;

    const result = detectTempoFromOnsetEnvelope(onsets, hopDuration);
    expect(result.tempoBpm).toBeGreaterThanOrEqual(115);
    expect(result.tempoBpm).toBeLessThanOrEqual(125);
    expect(result.confidence).toBeGreaterThan(0.5);
  });

  it("matches a C-major chroma profile", () => {
    const result = detectKeyFromChroma([6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88]);
    expect(result.musicalKey).toBe("C major");
    expect(result.confidence).toBeGreaterThan(0.5);
  });

  it.each([72, 90, 120, 150, 174])("tracks a %i BPM click pattern", (expectedTempo) => {
    const result = detectTempoFromPcm(createClickTrack(expectedTempo));
    expect(result.tempoBpm).toBeCloseTo(expectedTempo, 0);
    expect(result.confidence).toBeGreaterThan(0.5);
  });

  it("uses representative sections when the intro has no beat", () => {
    const intro = new Float32Array(AUDIO_ANALYSIS_SAMPLE_RATE * 35);
    const beat = createClickTrack(128, 70);
    const samples = new Float32Array(intro.length + beat.length);
    samples.set(intro);
    samples.set(beat, intro.length);

    const result = detectTempoFromPcm(samples);
    expect(result.tempoBpm).toBeCloseTo(128, 0);
  });

  it("extracts features from decoded PCM through the Meyda runtime", () => {
    const samples = new Float32Array(AUDIO_ANALYSIS_FRAME_SIZE * 2);
    for (let index = 0; index < samples.length; index += 1) {
      samples[index] = Math.sin(2 * Math.PI * 261.63 * index / AUDIO_ANALYSIS_SAMPLE_RATE) * 0.25;
    }

    const result = analyzeAudioPcm(Buffer.from(samples.buffer));
    expect(result.musicalKey).not.toBeNull();
  });
});
