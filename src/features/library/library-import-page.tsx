import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CloudUpload,
  FileAudio2,
  FolderOpen,
  LoaderCircle,
  Music2,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { startTransition, useEffect, useId, useRef, useState, type DragEvent } from "react";
import { Link, useBlocker, useLocation, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useCloudUploadProvider } from "@/features/cloud-providers/use-cloud-upload-provider";
import { createSong } from "@/features/library/api";
import { LibraryImportLeaveDialog } from "@/features/library/library-import-leave-dialog";
import {
  getLibraryImportProgress,
  getSongTitleFromFilename,
  isLibraryImportSettled,
  readLibraryImportSession,
  recoverInterruptedLibraryImport,
  writeLibraryImportSession,
  type LibraryImportItem,
} from "@/features/library/library-import-session";
import { uploadOriginalWithAutomaticPreview } from "@/features/media-processing/automatic-preview";
import { useAppViewer } from "@/hooks/use-app-viewer";
import { acceptedAudioExtensions, acceptedAudioMimeTypes } from "@/lib/constants";
import { queryClient } from "@/lib/query-client";
import { cn, formatBytes } from "@/lib/utils";

const maxParallelUploads = 3;

function isAcceptedAudio(file: File) {
  const filename = file.name.toLowerCase();
  return acceptedAudioExtensions.some((extension) => filename.endsWith(extension))
    || acceptedAudioMimeTypes.includes(file.type as (typeof acceptedAudioMimeTypes)[number]);
}

function getStatusPresentation(item: LibraryImportItem) {
  if (item.status === "ready") return { icon: Check, label: "Ready for versions", badge: "success" as const };
  if (item.status === "attention") return { icon: AlertTriangle, label: "Original safe", badge: "warning" as const };
  if (item.status === "failed") return { icon: AlertTriangle, label: "Needs attention", badge: "warning" as const };
  if (item.status === "creating") return { icon: LoaderCircle, label: "Creating song", badge: "accent" as const };
  if (item.status === "uploading") return { icon: LoaderCircle, label: "Uploading & processing", badge: "accent" as const };
  return { icon: FileAudio2, label: "Queued", badge: "neutral" as const };
}

function getInitialImportFiles(state: unknown) {
  const files = (state as { files?: unknown } | null)?.files;
  return Array.isArray(files) ? files.filter((file): file is File => file instanceof File) : [];
}

