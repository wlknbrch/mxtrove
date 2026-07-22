import { acknowledgeMediaProcessingJob, createMediaProcessingJob, downloadMediaProcessingPreview, finalizeMediaProcessingJob, getMediaProcessingJob, uploadMediaProcessingInput } from "@/features/media-processing/api";
import { createAssetRecord, updateAssetPublicLinks } from "@/features/drive/api";

import type { CloudStorageProvider } from "@/features/drive/providers/cloud-storage";
import type { Asset, MediaProcessingJob } from "@/types/domain";

const DRIVE_UPLOAD_THRESHOLD_BYTES = 20 * 1024 * 1024;
const POLL_INTERVAL_MS = 1500;

function toProgress(min: number, max: number, progress: number) {
  const clamped = Math.max(0, Math.min(100, progress));
  return Math.round(min + ((max - min) * clamped) / 100);
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

async function waitForJobToSettle(params: {
  jobId: string;
  signal?: AbortSignal;
  onJobChange?: (job: MediaProcessingJob | null) => void;
  onProgress?: (progress: number) => void;
}) {
  while (true) {
    if (params.signal?.aborted) {
      throw new DOMException("Upload aborted.", "AbortError");
    }

    const job = await getMediaProcessingJob(params.jobId);
    params.onJobChange?.(job);

    if (!job) {
      throw new Error("The media processing job could not be found anymore.");
    }

    params.onProgress?.(toProgress(56, 86, job.progress));

    if (job.status === "ready" || job.status === "uploading_to_drive" || job.status === "completed") {
      return job;
    }

    if (job.status === "failed" || job.status === "cancelled" || job.status === "expired") {
      throw new Error(job.error_message || `Media processing ended with status "${job.status}".`);
    }

    await new Promise((resolve) => window.setTimeout(resolve, POLL_INTERVAL_MS));
  }
}

export async function generateAutomaticPreview(params: {
  ownerId: string;
  provider: CloudStorageProvider;
  sourceAsset: Asset;
  sourceFile: File;
  previewFolderId: string;
  signal?: AbortSignal;
  onJobChange?: (job: MediaProcessingJob | null) => void;
  onProgress?: (progress: number) => void;
}) {
  const job = await createMediaProcessingJob({
    sourceAssetId: params.sourceAsset.id,
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
  const publicPreview = await params.provider.makePublicPreview(upload.fileId);
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
    previewFolderId: params.previewFolderId,
    signal: params.signal,
    onJobChange: params.onJobChange,
    onProgress: params.onProgress,
  });
}

export async function uploadOriginalWithAutomaticPreview(params: {
  ownerId: string;
  provider: CloudStorageProvider;
  originalFile: File;
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
