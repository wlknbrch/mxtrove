declare module "music-tempo" {
  interface MusicTempoOptions {
    bufferSize?: number;
    hopSize?: number;
    timeStep?: number;
    minBeatInterval?: number;
    maxBeatInterval?: number;
    expiryTime?: number;
  }

  interface BeatAgent {
    score: number;
    totalBeatCount: number;
  }

  export default class MusicTempo {
    constructor(audioData: Float32Array | number[], options?: MusicTempoOptions);
    tempo: string | number;
    beats: number[];
    bestAgent?: BeatAgent;
  }
}
