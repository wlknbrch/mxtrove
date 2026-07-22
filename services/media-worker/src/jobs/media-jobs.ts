import fs from "node:fs/promises";
import type { ChildProcess } from "node:child_process";

import { config } from "../config.js";
import { transcodeToMp3, decodeToMonoPcm } from "../media/ffmpeg.js";
import { probeAudioFile } from "../media/ffprobe.js";
import { ensureJobDir, getJobPaths, removeJobDir } from "../media/paths.js";
import { supabaseAdmin } from "../supabase/service.js";
import { generateWaveformFromPcm } from "../waveform/generate-waveform.js";

export interface MediaJobRecord {
  id: string;
  owner_id: string;
  source_asset_id: string;
  song_version_id: string | null;
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

  if (input.songVersionId) {
    const { data: version, error: versionError } = await supabaseAdmin
      .from("song_versions")
      .select("id, song:songs!song_versions_song_id_fkey(owner_id)")
      .eq("id", input.songVersionId)
      .maybeSingle();

    if (versionError) {
      throw versionError;
    }

    const versionOwnerId = (version as { song?: { owner_id?: string } | null } | null)?.song?.owner_id ?? null;
    if (!version || versionOwnerId !== input.ownerId) {
      throw new Error("Linked song version not found.");
    }
  }

  const { data: existing, error: existingError } = await supabaseAdmin
    .from("media_processing_jobs")
    .select("*")
    .eq("owner_id", input.ownerId)
    .eq("source_asset_id", input.sourceAssetId)
    .in("status", ["created", "uploading", "queued", "probing", "transcoding", "generating_waveform", "ready", "uploading_to_drive"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  if (existing) {
    return existing as MediaJobRecord;
  }

  const { data, error } = await supabaseAdmin
    .from("media_processing_jobs")
    .insert({
      owner_id: input.ownerId,
      source_asset_id: input.sourceAssetId,
      song_version_id: input.songVersionId ?? null,
      status: "created",
      stage: "Awaiting upload",
      progress: 0,
      input_filename: asset.filename,
      input_mime_type: asset.mime_type,
      input_bytes: asset.bytes,
      input_checksum: asset.checksum,
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
      stage: "Generating waveform",
      progress: 72,
      updated_at: new Date().toISOString(),
    });
    const pcm = await decodeToMonoPcm(paths.previewPath, (child) => {
      activeProcesses.set(jobId, child);
    });
    activeProcesses.delete(jobId);
    const waveform = generateWaveformFromPcm(pcm.stdout, metadata.durationSeconds);
    const outputStats = await fs.stat(paths.previewPath);

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
