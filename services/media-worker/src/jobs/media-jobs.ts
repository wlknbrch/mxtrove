import fs from "node:fs/promises";
import { createHash } from "node:crypto";
import type { ChildProcess } from "node:child_process";

import { config } from "../config.js";
import { analyzeAudioPcm, type AudioAnalysisResult } from "../audio-analysis/analyze-audio.js";
import { transcodeToMp3, decodeToAnalysisPcm, decodeToMonoPcm } from "../media/ffmpeg.js";
import { probeAudioFile } from "../media/ffprobe.js";
import { ensureJobDir, getJobPaths, removeJobDir } from "../media/paths.js";
import { protectedMediaStorage } from "../protected-media/index.js";
import { supabaseAdmin } from "../supabase/service.js";
import { generateWaveformFromPcm } from "../waveform/generate-waveform.js";

export interface MediaJobRecord {
  id: string;
  owner_id: string;
  source_asset_id: string;
  song_version_id: string | null;
  song_id: string | null;
  status: string;
  stage: string;
  progress: number;
  input_filename: string | null;
  input_mime_type: string | null;
  input_bytes: number | null;
  input_checksum: string | null;
  output_mime_type: string | null;
  output_bytes: number | null;
  duration_seconds: number | null;
  detected_codec: string | null;
  sample_rate_hz: number | null;
  channels: number | null;
  bit_rate_bps: number | null;
  waveform_data: unknown;
  detected_tempo_bpm: number | null;
  detected_musical_key: string | null;
  tempo_confidence: number | null;
  key_confidence: number | null;
  error_code: string | null;
  error_message: string | null;
  attempt_count: number;
  worker_instance_id: string | null;
  cancel_requested_at: string | null;
  created_at: string;
  started_at: string | null;
  ready_at: string | null;
  completed_at: string | null;
  expires_at: string | null;
  output_mode: "public_cloud" | "protected";
  protected_purpose: "post_preview" | "collaboration_preview" | "message_audio" | null;
  target_project_id: string | null;
  target_post_id: string | null;
  protected_asset_id: string | null;
  updated_at: string;
}

type JobTask = () => Promise<void>;

const activeProcesses = new Map<string, ChildProcess>();
const queuedTasks: JobTask[] = [];
let activeJobs = 0;

async function updateJob(jobId: string, payload: Partial<MediaJobRecord>) {
  const { error } = await supabaseAdmin.from("media_processing_jobs").update(payload).eq("id", jobId);
  if (error) {
    throw error;
  }
}

export async function setJobUploading(jobId: string) {
  await updateJob(jobId, {
    status: "uploading",
    stage: "Receiving original upload",
    progress: 0,
    updated_at: new Date().toISOString(),
  });
}

