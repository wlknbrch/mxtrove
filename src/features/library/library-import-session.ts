import type { CloudProvider } from "@/types/domain";

const importSessionPrefix = "mxtrove.library-import.v1";

export type LibraryImportStatus =
  | "queued"
  | "creating"
  | "uploading"
  | "ready"
  | "attention"
  | "failed";

export interface LibraryImportItem {
  id: string;
  filename: string;
  title: string;
  progress: number;
  status: LibraryImportStatus;
  songId: string | null;
  sourceAssetId: string | null;
  previewAssetId: string | null;
  message: string | null;
}

export interface LibraryImportSession {
  schemaVersion: 1;
  id: string;
  provider: CloudProvider;
  createdAt: string;
  updatedAt: string;
  items: LibraryImportItem[];
}

function getStorageKey(batchId: string) {
  return `${importSessionPrefix}.${batchId}`;
}

function isImportItem(value: unknown): value is LibraryImportItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<LibraryImportItem>;
  return typeof item.id === "string"
    && typeof item.filename === "string"
    && typeof item.title === "string"
    && typeof item.progress === "number"
    && typeof item.status === "string"
    && (item.songId === null || typeof item.songId === "string");
}

export function readLibraryImportSession(batchId: string): LibraryImportSession | null {
  if (typeof window === "undefined") return null;

  try {
    const parsed = JSON.parse(window.localStorage.getItem(getStorageKey(batchId)) ?? "null") as Partial<LibraryImportSession> | null;
    if (
      !parsed
      || parsed.schemaVersion !== 1
      || parsed.id !== batchId
      || typeof parsed.provider !== "string"
      || typeof parsed.createdAt !== "string"
      || typeof parsed.updatedAt !== "string"
      || !Array.isArray(parsed.items)
      || !parsed.items.every(isImportItem)
    ) {
      return null;
    }

    return parsed as LibraryImportSession;
  } catch {
    return null;
  }
}

export function writeLibraryImportSession(session: LibraryImportSession) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(getStorageKey(session.id), JSON.stringify(session));
}

export function getLibraryImportProgress(items: LibraryImportItem[]) {
  if (items.length === 0) return 0;
  return Math.round(items.reduce((sum, item) => sum + item.progress, 0) / items.length);
}

export function isLibraryImportSettled(items: LibraryImportItem[]) {
  return items.length > 0 && items.every((item) =>
    item.status === "ready" || item.status === "attention" || item.status === "failed"
  );
}

export function recoverInterruptedLibraryImport(items: LibraryImportItem[]) {
  return items.map((item): LibraryImportItem => {
    if (item.status !== "queued" && item.status !== "creating" && item.status !== "uploading") {
      return item;
    }

    return {
      ...item,
      status: "failed",
      message: item.songId
        ? "This browser session ended before the upload finished. Open the song workspace to retry the asset upload."
        : "This browser session ended before the song could be created. Start a new import for this file.",
    };
  });
}

export function getSongTitleFromFilename(filename: string) {
  return filename.replace(/\.[^.]+$/, "").trim() || "Untitled song";
}
