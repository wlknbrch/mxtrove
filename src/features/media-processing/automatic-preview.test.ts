import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { MediaProcessingJob } from "@/types/domain";

const { getMediaProcessingJobMock } = vi.hoisted(() => ({
  getMediaProcessingJobMock: vi.fn(),
}));

vi.mock("@/features/media-processing/api", () => ({
  ...vi.importActual("@/features/media-processing/api"),
  getMediaProcessingJob: getMediaProcessingJobMock,
}));

import { waitForJobToSettle } from "@/features/media-processing/automatic-preview";

function buildJob(overrides: Partial<MediaProcessingJob> = {}): MediaProcessingJob {
  return {
    id: "job-1",
    owner_id: "owner-1",
    source_asset_id: "asset-1",
    song_version_id: null,
    song_id: null,
    status: "transcoding",
    stage: "Converting to MP3",
    progress: 42,
    input_filename: "song.wav",
    input_mime_type: "audio/wav",
    input_bytes: 1024,
    input_checksum: null,
    output_mime_type: null,
    output_bytes: null,
    duration_seconds: 120,
    detected_codec: "pcm_s16le",
    sample_rate_hz: 44100,
    channels: 2,
    bit_rate_bps: 1411000,
    waveform_data: null,
    detected_tempo_bpm: null,
    detected_musical_key: null,
    tempo_confidence: null,
    key_confidence: null,
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
    output_mode: "public_cloud",
    protected_purpose: null,
    target_project_id: null,
    target_post_id: null,
    protected_asset_id: null,
    updated_at: new Date().toISOString(),
    ...overrides,
  } satisfies MediaProcessingJob;
}

describe("waitForJobToSettle", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    getMediaProcessingJobMock.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns once the job reaches a settled status", async () => {
    getMediaProcessingJobMock.mockResolvedValue(buildJob({ status: "ready", progress: 100 }));

    const job = await waitForJobToSettle({ jobId: "job-1" });

    expect(job.status).toBe("ready");
    expect(getMediaProcessingJobMock).toHaveBeenCalledTimes(1);
  });

  it("keeps polling until the job settles instead of freezing after one failure", async () => {
    getMediaProcessingJobMock
      .mockResolvedValueOnce(buildJob({ status: "queued", progress: 5 }))
      .mockResolvedValueOnce(buildJob({ status: "transcoding", progress: 42 }))
      .mockResolvedValueOnce(buildJob({ status: "ready", progress: 100 }));

    const pending = waitForJobToSettle({ jobId: "job-1" });
    await vi.runAllTimersAsync();
    const job = await pending;

    expect(job.status).toBe("ready");
    expect(getMediaProcessingJobMock).toHaveBeenCalledTimes(3);
  });

  it("survives transient poll failures and backs off instead of aborting the lane", async () => {
    getMediaProcessingJobMock
      .mockRejectedValueOnce(new Error("Too many requests. Please wait briefly and try again."))
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValue(buildJob({ status: "ready", progress: 100 }));

    const pending = waitForJobToSettle({ jobId: "job-1" });
    await vi.runAllTimersAsync();
    const job = await pending;

    expect(job.status).toBe("ready");
    expect(getMediaProcessingJobMock).toHaveBeenCalledTimes(3);
  });

  it("gives up with an actionable error after repeated transient failures", async () => {
    getMediaProcessingJobMock.mockRejectedValue(new Error("Too many requests."));
    const pending = waitForJobToSettle({ jobId: "job-1" });
    const assertion = expect(pending).rejects.toThrow(/kept refusing status updates.*original is safe/i);
    await vi.runAllTimersAsync();
    await assertion;

    expect(getMediaProcessingJobMock.mock.calls.length).toBeGreaterThan(3);
  });

  it("fails fast when the job record is gone instead of polling forever", async () => {
    getMediaProcessingJobMock.mockRejectedValue(new Error("Job not found."));
    const pending = waitForJobToSettle({ jobId: "job-1" });
    const assertion = expect(pending).rejects.toThrow(/could not be found anymore/i);
    await vi.runAllTimersAsync();
    await assertion;

    expect(getMediaProcessingJobMock).toHaveBeenCalledTimes(1);
  });

  it("surfaces the worker's terminal error message", async () => {
    getMediaProcessingJobMock.mockResolvedValue(
      buildJob({ status: "failed", error_message: "The uploaded file could not be analyzed correctly." }),
    );

    await expect(waitForJobToSettle({ jobId: "job-1" })).rejects.toThrow(
      "The uploaded file could not be analyzed correctly.",
    );
  });

  it("never polls forever when a stuck job stops reporting progress", async () => {
    getMediaProcessingJobMock.mockResolvedValue(buildJob({ status: "transcoding", progress: 42 }));
    const pending = waitForJobToSettle({ jobId: "job-1" });
    const assertion = expect(pending).rejects.toThrow(/has not reported progress.*original is safe/i);
    await vi.runAllTimersAsync();
    await assertion;

    expect(getMediaProcessingJobMock.mock.calls.length).toBeGreaterThan(10);
  });
});
