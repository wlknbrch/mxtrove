import { describe, expect, it, vi } from "vitest";
import { strFromU8, unzipSync } from "fflate";
import { releaseArchiveMetadata, writeReleaseArchive, type ReleaseDownloadManifest, type ArchiveSink } from "./release-download";
import type { CloudStorageProvider } from "@/features/drive/providers/cloud-storage";

function manifest(): ReleaseDownloadManifest {
  return {
    formatVersion: 1, generatedAt: "2026-11-17T12:00:00Z", archiveName: "Release.zip", rootDirectory: "Release",
    post: { id: "post", title: "Release", type: "album", description: "Notes", releaseNotes: null },
    tracks: Array.from({ length: 12 }, (_, i) => ({
      path: `Release/${String(i + 1).padStart(2, "0")} - Song ${i + 1}.wav`,
      asset: { id: `a${i}`, provider: "google_drive", remoteFileId: `private-id-${i}`, filename: `original-${i}.wav`, mimeType: "audio/wav", bytes: 4 },
      trackNumber: i + 1, title: `Song ${i + 1}`, songId: `s${i}`, versionId: `v${i}`, versionLabel: "Master",
      versionNumber: 1, productionStage: "Mastered", musicalKey: "A minor", tempoBpm: 120,
    })),
    artwork: { path: "Release/Cover.jpg", asset: { id: "cover", provider: "google_drive", remoteFileId: "private-cover", filename: "cover.jpg", mimeType: "image/jpeg", bytes: 4 } },
  };
}
function memorySink() {
  const parts: Uint8Array[] = [];
  return {
    parts,
    sink: { write: vi.fn(async (chunk: Uint8Array) => { parts.push(Uint8Array.from(chunk)); }), close: vi.fn(async () => undefined), abort: vi.fn(async () => undefined) } satisfies ArchiveSink,
  };
}
function provider() {
  return { restoreSession: vi.fn(async () => true), getPrivateFileStream: vi.fn(async () => new Response(new Uint8Array([0, 1, 2, 3]))) };
}
describe("release archive streaming", () => {
  it("produces a readable twelve-track ZIP with exact original bytes, artwork and metadata", async () => {
    const target = memorySink(); const cloud = provider();
    await writeReleaseArchive({ manifest: manifest(), sink: target.sink, artist: "WLKNBRCH", getProvider: () => cloud as unknown as CloudStorageProvider });
    const zip = unzipSync(Buffer.concat(target.parts.map(p => Buffer.from(p))));
    expect(Object.keys(zip)).toHaveLength(14);
    expect([...zip["Release/08 - Song 8.wav"]]).toEqual([0, 1, 2, 3]);
    expect([...zip["Release/Cover.jpg"]]).toEqual([0, 1, 2, 3]);
    const metadata = JSON.parse(strFromU8(zip["Release/metadata.json"]));
    expect(metadata.artist).toBe("WLKNBRCH");
    expect(metadata.tracks[7].title).toBe("Song 8");
    expect(JSON.stringify(metadata)).not.toMatch(/private-id|remoteFileId|accessToken/);
    expect(cloud.restoreSession).toHaveBeenCalledTimes(1);
    expect(target.sink.close).toHaveBeenCalledOnce(); expect(target.sink.abort).not.toHaveBeenCalled();
  });
  it("aborts an incomplete cloud download instead of offering a corrupt archive", async () => {
    const target = memorySink(); const cloud = provider();
    cloud.getPrivateFileStream.mockResolvedValueOnce(new Response(new Uint8Array([1])));
    await expect(writeReleaseArchive({ manifest: manifest(), sink: target.sink, getProvider: () => cloud as unknown as CloudStorageProvider })).rejects.toThrow("incomplete");
    expect(target.sink.close).not.toHaveBeenCalled(); expect(target.sink.abort).toHaveBeenCalledOnce();
  });
  it("cancels without completing the file", async () => {
    const target = memorySink(); const controller = new AbortController(); const cloud = provider();
    target.sink.write.mockImplementation(async () => { controller.abort(); });
    await expect(writeReleaseArchive({ manifest: manifest(), sink: target.sink, signal: controller.signal, getProvider: () => cloud as unknown as CloudStorageProvider })).rejects.toMatchObject({ name: "AbortError" });
    expect(target.sink.close).not.toHaveBeenCalled(); expect(target.sink.abort).toHaveBeenCalledOnce();
  });
  it("checks cloud authorization before reading private media", async () => {
    const target = memorySink(); const cloud = provider(); cloud.restoreSession.mockResolvedValue(false);
    await expect(writeReleaseArchive({ manifest: manifest(), sink: target.sink, getProvider: () => cloud as unknown as CloudStorageProvider })).rejects.toThrow("Reconnect");
    expect(cloud.getPrivateFileStream).not.toHaveBeenCalled();
  });
  it("rejects oversized fallback archives before downloading", async () => {
    const target = memorySink(); const cloud = provider();
    await expect(writeReleaseArchive({ manifest: manifest(), sink: target.sink, maxBytes: 4, getProvider: () => cloud as unknown as CloudStorageProvider })).rejects.toThrow("too large");
    expect(cloud.getPrivateFileStream).not.toHaveBeenCalled();
  });
  it("keeps only portable release metadata in the archive", () => {
    expect(releaseArchiveMetadata(manifest()).tracks[0]).not.toHaveProperty("asset");
  });
});