export async function getJobForOwner(jobId: string, ownerId: string) {
  const { data, error } = await supabaseAdmin
    .from("media_processing_jobs")
    .select("*")
    .eq("id", jobId)
    .eq("owner_id", ownerId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as MediaJobRecord | null;
}

export async function createMediaProcessingJobForOwner(input: {
  ownerId: string;
  sourceAssetId: string;
  songVersionId?: string | null;
  songId?: string | null;
  outputMode?: "public_cloud" | "protected";
  protectedPurpose?: "post_preview" | "collaboration_preview" | "message_audio" | null;
  projectId?: string | null;
  postId?: string | null;
}) {
  const { data: asset, error: assetError } = await supabaseAdmin
    .from("assets")
    .select("*")
    .eq("id", input.sourceAssetId)
    .eq("owner_id", input.ownerId)
    .maybeSingle();

  if (assetError) {
    throw assetError;
  }
  if (!asset || asset.asset_type !== "audio_original") {
    throw new Error("Only private original audio can be processed.");
  }

  let resolvedSongId = input.songId ?? null;
  if (input.songVersionId) {
    const { data: version, error: versionError } = await supabaseAdmin
      .from("song_versions")
      .select("id, song_id, song:songs!song_versions_song_id_fkey(owner_id)")
      .eq("id", input.songVersionId)
      .maybeSingle();

    if (versionError) {
      throw versionError;
    }

    const versionOwnerId = (version as { song?: { owner_id?: string } | null } | null)?.song?.owner_id ?? null;
    if (!version || versionOwnerId !== input.ownerId) {
      throw new Error("Linked song version not found.");
    }
    resolvedSongId = (version as { song_id: string }).song_id;
  } else if (resolvedSongId) {
    const { data: song, error: songError } = await supabaseAdmin
      .from("songs")
      .select("id")
      .eq("id", resolvedSongId)
      .eq("owner_id", input.ownerId)
      .maybeSingle();
    if (songError) throw songError;
    if (!song) throw new Error("Linked song not found.");
  }

  const outputMode = input.outputMode ?? "public_cloud";
  const protectedPurpose = outputMode === "protected"
    ? input.protectedPurpose ?? "collaboration_preview"
    : null;

  if (outputMode === "protected" && protectedPurpose === "collaboration_preview") {
    if (!input.projectId) {
      throw new Error("A collaboration project is required for this protected preview.");
    }

    const { data: canUpload, error: permissionError } = await supabaseAdmin.rpc(
      "can_upload_project_version",
      {
        target_project_id: input.projectId,
        target_profile_id: input.ownerId,
      },
    );
    if (permissionError) {
      throw permissionError;
    }
    if (!canUpload) {
      throw new Error("You cannot upload versions to this collaboration project.");
    }
  }

  if (outputMode === "protected" && protectedPurpose === "post_preview") {
    if (!input.postId) {
      throw new Error("A target post is required for this protected preview.");
    }
    const { data: post, error: postError } = await supabaseAdmin
      .from("posts")
      .select("id")
      .eq("id", input.postId)
      .eq("owner_id", input.ownerId)
      .maybeSingle();
    if (postError) {
      throw postError;
    }
    if (!post) {
      throw new Error("The target post could not be found.");
    }
  }

  let existingQuery = supabaseAdmin
    .from("media_processing_jobs")
    .select("*")
    .eq("owner_id", input.ownerId)
    .eq("source_asset_id", input.sourceAssetId)
    .eq("output_mode", outputMode)
    .in("status", ["created", "uploading", "queued", "probing", "transcoding", "generating_waveform", "ready", "uploading_to_drive"])
    .order("created_at", { ascending: false })
    .limit(1);
  if (outputMode === "protected") {
    existingQuery = existingQuery.eq("protected_purpose", protectedPurpose);
    existingQuery = input.projectId
      ? existingQuery.eq("target_project_id", input.projectId)
      : existingQuery.is("target_project_id", null);
    existingQuery = input.postId
      ? existingQuery.eq("target_post_id", input.postId)
      : existingQuery.is("target_post_id", null);
  }
  const { data: existing, error: existingError } = await existingQuery.maybeSingle();

  if (existingError) {
    throw existingError;
  }

  if (existing) {
    if (!existing.song_id && resolvedSongId) {
      const { data: linkedJob, error: linkError } = await supabaseAdmin
        .from("media_processing_jobs")
        .update({
          song_id: resolvedSongId,
          song_version_id: existing.song_version_id ?? input.songVersionId ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .select("*")
        .single();
      if (linkError) throw linkError;
      return linkedJob as MediaJobRecord;
    }

    return existing as MediaJobRecord;
  }

  const { data, error } = await supabaseAdmin
    .from("media_processing_jobs")
    .insert({
      owner_id: input.ownerId,
      source_asset_id: input.sourceAssetId,
      song_version_id: input.songVersionId ?? null,
      song_id: resolvedSongId,
      status: "created",
      stage: "Awaiting upload",
      progress: 0,
      input_filename: asset.filename,
      input_mime_type: asset.mime_type,
      input_bytes: asset.bytes,
      input_checksum: asset.checksum,
      output_mode: outputMode,
      protected_purpose: protectedPurpose,
      target_project_id: input.projectId ?? null,
      target_post_id: input.postId ?? null,
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as MediaJobRecord;
}

async function runNextQueuedTask() {
  if (activeJobs >= config.maxConcurrentMediaJobs) {
    return;
  }

  const nextTask = queuedTasks.shift();
  if (!nextTask) {
    return;
  }

  activeJobs += 1;
  try {
    await nextTask();
  } finally {
    activeJobs -= 1;
    void runNextQueuedTask();
  }
}

export function enqueueMediaJob(jobId: string) {
  queuedTasks.push(async () => {
    await processMediaJob(jobId);
  });

  void runNextQueuedTask();
}

export async function cancelMediaJob(jobId: string) {
  const activeProcess = activeProcesses.get(jobId);
  if (activeProcess) {
    activeProcess.kill("SIGTERM");
    setTimeout(() => {
      if (!activeProcess.killed) {
        activeProcess.kill("SIGKILL");
      }
    }, 2500).unref();
  }

  await updateJob(jobId, {
    status: "cancelled",
    stage: "Cancelled",
    updated_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
  });
  await removeJobDir(jobId);
}

async function ensureNotCancelled(jobId: string) {
  const { data, error } = await supabaseAdmin
    .from("media_processing_jobs")
    .select("cancel_requested_at")
    .eq("id", jobId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (data?.cancel_requested_at) {
    throw new Error("cancelled");
  }
}

async function persistDetectedSongMetadata(job: MediaJobRecord, analysis: AudioAnalysisResult) {
  let songId = job.song_id;
  if (!songId && job.song_version_id) {
    const { data: version, error } = await supabaseAdmin
      .from("song_versions")
      .select("song_id")
      .eq("id", job.song_version_id)
      .maybeSingle();
    if (error) throw error;
    songId = version?.song_id ?? null;
  }
  if (!songId || (!analysis.tempoBpm && !analysis.musicalKey)) return;

  const { data: song, error: songError } = await supabaseAdmin
    .from("songs")
    .select("id, tempo_bpm, musical_key")
    .eq("id", songId)
    .eq("owner_id", job.owner_id)
    .maybeSingle();
  if (songError) throw songError;
  if (!song) return;

  const updates: Record<string, unknown> = {
    audio_analysis_updated_at: new Date().toISOString(),
  };
  if (song.tempo_bpm == null && analysis.tempoBpm != null) {
    updates.tempo_bpm = analysis.tempoBpm;
    updates.tempo_confidence = analysis.tempoConfidence;
  }
  if (!song.musical_key && analysis.musicalKey) {
    updates.musical_key = analysis.musicalKey;
    updates.key_confidence = analysis.keyConfidence;
  }

  const { error: updateError } = await supabaseAdmin.from("songs").update(updates).eq("id", songId);
  if (updateError) throw updateError;
}

export async function processMediaJob(jobId: string) {
  const job = await getJobForOwner(jobId, (await getJobOwnerId(jobId)) ?? "");
  if (!job) {
    return;
  }

  const paths = await ensureJobDir(jobId);
  await updateJob(jobId, {
    status: "queued",
    stage: "Queued for processing",
    progress: 5,
    worker_instance_id: config.workerInstanceId,
    started_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  let reservedProtectedAssetId: string | null = null;
  try {
    await ensureNotCancelled(jobId);

    await updateJob(jobId, {
      status: "probing",
      stage: "Analyzing audio",
      progress: 15,
      updated_at: new Date().toISOString(),
    });
    const metadata = await probeAudioFile(paths.inputPath);
    if (!metadata.durationSeconds || metadata.durationSeconds <= 0) {
      throw new Error("The uploaded file could not be analyzed correctly.");
    }
    if (metadata.durationSeconds > config.maxAudioDurationSeconds) {
      throw new Error("The uploaded audio is longer than the configured limit.");
    }

    await ensureNotCancelled(jobId);

    await updateJob(jobId, {
      status: "transcoding",
      stage: "Converting to MP3",
      progress: 42,
      detected_codec: metadata.codec,
      sample_rate_hz: metadata.sampleRate,
      channels: metadata.channels,
      bit_rate_bps: metadata.bitRate,
      duration_seconds: metadata.durationSeconds,
      updated_at: new Date().toISOString(),
    });
    await transcodeToMp3(paths.inputPath, paths.previewPath, metadata.channels, (child) => {
      activeProcesses.set(jobId, child);
    });
    activeProcesses.delete(jobId);

    await ensureNotCancelled(jobId);

    await updateJob(jobId, {
      status: "generating_waveform",
      stage: "Detecting tempo and musical key",
      progress: 68,
      updated_at: new Date().toISOString(),
    });
    let analysis: AudioAnalysisResult = {
      tempoBpm: null,
      tempoConfidence: null,
      musicalKey: null,
      keyConfidence: null,
    };
    try {
      const analysisPcm = await decodeToAnalysisPcm(paths.previewPath, (child) => {
        activeProcesses.set(jobId, child);
      });
      activeProcesses.delete(jobId);
      analysis = analyzeAudioPcm(analysisPcm.stdout);
      await persistDetectedSongMetadata(job, analysis);
    } catch (analysisError) {
      activeProcesses.delete(jobId);
      console.warn(`Audio metadata analysis failed for job ${jobId}; preview generation will continue.`, analysisError);
    }

    await updateJob(jobId, {
      stage: "Generating waveform",
      progress: 78,
      detected_tempo_bpm: analysis.tempoBpm,
      detected_musical_key: analysis.musicalKey,
      tempo_confidence: analysis.tempoConfidence,
      key_confidence: analysis.keyConfidence,
      updated_at: new Date().toISOString(),
    });
    const pcm = await decodeToMonoPcm(paths.previewPath, (child) => {
      activeProcesses.set(jobId, child);
    });
    activeProcesses.delete(jobId);
    const waveform = generateWaveformFromPcm(pcm.stdout, metadata.durationSeconds);
    const outputStats = await fs.stat(paths.previewPath);

    if (job.output_mode === "protected") {
      await updateJob(jobId, {
        stage: "Securing collaboration preview",
        progress: 88,
        updated_at: new Date().toISOString(),
      });

      const reservation = await reserveProtectedPreview({
        job,
        outputBytes: outputStats.size,
      });
      reservedProtectedAssetId = reservation.id;

      await protectedMediaStorage.put({
        assetId: reservation.id,
        storageKey: reservation.storage_key,
        sourcePath: paths.previewPath,
        mimeType: "audio/mpeg",
        bytes: outputStats.size,
      });

      const checksum = createHash("sha256")
        .update(await fs.readFile(paths.previewPath))
        .digest("hex");
      await finalizeProtectedPreview({
        assetId: reservation.id,
        bytes: outputStats.size,
        checksum,
        durationSeconds: metadata.durationSeconds,
        waveform,
      });

      if (job.song_version_id) {
        const { error: versionError } = await supabaseAdmin
          .from("song_versions")
          .update({
            protected_preview_asset_id: reservation.id,
            sharing_mode:
              job.protected_purpose === "collaboration_preview"
                ? "project_members"
                : "followers",
          })
          .eq("id", job.song_version_id)
          .eq("owner_id", job.owner_id);
        if (versionError) {
          throw versionError;
        }
      }

      await updateJob(jobId, {
        status: "completed",
        stage: "Protected preview ready",
        progress: 100,
        output_mime_type: "audio/mpeg",
        output_bytes: outputStats.size,
        waveform_data: waveform,
        protected_asset_id: reservation.id,
        ready_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      reservedProtectedAssetId = null;
      await removeJobDir(jobId);
      return;
    }

    await updateJob(jobId, {
      status: "ready",
      stage: "Ready for Google Drive upload",
      progress: 100,
      output_mime_type: "audio/mpeg",
      output_bytes: outputStats.size,
      waveform_data: waveform,
      ready_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + config.mediaReadyTtlSeconds * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    });
  } catch (error) {
    activeProcesses.delete(jobId);
    if (reservedProtectedAssetId) {
      await protectedMediaStorage.delete(reservedProtectedAssetId).catch(() => undefined);
      const { error: releaseError } = await supabaseAdmin.rpc("release_protected_media_asset", {
        target_asset_id: reservedProtectedAssetId,
      });
      if (releaseError) {
        console.error("Could not release failed protected media reservation.", releaseError);
      }
    }
    if (error instanceof Error && error.message === "cancelled") {
      await updateJob(jobId, {
        status: "cancelled",
        stage: "Cancelled",
        progress: 0,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      await removeJobDir(jobId);
      return;
    }

    await updateJob(jobId, {
      status: "failed",
      stage: "Processing failed",
      error_code: "processing_failed",
      error_message: error instanceof Error ? error.message : "Processing failed.",
      updated_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    });
  }
}

interface ProtectedPreviewReservation {
  id: string;
  storage_key: string;
}

async function reserveProtectedPreview(input: {
  job: MediaJobRecord;
  outputBytes: number;
}) {
  const { data, error } = await supabaseAdmin.rpc("reserve_protected_media_asset", {
    target_owner_id: input.job.owner_id,
    target_purpose: input.job.protected_purpose ?? "collaboration_preview",
    target_filename: `${input.job.id}.mp3`,
    target_mime_type: "audio/mpeg",
    expected_bytes: input.outputBytes,
    target_source_asset_id: input.job.source_asset_id,
    target_post_id: input.job.target_post_id,
    target_project_id: input.job.target_project_id,
    target_song_version_id: input.job.song_version_id,
    target_expires_at: null,
  });
  if (error) {
    throw error;
  }

  const reservation = (Array.isArray(data) ? data[0] : data) as ProtectedPreviewReservation | null;
  if (!reservation?.id || !reservation.storage_key) {
    throw new Error("Protected media reservation failed.");
  }
  return reservation;
}

async function finalizeProtectedPreview(input: {
  assetId: string;
  bytes: number;
  checksum: string;
  durationSeconds: number;
  waveform: unknown;
}) {
  const { error } = await supabaseAdmin.rpc("finalize_protected_media_asset", {
    target_asset_id: input.assetId,
    actual_bytes: input.bytes,
    target_checksum: input.checksum,
    target_duration_seconds: input.durationSeconds,
    target_width: null,
    target_height: null,
    target_waveform_data: input.waveform,
  });
  if (error) {
    throw error;
  }
}

async function getJobOwnerId(jobId: string) {
  const { data, error } = await supabaseAdmin
    .from("media_processing_jobs")
    .select("owner_id")
    .eq("id", jobId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data?.owner_id ?? null;
}

export async function acknowledgeMediaJob(jobId: string) {
  await removeJobDir(jobId);
}

export async function markUploadingToDrive(jobId: string) {
  await updateJob(jobId, {
    status: "uploading_to_drive",
    stage: "Uploading preview to Google Drive",
    progress: 100,
    updated_at: new Date().toISOString(),
  });
}

export async function recoverStaleMediaJobs() {
  const staleThreshold = new Date(Date.now() - config.mediaJobTimeoutSeconds * 1000).toISOString();
  const { error } = await supabaseAdmin
    .from("media_processing_jobs")
    .update({
      status: "failed",
      stage: "Worker restarted before the job completed",
      error_code: "worker_restart",
      error_message: "The worker restarted before the job finished. Retry the conversion.",
      updated_at: new Date().toISOString(),
    })
    .in("status", ["uploading", "queued", "probing", "transcoding", "generating_waveform", "uploading_to_drive"])
    .lt("updated_at", staleThreshold);

  if (error) {
    throw error;
  }
}
