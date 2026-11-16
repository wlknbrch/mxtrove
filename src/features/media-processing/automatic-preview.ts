import { acknowledgeMediaProcessingJob, analyzeSongAudio, createMediaProcessingJob, downloadMediaProcessingPreview, finalizeMediaProcessingJob, getMediaProcessingJob, uploadMediaProcessingInput } from "@/features/media-processing/api";
import { createAssetRecord, updateAssetPublicLinks } from "@/features/drive/api";

import type { CloudStorageProvider } from "@/features/drive/providers/cloud-storage";
import type { Asset, MediaProcessingJob } from "@/types/domain";

const DRIVE_UPLOAD_THRESHOLD_BYTES = 20 * 1024 * 1024;
const POLL_INTERVAL_MS = 1500;
const POLL_MAX_INTERVAL_MS = 6000;
// Transient poll failures (rate limits, restarts, flaky links) must not kill a lane
// whose job is still being processed. Give each lane a bounded grace period.
const POLL_MAX_CONSECUTIVE_FAILURES = 8;
// Belt-and-braces deadline: a job that shows no change for this long is treated as
// lost so the import can never freeze forever. The worker's own stale-job recovery
// normally resolves stuck jobs long before this.
const JOB_STALL_TIMEOUT_MS = 45 * 60 * 1000;

function toProgress(min: number, max: number, progress: number) {
  const clamped = Math.max(0, Math.min(100, progress));
  return Math.round(min + ((max - min) * clamped) / 100);
}

function isSettledJobStatus(status: MediaProcessingJob["status"]) {
  return status === "ready" || status === "uploading_to_drive" || status === "completed";
}

function isTerminalJobStatus(status: MediaProcessingJob["status"]) {
  return status === "failed" || status === "cancelled" || status === "expired";
}

function derivePreviewFilename(filename: string) {
  const trimmed = filename.trim();
  const lastDot = trimmed.lastIndexOf(".");
  const basename = lastDot > 0 ? trimmed.slice(0, lastDot) : trimmed || "preview";
  return `${basename}.mp3`;
}

async function uploadFileToDrive(params: {
  provider: CloudStorageProvider;
  file: File;
  parentFolderId: string;
  signal?: AbortSignal;
  onProgress?: (progress: number) => void;
}) {
  if (params.file.size > DRIVE_UPLOAD_THRESHOLD_BYTES) {
    return params.provider.uploadResumable(params);
  }

  return params.provider.uploadFile(params);
}

export async function waitForJobToSettle(params: {
  jobId: string;
  signal?: AbortSignal;
  onJobChange?: (job: MediaProcessingJob | null) => void;
  onProgress?: (progress: number) => void;
}) {
  let intervalMs = POLL_INTERVAL_MS;
  let consecutiveFailures = 0;
  let lastChangeSignature: string | null = null;
  let lastChangeAt = Date.now();

  while (true) {
    if (params.signal?.aborted) {
      throw new DOMException("Upload aborted.", "AbortError");
    }

    let job: MediaProcessingJob | null;
    try {
      job = await getMediaProcessingJob(params.jobId);
    } catch (error) {
      // A missing job record can never recover, so fail fast on it. Everything
      // else (429 rate limits, worker restarts, dropped connections) is worth
      // retrying with backoff instead of aborting the whole lane.
      if (error instanceof Error && /not found|could not be found/i.test(error.message)) {
        throw new Error("The media processing job could not be found anymore. Retry the preview in the song workspace.");
      }
      consecutiveFailures += 1;
      if (consecutiveFailures >= POLL_MAX_CONSECUTIVE_FAILURES) {
        throw new Error(
          `The media worker kept refusing status updates (${error instanceof Error ? error.message : "unknown error"}). The original is safe; retry the preview in the song workspace.`,
        );
      }
      await new Promise((resolve) => window.setTimeout(resolve, intervalMs));
      intervalMs = Math.min(intervalMs * 1.5, POLL_MAX_INTERVAL_MS);
      continue;
    }

    consecutiveFailures = 0;
    intervalMs = POLL_INTERVAL_MS;
    params.onJobChange?.(job);

    if (!job) {
      throw new Error("The media processing job could not be found anymore. Retry the preview in the song workspace.");
    }

    const changeSignature = `${job.status}|${job.stage}|${job.progress}`;
    if (changeSignature !== lastChangeSignature) {
      lastChangeSignature = changeSignature;
      lastChangeAt = Date.now();
    } else if (Date.now() - lastChangeAt > JOB_STALL_TIMEOUT_MS) {
      throw new Error(
        "Preview processing has not reported progress for a very long time. The original is safe; retry the preview in the song workspace.",
      );
    }

    params.onProgress?.(toProgress(56, 86, job.progress));

    if (isSettledJobStatus(job.status)) {
      return job;
    }

    if (isTerminalJobStatus(job.status)) {
      throw new Error(job.error_message || `Media processing ended with status "${job.status}".`);
    }

    await new Promise((resolve) => window.setTimeout(resolve, intervalMs));
    intervalMs = Math.min(intervalMs * 1.5, POLL_MAX_INTERVAL_MS);
  }
}

