import { env } from "@/lib/env";
import { createDemoDelay, isDemoModeEnabled, requireSupabase } from "@/lib/service-utils";
import type { MediaProcessingJob } from "@/types/domain";

async function getAccessToken() {
  const client = requireSupabase();
  const { data, error } = await client.auth.getSession();

  if (error) {
    throw error;
  }

  const accessToken = data.session?.access_token;
  if (!accessToken) {
    throw new Error("Please sign in first.");
  }

  return accessToken;
}

async function workerRequest<T>(path: string, init?: RequestInit) {
  const accessToken = await getAccessToken();
  const response = await fetch(`${env.mediaWorkerUrl}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const payload = await response.text();
    throw new Error(payload || `Media worker request failed with status ${response.status}.`);
  }

  if (response.status === 204) {
    return null as T;
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return (await response.json()) as T;
  }

  return (await response.blob()) as T;
}

export async function listMediaProcessingJobs(sourceAssetId?: string) {
  if (isDemoModeEnabled()) {
    await createDemoDelay(150);
    return [] as MediaProcessingJob[];
  }

  const client = requireSupabase();
  let query = client
    .from("media_processing_jobs")
    .select("*")
    .order("created_at", { ascending: false });

  if (sourceAssetId) {
    query = query.eq("source_asset_id", sourceAssetId);
  }

  const { data, error } = await query;
  if (error) {
    throw error;
  }

  return (data ?? []) as MediaProcessingJob[];
}

export async function createMediaProcessingJob(input: {
  sourceAssetId: string;
  songVersionId?: string | null;
}) {
  if (isDemoModeEnabled()) {
    await createDemoDelay(180);
    return {
      id: crypto.randomUUID(),
      owner_id: "demo",
      source_asset_id: input.sourceAssetId,
      song_version_id: input.songVersionId ?? null,
      status: "created",
      stage: "Awaiting upload",
      progress: 0,
      input_filename: null,
      input_mime_type: null,
      input_bytes: null,
      input_checksum: null,
      output_mime_type: null,
      output_bytes: null,
      duration_seconds: null,
      detected_codec: null,
      sample_rate_hz: null,
      channels: null,
      bit_rate_bps: null,
      waveform_data: null,
      error_code: null,
      error_message: null,
      attempt_count: 0,
      worker_instance_id: null,
      cancel_requested_at: null,
      created_at: new Date().toISOString(),
      started_at: null,
      ready_at: null,
      completed_at: null,
      expires_at: null,
      updated_at: new Date().toISOString(),
    } satisfies MediaProcessingJob;
  }

  const client = requireSupabase();
  const { data, error } = await client.rpc("request_media_processing_job", {
    source_asset_id: input.sourceAssetId,
    linked_song_version_id: input.songVersionId ?? null,
  });

  if (error) {
    throw error;
  }

  return data as MediaProcessingJob;
}

export async function uploadMediaProcessingInput(input: {
  jobId: string;
  file: File;
  signal?: AbortSignal;
  onProgress?: (progress: number) => void;
}) {
  const accessToken = await getAccessToken();

  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", `${env.mediaWorkerUrl}/v1/media/jobs/${input.jobId}/input`);
    xhr.setRequestHeader("Authorization", `Bearer ${accessToken}`);
    xhr.setRequestHeader("Content-Type", input.file.type || "application/octet-stream");

    if (input.onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          input.onProgress?.(Math.round((event.loaded / event.total) * 100));
        }
      };
    }

    xhr.onerror = () =>
      reject(
        new Error(
          "Uploading the original to the media worker failed. Check that the worker is running and that its APP_ORIGIN allows your current frontend URL.",
        ),
      );
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
        return;
      }

      reject(
        new Error(
          xhr.responseText ||
            `Uploading the original to the media worker failed with status ${xhr.status}.`,
        ),
      );
    };

    if (input.signal) {
      input.signal.addEventListener(
        "abort",
        () => {
          xhr.abort();
          reject(new DOMException("Upload aborted.", "AbortError"));
        },
        { once: true },
      );
    }

    xhr.send(input.file);
  });
}

export async function getMediaProcessingJob(jobId: string) {
  if (isDemoModeEnabled()) {
    await createDemoDelay(120);
    return null;
  }

  return workerRequest<MediaProcessingJob>(`/v1/media/jobs/${jobId}`);
}

export async function downloadMediaProcessingPreview(jobId: string) {
  if (isDemoModeEnabled()) {
    await createDemoDelay(150);
    return new Blob([], { type: "audio/mpeg" });
  }

  const accessToken = await getAccessToken();

  return new Promise<Blob>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", `${env.mediaWorkerUrl}/v1/media/jobs/${jobId}/preview`);
    xhr.responseType = "blob";
    xhr.setRequestHeader("Authorization", `Bearer ${accessToken}`);

    xhr.onerror = () => reject(new Error("Downloading the generated preview from the media worker failed."));
    xhr.onload = () => {
      if (xhr.status < 200 || xhr.status >= 300) {
        reject(new Error(`Downloading the generated preview failed with status ${xhr.status}.`));
        return;
      }

      const response = xhr.response;
      if (!(response instanceof Blob) || response.size <= 0) {
        reject(new Error("The media worker returned an empty preview file."));
        return;
      }

      resolve(response);
    };

    xhr.send();
  });
}

export async function acknowledgeMediaProcessingJob(jobId: string) {
  if (isDemoModeEnabled()) {
    await createDemoDelay(100);
    return;
  }

  await workerRequest(`/v1/media/jobs/${jobId}/acknowledge`, {
    method: "POST",
  });
}

export async function cancelMediaProcessingJob(jobId: string) {
  if (isDemoModeEnabled()) {
    await createDemoDelay(100);
    return;
  }

  const client = requireSupabase();
  const { error } = await client.rpc("cancel_media_processing_job", {
    job_id: jobId,
  });

  if (error) {
    throw error;
  }

  await workerRequest(`/v1/media/jobs/${jobId}`, {
    method: "DELETE",
  });
}

export async function finalizeMediaProcessingJob(input: {
  jobId: string;
  previewAssetId: string;
}) {
  if (isDemoModeEnabled()) {
    await createDemoDelay(100);
    return;
  }

  const client = requireSupabase();
  const { error } = await client.rpc("finalize_media_processing_job", {
    job_id: input.jobId,
    preview_asset_id: input.previewAssetId,
  });

  if (error) {
    throw error;
  }
}

export async function sendPushTestNotification() {
  if (isDemoModeEnabled()) {
    await createDemoDelay(120);
    return;
  }

  await workerRequest("/v1/push/test", {
    method: "POST",
  });
}