export function LibraryImportPage() {
  const viewer = useAppViewer();
  const location = useLocation();
  const navigate = useNavigate();
  const { batchId: routeBatchId } = useParams();
  const cloudUpload = useCloudUploadProvider(viewer.userId);
  const fileInputId = useId();
  const itemsRef = useRef<LibraryImportItem[]>([]);
  const activeImportRef = useRef(false);
  const abortRequestedRef = useRef(false);
  const navigationBypassRef = useRef(false);
  const uploadControllersRef = useRef(new Set<AbortController>());
  const initialFilesRef = useRef<File[]>(getInitialImportFiles(location.state));
  const batchIdRef = useRef(routeBatchId ?? "");
  const createdAtRef = useRef(new Date().toISOString());
  const [items, setItems] = useState<LibraryImportItem[]>(() => {
    const restored = routeBatchId ? readLibraryImportSession(routeBatchId) : null;
    if (restored) {
      const recoveredItems = recoverInterruptedLibraryImport(restored.items);
      batchIdRef.current = restored.id;
      createdAtRef.current = restored.createdAt;
      itemsRef.current = recoveredItems;
      return recoveredItems;
    }
    return [];
  });
  const [processing, setProcessing] = useState(false);
  const [aborting, setAborting] = useState(false);
  const [dragging, setDragging] = useState(false);
  const navigationBlocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      processing
      && !navigationBypassRef.current
      && (
        currentLocation.pathname !== nextLocation.pathname
        || currentLocation.search !== nextLocation.search
      ),
  );

  useEffect(() => {
    if (!routeBatchId || activeImportRef.current) return;
    const restored = readLibraryImportSession(routeBatchId);
    if (!restored) return;
    const recoveredItems = recoverInterruptedLibraryImport(restored.items);
    batchIdRef.current = restored.id;
    createdAtRef.current = restored.createdAt;
    if (itemsRef.current.length === 0) {
      itemsRef.current = recoveredItems;
      setItems(recoveredItems);
    }
    if (restored.items.some((item) => item.status === "queued" || item.status === "creating" || item.status === "uploading")) {
      writeLibraryImportSession({ ...restored, updatedAt: new Date().toISOString(), items: recoveredItems });
    }
  }, [routeBatchId]);

  function commitItems(transform: (current: LibraryImportItem[]) => LibraryImportItem[]) {
    const next = transform(itemsRef.current);
    itemsRef.current = next;
    startTransition(() => setItems(next));

    if (batchIdRef.current) {
      writeLibraryImportSession({
        schemaVersion: 1,
        id: batchIdRef.current,
        provider: cloudUpload.providerId,
        createdAt: createdAtRef.current,
        updatedAt: new Date().toISOString(),
        items: next,
      });
    }
  }

  function updateItem(itemId: string, patch: Partial<LibraryImportItem>) {
    commitItems((current) => current.map((item) => item.id === itemId ? { ...item, ...patch } : item));
  }

  async function processItem(item: LibraryImportItem, file: File, folders: {
    audioOriginalsFolderId: string;
    audioPreviewsFolderId: string;
  }) {
    let songId: string | null = null;
    const controller = new AbortController();
    uploadControllersRef.current.add(controller);

    try {
      updateItem(item.id, { status: "creating", progress: 2, message: null });
      const song = await createSong(viewer.userId!, {
        title: item.title,
        notes: "",
        lyrics: "",
        musical_key: "",
        tempo_bpm: null,
        default_artwork_asset_id: null,
      });
      songId = song.id;
      updateItem(item.id, { songId, status: "uploading", progress: 5 });

      const result = await uploadOriginalWithAutomaticPreview({
        ownerId: viewer.userId!,
        provider: cloudUpload.provider,
        originalFile: file,
        songId,
        originalsFolderId: folders.audioOriginalsFolderId,
        previewsFolderId: folders.audioPreviewsFolderId,
        signal: controller.signal,
        onProgress: (progress) => updateItem(item.id, {
          status: "uploading",
          progress: Math.max(5, progress),
        }),
      });

      updateItem(item.id, {
        status: result.automationError ? "attention" : "ready",
        progress: 100,
        sourceAssetId: result.originalAsset.id,
        previewAssetId: result.previewAsset?.id ?? null,
        message: result.automationError
          ? `Original uploaded. Preview generation needs attention: ${result.automationError}`
          : "Original and playback asset are ready. Add your first version in the workspace.",
      });
    } catch (error) {
      const wasAborted = controller.signal.aborted
        || (error instanceof DOMException && error.name === "AbortError");
      updateItem(item.id, {
        status: "failed",
        progress: songId ? 5 : 0,
        songId,
        message: wasAborted
          ? "Upload stopped. Open this song in the Library whenever you want to retry."
          : error instanceof Error ? error.message : "This track could not be imported.",
      });
    } finally {
      uploadControllersRef.current.delete(controller);
    }
  }

  async function startImport(selectedFiles: File[]) {
    if (!viewer.userId || processing) return;
    if (!cloudUpload.connection) {
      toast.error("Connect a cloud provider before importing audio files.");
      return;
    }

    const uniqueFiles = Array.from(
      new Map(selectedFiles.map((file) => [`${file.name}:${file.size}:${file.lastModified}`, file])).values(),
    );
    const acceptedFiles = uniqueFiles.filter(isAcceptedAudio);
    const rejectedCount = uniqueFiles.length - acceptedFiles.length;
    if (acceptedFiles.length === 0) {
      toast.error("Choose at least one supported audio file.");
      return;
    }
    if (rejectedCount > 0) {
      toast.warning(`${rejectedCount} unsupported file${rejectedCount === 1 ? " was" : "s were"} skipped.`);
    }

    const nextBatchId = crypto.randomUUID();
    abortRequestedRef.current = false;
    navigationBypassRef.current = false;
    batchIdRef.current = nextBatchId;
    createdAtRef.current = new Date().toISOString();
    const nextItems = acceptedFiles.map<LibraryImportItem>((file) => ({
      id: crypto.randomUUID(),
      filename: file.name,
      title: getSongTitleFromFilename(file.name),
      progress: 0,
      status: "queued",
      songId: null,
      sourceAssetId: null,
      previewAssetId: null,
      message: `${formatBytes(file.size)} · waiting for an upload slot`,
    }));
    itemsRef.current = nextItems;
    setItems(nextItems);
    writeLibraryImportSession({
      schemaVersion: 1,
      id: nextBatchId,
      provider: cloudUpload.providerId,
      createdAt: createdAtRef.current,
      updatedAt: new Date().toISOString(),
      items: nextItems,
    });
    activeImportRef.current = true;
    navigate(`/library/import/${nextBatchId}`, { replace: true });
    setProcessing(true);

    try {
      const folders = await cloudUpload.ensureFolders();
      let nextIndex = 0;
      const workers = Array.from({ length: Math.min(maxParallelUploads, acceptedFiles.length) }, async () => {
        while (nextIndex < acceptedFiles.length && !abortRequestedRef.current) {
          const index = nextIndex;
          nextIndex += 1;
          await processItem(nextItems[index], acceptedFiles[index], folders);
        }
      });
      await Promise.all(workers);
      await queryClient.invalidateQueries({ queryKey: ["library", viewer.userId] });
      const failedCount = itemsRef.current.filter((item) => item.status === "failed").length;
      if (failedCount > 0) {
        toast.warning(`${acceptedFiles.length - failedCount} songs imported; ${failedCount} need attention.`);
      } else {
        toast.success(`${acceptedFiles.length} songs are ready in your Library.`);
      }
    } catch (error) {
      commitItems((current) => current.map((item) => item.status === "queued"
        ? { ...item, status: "failed", message: error instanceof Error ? error.message : "Storage setup failed." }
        : item));
      toast.error(error instanceof Error ? error.message : "The import could not start.");
    } finally {
      activeImportRef.current = false;
      setProcessing(false);
    }
  }

  useEffect(() => {
    if (
      routeBatchId
      || initialFilesRef.current.length < 2
      || !viewer.userId
      || !cloudUpload.connection
      || activeImportRef.current
    ) {
      return;
    }
    const files = initialFilesRef.current;
    initialFilesRef.current = [];
    void startImport(files);
  }, [cloudUpload.connection, routeBatchId, viewer.userId]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!processing || navigationBypassRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [processing]);

  function abortAndLeave() {
    if (navigationBlocker.state !== "blocked") return;
    setAborting(true);
    abortRequestedRef.current = true;
    navigationBypassRef.current = true;
    uploadControllersRef.current.forEach((controller) => controller.abort());
    commitItems((current) => current.map((item) =>
      item.status === "queued" || item.status === "creating" || item.status === "uploading"
        ? {
            ...item,
            status: "failed",
            message: "Upload stopped. Open this song in the Library whenever you want to retry.",
          }
        : item
    ));
    activeImportRef.current = false;
    setProcessing(false);
    navigationBlocker.proceed();
  }

  const overallProgress = getLibraryImportProgress(items);
  const settled = isLibraryImportSettled(items);
  const readyCount = items.filter((item) => item.status === "ready" || item.status === "attention").length;
  const failedCount = items.filter((item) => item.status === "failed").length;
  const firstWorkspaceItem = items.find((item) => item.songId) ?? null;

  return (
    <div className="space-y-6">
      <Link
        to="/library"
        className="inline-flex items-center gap-2 text-sm text-accent-secondary transition-colors hover:text-white"
      >
        <ArrowLeft className="size-4" />
        Back to library
      </Link>

      <PageHeader
        eyebrow="Batch import"
        title="Bring in a whole session"
        description="Create every song from its filename, upload several originals in parallel, then move through the complete workspaces without losing the batch context."
        actions={
          settled ? (
            <Button variant="secondary" onClick={() => {
                itemsRef.current = [];
                setItems([]);
                batchIdRef.current = "";
                navigate("/library/import", { replace: true });
              }}>
                <RotateCcw className="size-4" /> New import
            </Button>
          ) : null
        }
      />

      {items.length > 0 ? (
        <Card className="overflow-hidden border-accent/20 p-0">
          <div className="relative overflow-hidden border-b border-white/[0.06] px-5 py-5 md:px-6">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(var(--accent-rgb),0.22),transparent_38%)]" />
            <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-accent-secondary">Session queue</p>
                <h2 className="mt-2 font-display text-3xl font-semibold">{items.length} tracks moving together</h2>
                <p className="mt-2 max-w-2xl text-sm leading-7 text-muted-foreground">
                  Songs enter the Library immediately. Versions stay manual so every label, stage, and changelog remains yours to define.
                </p>
              </div>
              <div className="flex items-end gap-6">
                <div>
                  <p className="font-display text-4xl font-semibold text-accent-secondary">{overallProgress}%</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">overall</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="success">{readyCount} ready</Badge>
                  {failedCount ? <Badge variant="warning">{failedCount} failed</Badge> : null}
                  {processing ? <Badge variant="accent">{Math.min(maxParallelUploads, items.length)} parallel lanes</Badge> : null}
                </div>
              </div>
            </div>
            <div className="relative mt-5 h-2 overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-accent via-accent-strong to-accent-secondary transition-[width] duration-500 ease-out"
                style={{ width: `${overallProgress}%` }}
              />
            </div>
          </div>

          <div className="grid gap-3 p-4 md:grid-cols-2 md:p-5 xl:grid-cols-3">
            {items.map((item, index) => {
              const presentation = getStatusPresentation(item);
              const StatusIcon = presentation.icon;
              const canOpen = Boolean(item.songId && settled);
              return (
                <button
                  key={item.id}
                  type="button"
                  disabled={!canOpen}
                  onClick={() => {
                    if (item.songId) navigate(`/library/songs/${item.songId}?batch=${batchIdRef.current}`);
                  }}
                  className={cn(
                    "group relative min-w-0 overflow-hidden rounded-[24px] border border-white/[0.07] bg-white/[0.025] p-4 text-left opacity-0 shadow-[0_18px_42px_rgba(3,0,18,0.2)] transition-[transform,border-color,background-color,box-shadow] duration-300 [animation:library-import-in_500ms_cubic-bezier(.22,1,.36,1)_forwards]",
                    canOpen
                      ? "cursor-pointer hover:-translate-y-1 hover:border-accent/35 hover:bg-accent/[0.07] hover:shadow-[0_22px_52px_rgba(var(--accent-rgb),0.13)]"
                      : "cursor-default",
                  )}
                  style={{ animationDelay: `${Math.min(index * 55, 440)}ms` }}
                >
                  <div className="flex items-start gap-3">
                    <div className="relative flex size-12 shrink-0 items-center justify-center rounded-2xl border border-accent/15 bg-[radial-gradient(circle_at_top,rgba(var(--accent-rgb),0.2),rgba(255,255,255,0.025)_68%)]">
                      <FileAudio2 className="size-5 text-accent-secondary" />
                      <span className="absolute -bottom-1 -right-1 flex size-5 items-center justify-center rounded-full border border-background bg-surface-strong text-[10px] text-muted-foreground">
                        {index + 1}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-foreground" title={item.title}>{item.title}</p>
                      <p className="mt-1 truncate text-xs text-muted-foreground" title={item.filename}>{item.filename}</p>
                    </div>
                    <StatusIcon className={cn(
                      "mt-1 size-4 shrink-0",
                      item.status === "creating" || item.status === "uploading" ? "animate-spin text-accent-secondary" : item.status === "failed" ? "text-danger" : "text-success",
                    )} />
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-3">
                    <Badge variant={presentation.badge}>{presentation.label}</Badge>
                    <span className="font-mono text-xs text-muted-foreground">{item.progress}%</span>
                  </div>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                    <div
                      className={cn(
                        "h-full rounded-full transition-[width] duration-500",
                        item.status === "failed" ? "bg-danger" : "bg-gradient-to-r from-accent to-accent-secondary",
                      )}
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                  <p className="mt-3 line-clamp-2 min-h-10 text-xs leading-5 text-muted-foreground">
                    {item.message}
                  </p>
                  {canOpen ? (
                    <span className="mt-3 inline-flex items-center gap-2 text-xs font-medium text-accent-secondary">
                      <FolderOpen className="size-3.5" /> Open song workspace
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>

          {settled && firstWorkspaceItem?.songId ? (
            <div className="flex flex-col gap-4 border-t border-white/[0.06] px-5 py-5 md:flex-row md:items-center md:justify-between md:px-6">
              <div className="flex items-start gap-3">
                <Sparkles className="mt-1 size-5 text-accent-secondary" />
                <div>
                  <p className="font-medium">The batch is ready for your decisions.</p>
                  <p className="mt-1 text-sm text-muted-foreground">Open the first workspace, define its version, then move through the rail at the top.</p>
                </div>
              </div>
              <Button onClick={() => navigate(`/library/songs/${firstWorkspaceItem.songId}?batch=${batchIdRef.current}`)}>
                Start editing <FolderOpen className="size-4" />
              </Button>
            </div>
          ) : null}
        </Card>
      ) : (
        <Card className={cn(
          "overflow-hidden border-dashed p-0 transition-[border-color,background-color] duration-300",
          dragging ? "border-accent bg-accent/[0.07]" : "border-border",
        )}>
          <div
            className="relative grid min-h-[26rem] place-items-center overflow-hidden p-6 text-center"
            onDragEnter={(event: DragEvent<HTMLDivElement>) => { event.preventDefault(); setDragging(true); }}
            onDragLeave={(event: DragEvent<HTMLDivElement>) => { event.preventDefault(); setDragging(false); }}
            onDragOver={(event: DragEvent<HTMLDivElement>) => { event.preventDefault(); setDragging(true); }}
            onDrop={(event: DragEvent<HTMLDivElement>) => {
              event.preventDefault();
              setDragging(false);
              void startImport(Array.from(event.dataTransfer.files));
            }}
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(var(--accent-rgb),0.18),transparent_35%)]" />
            <div className="relative max-w-2xl">
              <div className="mx-auto flex size-20 items-center justify-center rounded-[28px] border border-accent/25 bg-[radial-gradient(circle_at_top,rgba(var(--accent-rgb),0.32),rgba(255,255,255,0.025)_65%)] shadow-[0_24px_70px_rgba(var(--accent-rgb),0.2)]">
                <CloudUpload className="size-8 text-accent-secondary" />
              </div>
              <p className="mt-6 text-xs uppercase tracking-[0.25em] text-accent-secondary">Multi-track intake</p>
              <h2 className="mt-3 font-display text-4xl font-semibold tracking-[-0.025em]">Drop the whole folder of ideas.</h2>
              <p className="mx-auto mt-4 max-w-xl text-base leading-8 text-muted-foreground">
                Select multiple audio files. MxTrove creates one private song per filename and processes up to {maxParallelUploads} tracks at once.
              </p>
              <input
                id={fileInputId}
                className="sr-only"
                type="file"
                multiple
                accept={acceptedAudioExtensions.join(",")}
                onChange={(event) => {
                  const files = Array.from(event.currentTarget.files ?? []);
                  event.currentTarget.value = "";
                  void startImport(files);
                }}
              />
              <div className="mt-7 flex flex-wrap justify-center gap-3">
                <label
                  htmlFor={cloudUpload.connection ? fileInputId : undefined}
                  className={cn(
                    buttonVariants({ variant: "primary", size: "lg" }),
                    cloudUpload.connection ? "cursor-pointer" : "pointer-events-none opacity-50",
                  )}
                >
                  <Music2 className="size-4" /> Choose audio files
                </label>
                {!cloudUpload.connection ? (
                  <Link to="/settings/storage"><Button variant="secondary">Connect cloud storage</Button></Link>
                ) : null}
              </div>
              <p className="mt-5 text-xs leading-6 text-subtle-foreground">
                WAV, MP3, FLAC, AIFF, AIF, M4A, AAC, OGG, and OPUS · duplicates in this selection are skipped
              </p>
            </div>
          </div>
        </Card>
      )}

      <LibraryImportLeaveDialog
        open={navigationBlocker.state === "blocked"}
        aborting={aborting}
        onAbort={abortAndLeave}
        onStay={() => {
          if (navigationBlocker.state === "blocked") navigationBlocker.reset();
        }}
      />
    </div>
  );
}
