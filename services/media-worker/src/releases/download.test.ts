import Fastify from "fastify";
import { beforeEach, describe, expect, it, vi } from "vitest";
const { tables, calls, user } = vi.hoisted(() => ({
  tables: {} as Record<string, Array<Record<string, any>>>, calls: [] as string[], user: { id: "author", authenticated: true },
}));
vi.mock("../auth/verify-jwt.js", () => ({ verifySupabaseBearerToken: vi.fn(async () => {
  if (!user.authenticated) throw new Error("Missing bearer token.");
  return { id: user.id };
}) }));
vi.mock("../supabase/service.js", () => ({ supabaseAdmin: { from: (table: string) => {
  calls.push(table);
  let rows = [...(tables[table] ?? [])];
  const query = {
    select: () => query,
    eq: (key: string, value: unknown) => { rows = rows.filter(row => row[key] === value); return query; },
    in: (key: string, values: unknown[]) => { rows = rows.filter(row => values.includes(row[key])); return query; },
    order: (key: string, options: { ascending: boolean }) => { rows.sort((a,b) => (a[key] > b[key] ? 1 : -1) * (options.ascending ? 1 : -1)); return query; },
    maybeSingle: async () => ({ data: rows[0] ?? null, error: null }),
    then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data: rows, error: null }).then(resolve),
  };
  return query;
} } }));
import { archiveSegment, getReleaseDownloadManifest, registerReleaseDownloadRoutes } from "./download.js";
const postId = "90000000-0000-4000-8000-000000000001";
beforeEach(() => {
  user.id = "author"; user.authenticated = true; calls.length = 0;
  tables.posts = [{ id: postId, owner_id: "author", post_type: "album", title: "A / beautiful album", artwork_asset_id: "cover" }];
  tables.release_tracks = Array.from({ length: 12 }, (_, i) => ({ post_id: postId, song_id: `s${i}`, song_version_id: `v${i}`, track_number: i + 1, track_title: `Song ${i + 1}` }));
  tables.song_versions = tables.release_tracks.map((t, i) => ({ id: t.song_version_id, owner_id: "author", song_id: t.song_id, source_asset_id: `a${i}`, version_number: i + 1, version_label: "Master", production_stage: "Mastered" }));
  tables.songs = tables.release_tracks.map(t => ({ id: t.song_id, owner_id: "author", title: t.track_title, tempo_bpm: 120, musical_key: "A minor" }));
  tables.assets = tables.song_versions.map((v, i) => ({ id: v.source_asset_id, owner_id: "author", provider: "google_drive", remote_file_id: `private-${i}`, filename: `source${i}.WAV`, mime_type: "audio/wav", bytes: 10, asset_type: "audio_original", share_url: "must-not-leak", waveform_peaks: [123] }));
  tables.assets.push({ id: "cover", owner_id: "author", provider: "google_drive", remote_file_id: "private-cover", filename: "art.JPG", mime_type: "image/jpeg", bytes: 3, asset_type: "cover_artwork" });
  tables.single_posts = [{ post_id: postId, song_id: "s0" }];
});
describe("author release downloads", () => {
  it("exports twelve originals in release order with named tracks and full cover", async () => {
    const manifest = await getReleaseDownloadManifest(postId, "author");
    expect(manifest.tracks).toHaveLength(12);
    expect(manifest.tracks[7].path).toBe("A _ beautiful album/08 - Song 8.wav");
    expect(manifest.tracks[11].asset.remoteFileId).toBe("private-11");
    expect(manifest.artwork?.path).toBe("A _ beautiful album/Cover.jpg");
    expect(JSON.stringify(manifest)).not.toMatch(/must-not-leak|waveform_peaks/);
  });
  it("denies even a public release to another viewer before reading source IDs", async () => {
    await expect(getReleaseDownloadManifest(postId, "another-viewer")).rejects.toMatchObject({ statusCode: 404 });
    expect(calls).toEqual(["posts"]);
  });
  it("includes all of the author's single versions, including private versions", async () => {
    tables.posts[0].post_type = "single";
    tables.song_versions.push({ ...tables.song_versions[0], id: "v-old", version_number: 0, version_label: "Sketch", source_asset_id: "a1" });
    const manifest = await getReleaseDownloadManifest(postId, "author");
    expect(manifest.tracks.map(v => v.versionLabel)).toEqual(["Sketch", "Master"]);
  });
  it("never exports another artist's private source through an owned release", async () => {
    tables.assets[7].owner_id = "another-artist";
    await expect(getReleaseDownloadManifest(postId, "author")).rejects.toMatchObject({ statusCode: 409 });
  });
  it("requires a matching song/version relationship", async () => {
    tables.song_versions[7].song_id = "s9";
    await expect(getReleaseDownloadManifest(postId, "author")).rejects.toMatchObject({ statusCode: 409 });
  });
  it("does not cache authenticated manifests and rejects unauthenticated callers", async () => {
    const app = Fastify();
    app.setErrorHandler((error, _req, reply) => reply.code(401).send({ error: error instanceof Error ? error.message : "Unauthorized" }));
    await registerReleaseDownloadRoutes(app);
    const result = await app.inject({ method: "GET", url: `/v1/releases/${postId}/download-manifest` });
    expect(result.statusCode).toBe(200);
    expect(result.headers["cache-control"]).toBe("private, no-store");
    user.authenticated = false;
    expect((await app.inject({ method: "GET", url: `/v1/releases/${postId}/download-manifest` })).statusCode).toBe(401);
    await app.close();
  });
  it("sanitizes traversal, control characters and device names", () => {
    expect(archiveSegment("../CON")).not.toContain("/");
    expect(archiveSegment("CON")).toBe("_CON");
    expect(archiveSegment("..\u0000" )).not.toContain("\u0000");
  });
});
