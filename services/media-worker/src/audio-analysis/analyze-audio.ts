import MeydaModule, { type MeydaFeaturesObject, type MeydaSignal } from "meyda";
import MusicTempoModule from "music-tempo";

export const AUDIO_ANALYSIS_SAMPLE_RATE = 11025;
export const AUDIO_ANALYSIS_FRAME_SIZE = 4096;
export const AUDIO_ANALYSIS_HOP_SIZE = 512;

interface MeydaApi {
  bufferSize: number;
  sampleRate: number;
  chromaBands: number;
  windowingFunction: string;
  extract: (
    features: Array<"chroma" | "rms">,
    signal: MeydaSignal,
  ) => Partial<MeydaFeaturesObject> | null;
}

// Meyda 5's NodeNext declaration exposes the module namespace although its runtime export is the API object.
const Meyda = MeydaModule as unknown as MeydaApi;
const MusicTempo = MusicTempoModule as unknown as typeof MusicTempoModule;

const TEMPO_ANALYSIS_SEGMENT_SECONDS = 30;
const TEMPO_ANALYSIS_MAX_SEGMENTS = 3;

const majorProfile = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const minorProfile = [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];
const pitchNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

export interface AudioAnalysisResult {
  tempoBpm: number | null;
  tempoConfidence: number | null;
  musicalKey: string | null;
  keyConfidence: number | null;
}

export function roundDetectedTempoBpm(tempoBpm: number | null) {
  return tempoBpm == null ? null : Math.round(tempoBpm);
}

function correlation(left: number[], right: number[]) {
  const leftMean = left.reduce((sum, value) => sum + value, 0) / left.length;
  const rightMean = right.reduce((sum, value) => sum + value, 0) / right.length;
  let numerator = 0;
  let leftEnergy = 0;
  let rightEnergy = 0;

  for (let index = 0; index < left.length; index += 1) {
    const leftDelta = left[index] - leftMean;
    const rightDelta = right[index] - rightMean;
    numerator += leftDelta * rightDelta;
    leftEnergy += leftDelta * leftDelta;
    rightEnergy += rightDelta * rightDelta;
  }

  return numerator / Math.sqrt(Math.max(Number.EPSILON, leftEnergy * rightEnergy));
}

export function detectKeyFromChroma(chroma: number[]) {
  if (chroma.length !== 12 || chroma.every((value) => value <= 0)) {
    return { musicalKey: null, confidence: null };
  }

  const candidates = pitchNames.flatMap((pitchName, root) => [
    {
      musicalKey: `${pitchName} major`,
      score: correlation(chroma, chroma.map((_, pitch) => majorProfile[(pitch - root + 12) % 12])),
    },
    {
      musicalKey: `${pitchName} minor`,
      score: correlation(chroma, chroma.map((_, pitch) => minorProfile[(pitch - root + 12) % 12])),
    },
  ]).sort((left, right) => right.score - left.score);

  const best = candidates[0];
  const runnerUp = candidates[1];
  if (!best || best.score <= 0) {
    return { musicalKey: null, confidence: null };
  }

  return {
    musicalKey: best.musicalKey,
    confidence: Math.max(0, Math.min(1, (best.score + 1) / 2 * 0.7 + Math.max(0, best.score - runnerUp.score) * 0.3)),
  };
}

export function detectTempoFromOnsetEnvelope(onsets: number[], hopDurationSeconds: number) {
  if (onsets.length < 32 || onsets.every((value) => value <= 0)) {
    return { tempoBpm: null, confidence: null };
  }

  const mean = onsets.reduce((sum, value) => sum + value, 0) / onsets.length;
  const centered = onsets.map((value) => Math.max(0, value - mean * 0.5));
  const minimumLag = Math.max(1, Math.floor(60 / (210 * hopDurationSeconds)));
  const maximumLag = Math.min(centered.length - 2, Math.ceil(60 / (55 * hopDurationSeconds)));
  const candidates: Array<{ lag: number; score: number }> = [];

  for (let lag = minimumLag; lag <= maximumLag; lag += 1) {
    let product = 0;
    let leftEnergy = 0;
    let rightEnergy = 0;
    for (let index = lag; index < centered.length; index += 1) {
      const left = centered[index];
      const right = centered[index - lag];
      product += left * right;
      leftEnergy += left * left;
      rightEnergy += right * right;
    }
    const bpm = 60 / (lag * hopDurationSeconds);
    const normalized = product / Math.sqrt(Math.max(Number.EPSILON, leftEnergy * rightEnergy));
    const centerPreference = 1 - Math.min(0.08, Math.abs(Math.log2(bpm / 120)) * 0.04);
    candidates.push({ lag, score: normalized * centerPreference });
  }

  candidates.sort((left, right) => right.score - left.score);
  const best = candidates[0];
  if (!best || best.score < 0.05) {
    return { tempoBpm: null, confidence: null };
  }

  const previous = candidates.find((candidate) => candidate.lag === best.lag - 1)?.score ?? best.score;
  const next = candidates.find((candidate) => candidate.lag === best.lag + 1)?.score ?? best.score;
  const denominator = previous - 2 * best.score + next;
  const interpolation = Math.abs(denominator) > Number.EPSILON
    ? Math.max(-0.5, Math.min(0.5, 0.5 * (previous - next) / denominator))
    : 0;
  const refinedLag = best.lag + interpolation;

  return {
    tempoBpm: Math.round((60 / (refinedLag * hopDurationSeconds)) * 10) / 10,
    confidence: Math.max(0, Math.min(1, best.score)),
  };
}

