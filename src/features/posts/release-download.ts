import { env } from "@/lib/env";
import { requireSupabase } from "@/lib/service-utils";
import { getCloudStorageProvider } from "@/features/cloud-providers/provider-registry";
import type { CloudProvider } from "@/types/domain";
import type { CloudStorageProvider } from "@/features/drive/providers/cloud-storage";

export interface ReleaseDownloadEntry {
  path: string;
  asset: { id: string; provider: CloudProvider; remoteFileId: string; filename: string; mimeType: string; bytes: number | null };
}
export interface ReleaseDownloadManifest {
  formatVersion: 1; generatedAt: string; archiveName: string; rootDirectory: string;
  post: { id: string; title: string; type: string; description: string | null; releaseNotes: string | null };
  tracks: Array<ReleaseDownloadEntry & {
    trackNumber: number; title: string; songId: string; versionId: string; versionLabel: string;
    versionNumber: number; productionStage: string; musicalKey: string | null; tempoBpm: number | null;
  }>;
  artwork: ReleaseDownloadEntry | null;
}
export interface ArchiveSink {
  write(chunk: Uint8Array): Promise<void>;
  close(): Promise<void>;
  abort(): Promise<void>;
}
export interface ArchiveFileHandle { createWritable(): Promise<ArchiveSink> }
export interface ReleaseDownloadProgress { completed: number; total: number; filename: string; bytes: number }
const MAX_ARCHIVE_BYTES = 3_500_000_000; // fflate uses ZIP32, not ZIP64.
export const MAX_MEMORY_ARCHIVE_BYTES = 1024 * 1024 * 1024;

export async function getReleaseDownloadManifest(postId: string, signal?: AbortSignal): Promise<ReleaseDownloadManifest> {
  const { data, error } = await requireSupabase().auth.getSession();
  if (error) throw error;
  if (!data.session?.access_token) throw new Error("Please sign in first.");
  const response = await fetch(`${env.mediaWorkerUrl}/v1/releases/${encodeURIComponent(postId)}/download-manifest`, {
    headers: { Authorization: `Bearer ${data.session.access_token}` },
    signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(30_000)]) : AbortSignal.timeout(30_000),
    cache: "no-store",
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(payload?.error || "The release download could not be prepared. Please update the media worker and try again.");
  }
  return response.json();
}

