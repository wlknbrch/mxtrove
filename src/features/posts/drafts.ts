import type { CloudProvider, PostDraft, PostType, Visibility } from "@/types/domain";

export const postDraftSchemaVersion = 1;

interface PostDraftPayloadBase {
  schemaVersion: typeof postDraftSchemaVersion;
}

export interface SinglePostDraftPayload extends PostDraftPayloadBase {
  kind: "single";
  step: number;
  existingSongId: string;
  newSongTitle: string;
  newSongLyrics?: string;
  versionLabel: string;
  productionStage: string;
  description: string;
  postTitle: string;
  visibility: Visibility;
  showLyrics?: boolean;
  originalAssetId: string | null;
  previewAssetId: string | null;
  artworkAssetId: string | null;
  uploadProviderId: CloudProvider;
  postTitleWasEdited: boolean;
}

export interface ReleasePostDraftPayload extends PostDraftPayloadBase {
  kind: "ep" | "album";
  title: string;
  description: string;
  releaseUrl: string;
  visibility: Visibility;
  selectedSongIds: string[];
  lyricsVisibleSongIds?: string[];
  quickSongTitle: string;
  artworkAssetId: string | null;
  uploadProviderId: CloudProvider;
}

export interface ReleaseEditDraftPayload extends PostDraftPayloadBase {
  kind: "release_edit";
  postId: string;
  title: string;
  description: string;
  visibility: Visibility;
  revokeOldPublicPreviews: boolean;
  releaseUrl: string;
  releaseNotes: string;
  allowEmbed: boolean;
  creditsText: string;
  externalLinksText: string;
  artworkAssetId: string | null;
  uploadProviderId: CloudProvider | null;
  singleSongVersionId: string | null;
  singleShowLyrics: boolean;
  tracks: Array<{
    songId: string;
    trackTitle: string;
    songVersionId: string | null;
    showLyrics: boolean;
  }>;
}

export type PostDraftPayload = SinglePostDraftPayload | ReleasePostDraftPayload | ReleaseEditDraftPayload;

export function isSinglePostDraftPayload(payload: unknown): payload is SinglePostDraftPayload {
  if (!payload || typeof payload !== "object") return false;
  const candidate = payload as Partial<SinglePostDraftPayload>;
  return candidate.schemaVersion === postDraftSchemaVersion && candidate.kind === "single";
}

export function isReleasePostDraftPayload(payload: unknown): payload is ReleasePostDraftPayload {
  if (!payload || typeof payload !== "object") return false;
  const candidate = payload as Partial<ReleasePostDraftPayload>;
  return (
    candidate.schemaVersion === postDraftSchemaVersion
    && (candidate.kind === "ep" || candidate.kind === "album")
    && Array.isArray(candidate.selectedSongIds)
  );
}

export function isReleaseEditDraftPayload(payload: unknown): payload is ReleaseEditDraftPayload {
  if (!payload || typeof payload !== "object") return false;
  const candidate = payload as Partial<ReleaseEditDraftPayload>;
  return (
    candidate.schemaVersion === postDraftSchemaVersion
    && candidate.kind === "release_edit"
    && typeof candidate.postId === "string"
    && Array.isArray(candidate.tracks)
  );
}

export function getDraftRoute(
  draft: Pick<PostDraft, "id" | "post_type"> & Partial<Pick<PostDraft, "payload">>,
) {
  if (isReleaseEditDraftPayload(draft.payload)) {
    return `/post/${draft.payload.postId}/edit`;
  }
  return `/create/${draft.post_type}?draft=${draft.id}`;
}

export function getDraftFallbackTitle(postType: PostType) {
  if (postType === "single") return "Untitled single";
  if (postType === "ep") return "Untitled EP";
  return "Untitled album";
}

export function hasMeaningfulSingleDraft(payload: SinglePostDraftPayload) {
  return Boolean(
    payload.existingSongId
    || payload.newSongTitle.trim()
    || payload.newSongLyrics?.trim()
    || payload.description.trim()
    || payload.postTitle.trim()
    || payload.originalAssetId
    || payload.previewAssetId
    || payload.artworkAssetId
    || payload.step > 1,
  );
}

export function hasMeaningfulReleaseDraft(payload: ReleasePostDraftPayload) {
  return Boolean(
    payload.title.trim()
    || payload.description.trim()
    || payload.releaseUrl.trim()
    || payload.selectedSongIds.length
    || payload.quickSongTitle.trim()
    || payload.artworkAssetId,
  );
}
