# Exact TypeScript model declarations

Generated from source; SQL constraints and RPC result shapes take precedence over web casts. See schema-map.md for Swift/Kotlin mapping and partial-card exceptions.

## PlaybackTrack

[src/components/audio/player-store.ts:3](../../../src/components/audio/player-store.ts#L3)

```typescript
export interface PlaybackTrack {
  id: string;
  postId?: string | null;
  releaseTrackId?: string | null;
  versionId?: string | null;
  title: string;
  artistName: string;
  artworkUrl?: string | string[] | null;
  src: string;
  srcCandidates?: string[] | null;
  protectedAssetId?: string | null;
  durationSeconds?: number | null;
  waveform?: import("@/types/domain").WaveformDataV1 | null;
  lyrics?: string | null;
  versionLabel?: string | null;
  queueGroupLabel?: string | null;
}
```

## ReportStatus

[src/features/admin/api.ts:4](../../../src/features/admin/api.ts#L4)

```typescript
export type ReportStatus = "open" | "reviewing" | "action_taken" | "dismissed";
```

## AdminRemovableContentType

[src/features/admin/api.ts:5](../../../src/features/admin/api.ts#L5)

```typescript
export type AdminRemovableContentType = "post" | "comment";
```

## AdminRemovalReason

[src/features/admin/api.ts:6](../../../src/features/admin/api.ts#L6)

```typescript
export type AdminRemovalReason =
  | "copyright"
  | "hate"
  | "harassment"
  | "sexual_content"
  | "illegal_content"
  | "spam"
  | "other";
```

## AdminReport

[src/features/admin/api.ts:15](../../../src/features/admin/api.ts#L15)

```typescript
export interface AdminReport {
  id: string;
  reporter_id: string;
  target_type: "profile" | "post" | "comment" | "message" | "project_invite" | "share_link" | "app_feedback";
  target_id: string;
  reason: ReportReason;
  details: string | null;
  status: ReportStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  target_hidden_at: string | null;
  subject: string | null;
  page_context: string | null;
  attachment_url: string | null;
  client_context: Record<string, string | number | boolean | null>;
  created_at: string;
  reporter: Pick<Profile, "id" | "username" | "display_name"> | null;
}
```

## AdminReportNote

[src/features/admin/api.ts:34](../../../src/features/admin/api.ts#L34)

```typescript
export interface AdminReportNote {
  id: string;
  report_id: string;
  author_id: string;
  body: string;
  created_at: string;
}
```

## AdminDashboardData

[src/features/admin/api.ts:42](../../../src/features/admin/api.ts#L42)

```typescript
export interface AdminDashboardData {
  generated_at: string;
  window_days: number;
  privacy_boundary: {
    public_releases_only: boolean;
    public_comments_only: boolean;
    discoverable_profiles_only: boolean;
    private_assets_excluded: boolean;
    messages_excluded: boolean;
  };
  totals: {
    public_releases: number;
    public_comments: number;
    discoverable_creators: number;
    public_media_assets: number;
    public_media_bytes: number;
    open_reports: number;
    reports_last_30_days: number;
  };
  daily_activity: Array<{
    date: string;
    releases: number;
    comments: number;
    creators: number;
  }>;
  release_mix: Array<{ type: "single" | "ep" | "album"; count: number }>;
  storage_mix: Array<{ provider: string; assets: number; bytes: number }>;
  report_statuses: Array<{ status: ReportStatus; count: number }>;
  recent_releases: Array<{
    id: string;
    title: string;
    post_type: "single" | "ep" | "album";
    activity_at: string;
    owner_id: string;
    username: string;
    display_name: string;
    heart_count: number;
    comment_count: number;
  }>;
  recent_comments: Array<{
    id: string;
    body: string;
    created_at: string;
    post_id: string;
    post_title: string;
    author_id: string;
    username: string;
    display_name: string;
    heart_count: number;
    reply_count: number;
  }>;
  recent_creators: Array<{
    id: string;
    username: string;
    display_name: string;
    created_at: string;
    public_release_count: number;
  }>;
  recent_media: Array<{
    id: string;
    asset_type: "audio_preview" | "cover_artwork";
    provider: string;
    bytes: number | null;
    created_at: string;
    post_id: string;
    post_title: string;
  }>;
}
```

## AdminRemovalTarget

[src/features/admin/content-removal-dialog.tsx:21](../../../src/features/admin/content-removal-dialog.tsx#L21)

```typescript
export interface AdminRemovalTarget {
  type: AdminRemovableContentType;
  id: string;
  label: string;
}
```

## MessageReferenceAttachmentType

[src/features/attachments/api.ts:6](../../../src/features/attachments/api.ts#L6)

```typescript
export type MessageReferenceAttachmentType =
  | "project_reference"
  | "post_reference"
  | "song_version_reference";
```

## MessageReferenceTarget

[src/features/attachments/api.ts:11](../../../src/features/attachments/api.ts#L11)

```typescript
export interface MessageReferenceTarget {
  title: string;
  subtitle: string;
  to: string;
}
```

## UploadableAttachmentKind

[src/features/attachments/api.ts:17](../../../src/features/attachments/api.ts#L17)

```typescript
export type UploadableAttachmentKind = "audio" | "image" | "document";
```

## AssetReferenceSummary

[src/features/drive/api.ts:383](../../../src/features/drive/api.ts#L383)

```typescript
export interface AssetReferenceSummary {
  sourceVersionCount: number;
  previewVersionCount: number;
  releaseTrackCount: number;
  songArtworkCount: number;
  postArtworkCount: number;
  profileAvatarCount: number;
}
```

## CloudConnectionResult

[src/features/drive/providers/cloud-storage.ts:3](../../../src/features/drive/providers/cloud-storage.ts#L3)

```typescript
export interface CloudConnectionResult {
  provider: CloudProvider;
  accountId: string | null;
  email: string | null;
  accessToken: string;
  expiresAt: number | null;
  folders: CloudFolderStructure;
}
```

## CloudFolderStructure

[src/features/drive/providers/cloud-storage.ts:12](../../../src/features/drive/providers/cloud-storage.ts#L12)

```typescript
export interface CloudFolderStructure {
  rootFolderId: string;
  audioFolderId: string;
  audioOriginalsFolderId: string;
  audioPreviewsFolderId: string;
  artworkFolderId: string;
  avatarsFolderId: string;
  exportsFolderId: string;
}
```

## UploadFileInput

[src/features/drive/providers/cloud-storage.ts:22](../../../src/features/drive/providers/cloud-storage.ts#L22)

```typescript
export interface UploadFileInput {
  file: File;
  filename?: string;
  parentFolderId: string;
  signal?: AbortSignal;
  onProgress?: (progress: number) => void;
}
```

## CloudFileMetadata

[src/features/drive/providers/cloud-storage.ts:30](../../../src/features/drive/providers/cloud-storage.ts#L30)

```typescript
export interface CloudFileMetadata {
  id: string;
  name: string;
  mimeType: string;
  size: number | null;
  webViewLink: string | null;
  webContentLink: string | null;
  thumbnailLink: string | null;
}
```

## CloudAssetResult

[src/features/drive/providers/cloud-storage.ts:40](../../../src/features/drive/providers/cloud-storage.ts#L40)

```typescript
export interface CloudAssetResult {
  provider?: CloudProvider;
  fileId: string;
  filename: string;
  mimeType: string;
  bytes: number;
  parentFolderId: string;
  viewUrl: string | null;
  shareUrl: string | null;
  thumbnailUrl: string | null;
}
```

## PublicAssetResult

[src/features/drive/providers/cloud-storage.ts:52](../../../src/features/drive/providers/cloud-storage.ts#L52)

```typescript
export interface PublicAssetResult {
  fileId: string;
  shareUrl: string | null;
  viewUrl: string | null;
}
```

## CloudStorageProvider

[src/features/drive/providers/cloud-storage.ts:58](../../../src/features/drive/providers/cloud-storage.ts#L58)

```typescript
export interface CloudStorageProvider {
  provider: CloudProvider;
  connect(profileId?: string): Promise<CloudConnectionResult>;
  disconnect(): Promise<void>;
  restoreSession(): Promise<boolean>;
  ensureRootStructure(profileId?: string): Promise<CloudFolderStructure>;
  uploadFile(input: UploadFileInput): Promise<CloudAssetResult>;
  uploadResumable(input: UploadFileInput): Promise<CloudAssetResult>;
  getPrivateFileBlob(fileId: string): Promise<Blob>;
  getFileMetadata(fileId: string): Promise<CloudFileMetadata>;
  createPublicPreview(fileId: string): Promise<PublicAssetResult>;
  revokePublicPreview(fileId: string): Promise<void>;
  getPublicPreviewUrl(fileId: string): Promise<string | null>;
  getViewUrl(fileId: string): Promise<string | null>;
  deleteFile(fileId: string): Promise<void>;
}
```

## ExploreCatalogResult

[src/features/feed/api.ts:44](../../../src/features/feed/api.ts#L44)

```typescript
export interface ExploreCatalogResult {
  result_kind: "creator" | "post";
  profile_id: string | null;
  post_id: string | null;
  username: string | null;
  display_name: string | null;
  title: string | null;
  description: string | null;
  post_type: string | null;
  activity_at: string | null;
  followers_count: number | null;
}
```

## HomeFeedPage

[src/features/feed/api.ts:57](../../../src/features/feed/api.ts#L57)

```typescript
export interface HomeFeedPage {
  items: ResolvedPostCard[];
  nextOffset: number | null;
}
```

## FollowState

[src/features/follows/api.ts:18](../../../src/features/follows/api.ts#L18)

```typescript
export interface FollowState {
  viewerFollowsProfile: boolean;
  profileFollowsViewer: boolean;
}
```

## SocialProfileCard

[src/features/follows/api.ts:23](../../../src/features/follows/api.ts#L23)

```typescript
export interface SocialProfileCard {
  profile: Profile;
  metrics: ProfilePublicMetrics;
  followsYou: boolean;
  viewerFollowsProfile: boolean;
  connectedAt?: string | null;
}
```

## TermsAcceptance

[src/features/legal/api.ts:3](../../../src/features/legal/api.ts#L3)

```typescript
export interface TermsAcceptance {
  profile_id: string;
  terms_version: string;
  accepted_at: string;
}
```

## AppRelease

[src/features/legal/changelog.ts:1](../../../src/features/legal/changelog.ts#L1)

```typescript
export interface AppRelease {
  version: string;
  date: string;
  title: string;
  changes: string[];
}
```

## AppFeedbackKind

[src/features/legal/feedback-api.ts:3](../../../src/features/legal/feedback-api.ts#L3)

```typescript
export type AppFeedbackKind = "bug" | "feedback" | "feature_request";
```

## AppFeedbackInput

[src/features/legal/feedback-api.ts:5](../../../src/features/legal/feedback-api.ts#L5)

```typescript
export interface AppFeedbackInput {
  kind: AppFeedbackKind;
  subject: string;
  details: string;
  pageContext: string | null;
  screenshotUrl: string | null;
  clientContext: Record<string, string | number | boolean | null>;
}
```

## AppFeedbackValidationErrors

[src/features/legal/feedback-api.ts:14](../../../src/features/legal/feedback-api.ts#L14)

```typescript
export interface AppFeedbackValidationErrors {
  subject?: string;
  details?: string;
  context?: string;
  screenshot?: string;
}
```

## LibraryDashboardData

[src/features/library/api.ts:10](../../../src/features/library/api.ts#L10)

```typescript
export interface LibraryDashboardData {
  songs: Song[];
  versions: SongVersion[];
  assets: Asset[];
}
```

## LibraryImportStatus

[src/features/library/library-import-session.ts:5](../../../src/features/library/library-import-session.ts#L5)

```typescript
export type LibraryImportStatus =
  | "queued"
  | "creating"
  | "uploading"
  | "ready"
  | "attention"
  | "failed";
```

## LibraryImportItem

[src/features/library/library-import-session.ts:13](../../../src/features/library/library-import-session.ts#L13)

```typescript
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
```

## LibraryImportSession

[src/features/library/library-import-session.ts:25](../../../src/features/library/library-import-session.ts#L25)

```typescript
export interface LibraryImportSession {
  schemaVersion: 1;
  id: string;
  provider: CloudProvider;
  createdAt: string;
  updatedAt: string;
  items: LibraryImportItem[];
}
```

## SongUploadGroup

[src/features/library/song-upload-groups.ts:3](../../../src/features/library/song-upload-groups.ts#L3)

```typescript
export interface SongUploadGroup {
  key: string;
  label: string;
  songs: Song[];
}
```

## SongAudioAnalysisResult

[src/features/media-processing/api.ts:68](../../../src/features/media-processing/api.ts#L68)

```typescript
export interface SongAudioAnalysisResult {
  tempoBpm: number | null;
  tempoConfidence: number | null;
  musicalKey: string | null;
  keyConfidence: number | null;
}
```

## ConversationPreview

[src/features/messages/api.ts:14](../../../src/features/messages/api.ts#L14)

```typescript
export interface ConversationPreview {
  conversation: Conversation;
  counterpart: Profile | null;
  project: CollaborationProject | null;
  lastMessage: Message | null;
  unreadCount: number;
}
```

## UnreadConversationSummary

[src/features/messages/api.ts:22](../../../src/features/messages/api.ts#L22)

```typescript
export interface UnreadConversationSummary {
  unreadConversations: number;
  unreadMessages: number;
}
```

## ResolvedNotification

[src/features/notifications/api.ts:6](../../../src/features/notifications/api.ts#L6)

```typescript
export interface ResolvedNotification {
  notification: Notification;
  actor: Profile | null;
}
```

## NotificationsPageResult

[src/features/notifications/api.ts:13](../../../src/features/notifications/api.ts#L13)

```typescript
export interface NotificationsPageResult {
  items: ResolvedNotification[];
  total: number;
  nextOffset: number | null;
}
```

## CommentSortMode

[src/features/posts/comment-sorting.ts:3](../../../src/features/posts/comment-sorting.ts#L3)

```typescript
export type CommentSortMode = "relevant" | "chronological";
```

## CommentThread

[src/features/posts/comment-sorting.ts:5](../../../src/features/posts/comment-sorting.ts#L5)

```typescript
export interface CommentThread {
  comment: ResolvedComment;
  replies: ResolvedComment[];
}
```

## SinglePostDraftPayload

[src/features/posts/drafts.ts:9](../../../src/features/posts/drafts.ts#L9)

```typescript
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
```

## ReleasePostDraftPayload

[src/features/posts/drafts.ts:28](../../../src/features/posts/drafts.ts#L28)

```typescript
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
```

## ReleaseEditDraftPayload

[src/features/posts/drafts.ts:41](../../../src/features/posts/drafts.ts#L41)

```typescript
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
```

## PostDraftPayload

[src/features/posts/drafts.ts:65](../../../src/features/posts/drafts.ts#L65)

```typescript
export type PostDraftPayload = SinglePostDraftPayload | ReleasePostDraftPayload | ReleaseEditDraftPayload;
```

## ReleasePresentationField

[src/features/posts/release-presentation.ts:26](../../../src/features/posts/release-presentation.ts#L26)

```typescript
export type ReleasePresentationField = "title" | "releaseUrl" | "credits" | "externalLinks";
```

## ResolvedComment

[src/features/posts/types.ts:15](../../../src/features/posts/types.ts#L15)

```typescript
export interface ResolvedComment extends Comment {
  author: Profile | null;
  heartCount: number;
  replyCount: number;
  viewerHasHearted: boolean;
}
```

## ResolvedReleaseTrack

[src/features/posts/types.ts:22](../../../src/features/posts/types.ts#L22)

```typescript
export interface ResolvedReleaseTrack {
  track: ReleaseTrack;
  song: Song | null;
  version: SongVersion | null;
  versionLabel: string | null;
  previewAsset: Asset | null;
  protectedPreview: {
    asset: ProtectedMediaAsset;
    readUrl: string;
  } | null;
  versionHeartCount: number;
  viewerHasHeartedVersion: boolean;
}
```

## ResolvedSingleInfo

[src/features/posts/types.ts:36](../../../src/features/posts/types.ts#L36)

```typescript
export interface ResolvedSingleInfo {
  song: Song | null;
  showLyrics: boolean;
  featuredVersion: SongVersion | null;
  previewAsset: Asset | null;
  protectedPreview: {
    asset: ProtectedMediaAsset;
    readUrl: string;
  } | null;
  previousVersion: SongVersion | null;
  versionHeartCount: number;
  viewerHasHeartedVersion: boolean;
}
```

## ResolvedPostCard

[src/features/posts/types.ts:50](../../../src/features/posts/types.ts#L50)

```typescript
export interface ResolvedPostCard {
  post: Post;
  owner: Profile | null;
  artwork: Asset | null;
  single: ResolvedSingleInfo | null;
  releaseTracks: ResolvedReleaseTrack[];
  comments: ResolvedComment[];
  heartCount: number;
  viewerHasHearted: boolean;
  versionHeartCount: number;
  viewerHasHeartedVersion: boolean;
  commentCount: number;
  credits: PostCredit[];
  externalLinks: PostExternalLink[];
  feedEvent?: FeedEvent | null;
}
```

## DraftSaveStatus

[src/features/posts/use-post-draft-autosave.ts:11](../../../src/features/posts/use-post-draft-autosave.ts#L11)

```typescript
export type DraftSaveStatus = "idle" | "saving" | "saved" | "error";
```

## DataExportRequest

[src/features/privacy/account-api.ts:56](../../../src/features/privacy/account-api.ts#L56)

```typescript
export interface DataExportRequest {
  id: string;
  profile_id: string;
  status: "queued" | "processing" | "ready" | "failed" | "expired";
  format: "json" | "json_csv";
  protected_asset_id: string | null;
  requested_at: string;
  started_at: string | null;
  completed_at: string | null;
  expires_at: string | null;
  error_message: string | null;
}
```

## BlockedProfileRow

[src/features/privacy/api.ts:117](../../../src/features/privacy/api.ts#L117)

```typescript
export interface BlockedProfileRow {
  profile_id: string;
  username: string;
  display_name: string;
  avatar_asset_id: string | null;
  blocked_at: string;
}
```

## ProjectDashboardItem

[src/features/projects/api.ts:25](../../../src/features/projects/api.ts#L25)

```typescript
export interface ProjectDashboardItem {
  project: CollaborationProject;
  viewerRole: CollaborationRole;
  members: Array<{ member: CollaborationProjectMember; profile: Profile | null }>;
  lastActivity: CollaborationActivity | null;
  openFeedbackCount: number;
}
```

## ProjectDetail

[src/features/projects/api.ts:33](../../../src/features/projects/api.ts#L33)

```typescript
export interface ProjectDetail {
  project: CollaborationProject;
  viewerRole: CollaborationRole;
  tracks: CollaborationProjectTrack[];
  members: Array<{ member: CollaborationProjectMember; profile: Profile | null }>;
  songs: Song[];
  versions: SongVersion[];
  assets: Asset[];
  protectedAssets: ProtectedMediaAsset[];
  feedbackThreads: FeedbackThread[];
  feedbackReplies: FeedbackReply[];
  feedbackReactions: FeedbackReaction[];
  versionHearts: Array<{ song_version_id: string; profile_id: string }>;
  activity: CollaborationActivity[];
  conversationId: string | null;
}
```

## PendingProjectInvite

[src/features/projects/api.ts:297](../../../src/features/projects/api.ts#L297)

```typescript
export interface PendingProjectInvite {
  invite_id: string;
  project_id: string;
  project_title: string;
  project_type: CollaborationProjectType;
  role: CollaborationRole;
  invited_by: string;
  inviter_name: string;
  expires_at: string;
  created_at: string;
}
```

## SharedProjectTrack

[src/features/projects/api.ts:605](../../../src/features/projects/api.ts#L605)

```typescript
export interface SharedProjectTrack {
  track: CollaborationProjectTrack;
  song: Song;
  version: SongVersion | null;
  protectedAsset: ProtectedMediaAsset | null;
}
```

## SharedProjectDetail

[src/features/projects/api.ts:612](../../../src/features/projects/api.ts#L612)

```typescript
export interface SharedProjectDetail {
  targetType: "collaboration_project" | "song_version";
  targetId: string;
  permission: "view" | "review";
  project: CollaborationProject;
  owner: Profile;
  tracks: SharedProjectTrack[];
  feedbackThreads: FeedbackThread[];
}
```

## SearchCategory

[src/features/search/api.ts:3](../../../src/features/search/api.ts#L3)

```typescript
export type SearchCategory = "creator" | "release" | "song" | "project" | "message";
```

## SearchResult

[src/features/search/api.ts:5](../../../src/features/search/api.ts#L5)

```typescript
export interface SearchResult {
  result_kind: SearchCategory;
  result_id: string;
  context_id: string | null;
  title: string;
  subtitle: string | null;
  rank: number;
}
```

## Visibility

[src/types/domain.ts:1](../../../src/types/domain.ts#L1)

```typescript
export type Visibility = "private" | "followers" | "unlisted" | "public";
```

## PostType

[src/types/domain.ts:2](../../../src/types/domain.ts#L2)

```typescript
export type PostType = "single" | "ep" | "album";
```

## AssetType

[src/types/domain.ts:3](../../../src/types/domain.ts#L3)

```typescript
export type AssetType =
  | "audio_original"
  | "audio_preview"
  | "cover_artwork"
  | "avatar";
```

## CloudProvider

[src/types/domain.ts:8](../../../src/types/domain.ts#L8)

```typescript
export type CloudProvider = "google_drive" | "dropbox" | "onedrive";
```

## ConversationKind

[src/types/domain.ts:9](../../../src/types/domain.ts#L9)

```typescript
export type ConversationKind = "direct" | "project";
```

## NotificationType

[src/types/domain.ts:10](../../../src/types/domain.ts#L10)

```typescript
export type NotificationType =
  | "follow"
  | "post_heart"
  | "version_heart"
  | "comment_heart"
  | "comment"
  | "comment_reply"
  | "single_version"
  | "release_update"
  | "message"
  | "project_invite"
  | "project_invite_accepted"
  | "project_member_removed"
  | "project_role_changed"
  | "project_feedback"
  | "project_feedback_reply"
  | "project_feedback_resolved"
  | "project_version_uploaded"
  | "project_status_changed"
  | "message_attachment"
  | "share_link_review"
  | "content_moderated";
```

## PreviewGeneration

[src/types/domain.ts:32](../../../src/types/domain.ts#L32)

```typescript
export type PreviewGeneration = "manual" | "automatic";
```

## MediaProcessingJobStatus

[src/types/domain.ts:33](../../../src/types/domain.ts#L33)

```typescript
export type MediaProcessingJobStatus =
  | "created"
  | "uploading"
  | "queued"
  | "probing"
  | "transcoding"
  | "generating_waveform"
  | "ready"
  | "uploading_to_drive"
  | "completed"
  | "failed"
  | "cancelled"
  | "expired";
```

## ReportReason

[src/types/domain.ts:46](../../../src/types/domain.ts#L46)

```typescript
export type ReportReason =
  | "spam"
  | "harassment"
  | "copyright"
  | "hate"
  | "sexual_content"
  | "illegal_content"
  | "other";
```

## Profile

[src/types/domain.ts:55](../../../src/types/domain.ts#L55)

```typescript
export interface Profile {
  id: string;
  username: string;
  display_name: string;
  bio: string | null;
  location: string | null;
  website_url: string | null;
  instagram_url: string | null;
  spotify_url: string | null;
  youtube_url: string | null;
  support_url: string | null;
  avatar_asset_id: string | null;
  pinned_post_id: string | null;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}
```

## CloudConnection

[src/types/domain.ts:73](../../../src/types/domain.ts#L73)

```typescript
export interface CloudConnection {
  id: string;
  profile_id: string;
  provider: CloudProvider;
  provider_account_id: string | null;
  provider_account_email: string | null;
  root_folder_id: string | null;
  audio_originals_folder_id: string | null;
  audio_previews_folder_id: string | null;
  artwork_folder_id: string | null;
  avatars_folder_id: string | null;
  exports_folder_id: string | null;
  is_default: boolean;
  connection_status: "connected" | "expired" | "disconnected" | "error";
  capabilities: Record<string, boolean>;
  last_error: string | null;
  connected_at: string;
  last_verified_at: string | null;
  updated_at: string;
}
```

## Asset

[src/types/domain.ts:94](../../../src/types/domain.ts#L94)

```typescript
export interface Asset {
  id: string;
  owner_id: string;
  provider: CloudProvider;
  remote_file_id: string;
  remote_parent_folder_id: string | null;
  filename: string;
  display_name: string | null;
  mime_type: string;
  file_extension: string;
  bytes: number | null;
  duration_seconds: number | null;
  checksum: string | null;
  asset_type: AssetType;
  access_mode: Visibility;
  share_url: string | null;
  view_url: string | null;
  thumbnail_url: string | null;
  waveform_peaks: WaveformDataV1 | number[] | null;
  derived_from_asset_id: string | null;
  processing_job_id: string | null;
  preview_generation: PreviewGeneration | null;
  codec: string | null;
  sample_rate_hz: number | null;
  channels: number | null;
  bit_rate_bps: number | null;
  waveform_version: number | null;
  waveform_bucket_count: number | null;
  waveform_generated_at: string | null;
  created_at: string;
  updated_at: string;
}
```

## Song

[src/types/domain.ts:127](../../../src/types/domain.ts#L127)

```typescript
export interface Song {
  id: string;
  owner_id: string;
  title: string;
  notes: string | null;
  lyrics: string | null;
  musical_key: string | null;
  tempo_bpm: number | null;
  tempo_confidence: number | null;
  key_confidence: number | null;
  audio_analysis_updated_at: string | null;
  default_artwork_asset_id: string | null;
  created_at: string;
  updated_at: string;
}
```

## SongVersion

[src/types/domain.ts:143](../../../src/types/domain.ts#L143)

```typescript
export interface SongVersion {
  id: string;
  song_id: string;
  source_asset_id: string;
  preview_asset_id: string | null;
  version_number: number;
  version_label: string;
  production_stage: string;
  changelog: string | null;
  is_published: boolean;
  published_at: string | null;
  owner_id: string;
  collaboration_project_id: string | null;
  collaboration_track_id: string | null;
  sharing_mode: "private" | "project_members" | "followers" | "public";
  review_status: "not_requested" | "review_requested" | "changes_requested" | "approved";
  protected_preview_asset_id: string | null;
  created_at: string;
  updated_at: string;
}
```

## Post

[src/types/domain.ts:164](../../../src/types/domain.ts#L164)

```typescript
export interface Post {
  id: string;
  owner_id: string;
  post_type: PostType;
  title: string;
  description: string | null;
  visibility: Visibility;
  artwork_asset_id: string | null;
  release_url: string | null;
  slug: string | null;
  release_notes: string | null;
  allow_embed: boolean;
  hidden_at: string | null;
  is_published: boolean;
  published_at: string | null;
  activity_at: string;
  created_at: string;
  updated_at: string;
}
```

## PostDraft

[src/types/domain.ts:184](../../../src/types/domain.ts#L184)

```typescript
export interface PostDraft {
  id: string;
  owner_id: string;
  post_type: PostType;
  title: string;
  current_step: number;
  schema_version: number;
  payload: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}
```

## SinglePost

[src/types/domain.ts:196](../../../src/types/domain.ts#L196)

```typescript
export interface SinglePost {
  post_id: string;
  song_id: string;
  featured_version_id: string;
  show_lyrics: boolean;
}
```

## ReleaseTrack

[src/types/domain.ts:203](../../../src/types/domain.ts#L203)

```typescript
export interface ReleaseTrack {
  id: string;
  post_id: string;
  song_id: string;
  song_version_id: string | null;
  track_title: string;
  track_number: number;
  preview_asset_id: string | null;
  production_stage: string | null;
  show_lyrics: boolean;
  created_at: string;
  updated_at: string;
}
```

## Follow

[src/types/domain.ts:217](../../../src/types/domain.ts#L217)

```typescript
export interface Follow {
  follower_id: string;
  followed_id: string;
  created_at: string;
}
```

## Comment

[src/types/domain.ts:223](../../../src/types/domain.ts#L223)

```typescript
export interface Comment {
  id: string;
  post_id: string;
  author_id: string;
  body: string;
  parent_comment_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}
```

## Conversation

[src/types/domain.ts:234](../../../src/types/domain.ts#L234)

```typescript
export interface Conversation {
  id: string;
  kind: ConversationKind;
  project_id: string | null;
  history_visible_from: string | null;
  created_at: string;
  updated_at: string;
}
```

## ConversationMember

[src/types/domain.ts:243](../../../src/types/domain.ts#L243)

```typescript
export interface ConversationMember {
  conversation_id: string;
  profile_id: string;
  joined_at: string;
  last_read_at: string | null;
}
```

## Message

[src/types/domain.ts:250](../../../src/types/domain.ts#L250)

```typescript
export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  edited_at: string | null;
  deleted_at: string | null;
}
```

## Notification

[src/types/domain.ts:260](../../../src/types/domain.ts#L260)

```typescript
export interface Notification {
  id: string;
  recipient_id: string;
  actor_id: string | null;
  type: NotificationType;
  post_id: string | null;
  song_version_id: string | null;
  comment_id: string | null;
  conversation_id: string | null;
  project_id: string | null;
  context?: Record<string, string | number | boolean | null>;
  is_read: boolean;
  created_at: string;
}
```

## ProfilePublicMetrics

[src/types/domain.ts:275](../../../src/types/domain.ts#L275)

```typescript
export interface ProfilePublicMetrics {
  profile_id: string;
  followers_count: number;
  following_count: number;
  public_posts_count: number;
  single_count: number;
  ep_count: number;
  album_count: number;
  last_public_activity_at: string | null;
  follower_counts_visible?: boolean;
  activity_visible?: boolean;
}
```

## WaveformDataV1

[src/types/domain.ts:288](../../../src/types/domain.ts#L288)

```typescript
export interface WaveformDataV1 {
  version: 1;
  durationSeconds: number;
  sourceSampleRate: number;
  analysisSampleRate: 8000;
  bucketCount: number;
  peaks: Array<[number, number]>;
}
```

## MediaProcessingJob

[src/types/domain.ts:297](../../../src/types/domain.ts#L297)

```typescript
export interface MediaProcessingJob {
  id: string;
  owner_id: string;
  source_asset_id: string;
  song_version_id: string | null;
  status: MediaProcessingJobStatus;
  stage: string;
  progress: number;
  input_filename: string | null;
  input_mime_type: string | null;
  input_bytes: number | null;
  input_checksum: string | null;
  output_mime_type: string | null;
  output_bytes: number | null;
  duration_seconds: number | null;
  detected_codec: string | null;
  sample_rate_hz: number | null;
  channels: number | null;
  bit_rate_bps: number | null;
  waveform_data: WaveformDataV1 | null;
  song_id: string | null;
  detected_tempo_bpm: number | null;
  detected_musical_key: string | null;
  tempo_confidence: number | null;
  key_confidence: number | null;
  error_code: string | null;
  error_message: string | null;
  attempt_count: number;
  worker_instance_id: string | null;
  cancel_requested_at: string | null;
  created_at: string;
  started_at: string | null;
  ready_at: string | null;
  completed_at: string | null;
  expires_at: string | null;
  output_mode: "public_cloud" | "protected";
  protected_purpose: "post_preview" | "collaboration_preview" | "message_audio" | null;
  target_project_id: string | null;
  target_post_id: string | null;
  protected_asset_id: string | null;
  updated_at: string;
}
```

## PushSubscriptionRecord

[src/types/domain.ts:340](../../../src/types/domain.ts#L340)

```typescript
export interface PushSubscriptionRecord {
  id: string;
  profile_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent: string | null;
  device_label: string | null;
  is_active: boolean;
  last_success_at: string | null;
  last_failure_at: string | null;
  failure_count: number;
  created_at: string;
  updated_at: string;
}
```

## NotificationPreferences

[src/types/domain.ts:356](../../../src/types/domain.ts#L356)

```typescript
export interface NotificationPreferences {
  profile_id: string;
  push_enabled: boolean;
  follows_enabled: boolean;
  post_hearts_enabled: boolean;
  version_hearts_enabled: boolean;
  comments_enabled: boolean;
  replies_enabled: boolean;
  messages_enabled: boolean;
  single_updates_enabled: boolean;
  project_invites_enabled: boolean;
  project_feedback_enabled: boolean;
  project_activity_enabled: boolean;
  message_attachments_enabled: boolean;
  privacy_safe_push: boolean;
  created_at: string;
  updated_at: string;
}
```

## FeedEvent

[src/types/domain.ts:375](../../../src/types/domain.ts#L375)

```typescript
export interface FeedEvent {
  id: string;
  actor_id: string;
  post_id: string;
  song_version_id: string | null;
  event_type: "single_release" | "single_update" | "release_publish";
  created_at: string;
}
```

## CollaborationProjectType

[src/types/domain.ts:384](../../../src/types/domain.ts#L384)

```typescript
export type CollaborationProjectType = "single" | "ep" | "album" | "loose_collection";
```

## CollaborationProjectVisibility

[src/types/domain.ts:385](../../../src/types/domain.ts#L385)

```typescript
export type CollaborationProjectVisibility = "private" | "members_only" | "link_invite";
```

## CollaborationProjectStatus

[src/types/domain.ts:386](../../../src/types/domain.ts#L386)

```typescript
export type CollaborationProjectStatus =
  | "planning"
  | "active"
  | "review"
  | "finalizing"
  | "completed"
  | "archived";
```

## CollaborationRole

[src/types/domain.ts:393](../../../src/types/domain.ts#L393)

```typescript
export type CollaborationRole =
  | "owner"
  | "admin"
  | "editor"
  | "contributor"
  | "reviewer"
  | "viewer";
```

## CollaborationTrackStatus

[src/types/domain.ts:400](../../../src/types/domain.ts#L400)

```typescript
export type CollaborationTrackStatus =
  | "idea"
  | "draft"
  | "recording"
  | "arrangement"
  | "mixing"
  | "review"
  | "approved"
  | "final";
```

## CollaborationProject

[src/types/domain.ts:410](../../../src/types/domain.ts#L410)

```typescript
export interface CollaborationProject {
  id: string;
  owner_id: string;
  project_type: CollaborationProjectType;
  title: string;
  description: string | null;
  artwork_asset_id: string | null;
  visibility: CollaborationProjectVisibility;
  status: CollaborationProjectStatus;
  linked_post_id: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}
```

## CollaborationProjectMember

[src/types/domain.ts:425](../../../src/types/domain.ts#L425)

```typescript
export interface CollaborationProjectMember {
  project_id: string;
  profile_id: string;
  role: CollaborationRole;
  membership_status: "invited" | "accepted" | "declined" | "removed";
  invited_by: string | null;
  joined_at: string | null;
  created_at: string;
  updated_at: string;
}
```

## CollaborationProjectInvite

[src/types/domain.ts:436](../../../src/types/domain.ts#L436)

```typescript
export interface CollaborationProjectInvite {
  id: string;
  project_id: string;
  invited_by: string;
  invited_profile_id: string | null;
  invited_email: string | null;
  role: Exclude<CollaborationRole, "owner">;
  status: "pending" | "accepted" | "declined" | "revoked" | "expired";
  expires_at: string;
  created_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
}
```

## CollaborationProjectTrack

[src/types/domain.ts:450](../../../src/types/domain.ts#L450)

```typescript
export interface CollaborationProjectTrack {
  id: string;
  project_id: string;
  song_id: string;
  active_version_id: string | null;
  track_title: string;
  track_number: number;
  notes: string | null;
  status: CollaborationTrackStatus;
  created_by: string;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
}
```

## CollaborationActivity

[src/types/domain.ts:465](../../../src/types/domain.ts#L465)

```typescript
export interface CollaborationActivity {
  id: string;
  project_id: string;
  actor_id: string | null;
  activity_type: string;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}
```

## FeedbackCategory

[src/types/domain.ts:476](../../../src/types/domain.ts#L476)

```typescript
export type FeedbackCategory =
  | "general"
  | "arrangement"
  | "mix"
  | "vocals"
  | "lyrics"
  | "sound_design"
  | "mastering"
  | "performance"
  | "technical";
```

## FeedbackThread

[src/types/domain.ts:487](../../../src/types/domain.ts#L487)

```typescript
export interface FeedbackThread {
  id: string;
  project_id: string;
  track_id: string;
  song_version_id: string;
  author_id: string;
  start_seconds: number;
  end_seconds: number | null;
  title: string | null;
  body: string;
  category: FeedbackCategory;
  priority: "low" | "normal" | "high" | "blocking";
  status: "open" | "in_progress" | "resolved" | "wont_fix";
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
}
```

## FeedbackReply

[src/types/domain.ts:507](../../../src/types/domain.ts#L507)

```typescript
export interface FeedbackReply {
  id: string;
  thread_id: string;
  author_id: string;
  body: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}
```

## FeedbackReaction

[src/types/domain.ts:517](../../../src/types/domain.ts#L517)

```typescript
export interface FeedbackReaction {
  thread_id: string;
  profile_id: string;
  reaction: "agree" | "disagree" | "done" | "important";
  created_at: string;
}
```

## ProtectedMediaAsset

[src/types/domain.ts:524](../../../src/types/domain.ts#L524)

```typescript
export interface ProtectedMediaAsset {
  id: string;
  owner_id: string;
  purpose: string;
  status: "reserved" | "processing" | "ready" | "failed" | "deleted";
  filename: string;
  mime_type: string;
  bytes: number | null;
  duration_seconds: number | null;
  waveform_data: WaveformDataV1 | null;
  post_id: string | null;
  project_id: string | null;
  song_version_id: string | null;
  message_id: string | null;
  created_at: string;
  ready_at: string | null;
}
```

## ProtectedMediaQuota

[src/types/domain.ts:542](../../../src/types/domain.ts#L542)

```typescript
export interface ProtectedMediaQuota {
  profile_id: string;
  used_bytes: number;
  reserved_bytes: number;
  attachment_used_bytes: number;
  attachment_reserved_bytes: number;
  protected_limit_bytes: number;
  attachment_limit_bytes: number;
  updated_at: string;
}
```

## MessageAttachment

[src/types/domain.ts:553](../../../src/types/domain.ts#L553)

```typescript
export interface MessageAttachment {
  id: string;
  message_id: string;
  owner_id: string;
  attachment_type:
    | "audio"
    | "image"
    | "document"
    | "project_reference"
    | "post_reference"
    | "song_version_reference";
  protected_asset_id: string | null;
  asset_id: string | null;
  post_id: string | null;
  project_id: string | null;
  song_version_id: string | null;
  filename: string;
  mime_type: string;
  bytes: number;
  duration_seconds: number | null;
  width: number | null;
  height: number | null;
  created_at: string;
  deleted_at: string | null;
}
```

## ProfilePrivacySettings

[src/types/domain.ts:579](../../../src/types/domain.ts#L579)

```typescript
export interface ProfilePrivacySettings {
  profile_id: string;
  profile_visibility: "public" | "members_only";
  message_permission: "everyone" | "people_i_follow" | "mutual_follows" | "nobody";
  project_invite_permission: "everyone" | "people_i_follow" | "mutual_follows" | "nobody";
  show_location: boolean;
  show_follower_counts: boolean;
  show_activity_status: boolean;
  allow_profile_discovery: boolean;
  created_at: string;
  updated_at: string;
}
```

## ProfileAppearanceSettings

[src/types/domain.ts:592](../../../src/types/domain.ts#L592)

```typescript
export interface ProfileAppearanceSettings {
  profile_id: string;
  theme: "system" | "dark" | "light";
  accent: "violet" | "rose" | "cyan" | "emerald" | "amber";
  interface_density: "comfortable" | "compact";
  show_waveforms: boolean;
  reduced_motion: boolean;
  autoplay_next: boolean;
  remember_volume: boolean;
  player_volume: number;
  increase_contrast: boolean;
  reduce_transparency: boolean;
  reduce_motion: boolean;
  larger_ui_text: boolean;
  created_at: string;
  updated_at: string;
}
```

## PostCredit

[src/types/domain.ts:610](../../../src/types/domain.ts#L610)

```typescript
export interface PostCredit {
  id: string;
  post_id: string;
  profile_id: string | null;
  display_name: string;
  role: string;
  position: number;
  created_at: string;
}
```

## PostExternalLink

[src/types/domain.ts:620](../../../src/types/domain.ts#L620)

```typescript
export interface PostExternalLink {
  id: string;
  post_id: string;
  platform: string;
  label: string;
  url: string;
  position: number;
  created_at: string;
}
```

## ShareLink

[src/types/domain.ts:630](../../../src/types/domain.ts#L630)

```typescript
export interface ShareLink {
  id: string;
  owner_id: string;
  target_type: "post" | "collaboration_project" | "song_version";
  target_id: string;
  permission: "view" | "review";
  expires_at: string | null;
  max_uses: number | null;
  use_count: number;
  is_active: boolean;
  created_at: string;
  revoked_at: string | null;
}
```