/** Call directly from the click handler, before awaiting network or code loading. */
export async function chooseArchiveFile(title: string): Promise<ArchiveFileHandle | null> {
  const picker = (window as unknown as { showSaveFilePicker?: (options: unknown) => Promise<ArchiveFileHandle> }).showSaveFilePicker;
  if (!picker) return null;
  const name = title.replace(/[\u0000-\u001f<>:"/\\|?*]/g, "_").replace(/[. ]+$/g, "").trim().slice(0, 120) || "MxTrove release";
  return picker.call(window, { suggestedName: `${name}.zip`, types: [{ description: "Release archive", accept: { "application/zip": [".zip"] } }] });
}

export function releaseArchiveMetadata(manifest: ReleaseDownloadManifest, artist?: string) {
  return { formatVersion: manifest.formatVersion, exportedAt: manifest.generatedAt, artist: artist || null,
    release: manifest.post, cover: manifest.artwork?.path ?? null,
    tracks: manifest.tracks.map(({ asset, ...track }) => ({ ...track, originalFilename: asset.filename,
      mimeType: asset.mimeType, bytes: asset.bytes })) };
}

export async function writeReleaseArchive(params: {
  manifest: ReleaseDownloadManifest; sink: ArchiveSink; artist?: string; signal?: AbortSignal;
  onProgress?: (progress: ReleaseDownloadProgress) => void;
  getProvider?: (provider: CloudProvider) => CloudStorageProvider;
  maxBytes?: number;
}) {
  const { Zip, ZipPassThrough, strToU8 } = await import("fflate");
  const { manifest, sink, signal } = params;
  const providers = new Map<CloudProvider, CloudStorageProvider>();
  const entries = [...manifest.tracks, ...(manifest.artwork ? [manifest.artwork] : [])];
  const maxBytes = Math.min(params.maxBytes ?? MAX_ARCHIVE_BYTES, MAX_ARCHIVE_BYTES);
  let bytes = 0;
  let pending: Uint8Array[] = [];
  let zipError: Error | null = null;
  let lastProgressAt = 0;
  const zip = new Zip((error, chunk) => {
    if (error) zipError = error;
    else if (chunk) pending.push(chunk);
  });
  async function flush() {
    if (zipError) throw zipError;
    const chunks = pending;
    pending = [];
    for (const chunk of chunks) { signal?.throwIfAborted(); await sink.write(chunk); }
  }
  function addBytes(size: number) {
    bytes += size;
    if (bytes > maxBytes) throw new Error("This archive is too large for this download mode. Use a desktop browser with direct file saving.");
  }
  try {
    signal?.throwIfAborted();
    if (entries.reduce((sum, e) => sum + (e.asset.bytes ?? 0), 0) > maxBytes) {
      throw new Error("This archive is too large for this download mode. Use a desktop browser with direct file saving.");
    }
    for (const { asset } of entries) {
      if (providers.has(asset.provider)) continue;
      const provider = (params.getProvider ?? getCloudStorageProvider)(asset.provider);
      if (!(await provider.restoreSession())) throw new Error(`Reconnect ${asset.provider.replace("_", " ")} in Storage settings before downloading your originals.`);
      providers.set(asset.provider, provider);
    }
    for (const [index, entry] of entries.entries()) {
      signal?.throwIfAborted();
      params.onProgress?.({ completed: index, total: entries.length, filename: entry.asset.filename, bytes });
      // Only server-generated flat paths inside the release directory are accepted.
      if (!entry.path.startsWith(`${manifest.rootDirectory}/`) || entry.path.split("/").length !== 2
        || entry.path.split("/").some(s => !s || s === "." || s === ".." || /[\\\u0000]/.test(s))) {
        throw new Error("Invalid release archive path.");
      }
      const provider = providers.get(entry.asset.provider)!;
      const response = provider.getPrivateFileStream
        ? await provider.getPrivateFileStream(entry.asset.remoteFileId, signal)
        : new Response(await provider.getPrivateFileBlob(entry.asset.remoteFileId));
      if (!response.ok || !response.body) throw new Error(`Could not download ${entry.asset.filename}. No completed archive was saved.`);
      const file = new ZipPassThrough(entry.path);
      zip.add(file);
      const reader = response.body.getReader();
      const abort = () => { void reader.cancel().catch(() => undefined); };
      signal?.addEventListener("abort", abort, { once: true });
      let fileBytes = 0;
      try {
        while (true) {
          signal?.throwIfAborted();
          const { done, value } = await reader.read();
          if (done) break;
          fileBytes += value.byteLength;
          addBytes(value.byteLength);
          file.push(value);
          await flush(); // backpressure: disk must catch up before reading again.
          if (Date.now() - lastProgressAt >= 100) {
            lastProgressAt = Date.now();
            params.onProgress?.({ completed: index, total: entries.length, filename: entry.asset.filename, bytes });
          }
        }
        signal?.throwIfAborted();
        if (!fileBytes || (entry.asset.bytes != null && fileBytes !== entry.asset.bytes)) {
          throw new Error(`The download of ${entry.asset.filename} was incomplete. Retry the release download.`);
        }
        file.push(new Uint8Array(), true);
        await flush();
      } finally {
        signal?.removeEventListener("abort", abort);
        await reader.cancel().catch(() => undefined);
        reader.releaseLock();
      }
    }
    const metadata = new ZipPassThrough(`${manifest.rootDirectory}/metadata.json`);
    zip.add(metadata);
    metadata.push(strToU8(JSON.stringify(releaseArchiveMetadata(manifest, params.artist), null, 2)), true);
    zip.end();
    await flush();
    signal?.throwIfAborted();
    await sink.close();
    params.onProgress?.({ completed: entries.length, total: entries.length, filename: "Archive complete", bytes });
  } catch (error) {
    zip.terminate();
    pending = [];
    await sink.abort().catch(() => undefined);
    throw error;
  }
}

export function createBrowserArchiveSink(filename: string): ArchiveSink {
  const chunks: BlobPart[] = [];
  return {
    async write(chunk) { chunks.push(new Uint8Array(chunk) as Uint8Array<ArrayBuffer>); },
    async close() {
      const url = URL.createObjectURL(new Blob(chunks, { type: "application/zip" }));
      chunks.length = 0;
      const link = document.createElement("a");
      link.href = url; link.download = filename;
      document.body.append(link); link.click(); link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    },
    async abort() { chunks.length = 0; },
  };
}
