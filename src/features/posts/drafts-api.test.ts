import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/service-utils", () => ({
  createDemoDelay: () => Promise.resolve(),
  isDemoModeEnabled: () => true,
  requireSupabase: vi.fn(),
}));

import {
  deletePostDraft,
  getPostDraft,
  listPostDrafts,
  upsertPostDraft,
} from "./drafts-api";
import { postDraftSchemaVersion, type SinglePostDraftPayload } from "./drafts";

const payload: SinglePostDraftPayload = {
  schemaVersion: postDraftSchemaVersion,
  kind: "single",
  step: 2,
  existingSongId: "song-1",
  newSongTitle: "",
  versionLabel: "Demo",
  productionStage: "Demo",
  description: "Late-night version",
  postTitle: "Signal",
  visibility: "followers",
  originalAssetId: "asset-original",
  previewAssetId: "asset-preview",
  artworkAssetId: "asset-artwork",
  uploadProviderId: "dropbox",
  postTitleWasEdited: true,
};

describe("drafts API demo persistence", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("round-trips linked draft data and removes only the draft", async () => {
    await upsertPostDraft({
      id: "draft-1",
      ownerId: "owner-1",
      postType: "single",
      title: "Signal",
      currentStep: 2,
      payload,
    });

    const saved = await getPostDraft("draft-1");
    expect(saved?.payload).toMatchObject({
      existingSongId: "song-1",
      originalAssetId: "asset-original",
      previewAssetId: "asset-preview",
      artworkAssetId: "asset-artwork",
    });
    expect(await listPostDrafts("owner-1")).toHaveLength(1);

    await deletePostDraft("draft-1");
    expect(await listPostDrafts("owner-1")).toEqual([]);
  });

  it("keeps drafts private to their owner in the local fallback", async () => {
    await upsertPostDraft({
      id: "draft-2",
      ownerId: "owner-1",
      postType: "single",
      title: "Signal",
      currentStep: 2,
      payload,
    });

    expect(await listPostDrafts("owner-2")).toEqual([]);
  });
});
