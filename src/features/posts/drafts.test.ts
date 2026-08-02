import { describe, expect, it } from "vitest";

import {
  getDraftFallbackTitle,
  getDraftRoute,
  hasMeaningfulReleaseDraft,
  hasMeaningfulSingleDraft,
  postDraftSchemaVersion,
  type ReleasePostDraftPayload,
  type SinglePostDraftPayload,
} from "./drafts";

const emptySingle: SinglePostDraftPayload = {
  schemaVersion: postDraftSchemaVersion,
  kind: "single",
  step: 1,
  existingSongId: "",
  newSongTitle: "",
  versionLabel: "Demo",
  productionStage: "Demo",
  description: "",
  postTitle: "",
  visibility: "public",
  originalAssetId: null,
  previewAssetId: null,
  artworkAssetId: null,
  uploadProviderId: "google_drive",
  postTitleWasEdited: false,
};

const emptyRelease: ReleasePostDraftPayload = {
  schemaVersion: postDraftSchemaVersion,
  kind: "album",
  title: "",
  description: "",
  releaseUrl: "",
  visibility: "public",
  selectedSongIds: [],
  quickSongTitle: "",
  artworkAssetId: null,
  uploadProviderId: "dropbox",
};

describe("post draft helpers", () => {
  it("does not clutter the draft list with untouched create flows", () => {
    expect(hasMeaningfulSingleDraft(emptySingle)).toBe(false);
    expect(hasMeaningfulReleaseDraft(emptyRelease)).toBe(false);
  });

  it("keeps linked media and ordered songs meaningful", () => {
    expect(hasMeaningfulSingleDraft({ ...emptySingle, originalAssetId: "asset-1" })).toBe(true);
    expect(hasMeaningfulReleaseDraft({ ...emptyRelease, selectedSongIds: ["song-2", "song-1"] })).toBe(true);
  });

  it("builds stable resume routes and labels", () => {
    expect(getDraftRoute({ id: "draft-1", post_type: "ep" })).toBe("/create/ep?draft=draft-1");
    expect(getDraftFallbackTitle("album")).toBe("Untitled album");
  });
});