function detectTempoCandidate(samples: Float32Array) {
  try {
    const hopSize = 110;
    const analysis = new MusicTempo(samples, {
      bufferSize: 512,
      hopSize,
      timeStep: hopSize / AUDIO_ANALYSIS_SAMPLE_RATE,
      minBeatInterval: 60 / 210,
      maxBeatInterval: 60 / 55,
      expiryTime: 20,
    });
    const tempoBpm = Number(analysis.tempo);
    if (!Number.isFinite(tempoBpm) || tempoBpm < 55 || tempoBpm > 210) {
      return null;
    }

    const trackedBeatCount = analysis.beats.length;
    return {
      tempoBpm: Math.round(tempoBpm * 10) / 10,
      confidence: Math.min(0.98, 0.55 + Math.min(0.43, trackedBeatCount / 160)),
    };
  } catch {
    return null;
  }
}

function getTempoAnalysisSegments(samples: Float32Array) {
  const segmentLength = AUDIO_ANALYSIS_SAMPLE_RATE * TEMPO_ANALYSIS_SEGMENT_SECONDS;
  if (samples.length <= segmentLength) return [samples];

  const offsets = samples.length <= segmentLength * 2
    ? [0, samples.length - segmentLength]
    : [0, Math.floor((samples.length - segmentLength) / 2), samples.length - segmentLength];

  return offsets
    .slice(0, TEMPO_ANALYSIS_MAX_SEGMENTS)
    .map((offset) => samples.subarray(offset, offset + segmentLength));
}

export function detectTempoFromPcm(samples: Float32Array) {
  const candidates = getTempoAnalysisSegments(samples)
    .map(detectTempoCandidate)
    .filter((candidate): candidate is NonNullable<typeof candidate> => candidate != null)
    .sort((left, right) => left.tempoBpm - right.tempoBpm);

  if (candidates.length === 0) {
    return { tempoBpm: null, confidence: null };
  }

  const medianTempo = candidates[Math.floor(candidates.length / 2)].tempoBpm;
  const matchingCandidates = candidates.filter(
    (candidate) => Math.abs(candidate.tempoBpm - medianTempo) <= Math.max(2, medianTempo * 0.04),
  );
  const tempoBpm = matchingCandidates.reduce((sum, candidate) => sum + candidate.tempoBpm, 0)
    / matchingCandidates.length;
  const averageConfidence = matchingCandidates.reduce((sum, candidate) => sum + candidate.confidence, 0)
    / matchingCandidates.length;
  const agreement = matchingCandidates.length / candidates.length;

  return {
    tempoBpm: Math.round(tempoBpm * 10) / 10,
    confidence: Math.min(0.98, averageConfidence * (0.7 + agreement * 0.3)),
  };
}

export function analyzeAudioPcm(pcm: Buffer): AudioAnalysisResult {
  const sampleCount = Math.floor(pcm.byteLength / Float32Array.BYTES_PER_ELEMENT);
  if (sampleCount < AUDIO_ANALYSIS_FRAME_SIZE) {
    return { tempoBpm: null, tempoConfidence: null, musicalKey: null, keyConfidence: null };
  }

  const samples = new Float32Array(pcm.buffer, pcm.byteOffset, sampleCount);
  const accumulatedChroma = new Array<number>(12).fill(0);
  const rmsFrames: number[] = [];
  let chromaWeight = 0;

  Meyda.bufferSize = AUDIO_ANALYSIS_FRAME_SIZE;
  Meyda.sampleRate = AUDIO_ANALYSIS_SAMPLE_RATE;
  Meyda.chromaBands = 12;
  Meyda.windowingFunction = "hanning";

  for (let offset = 0; offset + AUDIO_ANALYSIS_FRAME_SIZE <= samples.length; offset += AUDIO_ANALYSIS_HOP_SIZE) {
    const frame = samples.subarray(offset, offset + AUDIO_ANALYSIS_FRAME_SIZE);
    const features = Meyda.extract(["chroma", "rms"], frame);
    const rms = Number(features?.rms ?? 0);
    rmsFrames.push(rms);

    const chroma = features?.chroma;
    if (!chroma || rms < 0.002) continue;
    const weight = Math.min(1, rms * 8);
    for (let pitch = 0; pitch < 12; pitch += 1) {
      accumulatedChroma[pitch] += Number(chroma[pitch] ?? 0) * weight;
    }
    chromaWeight += weight;
  }

  const onsets = rmsFrames.map((rms, index) => {
    if (index === 0) return 0;
    return Math.max(0, rms - rmsFrames[index - 1] * 0.92);
  });
  const beatrootTempo = detectTempoFromPcm(samples);
  const fallbackTempo = detectTempoFromOnsetEnvelope(
    onsets,
    AUDIO_ANALYSIS_HOP_SIZE / AUDIO_ANALYSIS_SAMPLE_RATE,
  );
  const tempo = beatrootTempo.tempoBpm != null ? beatrootTempo : fallbackTempo;
  const normalizedChroma = chromaWeight > 0
    ? accumulatedChroma.map((value) => value / chromaWeight)
    : accumulatedChroma;
  const key = detectKeyFromChroma(normalizedChroma);

  return {
    tempoBpm: roundDetectedTempoBpm(tempo.tempoBpm),
    tempoConfidence: tempo.confidence,
    musicalKey: key.musicalKey,
    keyConfidence: key.confidence,
  };
}
