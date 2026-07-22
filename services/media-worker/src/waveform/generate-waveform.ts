export interface WaveformDataV1 {
  version: 1;
  durationSeconds: number;
  sourceSampleRate: number;
  analysisSampleRate: 8000;
  bucketCount: number;
  peaks: Array<[number, number]>;
}

export function generateWaveformFromPcm(pcmData: Buffer, durationSeconds: number) {
  const totalSamples = Math.floor(pcmData.length / 2);
  if (!totalSamples) {
    return {
      version: 1,
      durationSeconds,
      sourceSampleRate: 8000,
      analysisSampleRate: 8000,
      bucketCount: 1,
      peaks: [[0, 0]],
    } satisfies WaveformDataV1;
  }

  const bucketCount = Math.max(1, Math.min(1600, Math.round(durationSeconds * 6)));
  const samplesPerBucket = Math.max(1, Math.floor(totalSamples / bucketCount));
  const peaks: Array<[number, number]> = [];

  for (let bucketIndex = 0; bucketIndex < bucketCount; bucketIndex += 1) {
    const startSample = bucketIndex * samplesPerBucket;
    const endSample = bucketIndex === bucketCount - 1 ? totalSamples : Math.min(totalSamples, startSample + samplesPerBucket);

    let min = 1;
    let max = -1;
    for (let sampleIndex = startSample; sampleIndex < endSample; sampleIndex += 1) {
      const sample = pcmData.readInt16LE(sampleIndex * 2) / 32768;
      if (sample < min) {
        min = sample;
      }
      if (sample > max) {
        max = sample;
      }
    }

    if (min === 1 && max === -1) {
      min = 0;
      max = 0;
    }

    peaks.push([
      Number(Math.max(-1, Math.min(1, min)).toFixed(6)),
      Number(Math.max(-1, Math.min(1, max)).toFixed(6)),
    ]);
  }

  return {
    version: 1,
    durationSeconds,
    sourceSampleRate: 8000,
    analysisSampleRate: 8000,
    bucketCount: peaks.length,
    peaks,
  } satisfies WaveformDataV1;
}