export async function generateAutomaticPreview(params: {
  ownerId: string;
  provider: CloudStorageProvider;
  sourceAsset: Asset;
  sourceFile: File;
  songId?: string | null;
  previewFolderId: string;
  signal?: AbortSignal;
  onJobChange?: (job: MediaProcessingJob | null) => void;
  onProgress?: (progress: number) => void;
}) {
  const job = await createMediaProcessingJob({
    sourceAssetId: params.sourceAsset.id,
    songId: params.songId ?? null,
  });
  params.onJobChange?.(job);
  params.onProgress?.(42);

  if (job.status === "created" || job.status === "uploading") {
    await uploadMediaProcessingInput({
      jobId: job.id,
      file: params.sourceFile,
      signal: params.signal,
      onProgress: (progress) => {
        params.onProgress?.(toProgress(42, 56, progress));
      },
    });
  }

  const readyJob =
    job.status === "ready" || job.status === "uploading_to_drive" || job.status === "completed"
      ? job
      : await waitForJobToSettle({
          jobId: job.id,
          signal: params.signal,
          onJobChange: params.onJobChange,
          onProgress: params.onProgress,
        });

  params.onProgress?.(88);
  const previewBlob = await downloadMediaProcessingPreview(job.id);
  if (previewBlob.size <= 0) {
    throw new Error("The generated preview file was empty. Retry once the media worker is running with the latest build.");
  }
  const previewFile = new File([previewBlob], derivePreviewFilename(params.sourceFile.name), {
    type: "audio/mpeg",
    lastModified: Date.now(),
  });

  const upload = await uploadFileToDrive({
    provider: params.provider,
    file: previewFile,
    parentFolderId: params.previewFolderId,
    signal: params.signal,
    onProgress: (progress) => {
      params.onProgress?.(toProgress(88, 97, progress));
    },
  });
  const publicPreview = await params.provider.createPublicPreview(upload.fileId);
  const previewAsset = await createAssetRecord({
    ownerId: params.ownerId,
    assetType: "audio_preview",
    accessMode: "public",
    durationSeconds: readyJob.duration_seconds,
    waveformPeaks: readyJob.waveform_data,
    derivedFromAssetId: params.sourceAsset.id,
    processingJobId: readyJob.id,
    previewGeneration: "automatic",
    codec: "mp3",
    sampleRateHz: readyJob.sample_rate_hz,
    channels: readyJob.channels,
    bitRateBps: readyJob.bit_rate_bps,
    waveformVersion: readyJob.waveform_data?.version ?? null,
    waveformBucketCount: readyJob.waveform_data?.bucketCount ?? null,
    waveformGeneratedAt: new Date().toISOString(),
    upload: {
      ...upload,
      shareUrl: publicPreview.shareUrl,
      viewUrl: publicPreview.viewUrl,
    },
  });
  await updateAssetPublicLinks({
    assetId: previewAsset.id,
    accessMode: "public",
    shareUrl: publicPreview.shareUrl,
    viewUrl: publicPreview.viewUrl,
  });
  await finalizeMediaProcessingJob({
    jobId: readyJob.id,
    previewAssetId: previewAsset.id,
  });
  await acknowledgeMediaProcessingJob(readyJob.id);
  params.onJobChange?.({
    ...readyJob,
    status: "completed",
    stage: "Preview uploaded to Google Drive",
    progress: 100,
    completed_at: new Date().toISOString(),
  });
  params.onProgress?.(100);

  return {
    job: readyJob,
    previewAsset,
  };
}

export async function generateAutomaticPreviewFromSourceAsset(params: {
  ownerId: string;
  provider: CloudStorageProvider;
  sourceAsset: Asset;
  songId?: string | null;
  previewFolderId: string;
  signal?: AbortSignal;
  onJobChange?: (job: MediaProcessingJob | null) => void;
  onProgress?: (progress: number) => void;
}) {
  params.onProgress?.(8);
  const sourceBlob = await params.provider.getPrivateFileBlob(params.sourceAsset.remote_file_id);
  const sourceFile = new File([sourceBlob], params.sourceAsset.filename, {
    type: params.sourceAsset.mime_type || sourceBlob.type || "application/octet-stream",
    lastModified: Date.now(),
  });
  params.onProgress?.(18);

  return generateAutomaticPreview({
    ownerId: params.ownerId,
    provider: params.provider,
    sourceAsset: params.sourceAsset,
    sourceFile,
    songId: params.songId ?? null,
    previewFolderId: params.previewFolderId,
    signal: params.signal,
    onJobChange: params.onJobChange,
    onProgress: params.onProgress,
  });
}

