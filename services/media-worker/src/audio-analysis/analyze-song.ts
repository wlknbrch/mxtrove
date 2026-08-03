import { randomUUID } from "node:crypto";
import type { Readable } from "node:stream";

import { config } from "../config.js";
import { decodeToAnalysisPcm } from "../media/ffmpeg.js";
import { writeReadableStreamToFile } from "../media/io.js";
import { ensureJobDir, removeJobDir } from "../media/paths.js";
import { probeAudioFile } from "../media/ffprobe.js";
import { supabaseAdmin } from "../supabase/service.js";
import { analyzeAudioPcm } from "./analyze-audio.js";

export async function analyzeSongSourceForOwner(input: {
  ownerId: string;
  songId: string;
  sourceAssetId: string;
  source: Readable;
}) {
  const [{ data: song, error: songError }, { data: asset, error: assetError }] = await Promise.all([
    supabaseAdmin
      .from("songs")
      .select("id")
      .eq("id", input.songId)
      .eq("owner_id", input.ownerId)
      .maybeSingle(),
    supabaseAdmin
      .from("assets")
      .select("id, asset_type")
      .eq("id", input.sourceAssetId)
      .eq("owner_id", input.ownerId)
      .maybeSingle(),
  ]);

  if (songError) throw songError;
  if (assetError) throw assetError;
  if (!song) throw new Error("Song not found.");
  if (!asset || asset.asset_type !== "audio_original") {
    throw new Error("Only an owned private original can be analyzed.");
  }

  const analysisId = `analysis-${randomUUID()}`;
  const paths = await ensureJobDir(analysisId);
  try {
    await writeReadableStreamToFile(input.source, paths.inputPath, config.maxUploadBytes);
    const metadata = await probeAudioFile(paths.inputPath);
    if (!metadata.durationSeconds || metadata.durationSeconds <= 0) {
      throw new Error("The uploaded audio could not be analyzed correctly.");
    }
    if (metadata.durationSeconds > config.maxAudioDurationSeconds) {
      throw new Error("The uploaded audio is longer than the configured limit.");
    }

    const pcm = await decodeToAnalysisPcm(paths.inputPath);
    const analysis = analyzeAudioPcm(pcm.stdout);
    if (analysis.tempoBpm == null && !analysis.musicalKey) {
      throw new Error("The worker could not determine tempo or musical key from this audio.");
    }

    const updates: Record<string, unknown> = {
      audio_analysis_updated_at: new Date().toISOString(),
    };
    if (analysis.tempoBpm != null) {
      updates.tempo_bpm = analysis.tempoBpm;
      updates.tempo_confidence = analysis.tempoConfidence;
    }
    if (analysis.musicalKey) {
      updates.musical_key = analysis.musicalKey;
      updates.key_confidence = analysis.keyConfidence;
    }

    const { error: updateError } = await supabaseAdmin
      .from("songs")
      .update(updates)
      .eq("id", input.songId)
      .eq("owner_id", input.ownerId);
    if (updateError) throw updateError;

    return analysis;
  } finally {
    await removeJobDir(analysisId);
  }
}
