import { beforeEach, describe, expect, it } from "vitest";

import {
  getLibraryImportProgress,
  getSongTitleFromFilename,
  isLibraryImportSettled,
  readLibraryImportSession,
  recoverInterruptedLibraryImport,
  writeLibraryImportSession,
  type LibraryImportSession,
} from "@/features/library/library-import-session";

const session: LibraryImportSession = {
  schemaVersion: 1,
  id: "batch-1",
  provider: "dropbox",
  createdAt: "2026-08-07T10:00:00.000Z",
  updatedAt: "2026-08-07T10:00:00.000Z",
  items: [
    {
      id: "item-1",
      filename: "First Song.wav",
      title: "First Song",
      progress: 100,
      status: "ready",
      songId: "song-1",
      sourceAssetId: "source-1",
      previewAssetId: "preview-1",
      message: null,
    },
    {
      id: "item-2",
      filename: "Second Song.flac",
      title: "Second Song",
      progress: 50,
      status: "uploading",
      songId: "song-2",
      sourceAssetId: null,
      previewAssetId: null,
      message: null,
    },
  ],
};

describe("library import sessions", () => {
  beforeEach(() => window.localStorage.clear());

  it("persists the batch that connects import progress to song workspaces", () => {
    writeLibraryImportSession(session);
    expect(readLibraryImportSession("batch-1")).toEqual(session);
  });

  it("derives clean song titles from uploaded filenames", () => {
    expect(getSongTitleFromFilename("Midnight.Version 3.wav")).toBe("Midnight.Version 3");
    expect(getSongTitleFromFilename("untitled")).toBe("untitled");
  });

  it("calculates aggregate progress and settlement", () => {
    expect(getLibraryImportProgress(session.items)).toBe(75);
    expect(isLibraryImportSettled(session.items)).toBe(false);
    expect(isLibraryImportSettled(session.items.map((item) => ({ ...item, status: "ready" })))).toBe(true);
  });

  it("turns uploads that cannot survive a reload into actionable failures", () => {
    const recovered = recoverInterruptedLibraryImport(session.items);
    expect(recovered[0].status).toBe("ready");
    expect(recovered[1].status).toBe("failed");
    expect(recovered[1].message).toContain("Open the song workspace");
  });
});