export async function analyzeSongMetadataFromSourceAsset(params: {
  provider: CloudStorageProvider;
  sourceAsset: Asset;
  songId: string;
  signal?: AbortSignal;
  onProgress?: (progress: number) => void;
}) {
  params.onProgress?.(2);
  const sourceBlob = await params.provider.getPrivateFileBlob(params.sourceAsset.remote_file_id);
  const sourceFile = new File([sourceBlob], params.sourceAsset.filename, {
    type: params.sourceAsset.mime_type || sourceBlob.type || "application/octet-stream",
    lastModified: Date.now(),
  });
  params.onProgress?.(8);
  return analyzeSongAudio({
    songId: params.songId,
    sourceAssetId: params.sourceAsset.id,
    file: sourceFile,
    signal: params.signal,
    onProgress: (progress) => params.onProgress?.(8 + Math.round(progress * 0.92)),
  });
}

export async function generateProtectedPreviewFromSourceAsset(params: {
  provider: CloudStorageProvider;
  sourceAsset: Asset;
  songVersionId: string;
  purpose: "post_preview" | "collaboration_preview";
  postId?: string | null;
  projectId?: string | null;
  signal?: AbortSignal;
  onJobChange?: (job: MediaProcessingJob | null) => void;
  onProgress?: (progress: number) => void;
}) {
  params.onProgress?.(5);
  const sourceBlob = await params.provider.getPrivateFileBlob(params.sourceAsset.remote_file_id);
  const sourceFile = new File([sourceBlob], params.sourceAsset.filename, {
    type: params.sourceAsset.mime_type || sourceBlob.type || "application/octet-stream",
    lastModified: Date.now(),
  });
  params.onProgress?.(18);

  const job = await createMediaProcessingJob({
    sourceAssetId: params.sourceAsset.id,
    songVersionId: params.songVersionId,
    outputMode: "protected",
    protectedPurpose: params.purpose,
    projectId: params.projectId ?? null,
    postId: params.postId ?? null,
  });
  params.onJobChange?.(job);

  if (job.status === "created" || job.status === "uploading") {
    await uploadMediaProcessingInput({
      jobId: job.id,
      file: sourceFile,
      signal: params.signal,
      onProgress: (progress) => params.onProgress?.(toProgress(18, 52, progress)),
    });
  }

  const completedJob = job.status === "completed"
    ? job
    : await waitForJobToSettle({
        jobId: job.id,
        signal: params.signal,
        onJobChange: params.onJobChange,
        onProgress: (progress) => params.onProgress?.(toProgress(52, 100, progress)),
      });

  if (!completedJob.protected_asset_id) {
    throw new Error("The media worker completed without a protected preview asset.");
  }
  params.onProgress?.(100);
  return completedJob;
}

export async function uploadOriginalWithAutomaticPreview(params: {
  ownerId: string;
  provider: CloudStorageProvider;
  originalFile: File;
  songId?: string | null;
  originalsFolderId: string;
  previewsFolderId: string;
  signal?: AbortSignal;
  onProgress?: (progress: number) => void;
  onJobChange?: (job: MediaProcessingJob | null) => void;
}) {
  const upload = await uploadFileToDrive({
    provider: params.provider,
    file: params.originalFile,
    parentFolderId: params.originalsFolderId,
    signal: params.signal,
    onProgress: (progress) => {
      params.onProgress?.(toProgress(0, 38, progress));
    },
  });
  const originalAsset = await createAssetRecord({
    ownerId: params.ownerId,
    assetType: "audio_original",
    accessMode: "private",
    upload,
  });
  params.onProgress?.(40);

  try {
    const automaticPreview = await generateAutomaticPreview({
      ownerId: params.ownerId,
      provider: params.provider,
      sourceAsset: originalAsset,
      sourceFile: params.originalFile,
      songId: params.songId ?? null,
      previewFolderId: params.previewsFolderId,
      signal: params.signal,
      onProgress: params.onProgress,
      onJobChange: params.onJobChange,
    });

    return {
      originalAsset,
      previewAsset: automaticPreview.previewAsset,
      job: automaticPreview.job,
      automationError: null,
    };
  } catch (error) {
    if (
      params.signal?.aborted
      || (error instanceof DOMException && error.name === "AbortError")
    ) {
      throw error;
    }
    return {
      originalAsset,
      previewAsset: null,
      job: null,
      automationError:
        error instanceof Error
          ? error.message
          : "The original was uploaded, but the preview could not be generated automatically.",
    };
  }
}
