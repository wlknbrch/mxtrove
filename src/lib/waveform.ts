import type { Asset, WaveformDataV1 } from "@/types/domain";

function clampPeak(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(-1, Math.min(1, value));
}

export function isWaveformDataV1(value: unknown): value is WaveformDataV1 {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<WaveformDataV1>;
  return (
    candidate.version === 1 &&
    typeof candidate.durationSeconds === "number" &&
    typeof candidate.sourceSampleRate === "number" &&
    candidate.analysisSampleRate === 8000 &&
    typeof candidate.bucketCount === "number" &&
    Array.isArray(candidate.peaks)
  );
}

export function normalizeWaveformData(value: unknown): WaveformDataV1 | null {
  if (isWaveformDataV1(value)) {
    const peaks = value.peaks
      .filter((entry): entry is [number, number] => Array.isArray(entry) && entry.length === 2)
      .map(([min, max]) => [clampPeak(min), clampPeak(max)] as [number, number]);

    if (!peaks.length) {
      return null;
    }

    return {
      ...value,
      bucketCount: peaks.length,
      peaks,
    };
  }

  if (Array.isArray(value) && value.length > 0) {
    const numericValues = value.filter((entry): entry is number => typeof entry === "number" && Number.isFinite(entry));
    if (!numericValues.length) {
      return null;
    }

    const maxAbsolute = Math.max(...numericValues.map((entry) => Math.abs(entry)), 1);
    const peaks = numericValues.map((entry) => {
      const normalized = clampPeak(entry / maxAbsolute);
      return [-Math.abs(normalized), Math.abs(normalized)] as [number, number];
    });

    return {
      version: 1,
      durationSeconds: 0,
      sourceSampleRate: 0,
      analysisSampleRate: 8000,
      bucketCount: peaks.length,
      peaks,
    };
  }

  return null;
}

export function getAssetWaveform(asset: Pick<Asset, "waveform_peaks"> | null | undefined) {
  return normalizeWaveformData(asset?.waveform_peaks ?? null);
}

export function downsampleWaveform(
  waveform: WaveformDataV1 | null | undefined,
  targetBucketCount: number,
) {
  if (!waveform || waveform.peaks.length <= targetBucketCount) {
    return waveform ?? null;
  }

  const nextPeaks: Array<[number, number]> = [];
  const bucketSize = waveform.peaks.length / targetBucketCount;

  for (let index = 0; index < targetBucketCount; index += 1) {
    const start = Math.floor(index * bucketSize);
    const end = Math.max(start + 1, Math.floor((index + 1) * bucketSize));
    const slice = waveform.peaks.slice(start, end);
    const min = Math.min(...slice.map((entry) => entry[0]));
    const max = Math.max(...slice.map((entry) => entry[1]));
    nextPeaks.push([clampPeak(min), clampPeak(max)]);
  }

  return {
    ...waveform,
    bucketCount: nextPeaks.length,
    peaks: nextPeaks,
  } satisfies WaveformDataV1;
}
