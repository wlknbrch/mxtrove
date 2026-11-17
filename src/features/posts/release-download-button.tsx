import { Download, LoaderCircle, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { chooseArchiveFile, createBrowserArchiveSink, getReleaseDownloadManifest, MAX_MEMORY_ARCHIVE_BYTES, writeReleaseArchive,
  type ArchiveSink, type ReleaseDownloadProgress } from "@/features/posts/release-download";

export function ReleaseDownloadButton({ postId, title, artist, single }: {
  postId: string; title: string; artist?: string; single?: boolean;
}) {
  const active = useRef<AbortController | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<ReleaseDownloadProgress | null>(null);
  useEffect(() => () => { active.current?.abort(); }, []);

  async function download() {
    if (active.current) return;
    const controller = new AbortController();
    active.current = controller;
    setBusy(true);
    setProgress(null);
    let sink: ArchiveSink | null = null;
    try {
      const destination = await chooseArchiveFile(title);
      controller.signal.throwIfAborted();
      const manifest = await getReleaseDownloadManifest(postId, controller.signal);
      sink = destination ? await destination.createWritable() : createBrowserArchiveSink(manifest.archiveName);
      await writeReleaseArchive({ manifest, sink, artist, signal: controller.signal,
        maxBytes: destination ? undefined : MAX_MEMORY_ARCHIVE_BYTES, onProgress: setProgress });
      toast.success("Release archive downloaded.");
    } catch (error) {
      await sink?.abort().catch(() => undefined);
      if (!(error instanceof Error && error.name === "AbortError")) {
        toast.error(error instanceof Error ? error.message : "Could not download this release.");
      }
    } finally {
      active.current = null;
      setBusy(false);
      setProgress(null);
    }
  }

  return (
    <div className="flex max-w-full flex-wrap items-center gap-2">
      <Button variant="ghost" size="sm" disabled={busy} onClick={() => void download()}>
        {busy ? <LoaderCircle className="size-4 animate-spin" /> : <Download className="size-4" />}
        {busy ? "Downloading…" : single ? "Download versions" : "Download release"}
      </Button>
      {busy ? <>
        <Button variant="ghost" size="sm" onClick={() => active.current?.abort()} aria-label="Cancel release download">
          <X className="size-4" /> Cancel
        </Button>
        <span role="status" className="max-w-60 truncate text-xs text-muted-foreground">
          {progress ? `${progress.completed + (progress.completed < progress.total ? 1 : 0)} / ${progress.total} · ${progress.filename}` : "Preparing archive…"}
        </span>
      </> : null}
    </div>
  );
}
