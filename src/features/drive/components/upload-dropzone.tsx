import { useId, useRef, useState, type DragEvent, type KeyboardEvent } from "react";
import { AlertCircle, LoaderCircle, RefreshCcw, UploadCloud, X } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { acceptedAudioExtensions, acceptedAudioMimeTypes, publicPreviewPreferredExtensions } from "@/lib/constants";
import { cn, formatBytes } from "@/lib/utils";

import type { CloudAssetResult, UploadFileInput } from "@/features/drive/providers/cloud-storage";

function isAcceptedAudio(file: File) {
  const lowerName = file.name.toLowerCase();
  const extensionOk = acceptedAudioExtensions.some((extension) => lowerName.endsWith(extension));
  const mimeOk = acceptedAudioMimeTypes.includes(file.type as (typeof acceptedAudioMimeTypes)[number]);
  return extensionOk || mimeOk;
}

export function UploadDropzone({
  title,
  description,
  parentFolderId,
  recommendedPublicPreview = false,
  disabled,
  onUpload,
}: {
  title: string;
  description: string;
  parentFolderId: string;
  recommendedPublicPreview?: boolean;
  disabled?: boolean;
  onUpload: (input: UploadFileInput) => Promise<CloudAssetResult>;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [fileLabel, setFileLabel] = useState<string | null>(null);
  const [controller, setController] = useState<AbortController | null>(null);
  const [lastFile, setLastFile] = useState<File | null>(null);

  function handlePickerKeyDown(event: KeyboardEvent<HTMLLabelElement>) {
    if (disabled || progress !== null) {
      return;
    }

    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    inputRef.current?.click();
  }

  async function handleFile(file: File) {
    setError(null);

    if (!isAcceptedAudio(file)) {
      setError("This file can be archived, but it is not an accepted original or preview audio type.");
      return;
    }

    if (
      recommendedPublicPreview &&
      !publicPreviewPreferredExtensions.some((extension) => file.name.toLowerCase().endsWith(extension))
    ) {
      setError(
        "This original can be archived, but please provide an MP3, M4A, AAC, or OGG file for public browser playback.",
      );
      return;
    }

    const nextController = new AbortController();
    setController(nextController);
    setLastFile(file);
    setFileLabel(`${file.name} · ${formatBytes(file.size)}`);
    setProgress(0);

    try {
      await onUpload({
        file,
        parentFolderId,
        signal: nextController.signal,
        onProgress: setProgress,
      });
      setProgress(100);
    } catch (uploadError) {
      if (uploadError instanceof DOMException && uploadError.name === "AbortError") {
        setError("Upload canceled.");
      } else {
        setError(uploadError instanceof Error ? uploadError.message : "Upload failed.");
      }
      setProgress(null);
    } finally {
      setController(null);
    }
  }

  return (
    <Card
      className={cn(
        "overflow-hidden border-dashed p-0 transition-[border-color,background-color]",
        dragging ? "border-accent bg-accent/6" : "border-border",
      )}
    >
      <div
        onDragEnter={(event: DragEvent<HTMLDivElement>) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(event: DragEvent<HTMLDivElement>) => {
          event.preventDefault();
          setDragging(false);
        }}
        onDragOver={(event: DragEvent<HTMLDivElement>) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDrop={(event: DragEvent<HTMLDivElement>) => {
          event.preventDefault();
          setDragging(false);
          const droppedFile = event.dataTransfer.files?.[0];
          if (droppedFile) {
            void handleFile(droppedFile);
          }
        }}
      >
        <CardHeader className="mb-0 border-b border-white/[0.06] px-5 py-5">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription className="mt-2 text-sm leading-7">{description}</CardDescription>
          </div>
        </CardHeader>
        <div className="p-5">
          <div className="rounded-[24px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-[radial-gradient(circle_at_top,rgba(157,92,255,0.22),rgba(255,255,255,0.03)_62%)] text-accent-secondary">
                  {progress !== null && progress < 100 ? (
                    <LoaderCircle className="size-5 animate-spin" />
                  ) : (
                    <UploadCloud className="size-5" />
                  )}
                </div>
                <div className="space-y-1">
                  <p className="font-medium">
                    Drag an audio file here or choose one from your device.
                  </p>
                  <p className="text-sm leading-7 text-muted-foreground">
                    Accepted originals: WAV, MP3, FLAC, AIFF, AIF, M4A, AAC, OGG, OPUS.
                  </p>
                  {fileLabel ? <p className="text-sm text-accent-secondary">{fileLabel}</p> : null}
                </div>
              </div>
              <div className="flex flex-wrap gap-3 md:max-w-[15rem] md:justify-end">
                <input
                  id={inputId}
                  ref={inputRef}
                  className="sr-only"
                  type="file"
                  accept={acceptedAudioExtensions.join(",")}
                  onChange={(event) => {
                    const selectedFile = event.currentTarget.files?.[0];
                    event.currentTarget.value = "";
                    if (selectedFile) {
                      void handleFile(selectedFile);
                    }
                  }}
                />
                <label
                  htmlFor={disabled || progress !== null ? undefined : inputId}
                  role="button"
                  tabIndex={disabled || progress !== null ? -1 : 0}
                  aria-controls={inputId}
                  aria-disabled={disabled || progress !== null}
                  onKeyDown={handlePickerKeyDown}
                  className={cn(
                    buttonVariants({ variant: "secondary" }),
                    disabled || progress !== null ? "pointer-events-none opacity-50" : "cursor-pointer",
                  )}
                >
                  Choose file
                </label>
                {progress !== null && progress < 100 && controller ? (
                  <Button
                    variant="ghost"
                    onClick={() => controller.abort()}
                  >
                    <X className="size-4" />
                    Cancel
                  </Button>
                ) : null}
                {error && lastFile ? (
                  <Button
                    variant="ghost"
                    onClick={() => void handleFile(lastFile)}
                  >
                    <RefreshCcw className="size-4" />
                    Retry
                  </Button>
                ) : null}
              </div>
            </div>

            {progress !== null ? (
              <div className="mt-4 space-y-2">
                <div className="h-2 overflow-hidden rounded-full bg-white/6">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-accent to-accent-secondary"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">{progress}% complete</p>
              </div>
            ) : null}

            {error ? (
              <div className="mt-4 flex items-start gap-3 rounded-[18px] border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                <span>{error}</span>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </Card>
  );
}
