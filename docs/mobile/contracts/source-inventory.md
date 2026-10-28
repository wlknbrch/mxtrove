# Generated source inventory

Generated with `npm run mobile:contracts:generate`. Do not hand-edit. This is source evidence, not a claim about a live deployment.

## Web routes

| Path | Gate | Element | Source |
|---|---|---|---|
| `/login` | public | routeElement(<LoginPage />) | [src/routes/router.tsx:204](../../../src/routes/router.tsx#L204) |
| `/forgot-password` | public | routeElement(<ForgotPasswordPage />) | [src/routes/router.tsx:208](../../../src/routes/router.tsx#L208) |
| `/reset-password` | public | routeElement(<ResetPasswordPage />) | [src/routes/router.tsx:212](../../../src/routes/router.tsx#L212) |
| `/oauth/callback/:provider` | public | routeElement(<OAuthCallbackPage />) | [src/routes/router.tsx:216](../../../src/routes/router.tsx#L216) |
| `/share/:token` | public | routeElement(<SharedPostPage />) | [src/routes/router.tsx:220](../../../src/routes/router.tsx#L220) |
| `/embed/post/:postId` | public | routeElement(<EmbedPostPage />) | [src/routes/router.tsx:224](../../../src/routes/router.tsx#L224) |
| `/about` | public | routeElement(<AboutPage />) | [src/routes/router.tsx:231](../../../src/routes/router.tsx#L231) |
| `/privacy` | public | routeElement(<PrivacyPolicyPage />) | [src/routes/router.tsx:232](../../../src/routes/router.tsx#L232) |
| `/terms` | public | routeElement(<TermsOfServicePage />) | [src/routes/router.tsx:233](../../../src/routes/router.tsx#L233) |
| `/post/:postId` | public | routeElement(<PostDetailPage />) | [src/routes/router.tsx:234](../../../src/routes/router.tsx#L234) |
| `/:username` | public | routeElement(<ProfilePage />) | [src/routes/router.tsx:235](../../../src/routes/router.tsx#L235) |
| `/onboarding` | session-and-terms | routeElement(               <div className="page-shell mx-auto max-w-4xl px-4 py-8 md:px-6">                 <OnboardingPage />               </div>,             ) | [src/routes/router.tsx:241](../../../src/routes/router.tsx#L241) |
| `/` | session-and-terms | routeElement(<HomePage />) | [src/routes/router.tsx:252](../../../src/routes/router.tsx#L252) |
| `/explore` | session-and-terms | routeElement(<ExplorePage />) | [src/routes/router.tsx:253](../../../src/routes/router.tsx#L253) |
| `/search` | session-and-terms | routeElement(<SearchPage />) | [src/routes/router.tsx:254](../../../src/routes/router.tsx#L254) |
| `/library` | session-and-terms | routeElement(<LibraryPage />) | [src/routes/router.tsx:255](../../../src/routes/router.tsx#L255) |
| `/library/songs` | session-and-terms | routeElement(<LibraryPage />) | [src/routes/router.tsx:256](../../../src/routes/router.tsx#L256) |
| `/library/import` | session-and-terms | routeElement(<LibraryImportPage />) | [src/routes/router.tsx:257](../../../src/routes/router.tsx#L257) |
| `/library/import/:batchId` | session-and-terms | routeElement(<LibraryImportPage />) | [src/routes/router.tsx:258](../../../src/routes/router.tsx#L258) |
| `/library/songs/:songId` | session-and-terms | routeElement(<SongDetailPage />) | [src/routes/router.tsx:259](../../../src/routes/router.tsx#L259) |
| `/projects` | session-and-terms | routeElement(<ProjectsPage />) | [src/routes/router.tsx:260](../../../src/routes/router.tsx#L260) |
| `/projects/new` | session-and-terms | routeElement(<NewProjectPage />) | [src/routes/router.tsx:261](../../../src/routes/router.tsx#L261) |
| `/projects/:projectId` | session-and-terms | routeElement(<ProjectWorkspacePage />) | [src/routes/router.tsx:262](../../../src/routes/router.tsx#L262) |
| `/projects/:projectId/tracks` | session-and-terms | routeElement(<ProjectWorkspacePage />) | [src/routes/router.tsx:263](../../../src/routes/router.tsx#L263) |
| `/projects/:projectId/activity` | session-and-terms | routeElement(<ProjectWorkspacePage />) | [src/routes/router.tsx:264](../../../src/routes/router.tsx#L264) |
| `/projects/:projectId/members` | session-and-terms | routeElement(<ProjectWorkspacePage />) | [src/routes/router.tsx:265](../../../src/routes/router.tsx#L265) |
| `/projects/:projectId/settings` | session-and-terms | routeElement(<ProjectWorkspacePage />) | [src/routes/router.tsx:266](../../../src/routes/router.tsx#L266) |
| `/projects/:projectId/review` | session-and-terms | routeElement(<ProjectWorkspacePage />) | [src/routes/router.tsx:267](../../../src/routes/router.tsx#L267) |
| `/invites` | session-and-terms | routeElement(<InvitesPage />) | [src/routes/router.tsx:268](../../../src/routes/router.tsx#L268) |
| `/invites/:token` | session-and-terms | routeElement(<InviteTokenPage />) | [src/routes/router.tsx:269](../../../src/routes/router.tsx#L269) |
| `/create` | session-and-terms | routeElement(<CreateIndexPage />) | [src/routes/router.tsx:270](../../../src/routes/router.tsx#L270) |
| `/create/single` | session-and-terms | routeElement(<CreateSinglePage />) | [src/routes/router.tsx:271](../../../src/routes/router.tsx#L271) |
| `/create/ep` | session-and-terms | routeElement(<CreateReleasePage kind="ep" />) | [src/routes/router.tsx:272](../../../src/routes/router.tsx#L272) |
| `/create/album` | session-and-terms | routeElement(<CreateReleasePage kind="album" />) | [src/routes/router.tsx:273](../../../src/routes/router.tsx#L273) |
| `/post/:postId/edit` | session-and-terms | routeElement(<EditReleasePage />) | [src/routes/router.tsx:274](../../../src/routes/router.tsx#L274) |
| `/messages` | session-and-terms | routeElement(<MessagesPage />) | [src/routes/router.tsx:275](../../../src/routes/router.tsx#L275) |
| `/messages/:conversationId` | session-and-terms | routeElement(<ConversationPage />) | [src/routes/router.tsx:276](../../../src/routes/router.tsx#L276) |
| `/notifications` | session-and-terms | routeElement(<NotificationsPage />) | [src/routes/router.tsx:277](../../../src/routes/router.tsx#L277) |
| `/admin` | session-and-terms | routeElement(<AdminDashboardPage />) | [src/routes/router.tsx:278](../../../src/routes/router.tsx#L278) |
| `/admin/reports` | session-and-terms | routeElement(<AdminReportsPage />) | [src/routes/router.tsx:279](../../../src/routes/router.tsx#L279) |
| `/admin/reports/:reportId` | session-and-terms | routeElement(<AdminReportDetailPage />) | [src/routes/router.tsx:280](../../../src/routes/router.tsx#L280) |
| `/settings` | session-and-terms | routeElement(<SettingsIndexPage />) | [src/routes/router.tsx:281](../../../src/routes/router.tsx#L281) |
| `/settings/profile` | session-and-terms | routeElement(<ProfileSettingsPage />) | [src/routes/router.tsx:282](../../../src/routes/router.tsx#L282) |
| `/settings/storage` | session-and-terms | routeElement(<StorageSettingsPage />) | [src/routes/router.tsx:283](../../../src/routes/router.tsx#L283) |
| `/settings/appearance` | session-and-terms | routeElement(<AppearanceSettingsPage />) | [src/routes/router.tsx:284](../../../src/routes/router.tsx#L284) |
| `/settings/privacy` | session-and-terms | routeElement(<PrivacySettingsPage />) | [src/routes/router.tsx:285](../../../src/routes/router.tsx#L285) |
| `/settings/account` | session-and-terms | routeElement(<AccountSettingsPage />) | [src/routes/router.tsx:286](../../../src/routes/router.tsx#L286) |
| `/settings/blocked` | session-and-terms | routeElement(<BlockedAccountsPage />) | [src/routes/router.tsx:287](../../../src/routes/router.tsx#L287) |
| `/settings/account/export` | session-and-terms | routeElement(<DataExportPage />) | [src/routes/router.tsx:288](../../../src/routes/router.tsx#L288) |
| `/settings/notifications` | session-and-terms | routeElement(<NotificationSettingsPage />) | [src/routes/router.tsx:289](../../../src/routes/router.tsx#L289) |
| `/:username/followers` | session-and-terms | routeElement(<ProfileConnectionsPage relation="followers" />) | [src/routes/router.tsx:293](../../../src/routes/router.tsx#L293) |
| `/:username/following` | session-and-terms | routeElement(<ProfileConnectionsPage relation="following" />) | [src/routes/router.tsx:297](../../../src/routes/router.tsx#L297) |

## Feature API functions

Every exported function in a feature API module; local helpers outside API modules and UI event handlers are also in inventory.json. A TypeScript function is not an independent HTTP endpoint. Calls below include nested local callbacks; demo branches do not establish backend capability.

### getCurrentAdminRole

[src/features/admin/api.ts:169](../../../src/features/admin/api.ts#L169)

```typescript
export async function getCurrentAdminRole(profileId: string | null | undefined)
```

- **from**: `app_admin_roles`

### getAdminDashboard

[src/features/admin/api.ts:185](../../../src/features/admin/api.ts#L185)

```typescript
export async function getAdminDashboard(activityDays = 14)
```

- **rpc**: `get_admin_dashboard_v1`

### removePublicContent

[src/features/admin/api.ts:194](../../../src/features/admin/api.ts#L194)

```typescript
export async function removePublicContent(input: {
  targetType: AdminRemovableContentType;
  targetId: string;
  reason: AdminRemovalReason;
})
```

- **rpc**: `remove_public_content_for_moderation`

### listAdminReports

[src/features/admin/api.ts:209](../../../src/features/admin/api.ts#L209)

```typescript
export async function listAdminReports(status?: ReportStatus | "all")
```

- **from**: `reports`

### getAdminReport

[src/features/admin/api.ts:225](../../../src/features/admin/api.ts#L225)

```typescript
export async function getAdminReport(reportId: string)
```

- **from**: `reports`
- **from**: `report_admin_notes`
- **rpc**: `get_admin_report_target_profile_id`

### moderateReport

[src/features/admin/api.ts:250](../../../src/features/admin/api.ts#L250)

```typescript
export async function moderateReport(input: {
  reportId: string;
  status: ReportStatus;
  note?: string;
  hideTarget?: boolean;
  suspensionDays?: number | null;
})
```

- **rpc**: `moderate_report_v2`

### getAppearanceSettings

[src/features/appearance/api.ts:22](../../../src/features/appearance/api.ts#L22)

```typescript
export async function getAppearanceSettings(profileId: string)
```

- **from**: `profile_appearance_settings`

### saveAppearanceSettings

[src/features/appearance/api.ts:45](../../../src/features/appearance/api.ts#L45)

```typescript
export async function saveAppearanceSettings(
  settings: Omit<ProfileAppearanceSettings, "profile_id" | "created_at" | "updated_at">,
)
```

- **rpc**: `update_appearance_settings`

### getUploadableAttachmentKind

[src/features/attachments/api.ts:29](../../../src/features/attachments/api.ts#L29)

```typescript
export function getUploadableAttachmentKind(file: File): UploadableAttachmentKind | null
```

Local orchestration; follow its imported helpers and callers.

### uploadMessageAttachment

[src/features/attachments/api.ts:45](../../../src/features/attachments/api.ts#L45)

```typescript
export async function uploadMessageAttachment(input: {
  messageId: string;
  file: File;
  signal?: AbortSignal;
  onProgress?: (progress: number) => void;
})
```

Local orchestration; follow its imported helpers and callers.

### deleteMessageAttachment

[src/features/attachments/api.ts:97](../../../src/features/attachments/api.ts#L97)

```typescript
export async function deleteMessageAttachment(attachmentId: string)
```

- **fetch**: ``${env.mediaWorkerUrl}/v1/message-attachments/${encodeURIComponent(attachmentId)}``

### getMessageAttachmentReadUrl

[src/features/attachments/api.ts:111](../../../src/features/attachments/api.ts#L111)

```typescript
export async function getMessageAttachmentReadUrl(attachment: MessageAttachment)
```

Local orchestration; follow its imported helpers and callers.

### createMessageReferenceAttachment

[src/features/attachments/api.ts:118](../../../src/features/attachments/api.ts#L118)

```typescript
export async function createMessageReferenceAttachment(input: {
  messageId: string;
  attachmentType: MessageReferenceAttachmentType;
  targetId: string;
})
```

- **rpc**: `create_message_reference_attachment`

### getMessageReferenceTarget

[src/features/attachments/api.ts:133](../../../src/features/attachments/api.ts#L133)

```typescript
export async function getMessageReferenceTarget(
  attachment: MessageAttachment,
): Promise<MessageReferenceTarget>
```

- **from**: `collaboration_projects`
- **from**: `posts`
- **from**: `song_versions`
- **from**: `songs`

### signInWithPassword

[src/features/auth/api.ts:12](../../../src/features/auth/api.ts#L12)

```typescript
export async function signInWithPassword(input: { email: string; password: string })
```

- **signInWithPassword**: `input`

### signInWithGoogle

[src/features/auth/api.ts:23](../../../src/features/auth/api.ts#L23)

```typescript
export async function signInWithGoogle(options?: { termsAccepted?: boolean })
```

- **signInWithOAuth**: `{     provider: "google",     options: {       redirectTo: buildAuthRedirectUrl("/"),     },   }`

### requestPasswordReset

[src/features/auth/api.ts:42](../../../src/features/auth/api.ts#L42)

```typescript
export async function requestPasswordReset(email: string)
```

- **resetPasswordForEmail**: `email`

### updateRecoveredPassword

[src/features/auth/api.ts:53](../../../src/features/auth/api.ts#L53)

```typescript
export async function updateRecoveredPassword(password: string)
```

- **updateUser**: `{ password }`

### signUpWithPassword

[src/features/auth/api.ts:62](../../../src/features/auth/api.ts#L62)

```typescript
export async function signUpWithPassword(input: {
  email: string;
  password: string;
  displayName?: string;
  termsAccepted: boolean;
})
```

- **signUp**: `{     email: input.email,     password: input.password,     options: {       data: {         display_name: input.displayName,         terms_accepted_version: CURRENT_TERMS_VERSION,       },     },   }`

### getCloudConnection

[src/features/drive/api.ts:16](../../../src/features/drive/api.ts#L16)

```typescript
export async function getCloudConnection(profileId: string)
```

- **from**: `cloud_connections`

### getCloudConnections

[src/features/drive/api.ts:37](../../../src/features/drive/api.ts#L37)

```typescript
export async function getCloudConnections(profileId: string)
```

- **from**: `cloud_connections`

### getProtectedMediaQuota

[src/features/drive/api.ts:53](../../../src/features/drive/api.ts#L53)

```typescript
export async function getProtectedMediaQuota(profileId: string)
```

- **from**: `protected_media_quotas`

### setDefaultCloudProvider

[src/features/drive/api.ts:77](../../../src/features/drive/api.ts#L77)

```typescript
export async function setDefaultCloudProvider(provider: CloudConnection["provider"])
```

- **getUser**: `null`
- **from**: `cloud_connections`
- **rpc**: `set_default_cloud_provider`

### listOwnedAssets

[src/features/drive/api.ts:99](../../../src/features/drive/api.ts#L99)

```typescript
export async function listOwnedAssets(ownerId: string)
```

- **from**: `assets`

### updateAssetProviderReference

[src/features/drive/api.ts:115](../../../src/features/drive/api.ts#L115)

```typescript
export async function updateAssetProviderReference(input: {
  assetId: string;
  upload: CloudAssetResult;
  accessMode: Visibility;
})
```

- **from**: `assets`

### rewriteLegacyDropboxAssetPaths

[src/features/drive/api.ts:144](../../../src/features/drive/api.ts#L144)

```typescript
export async function rewriteLegacyDropboxAssetPaths(ownerId: string)
```

- **from**: `assets`
- **from**: `assets`

### upsertCloudConnection

[src/features/drive/api.ts:191](../../../src/features/drive/api.ts#L191)

```typescript
export async function upsertCloudConnection(input: Partial<CloudConnection> & { profile_id: string })
```

- **from**: `cloud_connections`

### createAssetRecord

[src/features/drive/api.ts:215](../../../src/features/drive/api.ts#L215)

```typescript
export async function createAssetRecord(input: {
  ownerId: string;
  assetType: AssetType;
  accessMode: Visibility;
  upload: CloudAssetResult;
  checksum?: string | null;
  durationSeconds?: number | null;
  waveformPeaks?: WaveformDataV1 | number[] | null;
  derivedFromAssetId?: string | null;
  processingJobId?: string | null;
  previewGeneration?: PreviewGeneration | null;
  codec?: string | null;
  sampleRateHz?: number | null;
  channels?: number | null;
  bitRateBps?: number | null;
  waveformVersion?: number | null;
  waveformBucketCount?: number | null;
  waveformGeneratedAt?: string | null;
})
```

- **from**: `assets`

### getAssetById

[src/features/drive/api.ts:312](../../../src/features/drive/api.ts#L312)

```typescript
export async function getAssetById(assetId: string)
```

- **from**: `assets`

### getAssetsByIds

[src/features/drive/api.ts:332](../../../src/features/drive/api.ts#L332)

```typescript
export async function getAssetsByIds(assetIds: string[])
```

- **from**: `assets`

### updateAssetPublicLinks

[src/features/drive/api.ts:357](../../../src/features/drive/api.ts#L357)

```typescript
export async function updateAssetPublicLinks(input: {
  assetId: string;
  accessMode: Visibility;
  shareUrl: string | null;
  viewUrl: string | null;
})
```

- **from**: `assets`

### getAssetReferenceSummary

[src/features/drive/api.ts:392](../../../src/features/drive/api.ts#L392)

```typescript
export async function getAssetReferenceSummary(assetId: string): Promise<AssetReferenceSummary>
```

- **from**: `song_versions`
- **from**: `song_versions`
- **from**: `release_tracks`
- **from**: `songs`
- **from**: `posts`
- **from**: `profiles`

### getAssetDeletionBlockers

[src/features/drive/api.ts:439](../../../src/features/drive/api.ts#L439)

```typescript
export function getAssetDeletionBlockers(summary: AssetReferenceSummary)
```

Local orchestration; follow its imported helpers and callers.

### deleteAssetRecord

[src/features/drive/api.ts:464](../../../src/features/drive/api.ts#L464)

```typescript
export async function deleteAssetRecord(assetId: string)
```

- **from**: `assets`

### listHomeFeedPage

[src/features/feed/api.ts:66](../../../src/features/feed/api.ts#L66)

```typescript
export async function listHomeFeedPage(
  viewerId: string | null,
  options: { offset?: number; limit?: number } = {},
): Promise<HomeFeedPage>
```

- **rpc**: `list_home_feed_post_ids`
- **rpc**: `list_trending_public_post_ids`
- **from**: `posts`

### listExploreFeedPage

[src/features/feed/api.ts:187](../../../src/features/feed/api.ts#L187)

```typescript
export async function listExploreFeedPage(params?: {
  postType?: "single" | "ep" | "album" | "all";
  viewerId?: string | null;
  mode?: "latest" | "trending";
  offset?: number;
  limit?: number;
}): Promise<HomeFeedPage>
```

- **rpc**: `list_trending_public_post_ids`

### searchExploreCatalog

[src/features/feed/api.ts:233](../../../src/features/feed/api.ts#L233)

```typescript
export async function searchExploreCatalog(params: {
  query: string;
  viewerId?: string | null;
  postType?: "single" | "ep" | "album" | "all";
})
```

- **rpc**: `search_public_catalog`

### getProfileMetrics

[src/features/follows/api.ts:80](../../../src/features/follows/api.ts#L80)

```typescript
export async function getProfileMetrics(profileId: string): Promise<ProfilePublicMetrics>
```

- **rpc**: `get_profile_metrics_v2`

### getFollowState

[src/features/follows/api.ts:99](../../../src/features/follows/api.ts#L99)

```typescript
export async function getFollowState(input: {
  viewerId?: string | null;
  profileId: string;
}): Promise<FollowState>
```

- **rpc**: `get_follow_state_v2`

### followProfile

[src/features/follows/api.ts:140](../../../src/features/follows/api.ts#L140)

```typescript
export async function followProfile(targetProfileId: string)
```

- **rpc**: `follow_profile`

### unfollowProfile

[src/features/follows/api.ts:158](../../../src/features/follows/api.ts#L158)

```typescript
export async function unfollowProfile(targetProfileId: string)
```

- **rpc**: `unfollow_profile`

### listProfileConnections

[src/features/follows/api.ts:176](../../../src/features/follows/api.ts#L176)

```typescript
export async function listProfileConnections(input: {
  profileId: string;
  relation: "followers" | "following";
  viewerId?: string | null;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<SocialProfileCard[]>
```

- **rpc**: `list_profile_connections`

### listCreatorDiscovery

[src/features/follows/api.ts:284](../../../src/features/follows/api.ts#L284)

```typescript
export async function listCreatorDiscovery(input?: {
  viewerId?: string | null;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<SocialProfileCard[]>
```

- **rpc**: `list_public_creators`

### getTermsAcceptance

[src/features/legal/api.ts:9](../../../src/features/legal/api.ts#L9)

```typescript
export async function getTermsAcceptance(profileId: string): Promise<TermsAcceptance | null>
```

- **from**: `terms_acceptances`

### acceptTermsOfService

[src/features/legal/api.ts:29](../../../src/features/legal/api.ts#L29)

```typescript
export async function acceptTermsOfService(version: string): Promise<TermsAcceptance>
```

- **rpc**: `accept_terms_of_service`

### validateAppFeedback

[src/features/legal/feedback-api.ts:21](../../../src/features/legal/feedback-api.ts#L21)

```typescript
export function validateAppFeedback(input: {
  subject: string;
  details: string;
  pageContext: string;
  screenshot: File | null;
})
```

Local orchestration; follow its imported helpers and callers.

### submitAppFeedback

[src/features/legal/feedback-api.ts:51](../../../src/features/legal/feedback-api.ts#L51)

```typescript
export async function submitAppFeedback(input: AppFeedbackInput)
```

- **rpc**: `submit_app_feedback`

### getLibraryDashboard

[src/features/library/api.ts:16](../../../src/features/library/api.ts#L16)

```typescript
export async function getLibraryDashboard(ownerId: string): Promise<LibraryDashboardData>
```

- **from**: `songs`
- **from**: `song_versions`
- **from**: `assets`

### getSongDetail

[src/features/library/api.ts:52](../../../src/features/library/api.ts#L52)

```typescript
export async function getSongDetail(songId: string)
```

- **from**: `songs`
- **from**: `song_versions`
- **from**: `assets`

### updateSong

[src/features/library/api.ts:89](../../../src/features/library/api.ts#L89)

```typescript
export async function updateSong(songId: string, values: SongFormValues)
```

- **from**: `songs`

### createSong

[src/features/library/api.ts:127](../../../src/features/library/api.ts#L127)

```typescript
export async function createSong(ownerId: string, values: SongFormValues)
```

- **from**: `songs`

### createSongVersion

[src/features/library/api.ts:156](../../../src/features/library/api.ts#L156)

```typescript
export async function createSongVersion(
  songId: string,
  values: VersionFormValues,
  context?: {
    projectId: string;
    trackId: string;
  },
)
```

- **from**: `song_versions`
- **from**: `song_versions`

### deleteSong

[src/features/library/api.ts:225](../../../src/features/library/api.ts#L225)

```typescript
export async function deleteSong(songId: string)
```

- **from**: `single_posts`
- **from**: `release_tracks`
- **from**: `songs`

### deleteSongVersion

[src/features/library/api.ts:269](../../../src/features/library/api.ts#L269)

```typescript
export async function deleteSongVersion(versionId: string)
```

- **from**: `single_posts`
- **from**: `song_versions`

### updateSongVersionPreview

[src/features/library/api.ts:300](../../../src/features/library/api.ts#L300)

```typescript
export async function updateSongVersionPreview(input: {
  versionId: string;
  previewAssetId: string | null;
})
```

- **from**: `song_versions`
- **from**: `release_tracks`

### analyzeSongAudio

[src/features/media-processing/api.ts:75](../../../src/features/media-processing/api.ts#L75)

```typescript
export async function analyzeSongAudio(input: {
  songId: string;
  sourceAssetId: string;
  file: File;
  signal?: AbortSignal;
  onProgress?: (progress: number) => void;
})
```

Local orchestration; follow its imported helpers and callers.

### listMediaProcessingJobs

[src/features/media-processing/api.ts:133](../../../src/features/media-processing/api.ts#L133)

```typescript
export async function listMediaProcessingJobs(sourceAssetId?: string)
```

- **from**: `media_processing_jobs`

### createMediaProcessingJob

[src/features/media-processing/api.ts:157](../../../src/features/media-processing/api.ts#L157)

```typescript
export async function createMediaProcessingJob(input: {
  sourceAssetId: string;
  songVersionId?: string | null;
  songId?: string | null;
  outputMode?: "public_cloud" | "protected";
  protectedPurpose?: "post_preview" | "collaboration_preview" | "message_audio" | null;
  projectId?: string | null;
  postId?: string | null;
})
```

- **workerRequest**: `/v1/media/jobs`
- **rpc**: `request_media_processing_job`

### uploadMediaProcessingInput

[src/features/media-processing/api.ts:244](../../../src/features/media-processing/api.ts#L244)

```typescript
export async function uploadMediaProcessingInput(input: {
  jobId: string;
  file: File;
  signal?: AbortSignal;
  onProgress?: (progress: number) => void;
})
```

Local orchestration; follow its imported helpers and callers.

### getMediaProcessingJob

[src/features/media-processing/api.ts:301](../../../src/features/media-processing/api.ts#L301)

```typescript
export async function getMediaProcessingJob(jobId: string)
```

- **workerRequest**: ``/v1/media/jobs/${jobId}``

### downloadMediaProcessingPreview

[src/features/media-processing/api.ts:310](../../../src/features/media-processing/api.ts#L310)

```typescript
export async function downloadMediaProcessingPreview(jobId: string)
```

Local orchestration; follow its imported helpers and callers.

### acknowledgeMediaProcessingJob

[src/features/media-processing/api.ts:344](../../../src/features/media-processing/api.ts#L344)

```typescript
export async function acknowledgeMediaProcessingJob(jobId: string)
```

- **workerRequest**: ``/v1/media/jobs/${jobId}/acknowledge``

### cancelMediaProcessingJob

[src/features/media-processing/api.ts:355](../../../src/features/media-processing/api.ts#L355)

```typescript
export async function cancelMediaProcessingJob(jobId: string)
```

- **rpc**: `cancel_media_processing_job`
- **workerRequest**: ``/v1/media/jobs/${jobId}``

### finalizeMediaProcessingJob

[src/features/media-processing/api.ts:375](../../../src/features/media-processing/api.ts#L375)

```typescript
export async function finalizeMediaProcessingJob(input: {
  jobId: string;
  previewAssetId: string;
})
```

- **rpc**: `finalize_media_processing_job`

### sendPushTestNotification

[src/features/media-processing/api.ts:395](../../../src/features/media-processing/api.ts#L395)

```typescript
export async function sendPushTestNotification()
```

- **workerRequest**: `/v1/push/test`

### createProtectedMediaReadUrl

[src/features/media-processing/api.ts:406](../../../src/features/media-processing/api.ts#L406)

```typescript
export async function createProtectedMediaReadUrl(
  assetId: string,
  shareToken?: string | null,
)
```

- **getSession**: `null`
- **fetch**: ``${env.mediaWorkerUrl}/v1/protected-media/${encodeURIComponent(assetId)}/read-url``
- **workerRequest**: ``/v1/protected-media/${encodeURIComponent(assetId)}/read-url``

### listConversations

[src/features/messages/api.ts:43](../../../src/features/messages/api.ts#L43)

```typescript
export async function listConversations(viewerId: string)
```

- **from**: `conversation_members`
- **from**: `conversations`
- **from**: `conversation_members`
- **from**: `messages`
- **from**: `collaboration_projects`
- **from**: `profiles`

### getConversation

[src/features/messages/api.ts:137](../../../src/features/messages/api.ts#L137)

```typescript
export async function getConversation(conversationId: string)
```

- **from**: `conversations`
- **from**: `conversation_members`
- **from**: `messages`
- **from**: `message_attachments`
- **from**: `protected_media_assets`
- **from**: `collaboration_projects`
- **from**: `profiles`

### createDirectConversation

[src/features/messages/api.ts:211](../../../src/features/messages/api.ts#L211)

```typescript
export async function createDirectConversation(input: { otherProfileId: string })
```

- **rpc**: `create_direct_conversation`

### getUnreadConversationSummary

[src/features/messages/api.ts:227](../../../src/features/messages/api.ts#L227)

```typescript
export async function getUnreadConversationSummary(viewerId: string): Promise<UnreadConversationSummary>
```

- **from**: `conversation_members`
- **from**: `messages`

### sendMessage

[src/features/messages/api.ts:287](../../../src/features/messages/api.ts#L287)

```typescript
export async function sendMessage(input: {
  conversationId: string;
  senderId: string;
  values: MessageFormValues;
})
```

- **from**: `messages`

### markConversationRead

[src/features/messages/api.ts:319](../../../src/features/messages/api.ts#L319)

```typescript
export async function markConversationRead(conversationId: string)
```

- **rpc**: `mark_conversation_read`

### deleteOwnMessage

[src/features/messages/api.ts:333](../../../src/features/messages/api.ts#L333)

```typescript
export async function deleteOwnMessage(messageId: string)
```

- **rpc**: `delete_own_message`

### listNotifications

[src/features/notifications/api.ts:19](../../../src/features/notifications/api.ts#L19)

```typescript
export async function listNotifications(
  viewerId: string,
  options: { offset?: number; limit?: number } = {},
): Promise<NotificationsPageResult>
```

- **from**: `notifications`

### getUnreadNotificationCount

[src/features/notifications/api.ts:70](../../../src/features/notifications/api.ts#L70)

```typescript
export async function getUnreadNotificationCount(viewerId: string)
```

- **from**: `notifications`

### markNotificationRead

[src/features/notifications/api.ts:92](../../../src/features/notifications/api.ts#L92)

```typescript
export async function markNotificationRead(notificationId: string)
```

- **rpc**: `mark_notification_read`

### markAllNotificationsRead

[src/features/notifications/api.ts:108](../../../src/features/notifications/api.ts#L108)

```typescript
export async function markAllNotificationsRead()
```

- **rpc**: `mark_all_notifications_read`

### getNotificationPreferences

[src/features/notifications/api.ts:122](../../../src/features/notifications/api.ts#L122)

```typescript
export async function getNotificationPreferences(profileId: string)
```

- **from**: `notification_preferences`

### updateNotificationPreferences

[src/features/notifications/api.ts:159](../../../src/features/notifications/api.ts#L159)

```typescript
export async function updateNotificationPreferences(
  profileId: string,
  updates: Partial<NotificationPreferences>,
)
```

- **from**: `notification_preferences`

### listPushSubscriptions

[src/features/notifications/api.ts:200](../../../src/features/notifications/api.ts#L200)

```typescript
export async function listPushSubscriptions(profileId: string)
```

- **from**: `push_subscriptions`

### savePushSubscription

[src/features/notifications/api.ts:220](../../../src/features/notifications/api.ts#L220)

```typescript
export async function savePushSubscription(input: {
  profileId: string;
  subscription: PushSubscription;
  deviceLabel?: string | null;
})
```

- **from**: `push_subscriptions`

### setPushSubscriptionActive

[src/features/notifications/api.ts:272](../../../src/features/notifications/api.ts#L272)

```typescript
export async function setPushSubscriptionActive(input: {
  profileId: string;
  endpoint: string;
  isActive: boolean;
})
```

- **from**: `push_subscriptions`

### getResolvedPostCardsByIds

[src/features/posts/api.ts:860](../../../src/features/posts/api.ts#L860)

```typescript
export async function getResolvedPostCardsByIds(
  postIds: string[],
  viewerId?: string | null,
): Promise<ResolvedPostCard[]>
```

- **rpc**: `get_resolved_post_cards`

### listResolvedPosts

[src/features/posts/api.ts:917](../../../src/features/posts/api.ts#L917)

```typescript
export async function listResolvedPosts(params?: {
  visibility?: Visibility;
  postType?: PostType | "all";
  ownerId?: string;
  search?: string;
  viewerId?: string | null;
  limit?: number;
  offset?: number;
}): Promise<ResolvedPostCard[]>
```

- **from**: `posts`

### getResolvedPostById

[src/features/posts/api.ts:988](../../../src/features/posts/api.ts#L988)

```typescript
export async function getResolvedPostById(postId: string, viewerId?: string | null)
```

- **from**: `comments`
- **rpc**: `get_comment_engagement`
- **from**: `post_credits`
- **from**: `post_external_links`

### findSinglePostBySongId

[src/features/posts/api.ts:1047](../../../src/features/posts/api.ts#L1047)

```typescript
export async function findSinglePostBySongId(songId: string)
```

- **from**: `single_posts`
- **from**: `posts`

### publishSingleVersion

[src/features/posts/api.ts:1082](../../../src/features/posts/api.ts#L1082)

```typescript
export async function publishSingleVersion(input: {
  versionId: string;
})
```

- **rpc**: `publish_single_version`

### createSinglePost

[src/features/posts/api.ts:1100](../../../src/features/posts/api.ts#L1100)

```typescript
export async function createSinglePost(input: {
  ownerId: string;
  songId: string;
  featuredVersionId: string;
  values: SinglePublishValues;
})
```

- **rpc**: `create_single_post`
- **from**: `single_posts`

### createReleasePost

[src/features/posts/api.ts:1137](../../../src/features/posts/api.ts#L1137)

```typescript
export async function createReleasePost(input: {
  postType: Exclude<PostType, "single">;
  title: string;
  description?: string;
  releaseUrl?: string;
  artworkAssetId?: string | null;
  visibility: Visibility;
  tracks: Array<{
    song_id: string;
    song_version_id: string | null;
    preview_asset_id: string | null;
    track_title: string;
    track_number: number;
    production_stage: string | null;
    show_lyrics: boolean;
  }>;
})
```

- **rpc**: `create_release_post`

### updateSinglePostForPublish

[src/features/posts/api.ts:1177](../../../src/features/posts/api.ts#L1177)

```typescript
export async function updateSinglePostForPublish(input: {
  postId: string;
  featuredVersionId: string;
  title: string;
  description?: string;
  artworkAssetId?: string | null;
  visibility: Visibility;
  showLyrics: boolean;
})
```

- **from**: `posts`
- **from**: `single_posts`

### updateSingleLyricsVisibility

[src/features/posts/api.ts:1217](../../../src/features/posts/api.ts#L1217)

```typescript
export async function updateSingleLyricsVisibility(input: {
  postId: string;
  showLyrics: boolean;
})
```

- **from**: `single_posts`

### updateReleasePost

[src/features/posts/api.ts:1242](../../../src/features/posts/api.ts#L1242)

```typescript
export async function updateReleasePost(input: {
  postId: string;
  title: string;
  description?: string;
  releaseUrl?: string;
  artworkAssetId?: string | null;
  tracks: Array<{
    song_id: string;
    song_version_id: string | null;
    preview_asset_id: string | null;
    track_title: string;
    track_number: number;
    production_stage: string | null;
    show_lyrics: boolean;
  }>;
})
```

- **rpc**: `update_release_post`

### updatePostVisibility

[src/features/posts/api.ts:1278](../../../src/features/posts/api.ts#L1278)

```typescript
export async function updatePostVisibility(postId: string, visibility: Visibility)
```

- **from**: `posts`

### makeVersionsPubliclyReadable

[src/features/posts/api.ts:1304](../../../src/features/posts/api.ts#L1304)

```typescript
export async function makeVersionsPubliclyReadable(versionIds: string[])
```

- **from**: `song_versions`

### updateSinglePost

[src/features/posts/api.ts:1327](../../../src/features/posts/api.ts#L1327)

```typescript
export async function updateSinglePost(input: {
  postId: string;
  title: string;
  description?: string;
  releaseUrl?: string;
  artworkAssetId?: string | null;
  featuredVersionId: string;
  showLyrics: boolean;
})
```

- **from**: `posts`
- **from**: `single_posts`
- **from**: `song_versions`
- **rpc**: `update_release_post`
- **from**: `single_posts`
- **from**: `single_posts`

### addCommentToPost

[src/features/posts/api.ts:1412](../../../src/features/posts/api.ts#L1412)

```typescript
export async function addCommentToPost(input: {
  postId: string;
  authorId: string;
  values: CommentFormValues;
})
```

- **from**: `comments`

### updateCommentOnPost

[src/features/posts/api.ts:1435](../../../src/features/posts/api.ts#L1435)

```typescript
export async function updateCommentOnPost(input: {
  commentId: string;
  authorId: string;
  body: string;
})
```

- **from**: `comments`

### deleteCommentOnPost

[src/features/posts/api.ts:1460](../../../src/features/posts/api.ts#L1460)

```typescript
export async function deleteCommentOnPost(input: {
  commentId: string;
  authorId: string;
})
```

- **from**: `comments`

### toggleCommentHeart

[src/features/posts/api.ts:1484](../../../src/features/posts/api.ts#L1484)

```typescript
export async function toggleCommentHeart(input: {
  commentId: string;
  profileId: string;
  active: boolean;
})
```

- **from**: `comment_hearts`
- **from**: `comment_hearts`

### togglePostHeart

[src/features/posts/api.ts:1516](../../../src/features/posts/api.ts#L1516)

```typescript
export async function togglePostHeart(input: {
  postId: string;
  profileId: string;
  active: boolean;
})
```

- **from**: `posts`
- **from**: `post_hearts`
- **from**: `post_hearts`
- **from**: `post_hearts`

### toggleVersionHeart

[src/features/posts/api.ts:1605](../../../src/features/posts/api.ts#L1605)

```typescript
export async function toggleVersionHeart(input: {
  versionId: string;
  profileId: string;
  active: boolean;
})
```

- **rpc**: `toggle_version_heart`

### reportPost

[src/features/posts/api.ts:1642](../../../src/features/posts/api.ts#L1642)

```typescript
export async function reportPost(input: {
  reporterId: string;
  targetId: string;
  reason: string;
  details?: string;
})
```

- **from**: `reports`

### deletePost

[src/features/posts/api.ts:1668](../../../src/features/posts/api.ts#L1668)

```typescript
export async function deletePost(postId: string)
```

- **from**: `posts`

### listPostShareLinks

[src/features/posts/api.ts:1682](../../../src/features/posts/api.ts#L1682)

```typescript
export async function listPostShareLinks(postId: string)
```

- **from**: `share_links`

### createPostShareLink

[src/features/posts/api.ts:1694](../../../src/features/posts/api.ts#L1694)

```typescript
export async function createPostShareLink(input: {
  postId: string;
  permission?: "view" | "review";
  expiresAt?: string | null;
  maxUses?: number | null;
})
```

- **rpc**: `create_share_link`

### revokePostShareLink

[src/features/posts/api.ts:1714](../../../src/features/posts/api.ts#L1714)

```typescript
export async function revokePostShareLink(shareLinkId: string)
```

- **rpc**: `revoke_share_link`

### replaceReleaseCredits

[src/features/posts/api.ts:1722](../../../src/features/posts/api.ts#L1722)

```typescript
export async function replaceReleaseCredits(postId: string, credits: Array<{
  profile_id?: string | null;
  display_name: string;
  role: string;
  position: number;
}>)
```

- **rpc**: `replace_release_credits`

### replaceReleaseExternalLinks

[src/features/posts/api.ts:1736](../../../src/features/posts/api.ts#L1736)

```typescript
export async function replaceReleaseExternalLinks(postId: string, links: Array<{
  platform: string;
  label: string;
  url: string;
  position: number;
}>)
```

- **rpc**: `replace_release_external_links`

### updateReleasePresentation

[src/features/posts/api.ts:1750](../../../src/features/posts/api.ts#L1750)

```typescript
export async function updateReleasePresentation(input: {
  postId: string;
  releaseNotes?: string;
  allowEmbed: boolean;
})
```

- **from**: `posts`

### getSharedPostByToken

[src/features/posts/api.ts:1788](../../../src/features/posts/api.ts#L1788)

```typescript
export async function getSharedPostByToken(token: string): Promise<ResolvedPostCard>
```

- **rpc**: `resolve_shared_post`

### resolveSharedLinkTarget

[src/features/posts/api.ts:1845](../../../src/features/posts/api.ts#L1845)

```typescript
export async function resolveSharedLinkTarget(token: string)
```

- **rpc**: `resolve_share_link_target`

### listPostDrafts

[src/features/posts/drafts-api.ts:22](../../../src/features/posts/drafts-api.ts#L22)

```typescript
export async function listPostDrafts(ownerId: string)
```

- **from**: `post_drafts`

### getPostDraft

[src/features/posts/drafts-api.ts:41](../../../src/features/posts/drafts-api.ts#L41)

```typescript
export async function getPostDraft(draftId: string)
```

- **from**: `post_drafts`

### upsertPostDraft

[src/features/posts/drafts-api.ts:58](../../../src/features/posts/drafts-api.ts#L58)

```typescript
export async function upsertPostDraft(input: {
  id: string;
  ownerId: string;
  postType: PostType;
  title: string;
  currentStep: number;
  payload: PostDraftPayload;
})
```

- **from**: `post_drafts`

### deletePostDraft

[src/features/posts/drafts-api.ts:102](../../../src/features/posts/drafts-api.ts#L102)

```typescript
export async function deletePostDraft(draftId: string)
```

- **from**: `post_drafts`

### updateAccountPassword

[src/features/privacy/account-api.ts:3](../../../src/features/privacy/account-api.ts#L3)

```typescript
export async function updateAccountPassword(password: string)
```

- **updateUser**: `{ password }`

### updateAccountEmail

[src/features/privacy/account-api.ts:11](../../../src/features/privacy/account-api.ts#L11)

```typescript
export async function updateAccountEmail(email: string)
```

- **updateUser**: `{ email }`

### confirmAccountPassword

[src/features/privacy/account-api.ts:19](../../../src/features/privacy/account-api.ts#L19)

```typescript
export async function confirmAccountPassword(input: {
  email: string;
  password: string;
})
```

- **signInWithPassword**: `input`

### requestAccountDeletion

[src/features/privacy/account-api.ts:33](../../../src/features/privacy/account-api.ts#L33)

```typescript
export async function requestAccountDeletion(input: {
  gracePeriodDays?: number;
  deleteCloudFiles?: boolean;
})
```

- **rpc**: `request_account_deletion`

### cancelAccountDeletion

[src/features/privacy/account-api.ts:48](../../../src/features/privacy/account-api.ts#L48)

```typescript
export async function cancelAccountDeletion()
```

- **rpc**: `cancel_account_deletion`

### requestDataExport

[src/features/privacy/account-api.ts:69](../../../src/features/privacy/account-api.ts#L69)

```typescript
export async function requestDataExport(format: "json" | "json_csv")
```

- **rpc**: `request_data_export`

### listDataExportRequests

[src/features/privacy/account-api.ts:80](../../../src/features/privacy/account-api.ts#L80)

```typescript
export async function listDataExportRequests(profileId: string)
```

- **from**: `data_export_requests`

### getPrivacySettings

[src/features/privacy/api.ts:17](../../../src/features/privacy/api.ts#L17)

```typescript
export async function getPrivacySettings(profileId: string)
```

- **from**: `profile_privacy_settings`

### savePrivacySettings

[src/features/privacy/api.ts:42](../../../src/features/privacy/api.ts#L42)

```typescript
export async function savePrivacySettings(
  values: Omit<ProfilePrivacySettings, "profile_id" | "created_at" | "updated_at">,
)
```

- **rpc**: `update_privacy_settings`

### blockProfile

[src/features/privacy/api.ts:66](../../../src/features/privacy/api.ts#L66)

```typescript
export async function blockProfile(profileId: string)
```

- **rpc**: `block_profile`

### unblockProfile

[src/features/privacy/api.ts:77](../../../src/features/privacy/api.ts#L77)

```typescript
export async function unblockProfile(profileId: string)
```

- **rpc**: `unblock_profile`

### muteProfile

[src/features/privacy/api.ts:88](../../../src/features/privacy/api.ts#L88)

```typescript
export async function muteProfile(input: {
  profileId: string;
  posts?: boolean;
  notifications?: boolean;
  messages?: boolean;
})
```

- **rpc**: `mute_profile`

### unmuteProfile

[src/features/privacy/api.ts:106](../../../src/features/privacy/api.ts#L106)

```typescript
export async function unmuteProfile(profileId: string)
```

- **rpc**: `unmute_profile`

### listBlockedProfiles

[src/features/privacy/api.ts:125](../../../src/features/privacy/api.ts#L125)

```typescript
export async function listBlockedProfiles()
```

- **rpc**: `list_blocked_profiles`

### getCurrentProfile

[src/features/profile/api.ts:23](../../../src/features/profile/api.ts#L23)

```typescript
export async function getCurrentProfile(userId?: string | null): Promise<Profile | null>
```

- **rpc**: `get_current_profile_v2`
- **getUser**: `null`
- **from**: `profiles`
- **from**: `profiles`

### getProfileByUsername

[src/features/profile/api.ts:89](../../../src/features/profile/api.ts#L89)

```typescript
export async function getProfileByUsername(username: string): Promise<Profile | null>
```

- **rpc**: `get_profile_by_username_v2`

### getProfilesByIds

[src/features/profile/api.ts:113](../../../src/features/profile/api.ts#L113)

```typescript
export async function getProfilesByIds(profileIds: string[]): Promise<Profile[]>
```

- **from**: `profiles`

### saveProfile

[src/features/profile/api.ts:138](../../../src/features/profile/api.ts#L138)

```typescript
export async function saveProfile(userId: string, values: ProfileFormValues): Promise<Profile>
```

- **rpc**: `save_profile_v2`

### updateProfileAvatar

[src/features/profile/api.ts:171](../../../src/features/profile/api.ts#L171)

```typescript
export async function updateProfileAvatar(userId: string, avatarAssetId: string | null): Promise<Profile>
```

- **from**: `profiles`

### getProfilePosts

[src/features/profile/api.ts:199](../../../src/features/profile/api.ts#L199)

```typescript
export async function getProfilePosts(profileId: string): Promise<Post[]>
```

- **from**: `posts`

### getDemoAvatarForProfile

[src/features/profile/api.ts:220](../../../src/features/profile/api.ts#L220)

```typescript
export function getDemoAvatarForProfile(profile: Profile)
```

Local orchestration; follow its imported helpers and callers.

### searchProjectInviteCandidates

[src/features/projects/api.ts:56](../../../src/features/projects/api.ts#L56)

```typescript
export async function searchProjectInviteCandidates(
  query: string,
  excludedProfileIds: string[] = [],
): Promise<Profile[]>
```

Local orchestration; follow its imported helpers and callers.

### listProjects

[src/features/projects/api.ts:80](../../../src/features/projects/api.ts#L80)

```typescript
export async function listProjects(viewerId: string): Promise<ProjectDashboardItem[]>
```

- **from**: `collaboration_project_members`
- **from**: `collaboration_projects`
- **from**: `collaboration_project_members`
- **from**: `collaboration_activity`
- **from**: `feedback_threads`
- **from**: `profiles`

### getProject

[src/features/projects/api.ts:131](../../../src/features/projects/api.ts#L131)

```typescript
export async function getProject(projectId: string): Promise<ProjectDetail | null>
```

- **from**: `collaboration_projects`
- **from**: `collaboration_project_members`
- **from**: `collaboration_project_tracks`
- **from**: `collaboration_activity`
- **from**: `feedback_threads`
- **from**: `conversations`
- **from**: `song_versions`
- **from**: `profiles`
- **from**: `songs`
- **from**: `assets`
- **from**: `feedback_replies`
- **from**: `feedback_reactions`
- **from**: `version_hearts`
- **from**: `protected_media_assets`
- **getUser**: `null`

### createProject

[src/features/projects/api.ts:243](../../../src/features/projects/api.ts#L243)

```typescript
export async function createProject(input: {
  title: string;
  type: CollaborationProjectType;
  description?: string;
  visibility?: CollaborationProjectVisibility;
})
```

- **rpc**: `create_collaboration_project`

### updateProject

[src/features/projects/api.ts:260](../../../src/features/projects/api.ts#L260)

```typescript
export async function updateProject(projectId: string, values: Partial<Pick<
  CollaborationProject,
  "title" | "description" | "visibility" | "artwork_asset_id"
>>)
```

- **from**: `collaboration_projects`

### inviteProjectMember

[src/features/projects/api.ts:275](../../../src/features/projects/api.ts#L275)

```typescript
export async function inviteProjectMember(input: {
  projectId: string;
  role: Exclude<CollaborationRole, "owner">;
  profileId?: string | null;
  email?: string | null;
})
```

- **rpc**: `invite_project_member`

### listPendingInvites

[src/features/projects/api.ts:309](../../../src/features/projects/api.ts#L309)

```typescript
export async function listPendingInvites(_profileId: string)
```

- **rpc**: `list_pending_project_invites`

### resolveProjectInvite

[src/features/projects/api.ts:316](../../../src/features/projects/api.ts#L316)

```typescript
export async function resolveProjectInvite(token: string)
```

- **rpc**: `resolve_project_invite`

### acceptProjectInvite

[src/features/projects/api.ts:333](../../../src/features/projects/api.ts#L333)

```typescript
export async function acceptProjectInvite(token: string)
```

- **rpc**: `accept_project_invite`
- **rpc**: `accept_project_invite_by_id`

### declineProjectInvite

[src/features/projects/api.ts:360](../../../src/features/projects/api.ts#L360)

```typescript
export async function declineProjectInvite(token: string)
```

- **rpc**: `decline_project_invite`

### acceptProjectInviteById

[src/features/projects/api.ts:368](../../../src/features/projects/api.ts#L368)

```typescript
export async function acceptProjectInviteById(inviteId: string)
```

- **rpc**: `accept_project_invite_by_id`

### declineProjectInviteById

[src/features/projects/api.ts:377](../../../src/features/projects/api.ts#L377)

```typescript
export async function declineProjectInviteById(inviteId: string)
```

- **rpc**: `decline_project_invite_by_id`

### addProjectTrack

[src/features/projects/api.ts:385](../../../src/features/projects/api.ts#L385)

```typescript
export async function addProjectTrack(input: {
  projectId: string;
  songId: string;
  versionId?: string | null;
  title?: string | null;
})
```

- **rpc**: `add_project_track`

### reorderProjectTracks

[src/features/projects/api.ts:402](../../../src/features/projects/api.ts#L402)

```typescript
export async function reorderProjectTracks(projectId: string, trackIds: string[])
```

- **rpc**: `reorder_project_tracks`

### removeProjectTrack

[src/features/projects/api.ts:411](../../../src/features/projects/api.ts#L411)

```typescript
export async function removeProjectTrack(projectId: string, trackId: string)
```

- **from**: `collaboration_project_tracks`

### updateProjectTrack

[src/features/projects/api.ts:421](../../../src/features/projects/api.ts#L421)

```typescript
export async function updateProjectTrack(input: {
  projectId: string;
  trackId: string;
  notes?: string | null;
  status?: CollaborationProjectTrack["status"];
  assignedTo?: string | null;
})
```

- **from**: `collaboration_project_tracks`

### selectProjectTrackVersion

[src/features/projects/api.ts:441](../../../src/features/projects/api.ts#L441)

```typescript
export async function selectProjectTrackVersion(input: {
  projectId: string;
  trackId: string;
  versionId: string;
})
```

- **rpc**: `select_project_track_version`

### updateProjectStatus

[src/features/projects/api.ts:455](../../../src/features/projects/api.ts#L455)

```typescript
export async function updateProjectStatus(projectId: string, status: CollaborationProjectStatus)
```

- **rpc**: `update_project_status`

### changeProjectMemberRole

[src/features/projects/api.ts:464](../../../src/features/projects/api.ts#L464)

```typescript
export async function changeProjectMemberRole(input: {
  projectId: string;
  profileId: string;
  role: Exclude<CollaborationRole, "owner">;
})
```

- **rpc**: `change_project_member_role`

### removeProjectMember

[src/features/projects/api.ts:478](../../../src/features/projects/api.ts#L478)

```typescript
export async function removeProjectMember(projectId: string, profileId: string)
```

- **rpc**: `remove_project_member`

### leaveProject

[src/features/projects/api.ts:487](../../../src/features/projects/api.ts#L487)

```typescript
export async function leaveProject(projectId: string)
```

- **rpc**: `leave_collaboration_project`

### transferProjectOwnership

[src/features/projects/api.ts:495](../../../src/features/projects/api.ts#L495)

```typescript
export async function transferProjectOwnership(projectId: string, profileId: string)
```

- **rpc**: `transfer_project_ownership`

### deleteProject

[src/features/projects/api.ts:504](../../../src/features/projects/api.ts#L504)

```typescript
export async function deleteProject(projectId: string)
```

- **from**: `collaboration_projects`

### toggleFeedbackReaction

[src/features/projects/api.ts:513](../../../src/features/projects/api.ts#L513)

```typescript
export async function toggleFeedbackReaction(input: {
  threadId: string;
  reaction: FeedbackReaction["reaction"];
  active: boolean;
})
```

- **rpc**: `set_feedback_reaction`

### createFeedback

[src/features/projects/api.ts:527](../../../src/features/projects/api.ts#L527)

```typescript
export async function createFeedback(input: {
  projectId: string;
  trackId: string;
  versionId: string;
  startSeconds: number;
  endSeconds?: number | null;
  title?: string;
  body: string;
  category: FeedbackThread["category"];
  priority: FeedbackThread["priority"];
  assignedTo?: string | null;
})
```

- **rpc**: `create_feedback_thread`

### replyToFeedback

[src/features/projects/api.ts:556](../../../src/features/projects/api.ts#L556)

```typescript
export async function replyToFeedback(threadId: string, body: string)
```

- **rpc**: `reply_to_feedback_thread`

### setFeedbackResolved

[src/features/projects/api.ts:566](../../../src/features/projects/api.ts#L566)

```typescript
export async function setFeedbackResolved(threadId: string, resolved: boolean)
```

- **rpc**: `resolved ? "resolve_feedback_thread" : "reopen_feedback_thread"`

### updateFeedbackStatus

[src/features/projects/api.ts:575](../../../src/features/projects/api.ts#L575)

```typescript
export async function updateFeedbackStatus(
  threadId: string,
  status: FeedbackThread["status"],
)
```

- **rpc**: `update_feedback_thread_status`

### updateVersionReviewStatus

[src/features/projects/api.ts:587](../../../src/features/projects/api.ts#L587)

```typescript
export async function updateVersionReviewStatus(input: {
  projectId: string;
  versionId: string;
  status: SongVersion["review_status"];
})
```

- **rpc**: `update_song_version_review_status`

### getProtectedAssetPlaybackUrl

[src/features/projects/api.ts:601](../../../src/features/projects/api.ts#L601)

```typescript
export async function getProtectedAssetPlaybackUrl(assetId: string)
```

Local orchestration; follow its imported helpers and callers.

### getSharedProjectByToken

[src/features/projects/api.ts:622](../../../src/features/projects/api.ts#L622)

```typescript
export async function getSharedProjectByToken(token: string)
```

- **rpc**: `resolve_shared_project`

### createSharedProjectFeedback

[src/features/projects/api.ts:633](../../../src/features/projects/api.ts#L633)

```typescript
export async function createSharedProjectFeedback(input: {
  token: string;
  trackId: string;
  versionId: string;
  startSeconds: number;
  endSeconds?: number | null;
  title?: string;
  body: string;
  category: FeedbackThread["category"];
  priority: FeedbackThread["priority"];
})
```

- **rpc**: `create_shared_feedback_thread`

### listProjectShareLinks

[src/features/projects/api.ts:660](../../../src/features/projects/api.ts#L660)

```typescript
export async function listProjectShareLinks(projectId: string, versionIds: string[] = [])
```

- **from**: `share_links`

### createProjectShareLink

[src/features/projects/api.ts:672](../../../src/features/projects/api.ts#L672)

```typescript
export async function createProjectShareLink(input: {
  targetType: "collaboration_project" | "song_version";
  targetId: string;
  permission: "view" | "review";
  expiresAt?: string | null;
  maxUses?: number | null;
})
```

- **rpc**: `create_share_link`

### revokeProjectShareLink

[src/features/projects/api.ts:693](../../../src/features/projects/api.ts#L693)

```typescript
export async function revokeProjectShareLink(shareLinkId: string)
```

- **rpc**: `revoke_share_link`

### searchV2

[src/features/search/api.ts:14](../../../src/features/search/api.ts#L14)

```typescript
export async function searchV2(query: string)
```

- **rpc**: `search_v2_catalog`

### getSearchResultPath

[src/features/search/api.ts:28](../../../src/features/search/api.ts#L28)

```typescript
export function getSearchResultPath(result: SearchResult)
```

Local orchestration; follow its imported helpers and callers.

## SQL functions and RPC signatures

Latest checked-in definition by SQL identity; triggers/helpers and service-only functions are included deliberately. Presence here does **not** imply permission to invoke. Full bodies and grant/revoke history are in inventory.json; use the permission matrix and live catalog verification before connecting.

### accept_project_invite_by_id(uuid)

[supabase/migrations/20260723120000_mxshare_v2_projects_collaboration.sql:808](../../../supabase/migrations/20260723120000_mxshare_v2_projects_collaboration.sql#L808)

```sql
create or replace function public.accept_project_invite_by_id(target_invite_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
```

### accept_project_invite(text)

[supabase/migrations/20260723120000_mxshare_v2_projects_collaboration.sql:671](../../../supabase/migrations/20260723120000_mxshare_v2_projects_collaboration.sql#L671)

```sql
create or replace function public.accept_project_invite(invite_token text)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
```

### accept_terms_of_service(text)

[supabase/migrations/20260805120000_mxtrove_terms_acceptance.sql:23](../../../supabase/migrations/20260805120000_mxtrove_terms_acceptance.sql#L23)

```sql
create or replace function public.accept_terms_of_service(accepted_version text)
returns public.terms_acceptances
language plpgsql
security definer
set search_path = public, pg_temp
```

### add_project_track(uuid,uuid,uuid,text)

[supabase/migrations/20260723120000_mxshare_v2_projects_collaboration.sql:1151](../../../supabase/migrations/20260723120000_mxshare_v2_projects_collaboration.sql#L1151)

```sql
create or replace function public.add_project_track(
  target_project_id uuid,
  target_song_id uuid,
  target_version_id uuid default null,
  target_title text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
```

### block_profile(uuid)

[supabase/migrations/20260723123000_mxshare_v2_privacy_blocking.sql:294](../../../supabase/migrations/20260723123000_mxshare_v2_privacy_blocking.sql#L294)

```sql
create or replace function public.block_profile(target_profile_id uuid)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
```

### bump_conversation_updated_at()

[supabase/migrations/20260707190000_mxshare_v1.sql:382](../../../supabase/migrations/20260707190000_mxshare_v1.sql#L382)

```sql
create or replace function public.bump_conversation_updated_at()
returns trigger
language plpgsql
```

### can_access_message_attachment(uuid,uuid)

[supabase/migrations/20260723122000_mxshare_v2_attachments_protected_media.sql:181](../../../supabase/migrations/20260723122000_mxshare_v2_attachments_protected_media.sql#L181)

```sql
create or replace function public.can_access_message_attachment(
  target_attachment_id uuid,
  target_profile_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
```

### can_access_protected_media(uuid,uuid,text)

[supabase/migrations/20260729130000_mxtrove_protected_message_attachment_access.sql:4](../../../supabase/migrations/20260729130000_mxtrove_protected_message_attachment_access.sql#L4)

```sql
create or replace function public.can_access_protected_media(
  target_asset_id uuid,
  target_profile_id uuid default auth.uid(),
  supplied_share_token text default null
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
```

### can_edit_collaboration_project(uuid,uuid)

[supabase/migrations/20260723120000_mxshare_v2_projects_collaboration.sql:313](../../../supabase/migrations/20260723120000_mxshare_v2_projects_collaboration.sql#L313)

```sql
create or replace function public.can_edit_collaboration_project(
  target_project_id uuid,
  target_profile_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
```

### can_invite_profile_to_project(uuid,uuid)

[supabase/migrations/20260723123000_mxshare_v2_privacy_blocking.sql:223](../../../supabase/migrations/20260723123000_mxshare_v2_privacy_blocking.sql#L223)

```sql
create or replace function public.can_invite_profile_to_project(
  inviter_profile_id uuid,
  invitee_profile_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
```

### can_manage_collaboration_members(uuid,uuid)

[supabase/migrations/20260723120000_mxshare_v2_projects_collaboration.sql:331](../../../supabase/migrations/20260723120000_mxshare_v2_projects_collaboration.sql#L331)

```sql
create or replace function public.can_manage_collaboration_members(
  target_project_id uuid,
  target_profile_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
```

### can_message_profile(uuid,uuid)

[supabase/migrations/20260723123000_mxshare_v2_privacy_blocking.sql:186](../../../supabase/migrations/20260723123000_mxshare_v2_privacy_blocking.sql#L186)

```sql
create or replace function public.can_message_profile(
  sender_profile_id uuid,
  recipient_profile_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
```

### can_profile_view_song_version(uuid,uuid)

[supabase/migrations/20260723135000_mxshare_v2_message_actions.sql:3](../../../supabase/migrations/20260723135000_mxshare_v2_message_actions.sql#L3)

```sql
create or replace function public.can_profile_view_song_version(
  target_version_id uuid,
  target_profile_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
```

### can_review_project(uuid,uuid)

[supabase/migrations/20260723120000_mxshare_v2_projects_collaboration.sql:367](../../../supabase/migrations/20260723120000_mxshare_v2_projects_collaboration.sql#L367)

```sql
create or replace function public.can_review_project(
  target_project_id uuid,
  target_profile_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
```

### can_send_message_to_conversation(uuid,uuid)

[supabase/migrations/20260723123000_mxshare_v2_privacy_blocking.sql:260](../../../supabase/migrations/20260723123000_mxshare_v2_privacy_blocking.sql#L260)

```sql
create or replace function public.can_send_message_to_conversation(
  target_conversation_id uuid,
  sender_profile_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
```

### can_upload_project_version(uuid,uuid)

[supabase/migrations/20260723120000_mxshare_v2_projects_collaboration.sql:349](../../../supabase/migrations/20260723120000_mxshare_v2_projects_collaboration.sql#L349)

```sql
create or replace function public.can_upload_project_version(
  target_project_id uuid,
  target_profile_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
```

### can_view_collaboration_project(uuid,uuid)

[supabase/migrations/20260723120000_mxshare_v2_projects_collaboration.sql:286](../../../supabase/migrations/20260723120000_mxshare_v2_projects_collaboration.sql#L286)

```sql
create or replace function public.can_view_collaboration_project(
  target_project_id uuid,
  target_profile_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
```

### can_view_post(uuid,uuid)

[supabase/migrations/20260723125000_mxshare_v2_release_pages_moderation.sql:519](../../../supabase/migrations/20260723125000_mxshare_v2_release_pages_moderation.sql#L519)

```sql
create or replace function public.can_view_post(
  target_post_id uuid,
  target_profile_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
```

### can_view_profile(uuid,uuid)

[supabase/migrations/20260723123000_mxshare_v2_privacy_blocking.sql:139](../../../supabase/migrations/20260723123000_mxshare_v2_privacy_blocking.sql#L139)

```sql
create or replace function public.can_view_profile(
  target_profile_id uuid,
  viewer_profile_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
```

### cancel_account_deletion()

[supabase/migrations/20260723123000_mxshare_v2_privacy_blocking.sql:530](../../../supabase/migrations/20260723123000_mxshare_v2_privacy_blocking.sql#L530)

```sql
create or replace function public.cancel_account_deletion()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
```

### cancel_media_processing_job(uuid)

[supabase/migrations/20260710183000_mxshare_v15_media_push_release.sql:272](../../../supabase/migrations/20260710183000_mxshare_v15_media_push_release.sql#L272)

```sql
create or replace function public.cancel_media_processing_job(job_id uuid)
returns void
language plpgsql
security definer
set search_path = public
```

### change_project_member_role(uuid,uuid,text)

[supabase/migrations/20260723120000_mxshare_v2_projects_collaboration.sql:986](../../../supabase/migrations/20260723120000_mxshare_v2_projects_collaboration.sql#L986)

```sql
create or replace function public.change_project_member_role(
  target_project_id uuid,
  target_profile_id uuid,
  next_role text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
```

### claim_push_delivery_batch(integer)

[supabase/migrations/20260812120000_mxtrove_admin_content_removal.sql:494](../../../supabase/migrations/20260812120000_mxtrove_admin_content_removal.sql#L494)

```sql
create function public.claim_push_delivery_batch(batch_size integer default 20)
returns table (
  queue_item_id uuid,
  notification_id uuid,
  recipient_id uuid,
  subscription_id uuid,
  endpoint text,
  p256dh text,
  auth text,
  notification_type text,
  notification_context jsonb,
  post_id uuid,
  project_id uuid,
  song_version_id uuid,
  comment_id uuid,
  conversation_id uuid,
  actor_display_name text,
  actor_username text,
  post_title text,
  privacy_safe_push boolean
)
language plpgsql
security definer
set search_path = public, pg_temp
```

### collaboration_member_role(uuid,uuid)

[supabase/migrations/20260723120000_mxshare_v2_projects_collaboration.sql:268](../../../supabase/migrations/20260723120000_mxshare_v2_projects_collaboration.sql#L268)

```sql
create or replace function public.collaboration_member_role(
  target_project_id uuid,
  target_profile_id uuid default auth.uid()
)
returns text
language sql
stable
security definer
set search_path = public, pg_temp
```

### collaboration_role_rank(text)

[supabase/migrations/20260723120000_mxshare_v2_projects_collaboration.sql:250](../../../supabase/migrations/20260723120000_mxshare_v2_projects_collaboration.sql#L250)

```sql
create or replace function public.collaboration_role_rank(member_role text)
returns integer
language sql
immutable
parallel safe
```

### compact_post_card_waveform(jsonb,integer)

[supabase/migrations/20260817120000_mxtrove_egress_optimized_post_cards.sql:3](../../../supabase/migrations/20260817120000_mxtrove_egress_optimized_post_cards.sql#L3)

```sql
create or replace function public.compact_post_card_waveform(
  target_waveform jsonb,
  max_buckets integer default 320
)
returns jsonb
language plpgsql
immutable
set search_path = public, pg_temp
```

### create_collaboration_project(text,text,text,text)

[supabase/migrations/20260723120000_mxshare_v2_projects_collaboration.sql:384](../../../supabase/migrations/20260723120000_mxshare_v2_projects_collaboration.sql#L384)

```sql
create or replace function public.create_collaboration_project(
  project_title text,
  project_kind text,
  project_description text default null,
  project_visibility text default 'private'
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
```

### create_comment_heart_notification()

[supabase/migrations/20260804120000_mxtrove_comment_heart_notifications.sql:32](../../../supabase/migrations/20260804120000_mxtrove_comment_heart_notifications.sql#L32)

```sql
create or replace function public.create_comment_heart_notification()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
```

### create_comment_notification()

[supabase/migrations/20260710183000_mxshare_v15_media_push_release.sql:543](../../../supabase/migrations/20260710183000_mxshare_v15_media_push_release.sql#L543)

```sql
create or replace function public.create_comment_notification()
returns trigger
language plpgsql
security definer
set search_path = public
```

### create_content_moderation_notification(uuid,text,text,text,text,text,uuid,uuid,uuid,uuid)

[supabase/migrations/20260812120000_mxtrove_admin_content_removal.sql:77](../../../supabase/migrations/20260812120000_mxtrove_admin_content_removal.sql#L77)

```sql
create or replace function public.create_content_moderation_notification(
  target_recipient_id uuid,
  target_reason text,
  target_type text,
  target_label text,
  target_location text,
  target_action text,
  target_post_id uuid default null,
  target_comment_id uuid default null,
  target_conversation_id uuid default null,
  target_action_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
```

### create_direct_conversation(uuid)

[supabase/migrations/20260723123000_mxshare_v2_privacy_blocking.sql:654](../../../supabase/migrations/20260723123000_mxshare_v2_privacy_blocking.sql#L654)

```sql
create or replace function public.create_direct_conversation(other_profile_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
```

### create_engaged_follower_release_update_notifications()

[supabase/migrations/20260807120000_mxtrove_release_updates_security_cache.sql:48](../../../supabase/migrations/20260807120000_mxtrove_release_updates_security_cache.sql#L48)

```sql
create or replace function public.create_engaged_follower_release_update_notifications()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
```

### create_feedback_thread(uuid,uuid,uuid,numeric,numeric,text,text,text,text,uuid)

[supabase/migrations/20260723121000_mxshare_v2_feedback_sharing.sql:553](../../../supabase/migrations/20260723121000_mxshare_v2_feedback_sharing.sql#L553)

```sql
create or replace function public.create_feedback_thread(
  target_project_id uuid,
  target_track_id uuid,
  target_song_version_id uuid,
  feedback_start_seconds numeric,
  feedback_end_seconds numeric,
  feedback_title text,
  feedback_body text,
  feedback_category text default 'general',
  feedback_priority text default 'normal',
  feedback_assigned_to uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
```

### create_message_reference_attachment(uuid,text,uuid)

[supabase/migrations/20260723135000_mxshare_v2_message_actions.sql:43](../../../supabase/migrations/20260723135000_mxshare_v2_message_actions.sql#L43)

```sql
create or replace function public.create_message_reference_attachment(
  target_message_id uuid,
  target_attachment_type text,
  target_id uuid
)
returns public.message_attachments
language plpgsql
security definer
set search_path = public, pg_temp
```

### create_post_heart_notification()

[supabase/migrations/20260710183000_mxshare_v15_media_push_release.sql:484](../../../supabase/migrations/20260710183000_mxshare_v15_media_push_release.sql#L484)

```sql
create or replace function public.create_post_heart_notification()
returns trigger
language plpgsql
security definer
set search_path = public
```

### create_release_post(text,text,text,text,uuid,text,jsonb)

[supabase/migrations/20260723143000_mxshare_v2_release_create_rpc.sql:1](../../../supabase/migrations/20260723143000_mxshare_v2_release_create_rpc.sql#L1)

```sql
create or replace function public.create_release_post(
  next_post_type text,
  next_title text,
  next_description text default null,
  next_release_url text default null,
  next_artwork_asset_id uuid default null,
  next_visibility text default 'public',
  next_tracks jsonb default '[]'::jsonb
)
returns public.posts
language plpgsql
security definer
set search_path = public, pg_temp
```

### create_share_link(text,uuid,text,timestamptz,integer)

[supabase/migrations/20260723121000_mxshare_v2_feedback_sharing.sql:800](../../../supabase/migrations/20260723121000_mxshare_v2_feedback_sharing.sql#L800)

```sql
create or replace function public.create_share_link(
  target_kind text,
  target_entity_id uuid,
  target_permission text default 'view',
  target_expires_at timestamptz default null,
  target_max_uses integer default null
)
returns table (share_link_id uuid, share_token text)
language plpgsql
security definer
set search_path = public, pg_temp
```

### create_shared_feedback_thread(text,uuid,uuid,numeric,numeric,text,text,text,text)

[supabase/migrations/20260723133000_mxshare_v2_project_review_links.sql:119](../../../supabase/migrations/20260723133000_mxshare_v2_project_review_links.sql#L119)

```sql
create or replace function public.create_shared_feedback_thread(
  supplied_token text,
  target_track_id uuid,
  target_song_version_id uuid,
  feedback_start_seconds numeric,
  feedback_end_seconds numeric,
  feedback_title text,
  feedback_body text,
  feedback_category text default 'general',
  feedback_priority text default 'normal'
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
```

### create_single_post(uuid,uuid,text,text,uuid,text)

[supabase/migrations/20260725120000_mxshare_reliability_fixes.sql:3](../../../supabase/migrations/20260725120000_mxshare_reliability_fixes.sql#L3)

```sql
create or replace function public.create_single_post(
  target_song_id uuid,
  target_version_id uuid,
  target_title text,
  target_description text default null,
  target_artwork_asset_id uuid default null,
  target_visibility text default 'public'
)
returns public.posts
language plpgsql
security definer
set search_path = public, pg_temp
```

### create_version_heart_notification()

[supabase/migrations/20260710183000_mxshare_v15_media_push_release.sql:513](../../../supabase/migrations/20260710183000_mxshare_v15_media_push_release.sql#L513)

```sql
create or replace function public.create_version_heart_notification()
returns trigger
language plpgsql
security definer
set search_path = public
```

### decline_project_invite_by_id(uuid)

[supabase/migrations/20260723120000_mxshare_v2_projects_collaboration.sql:900](../../../supabase/migrations/20260723120000_mxshare_v2_projects_collaboration.sql#L900)

```sql
create or replace function public.decline_project_invite_by_id(target_invite_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
```

### decline_project_invite(text)

[supabase/migrations/20260723120000_mxshare_v2_projects_collaboration.sql:787](../../../supabase/migrations/20260723120000_mxshare_v2_projects_collaboration.sql#L787)

```sql
create or replace function public.decline_project_invite(invite_token text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
```

### delete_message_attachment(uuid)

[supabase/migrations/20260723122000_mxshare_v2_attachments_protected_media.sql:260](../../../supabase/migrations/20260723122000_mxshare_v2_attachments_protected_media.sql#L260)

```sql
create or replace function public.delete_message_attachment(target_attachment_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
```

### delete_own_message(uuid)

[supabase/migrations/20260723135000_mxshare_v2_message_actions.sql:155](../../../supabase/migrations/20260723135000_mxshare_v2_message_actions.sql#L155)

```sql
create or replace function public.delete_own_message(target_message_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
```

### ensure_notification_preferences()

[supabase/migrations/20260710183000_mxshare_v15_media_push_release.sql:157](../../../supabase/migrations/20260710183000_mxshare_v15_media_push_release.sql#L157)

```sql
create or replace function public.ensure_notification_preferences()
returns trigger
language plpgsql
security definer
set search_path = public
```

### ensure_post_slug()

[supabase/migrations/20260723125000_mxshare_v2_release_pages_moderation.sql:159](../../../supabase/migrations/20260723125000_mxshare_v2_release_pages_moderation.sql#L159)

```sql
create or replace function public.ensure_post_slug()
returns trigger
language plpgsql
set search_path = public, pg_temp
```

### ensure_profile_appearance_settings()

[supabase/migrations/20260723124000_mxshare_v2_appearance_cloud_providers.sql:73](../../../supabase/migrations/20260723124000_mxshare_v2_appearance_cloud_providers.sql#L73)

```sql
create or replace function public.ensure_profile_appearance_settings()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
```

### ensure_profile_v2_settings()

[supabase/migrations/20260723123000_mxshare_v2_privacy_blocking.sql:96](../../../supabase/migrations/20260723123000_mxshare_v2_privacy_blocking.sql#L96)

```sql
create or replace function public.ensure_profile_v2_settings()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
```

### ensure_protected_media_quota()

[supabase/migrations/20260723121000_mxshare_v2_feedback_sharing.sql:203](../../../supabase/migrations/20260723121000_mxshare_v2_feedback_sharing.sql#L203)

```sql
create or replace function public.ensure_protected_media_quota()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
```

### ensure_public_single_playback_version(uuid)

[supabase/migrations/20260804140000_mxtrove_public_single_playback_sync.sql:3](../../../supabase/migrations/20260804140000_mxtrove_public_single_playback_sync.sql#L3)

```sql
create or replace function public.ensure_public_single_playback_version(target_post_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
```

### finalize_media_processing_job(uuid,uuid)

[supabase/migrations/20260710183000_mxshare_v15_media_push_release.sql:293](../../../supabase/migrations/20260710183000_mxshare_v15_media_push_release.sql#L293)

```sql
create or replace function public.finalize_media_processing_job(
  job_id uuid,
  preview_asset_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
```

### finalize_protected_media_asset(uuid,bigint,text,numeric,integer,integer,jsonb)

[supabase/migrations/20260723121000_mxshare_v2_feedback_sharing.sql:370](../../../supabase/migrations/20260723121000_mxshare_v2_feedback_sharing.sql#L370)

```sql
create or replace function public.finalize_protected_media_asset(
  target_asset_id uuid,
  actual_bytes bigint,
  target_checksum text default null,
  target_duration_seconds numeric default null,
  target_width integer default null,
  target_height integer default null,
  target_waveform_data jsonb default null
)
returns public.protected_media_assets
language plpgsql
security definer
set search_path = public, pg_temp
```

### follow_profile(uuid)

[supabase/migrations/20260723123000_mxshare_v2_privacy_blocking.sql:612](../../../supabase/migrations/20260723123000_mxshare_v2_privacy_blocking.sql#L612)

```sql
create or replace function public.follow_profile(target_profile_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
```

### follows_profile(uuid,uuid)

[supabase/migrations/20260723123000_mxshare_v2_privacy_blocking.sql:168](../../../supabase/migrations/20260723123000_mxshare_v2_privacy_blocking.sql#L168)

```sql
create or replace function public.follows_profile(
  follower_profile_id uuid,
  followed_profile_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
```

### get_admin_dashboard_v1(integer)

[supabase/migrations/20260811120000_mxtrove_admin_public_dashboard.sql:3](../../../supabase/migrations/20260811120000_mxtrove_admin_public_dashboard.sql#L3)

```sql
create or replace function public.get_admin_dashboard_v1(activity_days integer default 14)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
```

### get_admin_report_target_profile_id(uuid)

[supabase/migrations/20260812130000_mxtrove_prevent_admin_self_moderation.sql:4](../../../supabase/migrations/20260812130000_mxtrove_prevent_admin_self_moderation.sql#L4)

```sql
create or replace function public.get_admin_report_target_profile_id(target_report_id uuid)
returns uuid
language plpgsql
stable
security definer
set search_path = public, pg_temp
```

### get_comment_engagement(uuid)

[supabase/migrations/20260803120000_mxtrove_comment_hearts_song_metadata.sql:89](../../../supabase/migrations/20260803120000_mxtrove_comment_hearts_song_metadata.sql#L89)

```sql
create or replace function public.get_comment_engagement(target_post_id uuid)
returns table (
  comment_id uuid,
  heart_count bigint,
  reply_count bigint,
  viewer_has_hearted boolean
)
language sql
stable
security definer
set search_path = public, pg_temp
```

### get_current_profile_v2()

[supabase/migrations/20260723134000_mxshare_v2_profile_privacy_enforcement.sql:48](../../../supabase/migrations/20260723134000_mxshare_v2_profile_privacy_enforcement.sql#L48)

```sql
create or replace function public.get_current_profile_v2()
returns public.profiles
language plpgsql
stable
security definer
set search_path = public, pg_temp
```

### get_follow_state_v2(uuid)

[supabase/migrations/20260723137000_mxshare_v2_social_privacy_hardening.sql:3](../../../supabase/migrations/20260723137000_mxshare_v2_social_privacy_hardening.sql#L3)

```sql
create or replace function public.get_follow_state_v2(target_profile_id uuid)
returns table (
  viewer_follows_profile boolean,
  profile_follows_viewer boolean
)
language sql
stable
security definer
set search_path = public, pg_temp
```

### get_post_song_metadata(uuid)

[supabase/migrations/20260804130000_mxtrove_post_song_metadata.sql:3](../../../supabase/migrations/20260804130000_mxtrove_post_song_metadata.sql#L3)

```sql
create or replace function public.get_post_song_metadata(target_post_id uuid)
returns table (
  release_track_id uuid,
  song jsonb
)
language sql
stable
security definer
set search_path = public, pg_temp
```

### get_profile_by_username_v2(text)

[supabase/migrations/20260723134000_mxshare_v2_profile_privacy_enforcement.sql:80](../../../supabase/migrations/20260723134000_mxshare_v2_profile_privacy_enforcement.sql#L80)

```sql
create or replace function public.get_profile_by_username_v2(target_username text)
returns public.profiles
language plpgsql
stable
security definer
set search_path = public, pg_temp
```

### get_profile_metrics_v2(uuid)

[supabase/migrations/20260723134000_mxshare_v2_profile_privacy_enforcement.sql:265](../../../supabase/migrations/20260723134000_mxshare_v2_profile_privacy_enforcement.sql#L265)

```sql
create or replace function public.get_profile_metrics_v2(target_profile_id uuid)
returns table (
  profile_id uuid,
  followers_count integer,
  following_count integer,
  public_posts_count integer,
  single_count integer,
  ep_count integer,
  album_count integer,
  last_public_activity_at timestamptz,
  follower_counts_visible boolean,
  activity_visible boolean
)
language sql
stable
security definer
set search_path = public, pg_temp
```

### get_release_track_version_labels(uuid)

[supabase/migrations/20260727190000_mxtrove_release_track_version_labels.sql:3](../../../supabase/migrations/20260727190000_mxtrove_release_track_version_labels.sql#L3)

```sql
create or replace function public.get_release_track_version_labels(
  target_post_id uuid
)
returns table (
  track_id uuid,
  song_version_id uuid,
  version_label text
)
language sql
stable
security definer
set search_path = public, pg_temp
```

### get_resolved_post_cards(uuid[])

[supabase/migrations/20260817120000_mxtrove_egress_optimized_post_cards.sql:58](../../../supabase/migrations/20260817120000_mxtrove_egress_optimized_post_cards.sql#L58)

```sql
create or replace function public.get_resolved_post_cards(target_post_ids uuid[])
returns table (post_id uuid, card jsonb)
language sql
stable
security definer
set search_path = public, pg_temp
```

### handle_new_user()

[supabase/migrations/20260805120000_mxtrove_terms_acceptance.sql:55](../../../supabase/migrations/20260805120000_mxtrove_terms_acceptance.sql#L55)

```sql
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
```

### invite_project_member(uuid,text,uuid,text,integer)

[supabase/migrations/20260723120000_mxshare_v2_projects_collaboration.sql:486](../../../supabase/migrations/20260723120000_mxshare_v2_projects_collaboration.sql#L486)

```sql
create or replace function public.invite_project_member(
  target_project_id uuid,
  target_role text,
  target_profile_id uuid default null,
  target_email text default null,
  expires_in_days integer default 14
)
returns table (invite_id uuid, invite_token text)
language plpgsql
security definer
set search_path = public, pg_temp
```

### is_app_admin(uuid,text)

[supabase/migrations/20260723125000_mxshare_v2_release_pages_moderation.sql:206](../../../supabase/migrations/20260723125000_mxshare_v2_release_pages_moderation.sql#L206)

```sql
create or replace function public.is_app_admin(
  target_profile_id uuid default auth.uid(),
  minimum_role text default 'moderator'
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
```

### is_conversation_member(uuid,uuid)

[supabase/migrations/20260709001500_fix_message_rls_recursion.sql:3](../../../supabase/migrations/20260709001500_fix_message_rls_recursion.sql#L3)

```sql
create or replace function public.is_conversation_member(
  target_conversation_id uuid,
  target_profile_id uuid default auth.uid()
)
returns boolean
language sql
security definer
stable
set search_path = public
```

### is_profile_blocked_pair(uuid,uuid)

[supabase/migrations/20260723123000_mxshare_v2_privacy_blocking.sql:118](../../../supabase/migrations/20260723123000_mxshare_v2_privacy_blocking.sql#L118)

```sql
create or replace function public.is_profile_blocked_pair(
  first_profile_id uuid,
  second_profile_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
```

### is_profile_suspended(uuid)

[supabase/migrations/20260723128000_mxshare_v2_admin_suspensions.sql:10](../../../supabase/migrations/20260723128000_mxshare_v2_admin_suspensions.sql#L10)

```sql
create or replace function public.is_profile_suspended(target_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
```

### leave_collaboration_project(uuid)

[supabase/migrations/20260723120000_mxshare_v2_projects_collaboration.sql:1048](../../../supabase/migrations/20260723120000_mxshare_v2_projects_collaboration.sql#L1048)

```sql
create or replace function public.leave_collaboration_project(target_project_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
```

### list_blocked_profiles()

[supabase/migrations/20260723123000_mxshare_v2_privacy_blocking.sql:587](../../../supabase/migrations/20260723123000_mxshare_v2_privacy_blocking.sql#L587)

```sql
create or replace function public.list_blocked_profiles()
returns table (
  profile_id uuid,
  username text,
  display_name text,
  avatar_asset_id uuid,
  blocked_at timestamptz
)
language sql
stable
security definer
set search_path = public, pg_temp
```

### list_home_feed_post_ids(integer,integer)

[supabase/migrations/20260710103000_mxshare_v15_social_graph.sql:125](../../../supabase/migrations/20260710103000_mxshare_v15_social_graph.sql#L125)

```sql
create or replace function public.list_home_feed_post_ids(
  limit_count integer default 50,
  offset_count integer default 0
)
returns table (
  post_id uuid,
  feed_created_at timestamptz
)
language sql
security definer
set search_path = public
```

### list_pending_project_invites()

[supabase/migrations/20260723120000_mxshare_v2_projects_collaboration.sql:635](../../../supabase/migrations/20260723120000_mxshare_v2_projects_collaboration.sql#L635)

```sql
create or replace function public.list_pending_project_invites()
returns table (
  invite_id uuid,
  project_id uuid,
  project_title text,
  project_type text,
  role text,
  invited_by uuid,
  inviter_name text,
  expires_at timestamptz,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public, pg_temp
```

### list_profile_connections(uuid,text,text,integer,integer)

[supabase/migrations/20260728120000_mxtrove_profile_connections_fix.sql:4](../../../supabase/migrations/20260728120000_mxtrove_profile_connections_fix.sql#L4)

```sql
create or replace function public.list_profile_connections(
  target_profile_id uuid,
  relation text,
  search_query text default null,
  limit_count integer default 50,
  offset_count integer default 0
)
returns table (
  profile_id uuid,
  username text,
  display_name text,
  bio text,
  avatar_asset_id uuid,
  followers_count integer,
  following_count integer,
  public_posts_count integer,
  single_count integer,
  ep_count integer,
  album_count integer,
  follows_you boolean,
  viewer_follows_profile boolean,
  connected_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
```

### list_public_creators(text,integer,integer)

[supabase/migrations/20260723134000_mxshare_v2_profile_privacy_enforcement.sql:422](../../../supabase/migrations/20260723134000_mxshare_v2_profile_privacy_enforcement.sql#L422)

```sql
create or replace function public.list_public_creators(
  search_query text default null,
  limit_count integer default 18,
  offset_count integer default 0
)
returns table (
  profile_id uuid,
  username text,
  display_name text,
  bio text,
  avatar_asset_id uuid,
  followers_count integer,
  following_count integer,
  public_posts_count integer,
  single_count integer,
  ep_count integer,
  album_count integer,
  follows_you boolean,
  viewer_follows_profile boolean,
  last_public_activity_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
```

### list_trending_public_post_ids(integer,integer)

[supabase/migrations/20260710183000_mxshare_v15_media_push_release.sql:842](../../../supabase/migrations/20260710183000_mxshare_v15_media_push_release.sql#L842)

```sql
create or replace function public.list_trending_public_post_ids(
  limit_count integer default 40,
  offset_count integer default 0
)
returns table (
  post_id uuid,
  trending_score numeric
)
language sql
security definer
set search_path = public
```

### mark_all_notifications_read()

[supabase/migrations/20260707190000_mxshare_v1.sql:597](../../../supabase/migrations/20260707190000_mxshare_v1.sql#L597)

```sql
create or replace function public.mark_all_notifications_read()
returns void
language plpgsql
security definer
set search_path = public
```

### mark_conversation_read(uuid)

[supabase/migrations/20260710103000_mxshare_v15_social_graph.sql:331](../../../supabase/migrations/20260710103000_mxshare_v15_social_graph.sql#L331)

```sql
create or replace function public.mark_conversation_read(target_conversation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
```

### mark_notification_read(uuid)

[supabase/migrations/20260707190000_mxshare_v1.sql:583](../../../supabase/migrations/20260707190000_mxshare_v1.sql#L583)

```sql
create or replace function public.mark_notification_read(notification_id uuid)
returns void
language plpgsql
security definer
set search_path = public
```

### moderate_report_v2(uuid,text,text,boolean,integer)

[supabase/migrations/20260812120000_mxtrove_admin_content_removal.sql:286](../../../supabase/migrations/20260812120000_mxtrove_admin_content_removal.sql#L286)

```sql
create or replace function public.moderate_report_v2(
  target_report_id uuid,
  next_status text,
  internal_note text default null,
  hide_target boolean default false,
  suspension_days integer default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
```

### moderate_report(uuid,text,text,boolean)

[supabase/migrations/20260723125000_mxshare_v2_release_pages_moderation.sql:327](../../../supabase/migrations/20260723125000_mxshare_v2_release_pages_moderation.sql#L327)

```sql
create or replace function public.moderate_report(
  target_report_id uuid,
  next_status text,
  internal_note text default null,
  hide_target boolean default false
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
```

### mute_profile(uuid,boolean,boolean,boolean)

[supabase/migrations/20260723123000_mxshare_v2_privacy_blocking.sql:362](../../../supabase/migrations/20260723123000_mxshare_v2_privacy_blocking.sql#L362)

```sql
create or replace function public.mute_profile(
  target_profile_id uuid,
  should_mute_posts boolean default true,
  should_mute_notifications boolean default true,
  should_mute_messages boolean default false
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
```

### notification_type_push_enabled(public.notification_preferences,text)

[supabase/migrations/20260812120000_mxtrove_admin_content_removal.sql:452](../../../supabase/migrations/20260812120000_mxtrove_admin_content_removal.sql#L452)

```sql
create or replace function public.notification_type_push_enabled(
  preference_row public.notification_preferences,
  notification_type text
)
returns boolean
language plpgsql
immutable
```

### notify_direct_message_members()

[supabase/migrations/20260710103000_mxshare_v15_social_graph.sql:351](../../../supabase/migrations/20260710103000_mxshare_v15_social_graph.sql#L351)

```sql
create or replace function public.notify_direct_message_members()
returns trigger
language plpgsql
security definer
set search_path = public
```

### notify_message_attachment_members()

[supabase/migrations/20260723122000_mxshare_v2_attachments_protected_media.sql:144](../../../supabase/migrations/20260723122000_mxshare_v2_attachments_protected_media.sql#L144)

```sql
create or replace function public.notify_message_attachment_members()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
```

### prevent_admin_self_moderation_action()

[supabase/migrations/20260812130000_mxtrove_prevent_admin_self_moderation.sql:46](../../../supabase/migrations/20260812130000_mxtrove_prevent_admin_self_moderation.sql#L46)

```sql
create or replace function public.prevent_admin_self_moderation_action()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
```

### prevent_admin_self_report_moderation()

[supabase/migrations/20260812130000_mxtrove_prevent_admin_self_moderation.sql:79](../../../supabase/migrations/20260812130000_mxtrove_prevent_admin_self_moderation.sql#L79)

```sql
create or replace function public.prevent_admin_self_report_moderation()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
```

### protect_hidden_profile_location()

[supabase/migrations/20260723134000_mxshare_v2_profile_privacy_enforcement.sql:19](../../../supabase/migrations/20260723134000_mxshare_v2_profile_privacy_enforcement.sql#L19)

```sql
create or replace function public.protect_hidden_profile_location()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
```

### publish_single_version(uuid)

[supabase/migrations/20260707190000_mxshare_v1.sql:435](../../../supabase/migrations/20260707190000_mxshare_v1.sql#L435)

```sql
create or replace function public.publish_single_version(version_id uuid)
returns void
language plpgsql
security definer
set search_path = public
```

### queue_notification_for_push()

[supabase/migrations/20260710183000_mxshare_v15_media_push_release.sql:433](../../../supabase/migrations/20260710183000_mxshare_v15_media_push_release.sql#L433)

```sql
create or replace function public.queue_notification_for_push()
returns trigger
language plpgsql
security definer
set search_path = public
```

### reject_suspended_profile_write()

[supabase/migrations/20260723128000_mxshare_v2_admin_suspensions.sql:26](../../../supabase/migrations/20260723128000_mxshare_v2_admin_suspensions.sql#L26)

```sql
create or replace function public.reject_suspended_profile_write()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
```

### release_protected_media_asset(uuid)

[supabase/migrations/20260723121000_mxshare_v2_feedback_sharing.sql:448](../../../supabase/migrations/20260723121000_mxshare_v2_feedback_sharing.sql#L448)

```sql
create or replace function public.release_protected_media_asset(target_asset_id uuid)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
```

### remove_project_member(uuid,uuid)

[supabase/migrations/20260723120000_mxshare_v2_projects_collaboration.sql:919](../../../supabase/migrations/20260723120000_mxshare_v2_projects_collaboration.sql#L919)

```sql
create or replace function public.remove_project_member(
  target_project_id uuid,
  target_profile_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
```

### remove_public_content_for_moderation(text,uuid,text)

[supabase/migrations/20260812120000_mxtrove_admin_content_removal.sql:132](../../../supabase/migrations/20260812120000_mxtrove_admin_content_removal.sql#L132)

```sql
create or replace function public.remove_public_content_for_moderation(
  target_content_type text,
  target_content_id uuid,
  removal_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
```

### reopen_feedback_thread(uuid)

[supabase/migrations/20260723121000_mxshare_v2_feedback_sharing.sql:772](../../../supabase/migrations/20260723121000_mxshare_v2_feedback_sharing.sql#L772)

```sql
create or replace function public.reopen_feedback_thread(target_thread_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
```

### reorder_project_tracks(uuid,uuid[])

[supabase/migrations/20260723120000_mxshare_v2_projects_collaboration.sql:1251](../../../supabase/migrations/20260723120000_mxshare_v2_projects_collaboration.sql#L1251)

```sql
create or replace function public.reorder_project_tracks(
  target_project_id uuid,
  ordered_track_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
```

### replace_release_credits(uuid,jsonb)

[supabase/migrations/20260723125000_mxshare_v2_release_pages_moderation.sql:227](../../../supabase/migrations/20260723125000_mxshare_v2_release_pages_moderation.sql#L227)

```sql
create or replace function public.replace_release_credits(
  target_post_id uuid,
  next_credits jsonb
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
```

### replace_release_external_links(uuid,jsonb)

[supabase/migrations/20260723125000_mxshare_v2_release_pages_moderation.sql:272](../../../supabase/migrations/20260723125000_mxshare_v2_release_pages_moderation.sql#L272)

```sql
create or replace function public.replace_release_external_links(
  target_post_id uuid,
  next_links jsonb
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
```

### reply_to_feedback_thread(uuid,text)

[supabase/migrations/20260723121000_mxshare_v2_feedback_sharing.sql:665](../../../supabase/migrations/20260723121000_mxshare_v2_feedback_sharing.sql#L665)

```sql
create or replace function public.reply_to_feedback_thread(
  target_thread_id uuid,
  reply_body text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
```

### request_account_deletion(integer,boolean)

[supabase/migrations/20260723136000_mxshare_v2_account_reauthentication.sql:4](../../../supabase/migrations/20260723136000_mxshare_v2_account_reauthentication.sql#L4)

```sql
create or replace function public.request_account_deletion(
  grace_period_days integer default 14,
  remove_cloud_files boolean default false
)
returns timestamptz
language plpgsql
security definer
set search_path = public, pg_temp
```

### request_data_export(text)

[supabase/migrations/20260723123000_mxshare_v2_privacy_blocking.sql:557](../../../supabase/migrations/20260723123000_mxshare_v2_privacy_blocking.sql#L557)

```sql
create or replace function public.request_data_export(export_format text default 'json')
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
```

### request_media_processing_job(uuid,uuid,uuid)

[supabase/migrations/20260803120000_mxtrove_comment_hearts_song_metadata.sql:119](../../../supabase/migrations/20260803120000_mxtrove_comment_hearts_song_metadata.sql#L119)

```sql
create or replace function public.request_media_processing_job(
  source_asset_id uuid,
  linked_song_version_id uuid default null,
  linked_song_id uuid default null
)
returns public.media_processing_jobs
language plpgsql
security definer
set search_path = public, pg_temp
```

### reserve_protected_media_asset(uuid,text,text,text,bigint,uuid,uuid,uuid,uuid,timestamptz)

[supabase/migrations/20260723121000_mxshare_v2_feedback_sharing.sql:276](../../../supabase/migrations/20260723121000_mxshare_v2_feedback_sharing.sql#L276)

```sql
create or replace function public.reserve_protected_media_asset(
  target_owner_id uuid,
  target_purpose text,
  target_filename text,
  target_mime_type text,
  expected_bytes bigint,
  target_source_asset_id uuid default null,
  target_post_id uuid default null,
  target_project_id uuid default null,
  target_song_version_id uuid default null,
  target_expires_at timestamptz default null
)
returns public.protected_media_assets
language plpgsql
security definer
set search_path = public, pg_temp
```

### resolve_feedback_thread(uuid)

[supabase/migrations/20260723121000_mxshare_v2_feedback_sharing.sql:711](../../../supabase/migrations/20260723121000_mxshare_v2_feedback_sharing.sql#L711)

```sql
create or replace function public.resolve_feedback_thread(target_thread_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
```

### resolve_project_invite(text)

[supabase/migrations/20260723120000_mxshare_v2_projects_collaboration.sql:603](../../../supabase/migrations/20260723120000_mxshare_v2_projects_collaboration.sql#L603)

```sql
create or replace function public.resolve_project_invite(invite_token text)
returns table (
  invite_id uuid,
  project_id uuid,
  project_title text,
  project_type text,
  role text,
  status text,
  expires_at timestamptz
)
language sql
stable
security definer
set search_path = public, pg_temp
```

### resolve_share_link_target(text)

[supabase/migrations/20260723133000_mxshare_v2_project_review_links.sql:3](../../../supabase/migrations/20260723133000_mxshare_v2_project_review_links.sql#L3)

```sql
create or replace function public.resolve_share_link_target(supplied_token text)
returns text
language sql
stable
security definer
set search_path = public, pg_temp
```

### resolve_share_link(text,text)

[supabase/migrations/20260723121000_mxshare_v2_feedback_sharing.sql:897](../../../supabase/migrations/20260723121000_mxshare_v2_feedback_sharing.sql#L897)

```sql
create or replace function public.resolve_share_link(
  supplied_token text,
  requested_access_kind text default 'view'
)
returns table (
  share_link_id uuid,
  target_type text,
  target_id uuid,
  permission text,
  owner_id uuid,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
```

### resolve_shared_post(text)

[supabase/migrations/20260803130000_mxtrove_release_lyrics_visibility.sql:126](../../../supabase/migrations/20260803130000_mxtrove_release_lyrics_visibility.sql#L126)

```sql
create or replace function public.resolve_shared_post(
  supplied_token text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
```

### resolve_shared_project(text)

[supabase/migrations/20260723133000_mxshare_v2_project_review_links.sql:19](../../../supabase/migrations/20260723133000_mxshare_v2_project_review_links.sql#L19)

```sql
create or replace function public.resolve_shared_project(supplied_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
```

### revoke_share_link(uuid)

[supabase/migrations/20260723121000_mxshare_v2_feedback_sharing.sql:877](../../../supabase/migrations/20260723121000_mxshare_v2_feedback_sharing.sql#L877)

```sql
create or replace function public.revoke_share_link(target_share_link_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
```

### save_profile_v2(text,text,text,text,text,text,text,text,text,uuid)

[supabase/migrations/20260723134000_mxshare_v2_profile_privacy_enforcement.sql:122](../../../supabase/migrations/20260723134000_mxshare_v2_profile_privacy_enforcement.sql#L122)

```sql
create or replace function public.save_profile_v2(
  next_display_name text,
  next_username text,
  next_bio text,
  next_location text,
  next_website_url text,
  next_instagram_url text,
  next_spotify_url text,
  next_youtube_url text,
  next_support_url text,
  next_avatar_asset_id uuid
)
returns public.profiles
language plpgsql
security definer
set search_path = public, pg_temp
```

### search_public_catalog(text,integer,integer)

[supabase/migrations/20260710183000_mxshare_v15_media_push_release.sql:747](../../../supabase/migrations/20260710183000_mxshare_v15_media_push_release.sql#L747)

```sql
create or replace function public.search_public_catalog(
  raw_query text,
  limit_count integer default 24,
  offset_count integer default 0
)
returns table (
  result_kind text,
  profile_id uuid,
  post_id uuid,
  username text,
  display_name text,
  title text,
  description text,
  post_type text,
  activity_at timestamptz,
  followers_count integer
)
language plpgsql
security definer
set search_path = public
```

### search_v2_catalog(text,integer)

[supabase/migrations/20260728130000_mxtrove_fuzzy_creator_search.sql:4](../../../supabase/migrations/20260728130000_mxtrove_fuzzy_creator_search.sql#L4)

```sql
create or replace function public.search_v2_catalog(
  raw_query text,
  result_limit integer default 40
)
returns table (
  result_kind text,
  result_id uuid,
  context_id uuid,
  title text,
  subtitle text,
  rank real
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
```

### search_v2(text,integer)

[supabase/migrations/20260723125000_mxshare_v2_release_pages_moderation.sql:391](../../../supabase/migrations/20260723125000_mxshare_v2_release_pages_moderation.sql#L391)

```sql
create or replace function public.search_v2(
  raw_query text,
  result_limit integer default 20
)
returns table (
  result_kind text,
  result_id uuid,
  title text,
  subtitle text,
  rank real
)
language plpgsql
security definer
set search_path = public, pg_temp
```

### select_project_track_version(uuid,uuid,uuid)

[supabase/migrations/20260723120000_mxshare_v2_projects_collaboration.sql:1317](../../../supabase/migrations/20260723120000_mxshare_v2_projects_collaboration.sql#L1317)

```sql
create or replace function public.select_project_track_version(
  target_project_id uuid,
  target_track_id uuid,
  target_version_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
```

### set_default_cloud_provider(uuid)

[supabase/migrations/20260723124000_mxshare_v2_appearance_cloud_providers.sql:111](../../../supabase/migrations/20260723124000_mxshare_v2_appearance_cloud_providers.sql#L111)

```sql
create or replace function public.set_default_cloud_provider(target_connection_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
```

### set_feedback_reaction(uuid,text,boolean)

[supabase/migrations/20260729120000_mxtrove_feedback_reaction_exclusivity.sql:25](../../../supabase/migrations/20260729120000_mxtrove_feedback_reaction_exclusivity.sql#L25)

```sql
create or replace function public.set_feedback_reaction(
  target_thread_id uuid,
  target_reaction text,
  target_active boolean
)
returns void
language plpgsql
security invoker
set search_path = public, pg_temp
```

### set_feedback_reply_project()

[supabase/migrations/20260723130000_mxshare_v2_notifications_realtime.sql:18](../../../supabase/migrations/20260723130000_mxshare_v2_notifications_realtime.sql#L18)

```sql
create or replace function public.set_feedback_reply_project()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
```

### set_song_version_owner()

[supabase/migrations/20260723120000_mxshare_v2_projects_collaboration.sql:196](../../../supabase/migrations/20260723120000_mxshare_v2_projects_collaboration.sql#L196)

```sql
create or replace function public.set_song_version_owner()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
```

### set_updated_at()

[supabase/migrations/20260707190000_mxshare_v1.sql:3](../../../supabase/migrations/20260707190000_mxshare_v1.sql#L3)

```sql
create or replace function public.set_updated_at()
returns trigger
language plpgsql
```

### slugify_release_title(text)

[supabase/migrations/20260723125000_mxshare_v2_release_pages_moderation.sql:142](../../../supabase/migrations/20260723125000_mxshare_v2_release_pages_moderation.sql#L142)

```sql
create or replace function public.slugify_release_title(raw_title text)
returns text
language sql
immutable
parallel safe
```

### submit_app_feedback(text,text,text,text,text,jsonb)

[supabase/migrations/20260806120000_mxtrove_app_feedback.sql:30](../../../supabase/migrations/20260806120000_mxtrove_app_feedback.sql#L30)

```sql
create or replace function public.submit_app_feedback(
  feedback_kind text,
  feedback_subject text,
  feedback_details text,
  affected_page text default null,
  screenshot_url text default null,
  browser_context jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
```

### sync_public_single_playback_from_post()

[supabase/migrations/20260804140000_mxtrove_public_single_playback_sync.sql:31](../../../supabase/migrations/20260804140000_mxtrove_public_single_playback_sync.sql#L31)

```sql
create or replace function public.sync_public_single_playback_from_post()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
```

### sync_public_single_playback_from_single_link()

[supabase/migrations/20260804140000_mxtrove_public_single_playback_sync.sql:43](../../../supabase/migrations/20260804140000_mxtrove_public_single_playback_sync.sql#L43)

```sql
create or replace function public.sync_public_single_playback_from_single_link()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
```

### toggle_version_heart(uuid,boolean)

[supabase/migrations/20260725120000_mxshare_reliability_fixes.sql:84](../../../supabase/migrations/20260725120000_mxshare_reliability_fixes.sql#L84)

```sql
create or replace function public.toggle_version_heart(
  target_version_id uuid,
  should_be_active boolean
)
returns table (viewer_has_hearted boolean, changed boolean)
language plpgsql
security definer
set search_path = public, pg_temp
```

### transfer_project_ownership(uuid,uuid)

[supabase/migrations/20260723120000_mxshare_v2_projects_collaboration.sql:1098](../../../supabase/migrations/20260723120000_mxshare_v2_projects_collaboration.sql#L1098)

```sql
create or replace function public.transfer_project_ownership(
  target_project_id uuid,
  next_owner_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
```

### unblock_profile(uuid)

[supabase/migrations/20260723123000_mxshare_v2_privacy_blocking.sql:344](../../../supabase/migrations/20260723123000_mxshare_v2_privacy_blocking.sql#L344)

```sql
create or replace function public.unblock_profile(target_profile_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
```

### unfollow_profile(uuid)

[supabase/migrations/20260710103000_mxshare_v15_social_graph.sql:102](../../../supabase/migrations/20260710103000_mxshare_v15_social_graph.sql#L102)

```sql
create or replace function public.unfollow_profile(target_profile_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
```

### unmute_profile(uuid)

[supabase/migrations/20260723123000_mxshare_v2_privacy_blocking.sql:401](../../../supabase/migrations/20260723123000_mxshare_v2_privacy_blocking.sql#L401)

```sql
create or replace function public.unmute_profile(target_profile_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
```

### update_appearance_settings(text,text,text,boolean,boolean,boolean,boolean,numeric,boolean,boolean,boolean,boolean)

[supabase/migrations/20260723124000_mxshare_v2_appearance_cloud_providers.sql:142](../../../supabase/migrations/20260723124000_mxshare_v2_appearance_cloud_providers.sql#L142)

```sql
create or replace function public.update_appearance_settings(
  next_theme text,
  next_accent text,
  next_interface_density text,
  next_show_waveforms boolean,
  next_reduced_motion boolean,
  next_autoplay_next boolean,
  next_remember_volume boolean,
  next_player_volume numeric,
  next_increase_contrast boolean,
  next_reduce_transparency boolean,
  next_reduce_motion boolean,
  next_larger_ui_text boolean
)
returns public.profile_appearance_settings
language plpgsql
security definer
set search_path = public, pg_temp
```

### update_feedback_thread_status(uuid,text)

[supabase/migrations/20260723132000_mxshare_v2_review_workflow.sql:3](../../../supabase/migrations/20260723132000_mxshare_v2_review_workflow.sql#L3)

```sql
create or replace function public.update_feedback_thread_status(
  target_thread_id uuid,
  next_status text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
```

### update_privacy_settings(text,text,text,boolean,boolean,boolean,boolean)

[supabase/migrations/20260723134000_mxshare_v2_profile_privacy_enforcement.sql:184](../../../supabase/migrations/20260723134000_mxshare_v2_profile_privacy_enforcement.sql#L184)

```sql
create or replace function public.update_privacy_settings(
  next_profile_visibility text,
  next_message_permission text,
  next_project_invite_permission text,
  next_show_location boolean,
  next_show_follower_counts boolean,
  next_show_activity_status boolean,
  next_allow_profile_discovery boolean
)
returns public.profile_privacy_settings
language plpgsql
security definer
set search_path = public, pg_temp
```

### update_project_status(uuid,text)

[supabase/migrations/20260723120000_mxshare_v2_projects_collaboration.sql:1380](../../../supabase/migrations/20260723120000_mxshare_v2_projects_collaboration.sql#L1380)

```sql
create or replace function public.update_project_status(
  target_project_id uuid,
  next_status text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
```

### update_release_post(uuid,text,text,text,uuid,jsonb)

[supabase/migrations/20260803130000_mxtrove_release_lyrics_visibility.sql:9](../../../supabase/migrations/20260803130000_mxtrove_release_lyrics_visibility.sql#L9)

```sql
create or replace function public.update_release_post(
  target_post_id uuid,
  next_title text,
  next_description text,
  next_release_url text,
  next_artwork_asset_id uuid,
  next_tracks jsonb default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
```

### update_song_version_review_status(uuid,uuid,text)

[supabase/migrations/20260723132000_mxshare_v2_review_workflow.sql:56](../../../supabase/migrations/20260723132000_mxshare_v2_review_workflow.sql#L56)

```sql
create or replace function public.update_song_version_review_status(
  target_project_id uuid,
  target_version_id uuid,
  next_status text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
```

### validate_comment_depth()

[supabase/migrations/20260707190000_mxshare_v1.sql:284](../../../supabase/migrations/20260707190000_mxshare_v1.sql#L284)

```sql
create or replace function public.validate_comment_depth()
returns trigger
language plpgsql
```

### validate_message_attachment()

[supabase/migrations/20260723122000_mxshare_v2_attachments_protected_media.sql:70](../../../supabase/migrations/20260723122000_mxshare_v2_attachments_protected_media.sql#L70)

```sql
create or replace function public.validate_message_attachment()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
```

### validate_project_invite_privacy()

[supabase/migrations/20260723123000_mxshare_v2_privacy_blocking.sql:702](../../../supabase/migrations/20260723123000_mxshare_v2_privacy_blocking.sql#L702)

```sql
create or replace function public.validate_project_invite_privacy()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
```

### validate_release_track()

[supabase/migrations/20260707190000_mxshare_v1.sql:353](../../../supabase/migrations/20260707190000_mxshare_v1.sql#L353)

```sql
create or replace function public.validate_release_track()
returns trigger
language plpgsql
```

### validate_single_post()

[supabase/migrations/20260707190000_mxshare_v1.sql:331](../../../supabase/migrations/20260707190000_mxshare_v1.sql#L331)

```sql
create or replace function public.validate_single_post()
returns trigger
language plpgsql
```

### validate_song_version_assets()

[supabase/migrations/20260707190000_mxshare_v1.sql:307](../../../supabase/migrations/20260707190000_mxshare_v1.sql#L307)

```sql
create or replace function public.validate_song_version_assets()
returns trigger
language plpgsql
```

## Tables and migration history

CREATE plus ordered ALTER statements are retained verbatim rather than pretending a text scan is a deployed PostgreSQL catalog. They contain CHECK values, keys, defaults and nullable-field constraints.

### account_deletion_requests

[supabase/migrations/20260723123000_mxshare_v2_privacy_blocking.sql:46](../../../supabase/migrations/20260723123000_mxshare_v2_privacy_blocking.sql#L46)

```sql
create table public.account_deletion_requests (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  status text not null default 'scheduled',
  requested_at timestamptz not null default timezone('utc', now()),
  scheduled_for timestamptz not null,
  cancelled_at timestamptz,
  completed_at timestamptz,
  delete_cloud_files boolean not null default false,
  constraint account_deletion_requests_status_check
    check (status in ('scheduled', 'cancelled', 'processing', 'completed'))
);
```

[supabase/migrations/20260723123000_mxshare_v2_privacy_blocking.sql:758](../../../supabase/migrations/20260723123000_mxshare_v2_privacy_blocking.sql#L758)

```sql
alter table public.account_deletion_requests enable row level security;
```

### admin_moderation_actions

[supabase/migrations/20260812120000_mxtrove_admin_content_removal.sql:45](../../../supabase/migrations/20260812120000_mxtrove_admin_content_removal.sql#L45)

```sql
create table if not exists public.admin_moderation_actions (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.profiles (id) on delete restrict,
  target_type text not null,
  target_id uuid not null,
  action text not null,
  reason text not null,
  target_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  constraint admin_moderation_actions_target_type_check
    check (target_type in ('post', 'comment')),
  constraint admin_moderation_actions_action_check
    check (action in ('remove')),
  constraint admin_moderation_actions_reason_check
    check (reason in ('copyright', 'hate', 'harassment', 'sexual_content', 'illegal_content', 'spam', 'other')),
  constraint admin_moderation_actions_snapshot_object_check
    check (jsonb_typeof(target_snapshot) = 'object')
);
```

[supabase/migrations/20260812120000_mxtrove_admin_content_removal.sql:70](../../../supabase/migrations/20260812120000_mxtrove_admin_content_removal.sql#L70)

```sql
alter table public.admin_moderation_actions enable row level security;
```

### app_admin_roles

[supabase/migrations/20260723125000_mxshare_v2_release_pages_moderation.sql:77](../../../supabase/migrations/20260723125000_mxshare_v2_release_pages_moderation.sql#L77)

```sql
create table public.app_admin_roles (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  role text not null,
  granted_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (profile_id, role),
  constraint app_admin_roles_role_check
    check (role in ('moderator', 'admin'))
);
```

[supabase/migrations/20260723125000_mxshare_v2_release_pages_moderation.sql:483](../../../supabase/migrations/20260723125000_mxshare_v2_release_pages_moderation.sql#L483)

```sql
alter table public.app_admin_roles enable row level security;
```

### assets

[supabase/migrations/20260707190000_mxshare_v1.sql:49](../../../supabase/migrations/20260707190000_mxshare_v1.sql#L49)

```sql
create table if not exists public.assets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  provider text not null default 'google_drive',
  remote_file_id text not null,
  remote_parent_folder_id text,
  filename text not null,
  display_name text,
  mime_type text not null,
  file_extension text not null,
  bytes bigint,
  duration_seconds numeric(10, 2),
  checksum text,
  asset_type text not null,
  access_mode text not null default 'private',
  share_url text,
  view_url text,
  thumbnail_url text,
  waveform_peaks jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint assets_provider_check check (provider = 'google_drive'),
  constraint assets_asset_type_check check (asset_type in ('audio_original', 'audio_preview', 'cover_artwork', 'avatar')),
  constraint assets_access_mode_check check (access_mode in ('private', 'public')),
  constraint assets_owner_remote_file_key unique (owner_id, remote_file_id)
);
```

[supabase/migrations/20260707190000_mxshare_v1.sql:612](../../../supabase/migrations/20260707190000_mxshare_v1.sql#L612)

```sql
alter table public.assets enable row level security;
```

[supabase/migrations/20260710183000_mxshare_v15_media_push_release.sql:3](../../../supabase/migrations/20260710183000_mxshare_v15_media_push_release.sql#L3)

```sql
alter table public.assets
  add column if not exists derived_from_asset_id uuid references public.assets (id) on delete set null,
  add column if not exists processing_job_id uuid,
  add column if not exists preview_generation text,
  add column if not exists codec text,
  add column if not exists sample_rate_hz integer,
  add column if not exists channels integer,
  add column if not exists bit_rate_bps integer,
  add column if not exists waveform_version integer,
  add column if not exists waveform_bucket_count integer,
  add column if not exists waveform_generated_at timestamptz;
```

[supabase/migrations/20260710183000_mxshare_v15_media_push_release.sql:52](../../../supabase/migrations/20260710183000_mxshare_v15_media_push_release.sql#L52)

```sql
alter table public.assets
  add constraint assets_processing_job_id_fkey
  foreign key (processing_job_id) references public.media_processing_jobs (id) on delete set null;
```

[supabase/migrations/20260710183000_mxshare_v15_media_push_release.sql:117](../../../supabase/migrations/20260710183000_mxshare_v15_media_push_release.sql#L117)

```sql
alter table public.assets
  add constraint assets_preview_generation_check
  check (
    preview_generation is null
    or preview_generation in ('manual', 'automatic')
  );
```

[supabase/migrations/20260723124000_mxshare_v2_appearance_cloud_providers.sql:22](../../../supabase/migrations/20260723124000_mxshare_v2_appearance_cloud_providers.sql#L22)

```sql
alter table public.assets
  drop constraint if exists assets_provider_check;
```

[supabase/migrations/20260723124000_mxshare_v2_appearance_cloud_providers.sql:25](../../../supabase/migrations/20260723124000_mxshare_v2_appearance_cloud_providers.sql#L25)

```sql
alter table public.assets
  add constraint assets_provider_check
  check (provider in ('google_drive', 'dropbox', 'onedrive'));
```

### cloud_connections

[supabase/migrations/20260707190000_mxshare_v1.sql:33](../../../supabase/migrations/20260707190000_mxshare_v1.sql#L33)

```sql
create table if not exists public.cloud_connections (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  provider text not null default 'google_drive',
  provider_account_email text,
  root_folder_id text,
  audio_originals_folder_id text,
  audio_previews_folder_id text,
  artwork_folder_id text,
  avatars_folder_id text,
  connected_at timestamptz not null default timezone('utc', now()),
  last_verified_at timestamptz,
  constraint cloud_connections_provider_check check (provider = 'google_drive'),
  constraint cloud_connections_profile_provider_key unique (profile_id, provider)
);
```

[supabase/migrations/20260707190000_mxshare_v1.sql:611](../../../supabase/migrations/20260707190000_mxshare_v1.sql#L611)

```sql
alter table public.cloud_connections enable row level security;
```

[supabase/migrations/20260723124000_mxshare_v2_appearance_cloud_providers.sql:4](../../../supabase/migrations/20260723124000_mxshare_v2_appearance_cloud_providers.sql#L4)

```sql
alter table public.cloud_connections
  drop constraint if exists cloud_connections_provider_check;
```

[supabase/migrations/20260723124000_mxshare_v2_appearance_cloud_providers.sql:7](../../../supabase/migrations/20260723124000_mxshare_v2_appearance_cloud_providers.sql#L7)

```sql
alter table public.cloud_connections
  add constraint cloud_connections_provider_check
  check (provider in ('google_drive', 'dropbox', 'onedrive'));
```

[supabase/migrations/20260723124000_mxshare_v2_appearance_cloud_providers.sql:11](../../../supabase/migrations/20260723124000_mxshare_v2_appearance_cloud_providers.sql#L11)

```sql
alter table public.cloud_connections
  add column is_default boolean not null default false,
  add column connection_status text not null default 'connected',
  add column provider_account_id text,
  add column capabilities jsonb not null default '{}'::jsonb,
  add column last_error text,
  add column exports_folder_id text,
  add column updated_at timestamptz not null default timezone('utc', now()),
  add constraint cloud_connections_status_check
    check (connection_status in ('connected', 'expired', 'disconnected', 'error'));
```

### collaboration_activity

[supabase/migrations/20260723120000_mxshare_v2_projects_collaboration.sql:128](../../../supabase/migrations/20260723120000_mxshare_v2_projects_collaboration.sql#L128)

```sql
create table public.collaboration_activity (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.collaboration_projects (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete set null,
  activity_type text not null,
  entity_type text,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  constraint collaboration_activity_type_check
    check (
      activity_type in (
        'project_created',
        'member_invited',
        'member_joined',
        'member_removed',
        'member_left',
        'role_changed',
        'ownership_transferred',
        'track_added',
        'track_removed',
        'track_reordered',
        'version_uploaded',
        'version_selected',
        'feedback_added',
        'feedback_resolved',
        'status_changed',
        'project_published',
        'project_archived'
      )
    )
);
```

[supabase/migrations/20260723120000_mxshare_v2_projects_collaboration.sql:1449](../../../supabase/migrations/20260723120000_mxshare_v2_projects_collaboration.sql#L1449)

```sql
alter table public.collaboration_activity enable row level security;
```

[supabase/migrations/20260727233000_mxtrove_collaboration_activity_review_types.sql:1](../../../supabase/migrations/20260727233000_mxtrove_collaboration_activity_review_types.sql#L1)

```sql
alter table public.collaboration_activity
  drop constraint if exists collaboration_activity_type_check;
```

[supabase/migrations/20260727233000_mxtrove_collaboration_activity_review_types.sql:4](../../../supabase/migrations/20260727233000_mxtrove_collaboration_activity_review_types.sql#L4)

```sql
alter table public.collaboration_activity
  add constraint collaboration_activity_type_check
  check (
    activity_type in (
      'project_created',
      'member_invited',
      'member_joined',
      'member_removed',
      'member_left',
      'role_changed',
      'ownership_transferred',
      'track_added',
      'track_removed',
      'track_reordered',
      'version_uploaded',
      'version_selected',
      'version_review_status_changed',
      'feedback_added',
      'feedback_resolved',
      'feedback_status_changed',
      'status_changed',
      'project_published',
      'project_archived'
    )
  );
```

### collaboration_project_invites

[supabase/migrations/20260723120000_mxshare_v2_projects_collaboration.sql:78](../../../supabase/migrations/20260723120000_mxshare_v2_projects_collaboration.sql#L78)

```sql
create table public.collaboration_project_invites (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.collaboration_projects (id) on delete cascade,
  invited_by uuid not null references public.profiles (id) on delete cascade,
  invited_profile_id uuid references public.profiles (id) on delete cascade,
  invited_email text,
  invite_token_hash text not null unique,
  role text not null,
  status text not null default 'pending',
  expires_at timestamptz not null,
  created_at timestamptz not null default timezone('utc', now()),
  accepted_at timestamptz,
  revoked_at timestamptz,
  constraint collaboration_project_invites_target_check
    check (invited_profile_id is not null or nullif(btrim(invited_email), '') is not null),
  constraint collaboration_project_invites_role_check
    check (role in ('admin', 'editor', 'contributor', 'reviewer', 'viewer')),
  constraint collaboration_project_invites_status_check
    check (status in ('pending', 'accepted', 'declined', 'revoked', 'expired'))
);
```

[supabase/migrations/20260723120000_mxshare_v2_projects_collaboration.sql:1447](../../../supabase/migrations/20260723120000_mxshare_v2_projects_collaboration.sql#L1447)

```sql
alter table public.collaboration_project_invites enable row level security;
```

### collaboration_project_members

[supabase/migrations/20260723120000_mxshare_v2_projects_collaboration.sql:62](../../../supabase/migrations/20260723120000_mxshare_v2_projects_collaboration.sql#L62)

```sql
create table public.collaboration_project_members (
  project_id uuid not null references public.collaboration_projects (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  role text not null,
  membership_status text not null default 'invited',
  invited_by uuid references public.profiles (id) on delete set null,
  joined_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (project_id, profile_id),
  constraint collaboration_project_members_role_check
    check (role in ('owner', 'admin', 'editor', 'contributor', 'reviewer', 'viewer')),
  constraint collaboration_project_members_status_check
    check (membership_status in ('invited', 'accepted', 'declined', 'removed'))
);
```

[supabase/migrations/20260723120000_mxshare_v2_projects_collaboration.sql:1446](../../../supabase/migrations/20260723120000_mxshare_v2_projects_collaboration.sql#L1446)

```sql
alter table public.collaboration_project_members enable row level security;
```

### collaboration_project_tracks

[supabase/migrations/20260723120000_mxshare_v2_projects_collaboration.sql:107](../../../supabase/migrations/20260723120000_mxshare_v2_projects_collaboration.sql#L107)

```sql
create table public.collaboration_project_tracks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.collaboration_projects (id) on delete cascade,
  song_id uuid not null references public.songs (id) on delete restrict,
  active_version_id uuid references public.song_versions (id) on delete set null,
  track_title text not null,
  track_number integer not null,
  notes text,
  status text not null default 'idea',
  created_by uuid not null references public.profiles (id) on delete restrict,
  assigned_to uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint collaboration_project_tracks_number_key unique (project_id, track_number),
  constraint collaboration_project_tracks_number_check check (track_number > 0),
  constraint collaboration_project_tracks_title_check
    check (char_length(btrim(track_title)) between 1 and 160),
  constraint collaboration_project_tracks_status_check
    check (status in ('idea', 'draft', 'recording', 'arrangement', 'mixing', 'review', 'approved', 'final'))
);
```

[supabase/migrations/20260723120000_mxshare_v2_projects_collaboration.sql:1448](../../../supabase/migrations/20260723120000_mxshare_v2_projects_collaboration.sql#L1448)

```sql
alter table public.collaboration_project_tracks enable row level security;
```

[supabase/migrations/20260808120000_mxtrove_song_delete_project_cascade.sql:4](../../../supabase/migrations/20260808120000_mxtrove_song_delete_project_cascade.sql#L4)

```sql
alter table public.collaboration_project_tracks
  drop constraint if exists collaboration_project_tracks_song_id_fkey;
```

[supabase/migrations/20260808120000_mxtrove_song_delete_project_cascade.sql:7](../../../supabase/migrations/20260808120000_mxtrove_song_delete_project_cascade.sql#L7)

```sql
alter table public.collaboration_project_tracks
  add constraint collaboration_project_tracks_song_id_fkey
  foreign key (song_id)
  references public.songs (id)
  on delete cascade;
```

[supabase/migrations/20260808130000_mxtrove_fix_normal_song_deletion.sql:16](../../../supabase/migrations/20260808130000_mxtrove_fix_normal_song_deletion.sql#L16)

```sql
alter table public.collaboration_project_tracks
  drop constraint if exists collaboration_project_tracks_song_id_fkey;
```

[supabase/migrations/20260808130000_mxtrove_fix_normal_song_deletion.sql:19](../../../supabase/migrations/20260808130000_mxtrove_fix_normal_song_deletion.sql#L19)

```sql
alter table public.collaboration_project_tracks
  add constraint collaboration_project_tracks_song_id_fkey
  foreign key (song_id)
  references public.songs (id)
  on delete restrict;
```

### collaboration_projects

[supabase/migrations/20260723120000_mxshare_v2_projects_collaboration.sql:39](../../../supabase/migrations/20260723120000_mxshare_v2_projects_collaboration.sql#L39)

```sql
create table public.collaboration_projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete restrict,
  project_type text not null,
  title text not null,
  description text,
  artwork_asset_id uuid references public.assets (id) on delete set null,
  visibility text not null default 'private',
  status text not null default 'planning',
  linked_post_id uuid references public.posts (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  archived_at timestamptz,
  constraint collaboration_projects_type_check
    check (project_type in ('single', 'ep', 'album', 'loose_collection')),
  constraint collaboration_projects_visibility_check
    check (visibility in ('private', 'members_only', 'link_invite')),
  constraint collaboration_projects_status_check
    check (status in ('planning', 'active', 'review', 'finalizing', 'completed', 'archived')),
  constraint collaboration_projects_title_length_check
    check (char_length(btrim(title)) between 1 and 160)
);
```

[supabase/migrations/20260723120000_mxshare_v2_projects_collaboration.sql:1445](../../../supabase/migrations/20260723120000_mxshare_v2_projects_collaboration.sql#L1445)

```sql
alter table public.collaboration_projects enable row level security;
```

### comment_hearts

[supabase/migrations/20260803120000_mxtrove_comment_hearts_song_metadata.sql:40](../../../supabase/migrations/20260803120000_mxtrove_comment_hearts_song_metadata.sql#L40)

```sql
create table if not exists public.comment_hearts (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  comment_id uuid not null references public.comments (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (profile_id, comment_id)
);
```

[supabase/migrations/20260803120000_mxtrove_comment_hearts_song_metadata.sql:54](../../../supabase/migrations/20260803120000_mxtrove_comment_hearts_song_metadata.sql#L54)

```sql
alter table public.comment_hearts enable row level security;
```

### comments

[supabase/migrations/20260707190000_mxshare_v1.sql:163](../../../supabase/migrations/20260707190000_mxshare_v1.sql#L163)

```sql
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  parent_comment_id uuid references public.comments (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz
);
```

[supabase/migrations/20260707190000_mxshare_v1.sql:621](../../../supabase/migrations/20260707190000_mxshare_v1.sql#L621)

```sql
alter table public.comments enable row level security;
```

### conversation_members

[supabase/migrations/20260707190000_mxshare_v1.sql:182](../../../supabase/migrations/20260707190000_mxshare_v1.sql#L182)

```sql
create table if not exists public.conversation_members (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default timezone('utc', now()),
  last_read_at timestamptz,
  primary key (conversation_id, profile_id)
);
```

[supabase/migrations/20260707190000_mxshare_v1.sql:623](../../../supabase/migrations/20260707190000_mxshare_v1.sql#L623)

```sql
alter table public.conversation_members enable row level security;
```

### conversations

[supabase/migrations/20260707190000_mxshare_v1.sql:174](../../../supabase/migrations/20260707190000_mxshare_v1.sql#L174)

```sql
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'direct',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint conversations_kind_check check (kind = 'direct')
);
```

[supabase/migrations/20260707190000_mxshare_v1.sql:622](../../../supabase/migrations/20260707190000_mxshare_v1.sql#L622)

```sql
alter table public.conversations enable row level security;
```

[supabase/migrations/20260723120000_mxshare_v2_projects_collaboration.sql:4](../../../supabase/migrations/20260723120000_mxshare_v2_projects_collaboration.sql#L4)

```sql
alter table public.conversations
  drop constraint if exists conversations_kind_check;
```

[supabase/migrations/20260723120000_mxshare_v2_projects_collaboration.sql:7](../../../supabase/migrations/20260723120000_mxshare_v2_projects_collaboration.sql#L7)

```sql
alter table public.conversations
  add constraint conversations_kind_check
  check (kind in ('direct', 'project'));
```

[supabase/migrations/20260723120000_mxshare_v2_projects_collaboration.sql:161](../../../supabase/migrations/20260723120000_mxshare_v2_projects_collaboration.sql#L161)

```sql
alter table public.conversations
  add column project_id uuid references public.collaboration_projects (id) on delete cascade,
  add column history_visible_from timestamptz;
```

[supabase/migrations/20260723120000_mxshare_v2_projects_collaboration.sql:169](../../../supabase/migrations/20260723120000_mxshare_v2_projects_collaboration.sql#L169)

```sql
alter table public.conversations
  add constraint conversations_project_shape_check
  check (
    (kind = 'direct' and project_id is null)
    or (kind = 'project' and project_id is not null)
  );
```

### data_export_requests

[supabase/migrations/20260723123000_mxshare_v2_privacy_blocking.sql:58](../../../supabase/migrations/20260723123000_mxshare_v2_privacy_blocking.sql#L58)

```sql
create table public.data_export_requests (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'queued',
  format text not null default 'json',
  protected_asset_id uuid references public.protected_media_assets (id) on delete set null,
  requested_at timestamptz not null default timezone('utc', now()),
  started_at timestamptz,
  completed_at timestamptz,
  expires_at timestamptz,
  error_message text,
  constraint data_export_requests_status_check
    check (status in ('queued', 'processing', 'ready', 'failed', 'expired')),
  constraint data_export_requests_format_check
    check (format in ('json', 'json_csv'))
);
```

[supabase/migrations/20260723123000_mxshare_v2_privacy_blocking.sql:759](../../../supabase/migrations/20260723123000_mxshare_v2_privacy_blocking.sql#L759)

```sql
alter table public.data_export_requests enable row level security;
```

### feed_events

[supabase/migrations/20260707190000_mxshare_v1.sql:230](../../../supabase/migrations/20260707190000_mxshare_v1.sql#L230)

```sql
create table if not exists public.feed_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.profiles (id) on delete cascade,
  post_id uuid not null references public.posts (id) on delete cascade,
  song_version_id uuid references public.song_versions (id) on delete set null,
  event_type text not null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint feed_events_type_check check (event_type in ('single_release', 'single_update', 'release_publish'))
);
```

[supabase/migrations/20260707190000_mxshare_v1.sql:627](../../../supabase/migrations/20260707190000_mxshare_v1.sql#L627)

```sql
alter table public.feed_events enable row level security;
```

### feedback_reactions

[supabase/migrations/20260723121000_mxshare_v2_feedback_sharing.sql:127](../../../supabase/migrations/20260723121000_mxshare_v2_feedback_sharing.sql#L127)

```sql
create table public.feedback_reactions (
  thread_id uuid not null references public.feedback_threads (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  reaction text not null,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (thread_id, profile_id, reaction),
  constraint feedback_reactions_reaction_check
    check (reaction in ('agree', 'disagree', 'done', 'important'))
);
```

[supabase/migrations/20260723121000_mxshare_v2_feedback_sharing.sql:964](../../../supabase/migrations/20260723121000_mxshare_v2_feedback_sharing.sql#L964)

```sql
alter table public.feedback_reactions enable row level security;
```

### feedback_replies

[supabase/migrations/20260723121000_mxshare_v2_feedback_sharing.sql:115](../../../supabase/migrations/20260723121000_mxshare_v2_feedback_sharing.sql#L115)

```sql
create table public.feedback_replies (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.feedback_threads (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz,
  constraint feedback_replies_body_check
    check (char_length(btrim(body)) between 1 and 5000)
);
```

[supabase/migrations/20260723121000_mxshare_v2_feedback_sharing.sql:963](../../../supabase/migrations/20260723121000_mxshare_v2_feedback_sharing.sql#L963)

```sql
alter table public.feedback_replies enable row level security;
```

[supabase/migrations/20260723130000_mxshare_v2_notifications_realtime.sql:3](../../../supabase/migrations/20260723130000_mxshare_v2_notifications_realtime.sql#L3)

```sql
alter table public.feedback_replies
  add column project_id uuid references public.collaboration_projects (id) on delete cascade;
```

[supabase/migrations/20260723130000_mxshare_v2_notifications_realtime.sql:12](../../../supabase/migrations/20260723130000_mxshare_v2_notifications_realtime.sql#L12)

```sql
alter table public.feedback_replies
  alter column project_id set not null;
```

### feedback_threads

[supabase/migrations/20260723121000_mxshare_v2_feedback_sharing.sql:82](../../../supabase/migrations/20260723121000_mxshare_v2_feedback_sharing.sql#L82)

```sql
create table public.feedback_threads (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.collaboration_projects (id) on delete cascade,
  track_id uuid not null references public.collaboration_project_tracks (id) on delete cascade,
  song_version_id uuid not null references public.song_versions (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  start_seconds numeric(10, 3) not null,
  end_seconds numeric(10, 3),
  title text,
  body text not null,
  category text not null default 'general',
  priority text not null default 'normal',
  status text not null default 'open',
  assigned_to uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  resolved_at timestamptz,
  resolved_by uuid references public.profiles (id) on delete set null,
  constraint feedback_threads_time_check
    check (
      start_seconds >= 0
      and (end_seconds is null or end_seconds >= start_seconds)
    ),
  constraint feedback_threads_body_check
    check (char_length(btrim(body)) between 1 and 5000),
  constraint feedback_threads_category_check
    check (category in ('general', 'arrangement', 'mix', 'vocals', 'lyrics', 'sound_design', 'mastering', 'performance', 'technical')),
  constraint feedback_threads_priority_check
    check (priority in ('low', 'normal', 'high', 'blocking')),
  constraint feedback_threads_status_check
    check (status in ('open', 'in_progress', 'resolved', 'wont_fix'))
);
```

[supabase/migrations/20260723121000_mxshare_v2_feedback_sharing.sql:962](../../../supabase/migrations/20260723121000_mxshare_v2_feedback_sharing.sql#L962)

```sql
alter table public.feedback_threads enable row level security;
```

### follows

[supabase/migrations/20260707190000_mxshare_v1.sql:141](../../../supabase/migrations/20260707190000_mxshare_v1.sql#L141)

```sql
create table if not exists public.follows (
  follower_id uuid not null references public.profiles (id) on delete cascade,
  followed_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (follower_id, followed_id),
  constraint follows_no_self_follow check (follower_id <> followed_id)
);
```

[supabase/migrations/20260707190000_mxshare_v1.sql:618](../../../supabase/migrations/20260707190000_mxshare_v1.sql#L618)

```sql
alter table public.follows enable row level security;
```

### media_processing_jobs

[supabase/migrations/20260710183000_mxshare_v15_media_push_release.sql:15](../../../supabase/migrations/20260710183000_mxshare_v15_media_push_release.sql#L15)

```sql
create table if not exists public.media_processing_jobs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  source_asset_id uuid not null references public.assets (id) on delete cascade,
  song_version_id uuid references public.song_versions (id) on delete set null,
  status text not null default 'created',
  stage text not null default 'Awaiting upload',
  progress integer not null default 0,
  input_filename text,
  input_mime_type text,
  input_bytes bigint,
  input_checksum text,
  output_mime_type text,
  output_bytes bigint,
  duration_seconds numeric(12,3),
  detected_codec text,
  sample_rate_hz integer,
  channels integer,
  bit_rate_bps integer,
  waveform_data jsonb,
  error_code text,
  error_message text,
  attempt_count integer not null default 0,
  worker_instance_id text,
  cancel_requested_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  started_at timestamptz,
  ready_at timestamptz,
  completed_at timestamptz,
  expires_at timestamptz,
  updated_at timestamptz not null default timezone('utc', now()),
  constraint media_processing_jobs_status_check
    check (status in ('created', 'uploading', 'queued', 'probing', 'transcoding', 'generating_waveform', 'ready', 'uploading_to_drive', 'completed', 'failed', 'cancelled', 'expired')),
  constraint media_processing_jobs_progress_check
    check (progress >= 0 and progress <= 100)
);
```

[supabase/migrations/20260710183000_mxshare_v15_media_push_release.sql:881](../../../supabase/migrations/20260710183000_mxshare_v15_media_push_release.sql#L881)

```sql
alter table public.media_processing_jobs enable row level security;
```

[supabase/migrations/20260723122000_mxshare_v2_attachments_protected_media.sql:3](../../../supabase/migrations/20260723122000_mxshare_v2_attachments_protected_media.sql#L3)

```sql
alter table public.media_processing_jobs
  add column output_mode text not null default 'public_cloud',
  add column protected_purpose text,
  add column target_project_id uuid references public.collaboration_projects (id) on delete set null,
  add column protected_asset_id uuid references public.protected_media_assets (id) on delete set null,
  add constraint media_processing_jobs_output_mode_check
    check (output_mode in ('public_cloud', 'protected')),
  add constraint media_processing_jobs_protected_shape_check
    check (
      (output_mode = 'public_cloud' and protected_purpose is null)
      or (
        output_mode = 'protected'
        and protected_purpose in ('post_preview', 'collaboration_preview', 'message_audio')
      )
    );
```

[supabase/migrations/20260723126000_mxshare_v2_protected_post_targets.sql:3](../../../supabase/migrations/20260723126000_mxshare_v2_protected_post_targets.sql#L3)

```sql
alter table public.media_processing_jobs
  add column if not exists target_post_id uuid references public.posts (id) on delete set null;
```

[supabase/migrations/20260803120000_mxtrove_comment_hearts_song_metadata.sql:29](../../../supabase/migrations/20260803120000_mxtrove_comment_hearts_song_metadata.sql#L29)

```sql
alter table public.media_processing_jobs
  add column if not exists song_id uuid references public.songs (id) on delete set null,
  add column if not exists detected_tempo_bpm numeric(6, 2),
  add column if not exists detected_musical_key text,
  add column if not exists tempo_confidence numeric(5, 4),
  add column if not exists key_confidence numeric(5, 4);
```

[supabase/migrations/20260808130000_mxtrove_fix_normal_song_deletion.sql:4](../../../supabase/migrations/20260808130000_mxtrove_fix_normal_song_deletion.sql#L4)

```sql
alter table public.media_processing_jobs
  drop constraint if exists media_processing_jobs_protected_asset_id_fkey;
```

[supabase/migrations/20260808130000_mxtrove_fix_normal_song_deletion.sql:7](../../../supabase/migrations/20260808130000_mxtrove_fix_normal_song_deletion.sql#L7)

```sql
alter table public.media_processing_jobs
  add constraint media_processing_jobs_protected_asset_id_fkey
  foreign key (protected_asset_id)
  references public.protected_media_assets (id)
  on delete set null
  deferrable initially deferred;
```

### message_attachments

[supabase/migrations/20260723122000_mxshare_v2_attachments_protected_media.sql:19](../../../supabase/migrations/20260723122000_mxshare_v2_attachments_protected_media.sql#L19)

```sql
create table public.message_attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  attachment_type text not null,
  protected_asset_id uuid references public.protected_media_assets (id) on delete set null,
  asset_id uuid references public.assets (id) on delete set null,
  post_id uuid references public.posts (id) on delete set null,
  project_id uuid references public.collaboration_projects (id) on delete set null,
  song_version_id uuid references public.song_versions (id) on delete set null,
  filename text not null,
  mime_type text not null,
  bytes bigint not null,
  duration_seconds numeric(10, 3),
  width integer,
  height integer,
  created_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz,
  constraint message_attachments_type_check
    check (
      attachment_type in (
        'audio',
        'image',
        'document',
        'project_reference',
        'post_reference',
        'song_version_reference'
      )
    ),
  constraint message_attachments_bytes_check
    check (bytes >= 0 and bytes <= 52428800),
  constraint message_attachments_payload_check
    check (
      (attachment_type in ('audio', 'image', 'document') and protected_asset_id is not null)
      or (attachment_type = 'project_reference' and project_id is not null)
      or (attachment_type = 'post_reference' and post_id is not null)
      or (attachment_type = 'song_version_reference' and song_version_id is not null)
    )
);
```

[supabase/migrations/20260723122000_mxshare_v2_attachments_protected_media.sql:284](../../../supabase/migrations/20260723122000_mxshare_v2_attachments_protected_media.sql#L284)

```sql
alter table public.message_attachments enable row level security;
```

### messages

[supabase/migrations/20260707190000_mxshare_v1.sql:190](../../../supabase/migrations/20260707190000_mxshare_v1.sql#L190)

```sql
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default timezone('utc', now()),
  edited_at timestamptz,
  deleted_at timestamptz
);
```

[supabase/migrations/20260707190000_mxshare_v1.sql:624](../../../supabase/migrations/20260707190000_mxshare_v1.sql#L624)

```sql
alter table public.messages enable row level security;
```

### notification_preferences

[supabase/migrations/20260710183000_mxshare_v15_media_push_release.sql:72](../../../supabase/migrations/20260710183000_mxshare_v15_media_push_release.sql#L72)

```sql
create table if not exists public.notification_preferences (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  push_enabled boolean not null default false,
  follows_enabled boolean not null default true,
  post_hearts_enabled boolean not null default true,
  version_hearts_enabled boolean not null default true,
  comments_enabled boolean not null default true,
  replies_enabled boolean not null default true,
  messages_enabled boolean not null default true,
  single_updates_enabled boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);
```

[supabase/migrations/20260710183000_mxshare_v15_media_push_release.sql:883](../../../supabase/migrations/20260710183000_mxshare_v15_media_push_release.sql#L883)

```sql
alter table public.notification_preferences enable row level security;
```

[supabase/migrations/20260723125000_mxshare_v2_release_pages_moderation.sql:113](../../../supabase/migrations/20260723125000_mxshare_v2_release_pages_moderation.sql#L113)

```sql
alter table public.notification_preferences
  add column project_invites_enabled boolean not null default true,
  add column project_feedback_enabled boolean not null default true,
  add column project_activity_enabled boolean not null default true,
  add column message_attachments_enabled boolean not null default true,
  add column privacy_safe_push boolean not null default true;
```

### notifications

[supabase/migrations/20260707190000_mxshare_v1.sql:200](../../../supabase/migrations/20260707190000_mxshare_v1.sql#L200)

```sql
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete set null,
  type text not null,
  post_id uuid references public.posts (id) on delete set null,
  song_version_id uuid references public.song_versions (id) on delete set null,
  comment_id uuid references public.comments (id) on delete set null,
  conversation_id uuid references public.conversations (id) on delete set null,
  is_read boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  constraint notifications_type_check
    check (type in ('follow', 'post_heart', 'version_heart', 'comment', 'comment_reply', 'single_version', 'message'))
);
```

[supabase/migrations/20260707190000_mxshare_v1.sql:625](../../../supabase/migrations/20260707190000_mxshare_v1.sql#L625)

```sql
alter table public.notifications enable row level security;
```

[supabase/migrations/20260723120000_mxshare_v2_projects_collaboration.sql:11](../../../supabase/migrations/20260723120000_mxshare_v2_projects_collaboration.sql#L11)

```sql
alter table public.notifications
  drop constraint if exists notifications_type_check;
```

[supabase/migrations/20260723120000_mxshare_v2_projects_collaboration.sql:14](../../../supabase/migrations/20260723120000_mxshare_v2_projects_collaboration.sql#L14)

```sql
alter table public.notifications
  add constraint notifications_type_check
  check (
    type in (
      'follow',
      'post_heart',
      'version_heart',
      'comment',
      'comment_reply',
      'single_version',
      'message',
      'project_invite',
      'project_invite_accepted',
      'project_member_removed',
      'project_role_changed',
      'project_feedback',
      'project_feedback_reply',
      'project_feedback_resolved',
      'project_version_uploaded',
      'project_status_changed',
      'message_attachment',
      'share_link_review'
    )
  );
```

[supabase/migrations/20260723120000_mxshare_v2_projects_collaboration.sql:214](../../../supabase/migrations/20260723120000_mxshare_v2_projects_collaboration.sql#L214)

```sql
alter table public.notifications
  add column project_id uuid references public.collaboration_projects (id) on delete cascade;
```

[supabase/migrations/20260804120000_mxtrove_comment_heart_notifications.sql:3](../../../supabase/migrations/20260804120000_mxtrove_comment_heart_notifications.sql#L3)

```sql
alter table public.notifications
  drop constraint if exists notifications_type_check;
```

[supabase/migrations/20260804120000_mxtrove_comment_heart_notifications.sql:6](../../../supabase/migrations/20260804120000_mxtrove_comment_heart_notifications.sql#L6)

```sql
alter table public.notifications
  add constraint notifications_type_check
  check (
    type in (
      'follow',
      'post_heart',
      'version_heart',
      'comment_heart',
      'comment',
      'comment_reply',
      'single_version',
      'message',
      'project_invite',
      'project_invite_accepted',
      'project_member_removed',
      'project_role_changed',
      'project_feedback',
      'project_feedback_reply',
      'project_feedback_resolved',
      'project_version_uploaded',
      'project_status_changed',
      'message_attachment',
      'share_link_review'
    )
  );
```

[supabase/migrations/20260807120000_mxtrove_release_updates_security_cache.sql:18](../../../supabase/migrations/20260807120000_mxtrove_release_updates_security_cache.sql#L18)

```sql
alter table public.notifications
  drop constraint if exists notifications_type_check;
```

[supabase/migrations/20260807120000_mxtrove_release_updates_security_cache.sql:21](../../../supabase/migrations/20260807120000_mxtrove_release_updates_security_cache.sql#L21)

```sql
alter table public.notifications
  add constraint notifications_type_check
  check (
    type in (
      'follow',
      'post_heart',
      'version_heart',
      'comment_heart',
      'comment',
      'comment_reply',
      'single_version',
      'release_update',
      'message',
      'project_invite',
      'project_invite_accepted',
      'project_member_removed',
      'project_role_changed',
      'project_feedback',
      'project_feedback_reply',
      'project_feedback_resolved',
      'project_version_uploaded',
      'project_status_changed',
      'message_attachment',
      'share_link_review'
    )
  );
```

[supabase/migrations/20260812120000_mxtrove_admin_content_removal.sql:4](../../../supabase/migrations/20260812120000_mxtrove_admin_content_removal.sql#L4)

```sql
alter table public.notifications
  add column if not exists context jsonb not null default '{}'::jsonb;
```

[supabase/migrations/20260812120000_mxtrove_admin_content_removal.sql:7](../../../supabase/migrations/20260812120000_mxtrove_admin_content_removal.sql#L7)

```sql
alter table public.notifications
  drop constraint if exists notifications_context_object_check;
```

[supabase/migrations/20260812120000_mxtrove_admin_content_removal.sql:10](../../../supabase/migrations/20260812120000_mxtrove_admin_content_removal.sql#L10)

```sql
alter table public.notifications
  add constraint notifications_context_object_check
  check (jsonb_typeof(context) = 'object');
```

[supabase/migrations/20260812120000_mxtrove_admin_content_removal.sql:14](../../../supabase/migrations/20260812120000_mxtrove_admin_content_removal.sql#L14)

```sql
alter table public.notifications
  drop constraint if exists notifications_type_check;
```

[supabase/migrations/20260812120000_mxtrove_admin_content_removal.sql:17](../../../supabase/migrations/20260812120000_mxtrove_admin_content_removal.sql#L17)

```sql
alter table public.notifications
  add constraint notifications_type_check
  check (
    type in (
      'follow',
      'post_heart',
      'version_heart',
      'comment_heart',
      'comment',
      'comment_reply',
      'single_version',
      'release_update',
      'message',
      'project_invite',
      'project_invite_accepted',
      'project_member_removed',
      'project_role_changed',
      'project_feedback',
      'project_feedback_reply',
      'project_feedback_resolved',
      'project_version_uploaded',
      'project_status_changed',
      'message_attachment',
      'share_link_review',
      'content_moderated'
    )
  );
```

### post_credits

[supabase/migrations/20260723125000_mxshare_v2_release_pages_moderation.sql:15](../../../supabase/migrations/20260723125000_mxshare_v2_release_pages_moderation.sql#L15)

```sql
create table public.post_credits (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  profile_id uuid references public.profiles (id) on delete set null,
  display_name text not null,
  role text not null,
  position integer not null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint post_credits_position_key unique (post_id, position),
  constraint post_credits_position_check check (position > 0),
  constraint post_credits_name_check
    check (char_length(btrim(display_name)) between 1 and 120),
  constraint post_credits_role_check
    check (
      role in (
        'artist',
        'featured_artist',
        'producer',
        'composer',
        'lyricist',
        'vocalist',
        'instrumentalist',
        'mix_engineer',
        'mastering_engineer',
        'artwork',
        'other'
      )
    )
);
```

[supabase/migrations/20260723125000_mxshare_v2_release_pages_moderation.sql:480](../../../supabase/migrations/20260723125000_mxshare_v2_release_pages_moderation.sql#L480)

```sql
alter table public.post_credits enable row level security;
```

### post_drafts

[supabase/migrations/20260730120000_mxtrove_post_drafts.sql:1](../../../supabase/migrations/20260730120000_mxtrove_post_drafts.sql#L1)

```sql
create table if not exists public.post_drafts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  post_type text not null check (post_type in ('single', 'ep', 'album')),
  title text not null default '',
  current_step integer not null default 1 check (current_step between 1 and 20),
  schema_version integer not null default 1 check (schema_version > 0),
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);
```

[supabase/migrations/20260730120000_mxtrove_post_drafts.sql:21](../../../supabase/migrations/20260730120000_mxtrove_post_drafts.sql#L21)

```sql
alter table public.post_drafts enable row level security;
```

### post_external_links

[supabase/migrations/20260723125000_mxshare_v2_release_pages_moderation.sql:45](../../../supabase/migrations/20260723125000_mxshare_v2_release_pages_moderation.sql#L45)

```sql
create table public.post_external_links (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  platform text not null,
  label text not null,
  url text not null,
  position integer not null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint post_external_links_position_key unique (post_id, position),
  constraint post_external_links_position_check check (position > 0),
  constraint post_external_links_platform_check
    check (platform in ('spotify', 'apple_music', 'youtube', 'bandcamp', 'soundcloud', 'website', 'download', 'other')),
  constraint post_external_links_url_check
    check (url ~* '^https://')
);
```

[supabase/migrations/20260723125000_mxshare_v2_release_pages_moderation.sql:481](../../../supabase/migrations/20260723125000_mxshare_v2_release_pages_moderation.sql#L481)

```sql
alter table public.post_external_links enable row level security;
```

### post_hearts

[supabase/migrations/20260707190000_mxshare_v1.sql:149](../../../supabase/migrations/20260707190000_mxshare_v1.sql#L149)

```sql
create table if not exists public.post_hearts (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  post_id uuid not null references public.posts (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (profile_id, post_id)
);
```

[supabase/migrations/20260707190000_mxshare_v1.sql:619](../../../supabase/migrations/20260707190000_mxshare_v1.sql#L619)

```sql
alter table public.post_hearts enable row level security;
```

### posts

[supabase/migrations/20260707190000_mxshare_v1.sql:102](../../../supabase/migrations/20260707190000_mxshare_v1.sql#L102)

```sql
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  post_type text not null,
  title text not null,
  description text,
  visibility text not null default 'private',
  artwork_asset_id uuid references public.assets (id) on delete set null,
  release_url text,
  is_published boolean not null default false,
  published_at timestamptz,
  activity_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint posts_post_type_check check (post_type in ('single', 'ep', 'album')),
  constraint posts_visibility_check check (visibility in ('private', 'public'))
);
```

[supabase/migrations/20260707190000_mxshare_v1.sql:615](../../../supabase/migrations/20260707190000_mxshare_v1.sql#L615)

```sql
alter table public.posts enable row level security;
```

[supabase/migrations/20260723121000_mxshare_v2_feedback_sharing.sql:3](../../../supabase/migrations/20260723121000_mxshare_v2_feedback_sharing.sql#L3)

```sql
alter table public.posts
  drop constraint if exists posts_visibility_check;
```

[supabase/migrations/20260723121000_mxshare_v2_feedback_sharing.sql:6](../../../supabase/migrations/20260723121000_mxshare_v2_feedback_sharing.sql#L6)

```sql
alter table public.posts
  add constraint posts_visibility_check
  check (visibility in ('private', 'followers', 'unlisted', 'public'));
```

[supabase/migrations/20260723125000_mxshare_v2_release_pages_moderation.sql:3](../../../supabase/migrations/20260723125000_mxshare_v2_release_pages_moderation.sql#L3)

```sql
alter table public.posts
  add column slug text,
  add column release_notes text,
  add column allow_embed boolean not null default true,
  add column hidden_at timestamptz,
  add constraint posts_slug_format_check
    check (slug is null or slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$');
```

### profile_appearance_settings

[supabase/migrations/20260723124000_mxshare_v2_appearance_cloud_providers.sql:39](../../../supabase/migrations/20260723124000_mxshare_v2_appearance_cloud_providers.sql#L39)

```sql
create table public.profile_appearance_settings (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  theme text not null default 'dark',
  accent text not null default 'violet',
  interface_density text not null default 'comfortable',
  show_waveforms boolean not null default true,
  reduced_motion boolean not null default false,
  autoplay_next boolean not null default true,
  remember_volume boolean not null default true,
  player_volume numeric(4, 3) not null default 0.8,
  increase_contrast boolean not null default false,
  reduce_transparency boolean not null default false,
  reduce_motion boolean not null default false,
  larger_ui_text boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint profile_appearance_theme_check
    check (theme in ('system', 'dark', 'light')),
  constraint profile_appearance_accent_check
    check (accent in ('violet', 'rose', 'cyan', 'emerald', 'amber')),
  constraint profile_appearance_density_check
    check (interface_density in ('comfortable', 'compact')),
  constraint profile_appearance_volume_check
    check (player_volume between 0 and 1)
);
```

[supabase/migrations/20260723124000_mxshare_v2_appearance_cloud_providers.sql:218](../../../supabase/migrations/20260723124000_mxshare_v2_appearance_cloud_providers.sql#L218)

```sql
alter table public.profile_appearance_settings enable row level security;
```

### profile_blocks

[supabase/migrations/20260723123000_mxshare_v2_privacy_blocking.sql:7](../../../supabase/migrations/20260723123000_mxshare_v2_privacy_blocking.sql#L7)

```sql
create table public.profile_blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (blocker_id, blocked_id),
  constraint profile_blocks_no_self_check check (blocker_id <> blocked_id)
);
```

[supabase/migrations/20260723123000_mxshare_v2_privacy_blocking.sql:755](../../../supabase/migrations/20260723123000_mxshare_v2_privacy_blocking.sql#L755)

```sql
alter table public.profile_blocks enable row level security;
```

### profile_mutes

[supabase/migrations/20260723123000_mxshare_v2_privacy_blocking.sql:15](../../../supabase/migrations/20260723123000_mxshare_v2_privacy_blocking.sql#L15)

```sql
create table public.profile_mutes (
  muter_id uuid not null references public.profiles (id) on delete cascade,
  muted_id uuid not null references public.profiles (id) on delete cascade,
  mute_posts boolean not null default true,
  mute_notifications boolean not null default true,
  mute_messages boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (muter_id, muted_id),
  constraint profile_mutes_no_self_check check (muter_id <> muted_id)
);
```

[supabase/migrations/20260723123000_mxshare_v2_privacy_blocking.sql:756](../../../supabase/migrations/20260723123000_mxshare_v2_privacy_blocking.sql#L756)

```sql
alter table public.profile_mutes enable row level security;
```

### profile_privacy_settings

[supabase/migrations/20260723123000_mxshare_v2_privacy_blocking.sql:27](../../../supabase/migrations/20260723123000_mxshare_v2_privacy_blocking.sql#L27)

```sql
create table public.profile_privacy_settings (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  profile_visibility text not null default 'public',
  message_permission text not null default 'everyone',
  project_invite_permission text not null default 'everyone',
  show_location boolean not null default true,
  show_follower_counts boolean not null default true,
  show_activity_status boolean not null default true,
  allow_profile_discovery boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint profile_privacy_visibility_check
    check (profile_visibility in ('public', 'members_only')),
  constraint profile_privacy_message_check
    check (message_permission in ('everyone', 'people_i_follow', 'mutual_follows', 'nobody')),
  constraint profile_privacy_invite_check
    check (project_invite_permission in ('everyone', 'people_i_follow', 'mutual_follows', 'nobody'))
);
```

[supabase/migrations/20260723123000_mxshare_v2_privacy_blocking.sql:757](../../../supabase/migrations/20260723123000_mxshare_v2_privacy_blocking.sql#L757)

```sql
alter table public.profile_privacy_settings enable row level security;
```

[supabase/migrations/20260723134000_mxshare_v2_profile_privacy_enforcement.sql:3](../../../supabase/migrations/20260723134000_mxshare_v2_profile_privacy_enforcement.sql#L3)

```sql
alter table public.profile_privacy_settings
  add column private_location text;
```

### profiles

[supabase/migrations/20260707190000_mxshare_v1.sql:13](../../../supabase/migrations/20260707190000_mxshare_v1.sql#L13)

```sql
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique default ('user_' || substring(gen_random_uuid()::text from 1 for 8)),
  display_name text not null default 'New artist',
  bio text,
  location text,
  website_url text,
  instagram_url text,
  spotify_url text,
  youtube_url text,
  support_url text,
  avatar_asset_id uuid,
  pinned_post_id uuid,
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint profiles_username_format_check
    check (username ~ '^[a-z0-9_]{3,30}$')
);
```

[supabase/migrations/20260707190000_mxshare_v1.sql:240](../../../supabase/migrations/20260707190000_mxshare_v1.sql#L240)

```sql
alter table public.profiles
  add constraint profiles_avatar_asset_id_fkey foreign key (avatar_asset_id) references public.assets (id) on delete set null;
```

[supabase/migrations/20260707190000_mxshare_v1.sql:243](../../../supabase/migrations/20260707190000_mxshare_v1.sql#L243)

```sql
alter table public.profiles
  add constraint profiles_pinned_post_id_fkey foreign key (pinned_post_id) references public.posts (id) on delete set null;
```

[supabase/migrations/20260707190000_mxshare_v1.sql:610](../../../supabase/migrations/20260707190000_mxshare_v1.sql#L610)

```sql
alter table public.profiles enable row level security;
```

[supabase/migrations/20260723123000_mxshare_v2_privacy_blocking.sql:3](../../../supabase/migrations/20260723123000_mxshare_v2_privacy_blocking.sql#L3)

```sql
alter table public.profiles
  add column deactivated_at timestamptz,
  add column deletion_scheduled_at timestamptz;
```

[supabase/migrations/20260723128000_mxshare_v2_admin_suspensions.sql:3](../../../supabase/migrations/20260723128000_mxshare_v2_admin_suspensions.sql#L3)

```sql
alter table public.profiles
  add column suspended_until timestamptz;
```

### protected_media_assets

[supabase/migrations/20260723121000_mxshare_v2_feedback_sharing.sql:30](../../../supabase/migrations/20260723121000_mxshare_v2_feedback_sharing.sql#L30)

```sql
create table public.protected_media_assets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  storage_provider text not null default 'local',
  storage_key text not null unique,
  purpose text not null,
  status text not null default 'reserved',
  filename text not null,
  mime_type text not null,
  bytes bigint,
  reserved_bytes bigint not null default 0,
  checksum text,
  duration_seconds numeric(10, 3),
  width integer,
  height integer,
  waveform_data jsonb,
  source_asset_id uuid references public.assets (id) on delete set null,
  post_id uuid references public.posts (id) on delete cascade,
  project_id uuid references public.collaboration_projects (id) on delete cascade,
  song_version_id uuid references public.song_versions (id) on delete cascade,
  expires_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  ready_at timestamptz,
  deleted_at timestamptz,
  constraint protected_media_assets_provider_check
    check (storage_provider in ('local', 's3')),
  constraint protected_media_assets_purpose_check
    check (
      purpose in (
        'post_preview',
        'collaboration_preview',
        'message_audio',
        'message_image',
        'message_document',
        'social_preview',
        'data_export'
      )
    ),
  constraint protected_media_assets_status_check
    check (status in ('reserved', 'processing', 'ready', 'failed', 'deleted')),
  constraint protected_media_assets_bytes_check
    check (
      coalesce(bytes, 0) >= 0
      and reserved_bytes >= 0
    ),
  constraint protected_media_assets_storage_key_check
    check (storage_key ~ '^[a-z0-9][a-z0-9/_-]{8,220}$')
);
```

[supabase/migrations/20260723121000_mxshare_v2_feedback_sharing.sql:961](../../../supabase/migrations/20260723121000_mxshare_v2_feedback_sharing.sql#L961)

```sql
alter table public.protected_media_assets enable row level security;
```

[supabase/migrations/20260723122000_mxshare_v2_attachments_protected_media.sql:59](../../../supabase/migrations/20260723122000_mxshare_v2_attachments_protected_media.sql#L59)

```sql
alter table public.protected_media_assets
  add column message_id uuid references public.messages (id) on delete cascade;
```

### protected_media_quotas

[supabase/migrations/20260723121000_mxshare_v2_feedback_sharing.sql:10](../../../supabase/migrations/20260723121000_mxshare_v2_feedback_sharing.sql#L10)

```sql
create table public.protected_media_quotas (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  used_bytes bigint not null default 0,
  reserved_bytes bigint not null default 0,
  attachment_used_bytes bigint not null default 0,
  attachment_reserved_bytes bigint not null default 0,
  protected_limit_bytes bigint not null default 2147483648,
  attachment_limit_bytes bigint not null default 524288000,
  updated_at timestamptz not null default timezone('utc', now()),
  constraint protected_media_quotas_nonnegative_check
    check (
      used_bytes >= 0
      and reserved_bytes >= 0
      and attachment_used_bytes >= 0
      and attachment_reserved_bytes >= 0
      and protected_limit_bytes > 0
      and attachment_limit_bytes > 0
    )
);
```

[supabase/migrations/20260723121000_mxshare_v2_feedback_sharing.sql:960](../../../supabase/migrations/20260723121000_mxshare_v2_feedback_sharing.sql#L960)

```sql
alter table public.protected_media_quotas enable row level security;
```

### push_delivery_attempts

[supabase/migrations/20260710183000_mxshare_v15_media_push_release.sql:103](../../../supabase/migrations/20260710183000_mxshare_v15_media_push_release.sql#L103)

```sql
create table if not exists public.push_delivery_attempts (
  id uuid primary key default gen_random_uuid(),
  queue_item_id uuid not null references public.push_delivery_queue (id) on delete cascade,
  subscription_id uuid not null references public.push_subscriptions (id) on delete cascade,
  status_code integer,
  error_message text,
  created_at timestamptz not null default timezone('utc', now())
);
```

[supabase/migrations/20260710183000_mxshare_v15_media_push_release.sql:885](../../../supabase/migrations/20260710183000_mxshare_v15_media_push_release.sql#L885)

```sql
alter table public.push_delivery_attempts enable row level security;
```

### push_delivery_queue

[supabase/migrations/20260710183000_mxshare_v15_media_push_release.sql:86](../../../supabase/migrations/20260710183000_mxshare_v15_media_push_release.sql#L86)

```sql
create table if not exists public.push_delivery_queue (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.notifications (id) on delete cascade,
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending',
  attempt_count integer not null default 0,
  available_at timestamptz not null default timezone('utc', now()),
  locked_at timestamptz,
  locked_by text,
  last_error text,
  created_at timestamptz not null default timezone('utc', now()),
  delivered_at timestamptz,
  updated_at timestamptz not null default timezone('utc', now()),
  constraint push_delivery_queue_status_check
    check (status in ('pending', 'processing', 'delivered', 'failed', 'discarded'))
);
```

[supabase/migrations/20260710183000_mxshare_v15_media_push_release.sql:884](../../../supabase/migrations/20260710183000_mxshare_v15_media_push_release.sql#L884)

```sql
alter table public.push_delivery_queue enable row level security;
```

### push_subscriptions

[supabase/migrations/20260710183000_mxshare_v15_media_push_release.sql:56](../../../supabase/migrations/20260710183000_mxshare_v15_media_push_release.sql#L56)

```sql
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  device_label text,
  is_active boolean not null default true,
  last_success_at timestamptz,
  last_failure_at timestamptz,
  failure_count integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);
```

[supabase/migrations/20260710183000_mxshare_v15_media_push_release.sql:882](../../../supabase/migrations/20260710183000_mxshare_v15_media_push_release.sql#L882)

```sql
alter table public.push_subscriptions enable row level security;
```

### release_tracks

[supabase/migrations/20260707190000_mxshare_v1.sql:126](../../../supabase/migrations/20260707190000_mxshare_v1.sql#L126)

```sql
create table if not exists public.release_tracks (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  song_id uuid not null references public.songs (id) on delete restrict,
  song_version_id uuid references public.song_versions (id) on delete set null,
  track_title text not null,
  track_number integer not null,
  preview_asset_id uuid references public.assets (id) on delete set null,
  production_stage text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint release_tracks_post_track_key unique (post_id, track_number),
  constraint release_tracks_track_number_check check (track_number > 0)
);
```

[supabase/migrations/20260707190000_mxshare_v1.sql:617](../../../supabase/migrations/20260707190000_mxshare_v1.sql#L617)

```sql
alter table public.release_tracks enable row level security;
```

[supabase/migrations/20260803130000_mxtrove_release_lyrics_visibility.sql:6](../../../supabase/migrations/20260803130000_mxtrove_release_lyrics_visibility.sql#L6)

```sql
alter table public.release_tracks
  add column if not exists show_lyrics boolean not null default false;
```

### report_admin_notes

[supabase/migrations/20260723125000_mxshare_v2_release_pages_moderation.sql:87](../../../supabase/migrations/20260723125000_mxshare_v2_release_pages_moderation.sql#L87)

```sql
create table public.report_admin_notes (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete restrict,
  body text not null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint report_admin_notes_body_check
    check (char_length(btrim(body)) between 1 and 5000)
);
```

[supabase/migrations/20260723125000_mxshare_v2_release_pages_moderation.sql:484](../../../supabase/migrations/20260723125000_mxshare_v2_release_pages_moderation.sql#L484)

```sql
alter table public.report_admin_notes enable row level security;
```

### reports

[supabase/migrations/20260707190000_mxshare_v1.sql:215](../../../supabase/migrations/20260707190000_mxshare_v1.sql#L215)

```sql
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  target_type text not null,
  target_id uuid not null,
  reason text not null,
  details text,
  status text not null default 'open',
  created_at timestamptz not null default timezone('utc', now()),
  constraint reports_reason_check
    check (reason in ('spam', 'harassment', 'copyright', 'hate', 'sexual_content', 'illegal_content', 'other')),
  constraint reports_status_check
    check (status in ('open', 'reviewing', 'resolved', 'dismissed'))
);
```

[supabase/migrations/20260707190000_mxshare_v1.sql:626](../../../supabase/migrations/20260707190000_mxshare_v1.sql#L626)

```sql
alter table public.reports enable row level security;
```

[supabase/migrations/20260723125000_mxshare_v2_release_pages_moderation.sql:101](../../../supabase/migrations/20260723125000_mxshare_v2_release_pages_moderation.sql#L101)

```sql
alter table public.reports
  drop constraint if exists reports_status_check;
```

[supabase/migrations/20260723125000_mxshare_v2_release_pages_moderation.sql:104](../../../supabase/migrations/20260723125000_mxshare_v2_release_pages_moderation.sql#L104)

```sql
alter table public.reports
  add column reviewed_by uuid references public.profiles (id) on delete set null,
  add column reviewed_at timestamptz,
  add column target_hidden_at timestamptz,
  add constraint reports_status_check
    check (status in ('open', 'reviewing', 'action_taken', 'dismissed')),
  add constraint reports_target_type_check
    check (target_type in ('profile', 'post', 'comment', 'message', 'project_invite', 'share_link'));
```

[supabase/migrations/20260806120000_mxtrove_app_feedback.sql:3](../../../supabase/migrations/20260806120000_mxtrove_app_feedback.sql#L3)

```sql
alter table public.reports
  add column if not exists subject text,
  add column if not exists page_context text,
  add column if not exists attachment_url text,
  add column if not exists client_context jsonb not null default '{}'::jsonb;
```

[supabase/migrations/20260806120000_mxtrove_app_feedback.sql:9](../../../supabase/migrations/20260806120000_mxtrove_app_feedback.sql#L9)

```sql
alter table public.reports
  drop constraint if exists reports_target_type_check;
```

[supabase/migrations/20260806120000_mxtrove_app_feedback.sql:12](../../../supabase/migrations/20260806120000_mxtrove_app_feedback.sql#L12)

```sql
alter table public.reports
  add constraint reports_target_type_check
    check (target_type in ('profile', 'post', 'comment', 'message', 'project_invite', 'share_link', 'app_feedback')),
  add constraint reports_subject_check
    check (subject is null or char_length(btrim(subject)) between 3 and 120),
  add constraint reports_page_context_check
    check (page_context is null or char_length(btrim(page_context)) between 2 and 120),
  add constraint reports_attachment_url_check
    check (attachment_url is null or attachment_url ~* '^https://');
```

### share_link_access_logs

[supabase/migrations/20260723121000_mxshare_v2_feedback_sharing.sql:158](../../../supabase/migrations/20260723121000_mxshare_v2_feedback_sharing.sql#L158)

```sql
create table public.share_link_access_logs (
  id bigint generated always as identity primary key,
  share_link_id uuid not null references public.share_links (id) on delete cascade,
  profile_id uuid references public.profiles (id) on delete set null,
  accessed_at timestamptz not null default timezone('utc', now()),
  access_kind text not null default 'view',
  user_agent_hash text,
  constraint share_link_access_logs_kind_check
    check (access_kind in ('view', 'review', 'media'))
);
```

[supabase/migrations/20260723121000_mxshare_v2_feedback_sharing.sql:966](../../../supabase/migrations/20260723121000_mxshare_v2_feedback_sharing.sql#L966)

```sql
alter table public.share_link_access_logs enable row level security;
```

### share_links

[supabase/migrations/20260723121000_mxshare_v2_feedback_sharing.sql:137](../../../supabase/migrations/20260723121000_mxshare_v2_feedback_sharing.sql#L137)

```sql
create table public.share_links (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  target_type text not null,
  target_id uuid not null,
  token_hash text not null unique,
  permission text not null default 'view',
  expires_at timestamptz,
  max_uses integer,
  use_count integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  revoked_at timestamptz,
  constraint share_links_target_type_check
    check (target_type in ('post', 'collaboration_project', 'song_version')),
  constraint share_links_permission_check
    check (permission in ('view', 'review')),
  constraint share_links_usage_check
    check (use_count >= 0 and (max_uses is null or max_uses > 0))
);
```

[supabase/migrations/20260723121000_mxshare_v2_feedback_sharing.sql:965](../../../supabase/migrations/20260723121000_mxshare_v2_feedback_sharing.sql#L965)

```sql
alter table public.share_links enable row level security;
```

### single_posts

[supabase/migrations/20260707190000_mxshare_v1.sql:120](../../../supabase/migrations/20260707190000_mxshare_v1.sql#L120)

```sql
create table if not exists public.single_posts (
  post_id uuid primary key references public.posts (id) on delete cascade,
  song_id uuid not null references public.songs (id) on delete cascade,
  featured_version_id uuid not null references public.song_versions (id) on delete restrict
);
```

[supabase/migrations/20260707190000_mxshare_v1.sql:616](../../../supabase/migrations/20260707190000_mxshare_v1.sql#L616)

```sql
alter table public.single_posts enable row level security;
```

[supabase/migrations/20260803130000_mxtrove_release_lyrics_visibility.sql:3](../../../supabase/migrations/20260803130000_mxtrove_release_lyrics_visibility.sql#L3)

```sql
alter table public.single_posts
  add column if not exists show_lyrics boolean not null default false;
```

### social_preview_cache

[supabase/migrations/20260723125000_mxshare_v2_release_pages_moderation.sql:61](../../../supabase/migrations/20260723125000_mxshare_v2_release_pages_moderation.sql#L61)

```sql
create table public.social_preview_cache (
  id uuid primary key default gen_random_uuid(),
  target_type text not null,
  target_id uuid not null,
  cache_key text not null unique,
  storage_key text not null unique,
  mime_type text not null default 'image/png',
  bytes bigint not null,
  content_hash text not null,
  generated_at timestamptz not null default timezone('utc', now()),
  expires_at timestamptz not null,
  constraint social_preview_cache_target_check
    check (target_type in ('post', 'profile')),
  constraint social_preview_cache_bytes_check check (bytes > 0)
);
```

[supabase/migrations/20260723125000_mxshare_v2_release_pages_moderation.sql:482](../../../supabase/migrations/20260723125000_mxshare_v2_release_pages_moderation.sql#L482)

```sql
alter table public.social_preview_cache enable row level security;
```

### song_versions

[supabase/migrations/20260707190000_mxshare_v1.sql:86](../../../supabase/migrations/20260707190000_mxshare_v1.sql#L86)

```sql
create table if not exists public.song_versions (
  id uuid primary key default gen_random_uuid(),
  song_id uuid not null references public.songs (id) on delete cascade,
  source_asset_id uuid not null references public.assets (id) on delete restrict,
  preview_asset_id uuid references public.assets (id) on delete set null,
  version_number integer not null,
  version_label text not null,
  production_stage text not null,
  changelog text,
  is_published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint song_versions_song_version_key unique (song_id, version_number)
);
```

[supabase/migrations/20260707190000_mxshare_v1.sql:614](../../../supabase/migrations/20260707190000_mxshare_v1.sql#L614)

```sql
alter table public.song_versions enable row level security;
```

[supabase/migrations/20260723120000_mxshare_v2_projects_collaboration.sql:176](../../../supabase/migrations/20260723120000_mxshare_v2_projects_collaboration.sql#L176)

```sql
alter table public.song_versions
  add column owner_id uuid references public.profiles (id) on delete restrict,
  add column collaboration_project_id uuid references public.collaboration_projects (id) on delete set null,
  add column collaboration_track_id uuid references public.collaboration_project_tracks (id) on delete set null,
  add column sharing_mode text not null default 'private',
  add column review_status text not null default 'not_requested';
```

[supabase/migrations/20260723120000_mxshare_v2_projects_collaboration.sql:189](../../../supabase/migrations/20260723120000_mxshare_v2_projects_collaboration.sql#L189)

```sql
alter table public.song_versions
  alter column owner_id set not null,
  add constraint song_versions_sharing_mode_check
    check (sharing_mode in ('private', 'project_members', 'followers', 'public')),
  add constraint song_versions_review_status_check
    check (review_status in ('not_requested', 'review_requested', 'changes_requested', 'approved'));
```

[supabase/migrations/20260723121000_mxshare_v2_feedback_sharing.sql:79](../../../supabase/migrations/20260723121000_mxshare_v2_feedback_sharing.sql#L79)

```sql
alter table public.song_versions
  add column protected_preview_asset_id uuid references public.protected_media_assets (id) on delete set null;
```

### songs

[supabase/migrations/20260707190000_mxshare_v1.sql:76](../../../supabase/migrations/20260707190000_mxshare_v1.sql#L76)

```sql
create table if not exists public.songs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  notes text,
  default_artwork_asset_id uuid references public.assets (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);
```

[supabase/migrations/20260707190000_mxshare_v1.sql:613](../../../supabase/migrations/20260707190000_mxshare_v1.sql#L613)

```sql
alter table public.songs enable row level security;
```

[supabase/migrations/20260803120000_mxtrove_comment_hearts_song_metadata.sql:4](../../../supabase/migrations/20260803120000_mxtrove_comment_hearts_song_metadata.sql#L4)

```sql
alter table public.songs
  add column if not exists lyrics text,
  add column if not exists musical_key text,
  add column if not exists tempo_bpm numeric(6, 2),
  add column if not exists tempo_confidence numeric(5, 4),
  add column if not exists key_confidence numeric(5, 4),
  add column if not exists audio_analysis_updated_at timestamptz;
```

[supabase/migrations/20260803120000_mxtrove_comment_hearts_song_metadata.sql:12](../../../supabase/migrations/20260803120000_mxtrove_comment_hearts_song_metadata.sql#L12)

```sql
alter table public.songs
  drop constraint if exists songs_lyrics_length_check,
  add constraint songs_lyrics_length_check
    check (lyrics is null or char_length(lyrics) <= 50000),
  drop constraint if exists songs_musical_key_length_check,
  add constraint songs_musical_key_length_check
    check (musical_key is null or char_length(musical_key) <= 32),
  drop constraint if exists songs_tempo_bpm_check,
  add constraint songs_tempo_bpm_check
    check (tempo_bpm is null or tempo_bpm between 20 and 400),
  drop constraint if exists songs_tempo_confidence_check,
  add constraint songs_tempo_confidence_check
    check (tempo_confidence is null or tempo_confidence between 0 and 1),
  drop constraint if exists songs_key_confidence_check,
  add constraint songs_key_confidence_check
    check (key_confidence is null or key_confidence between 0 and 1);
```

### terms_acceptances

[supabase/migrations/20260805120000_mxtrove_terms_acceptance.sql:3](../../../supabase/migrations/20260805120000_mxtrove_terms_acceptance.sql#L3)

```sql
create table if not exists public.terms_acceptances (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  terms_version text not null,
  accepted_at timestamptz not null default timezone('utc', now()),
  constraint terms_acceptances_version_length_check
    check (char_length(btrim(terms_version)) between 1 and 40)
);
```

[supabase/migrations/20260805120000_mxtrove_terms_acceptance.sql:11](../../../supabase/migrations/20260805120000_mxtrove_terms_acceptance.sql#L11)

```sql
alter table public.terms_acceptances enable row level security;
```

### version_hearts

[supabase/migrations/20260707190000_mxshare_v1.sql:156](../../../supabase/migrations/20260707190000_mxshare_v1.sql#L156)

```sql
create table if not exists public.version_hearts (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  song_version_id uuid not null references public.song_versions (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (profile_id, song_version_id)
);
```

[supabase/migrations/20260707190000_mxshare_v1.sql:620](../../../supabase/migrations/20260707190000_mxshare_v1.sql#L620)

```sql
alter table public.version_hearts enable row level security;
```

## Effective named RLS policy definitions

Replays explicit CREATE/DROP POLICY statements in migration filename order. Dynamic SQL remains in sqlSecurityStatements; test against a migrated local database.

### account_deletion_requests / "account deletion owner select"

[supabase/migrations/20260723123000_mxshare_v2_privacy_blocking.sql:773](../../../supabase/migrations/20260723123000_mxshare_v2_privacy_blocking.sql#L773)

```sql
create policy "account deletion owner select"
on public.account_deletion_requests for select
using (profile_id = auth.uid());
```

### admin_moderation_actions / "moderation actions admins select"

[supabase/migrations/20260812120000_mxtrove_admin_content_removal.sql:73](../../../supabase/migrations/20260812120000_mxtrove_admin_content_removal.sql#L73)

```sql
create policy "moderation actions admins select"
on public.admin_moderation_actions for select
using (public.is_app_admin(auth.uid(), 'moderator'));
```

### app_admin_roles / "admin roles self visible"

[supabase/migrations/20260723125000_mxshare_v2_release_pages_moderation.sql:498](../../../supabase/migrations/20260723125000_mxshare_v2_release_pages_moderation.sql#L498)

```sql
create policy "admin roles self visible"
on public.app_admin_roles for select
using (profile_id = auth.uid() or public.is_app_admin(auth.uid(), 'admin'));
```

### assets / "assets delete own"

[supabase/migrations/20260707190000_mxshare_v1.sql:676](../../../supabase/migrations/20260707190000_mxshare_v1.sql#L676)

```sql
create policy "assets delete own"
on public.assets for delete
using (owner_id = auth.uid());
```

### assets / "assets insert own"

[supabase/migrations/20260707190000_mxshare_v1.sql:667](../../../supabase/migrations/20260707190000_mxshare_v1.sql#L667)

```sql
create policy "assets insert own"
on public.assets for insert
with check (owner_id = auth.uid());
```

### assets / "assets read owner or public"

[supabase/migrations/20260707190000_mxshare_v1.sql:663](../../../supabase/migrations/20260707190000_mxshare_v1.sql#L663)

```sql
create policy "assets read owner or public"
on public.assets for select
using (owner_id = auth.uid() or access_mode = 'public');
```

### assets / "assets update own"

[supabase/migrations/20260707190000_mxshare_v1.sql:671](../../../supabase/migrations/20260707190000_mxshare_v1.sql#L671)

```sql
create policy "assets update own"
on public.assets for update
using (owner_id = auth.uid())
with check (owner_id = auth.uid());
```

### cloud_connections / "cloud connections delete own"

[supabase/migrations/20260707190000_mxshare_v1.sql:659](../../../supabase/migrations/20260707190000_mxshare_v1.sql#L659)

```sql
create policy "cloud connections delete own"
on public.cloud_connections for delete
using (profile_id = auth.uid());
```

### cloud_connections / "cloud connections insert own"

[supabase/migrations/20260707190000_mxshare_v1.sql:650](../../../supabase/migrations/20260707190000_mxshare_v1.sql#L650)

```sql
create policy "cloud connections insert own"
on public.cloud_connections for insert
with check (profile_id = auth.uid());
```

### cloud_connections / "cloud connections owner only"

[supabase/migrations/20260707190000_mxshare_v1.sql:646](../../../supabase/migrations/20260707190000_mxshare_v1.sql#L646)

```sql
create policy "cloud connections owner only"
on public.cloud_connections for select
using (profile_id = auth.uid());
```

### cloud_connections / "cloud connections update own"

[supabase/migrations/20260707190000_mxshare_v1.sql:654](../../../supabase/migrations/20260707190000_mxshare_v1.sql#L654)

```sql
create policy "cloud connections update own"
on public.cloud_connections for update
using (profile_id = auth.uid())
with check (profile_id = auth.uid());
```

### collaboration_activity / "collaboration activity visible to members"

[supabase/migrations/20260723120000_mxshare_v2_projects_collaboration.sql:1495](../../../supabase/migrations/20260723120000_mxshare_v2_projects_collaboration.sql#L1495)

```sql
create policy "collaboration activity visible to members"
on public.collaboration_activity for select
using (public.can_view_collaboration_project(project_id, auth.uid()));
```

### collaboration_project_invites / "collaboration invites visible to managers or invitee"

[supabase/migrations/20260723120000_mxshare_v2_projects_collaboration.sql:1468](../../../supabase/migrations/20260723120000_mxshare_v2_projects_collaboration.sql#L1468)

```sql
create policy "collaboration invites visible to managers or invitee"
on public.collaboration_project_invites for select
using (
  public.can_manage_collaboration_members(project_id, auth.uid())
  or invited_profile_id = auth.uid()
);
```

### collaboration_project_members / "collaboration members visible to project members"

[supabase/migrations/20260723120000_mxshare_v2_projects_collaboration.sql:1464](../../../supabase/migrations/20260723120000_mxshare_v2_projects_collaboration.sql#L1464)

```sql
create policy "collaboration members visible to project members"
on public.collaboration_project_members for select
using (public.can_view_collaboration_project(project_id, auth.uid()));
```

### collaboration_project_tracks / "collaboration tracks delete by editors"

[supabase/migrations/20260723120000_mxshare_v2_projects_collaboration.sql:1491](../../../supabase/migrations/20260723120000_mxshare_v2_projects_collaboration.sql#L1491)

```sql
create policy "collaboration tracks delete by editors"
on public.collaboration_project_tracks for delete
using (public.can_edit_collaboration_project(project_id, auth.uid()));
```

### collaboration_project_tracks / "collaboration tracks insert by editors"

[supabase/migrations/20260723120000_mxshare_v2_projects_collaboration.sql:1479](../../../supabase/migrations/20260723120000_mxshare_v2_projects_collaboration.sql#L1479)

```sql
create policy "collaboration tracks insert by editors"
on public.collaboration_project_tracks for insert
with check (
  public.can_edit_collaboration_project(project_id, auth.uid())
  and created_by = auth.uid()
);
```

### collaboration_project_tracks / "collaboration tracks update by editors"

[supabase/migrations/20260723120000_mxshare_v2_projects_collaboration.sql:1486](../../../supabase/migrations/20260723120000_mxshare_v2_projects_collaboration.sql#L1486)

```sql
create policy "collaboration tracks update by editors"
on public.collaboration_project_tracks for update
using (public.can_edit_collaboration_project(project_id, auth.uid()))
with check (public.can_edit_collaboration_project(project_id, auth.uid()));
```

### collaboration_project_tracks / "collaboration tracks visible to members"

[supabase/migrations/20260723120000_mxshare_v2_projects_collaboration.sql:1475](../../../supabase/migrations/20260723120000_mxshare_v2_projects_collaboration.sql#L1475)

```sql
create policy "collaboration tracks visible to members"
on public.collaboration_project_tracks for select
using (public.can_view_collaboration_project(project_id, auth.uid()));
```

### collaboration_projects / "collaboration projects deletable by owner"

[supabase/migrations/20260723120000_mxshare_v2_projects_collaboration.sql:1460](../../../supabase/migrations/20260723120000_mxshare_v2_projects_collaboration.sql#L1460)

```sql
create policy "collaboration projects deletable by owner"
on public.collaboration_projects for delete
using (owner_id = auth.uid());
```

### collaboration_projects / "collaboration projects editable by editors"

[supabase/migrations/20260723120000_mxshare_v2_projects_collaboration.sql:1455](../../../supabase/migrations/20260723120000_mxshare_v2_projects_collaboration.sql#L1455)

```sql
create policy "collaboration projects editable by editors"
on public.collaboration_projects for update
using (public.can_edit_collaboration_project(id, auth.uid()))
with check (public.can_edit_collaboration_project(id, auth.uid()));
```

### collaboration_projects / "collaboration projects visible to accepted members"

[supabase/migrations/20260723120000_mxshare_v2_projects_collaboration.sql:1451](../../../supabase/migrations/20260723120000_mxshare_v2_projects_collaboration.sql#L1451)

```sql
create policy "collaboration projects visible to accepted members"
on public.collaboration_projects for select
using (public.can_view_collaboration_project(id, auth.uid()));
```

### comment_hearts / "comment hearts delete own"

[supabase/migrations/20260803120000_mxtrove_comment_hearts_song_metadata.sql:85](../../../supabase/migrations/20260803120000_mxtrove_comment_hearts_song_metadata.sql#L85)

```sql
create policy "comment hearts delete own"
on public.comment_hearts for delete
using (profile_id = auth.uid());
```

### comment_hearts / "comment hearts insert own on visible comments"

[supabase/migrations/20260803120000_mxtrove_comment_hearts_song_metadata.sql:69](../../../supabase/migrations/20260803120000_mxtrove_comment_hearts_song_metadata.sql#L69)

```sql
create policy "comment hearts insert own on visible comments"
on public.comment_hearts for insert
with check (
  profile_id = auth.uid()
  and exists (
    select 1
    from public.comments as comment
    where comment.id = comment_hearts.comment_id
      and comment.deleted_at is null
      and comment.author_id <> auth.uid()
      and public.can_view_post(comment.post_id, auth.uid())
      and not public.is_profile_blocked_pair(comment.author_id, auth.uid())
  )
);
```

### comment_hearts / "comment hearts readable through comment visibility"

[supabase/migrations/20260803120000_mxtrove_comment_hearts_song_metadata.sql:57](../../../supabase/migrations/20260803120000_mxtrove_comment_hearts_song_metadata.sql#L57)

```sql
create policy "comment hearts readable through comment visibility"
on public.comment_hearts for select
using (
  exists (
    select 1
    from public.comments as comment
    where comment.id = comment_hearts.comment_id
      and public.can_view_post(comment.post_id, auth.uid())
  )
);
```

### comments / "comments delete own"

[supabase/migrations/20260707190000_mxshare_v1.sql:891](../../../supabase/migrations/20260707190000_mxshare_v1.sql#L891)

```sql
create policy "comments delete own"
on public.comments for delete
using (author_id = auth.uid());
```

### comments / "comments insert on visible unblocked posts"

[supabase/migrations/20260723123000_mxshare_v2_privacy_blocking.sql:830](../../../supabase/migrations/20260723123000_mxshare_v2_privacy_blocking.sql#L830)

```sql
create policy "comments insert on visible unblocked posts"
on public.comments for insert
with check (
  author_id = auth.uid()
  and public.can_view_post(post_id, auth.uid())
  and not exists (
    select 1
    from public.posts
    where id = comments.post_id
      and public.is_profile_blocked_pair(owner_id, auth.uid())
  )
);
```

### comments / "comments readable through post visibility"

[supabase/migrations/20260723121000_mxshare_v2_feedback_sharing.sql:1085](../../../supabase/migrations/20260723121000_mxshare_v2_feedback_sharing.sql#L1085)

```sql
create policy "comments readable through post visibility"
on public.comments for select
using (public.can_view_post(post_id, auth.uid()));
```

### comments / "comments update own"

[supabase/migrations/20260707190000_mxshare_v1.sql:886](../../../supabase/migrations/20260707190000_mxshare_v1.sql#L886)

```sql
create policy "comments update own"
on public.comments for update
using (author_id = auth.uid())
with check (author_id = auth.uid());
```

### conversation_members / "conversation members readable by members"

[supabase/migrations/20260709001500_fix_message_rls_recursion.sql:30](../../../supabase/migrations/20260709001500_fix_message_rls_recursion.sql#L30)

```sql
create policy "conversation members readable by members"
on public.conversation_members for select
using (public.is_conversation_member(conversation_members.conversation_id));
```

### conversation_members / "conversation members update own read state"

[supabase/migrations/20260710103000_mxshare_v15_social_graph.sql:378](../../../supabase/migrations/20260710103000_mxshare_v15_social_graph.sql#L378)

```sql
create policy "conversation members update own read state"
on public.conversation_members for update
using (profile_id = auth.uid())
with check (profile_id = auth.uid());
```

### conversations / "conversations member only"

[supabase/migrations/20260709001500_fix_message_rls_recursion.sql:25](../../../supabase/migrations/20260709001500_fix_message_rls_recursion.sql#L25)

```sql
create policy "conversations member only"
on public.conversations for select
using (public.is_conversation_member(conversations.id));
```

### data_export_requests / "data exports owner select"

[supabase/migrations/20260723123000_mxshare_v2_privacy_blocking.sql:777](../../../supabase/migrations/20260723123000_mxshare_v2_privacy_blocking.sql#L777)

```sql
create policy "data exports owner select"
on public.data_export_requests for select
using (profile_id = auth.uid());
```

### feed_events / "feed events read visible posts"

[supabase/migrations/20260723121000_mxshare_v2_feedback_sharing.sql:1098](../../../supabase/migrations/20260723121000_mxshare_v2_feedback_sharing.sql#L1098)

```sql
create policy "feed events read visible posts"
on public.feed_events for select
using (public.can_view_post(post_id, auth.uid()));
```

### feedback_reactions / "feedback reactions delete own"

[supabase/migrations/20260723121000_mxshare_v2_feedback_sharing.sql:1050](../../../supabase/migrations/20260723121000_mxshare_v2_feedback_sharing.sql#L1050)

```sql
create policy "feedback reactions delete own"
on public.feedback_reactions for delete
using (profile_id = auth.uid());
```

### feedback_reactions / "feedback reactions insert own"

[supabase/migrations/20260723121000_mxshare_v2_feedback_sharing.sql:1038](../../../supabase/migrations/20260723121000_mxshare_v2_feedback_sharing.sql#L1038)

```sql
create policy "feedback reactions insert own"
on public.feedback_reactions for insert
with check (
  profile_id = auth.uid()
  and exists (
    select 1
    from public.feedback_threads as thread
    where thread.id = feedback_reactions.thread_id
      and public.can_review_project(thread.project_id, auth.uid())
  )
);
```

### feedback_reactions / "feedback reactions visible with thread"

[supabase/migrations/20260723121000_mxshare_v2_feedback_sharing.sql:1027](../../../supabase/migrations/20260723121000_mxshare_v2_feedback_sharing.sql#L1027)

```sql
create policy "feedback reactions visible with thread"
on public.feedback_reactions for select
using (
  exists (
    select 1
    from public.feedback_threads as thread
    where thread.id = feedback_reactions.thread_id
      and public.can_review_project(thread.project_id, auth.uid())
  )
);
```

### feedback_replies / "feedback replies insert by reviewers"

[supabase/migrations/20260723121000_mxshare_v2_feedback_sharing.sql:1010](../../../supabase/migrations/20260723121000_mxshare_v2_feedback_sharing.sql#L1010)

```sql
create policy "feedback replies insert by reviewers"
on public.feedback_replies for insert
with check (
  author_id = auth.uid()
  and exists (
    select 1
    from public.feedback_threads as thread
    where thread.id = feedback_replies.thread_id
      and public.can_review_project(thread.project_id, auth.uid())
  )
);
```

### feedback_replies / "feedback replies update own"

[supabase/migrations/20260723121000_mxshare_v2_feedback_sharing.sql:1022](../../../supabase/migrations/20260723121000_mxshare_v2_feedback_sharing.sql#L1022)

```sql
create policy "feedback replies update own"
on public.feedback_replies for update
using (author_id = auth.uid())
with check (author_id = auth.uid());
```

### feedback_replies / "feedback replies visible with thread"

[supabase/migrations/20260723121000_mxshare_v2_feedback_sharing.sql:999](../../../supabase/migrations/20260723121000_mxshare_v2_feedback_sharing.sql#L999)

```sql
create policy "feedback replies visible with thread"
on public.feedback_replies for select
using (
  exists (
    select 1
    from public.feedback_threads as thread
    where thread.id = feedback_replies.thread_id
      and public.can_review_project(thread.project_id, auth.uid())
  )
);
```

### feedback_threads / "feedback insert through reviewer permission"

[supabase/migrations/20260723121000_mxshare_v2_feedback_sharing.sql:984](../../../supabase/migrations/20260723121000_mxshare_v2_feedback_sharing.sql#L984)

```sql
create policy "feedback insert through reviewer permission"
on public.feedback_threads for insert
with check (
  author_id = auth.uid()
  and public.can_review_project(project_id, auth.uid())
);
```

### feedback_threads / "feedback update by author or project editor"

[supabase/migrations/20260723121000_mxshare_v2_feedback_sharing.sql:991](../../../supabase/migrations/20260723121000_mxshare_v2_feedback_sharing.sql#L991)

```sql
create policy "feedback update by author or project editor"
on public.feedback_threads for update
using (
  author_id = auth.uid()
  or public.can_edit_collaboration_project(project_id, auth.uid())
)
with check (public.can_review_project(project_id, auth.uid()));
```

### feedback_threads / "feedback visible to project reviewers"

[supabase/migrations/20260723121000_mxshare_v2_feedback_sharing.sql:980](../../../supabase/migrations/20260723121000_mxshare_v2_feedback_sharing.sql#L980)

```sql
create policy "feedback visible to project reviewers"
on public.feedback_threads for select
using (public.can_review_project(project_id, auth.uid()));
```

### follows / "follow allowed relations only"

[supabase/migrations/20260723123000_mxshare_v2_privacy_blocking.sql:795](../../../supabase/migrations/20260723123000_mxshare_v2_privacy_blocking.sql#L795)

```sql
create policy "follow allowed relations only"
on public.follows for insert
with check (
  follower_id = auth.uid()
  and follower_id <> followed_id
  and not public.is_profile_blocked_pair(follower_id, followed_id)
);
```

### follows / "follows visible to either participant"

[supabase/migrations/20260723137000_mxshare_v2_social_privacy_hardening.sql:31](../../../supabase/migrations/20260723137000_mxshare_v2_social_privacy_hardening.sql#L31)

```sql
create policy "follows visible to either participant"
on public.follows for select
using (
  follower_id = auth.uid()
  or followed_id = auth.uid()
);
```

### follows / "unfollow self-owned relations only"

[supabase/migrations/20260707190000_mxshare_v1.sql:835](../../../supabase/migrations/20260707190000_mxshare_v1.sql#L835)

```sql
create policy "unfollow self-owned relations only"
on public.follows for delete
using (follower_id = auth.uid());
```

### media_processing_jobs / "media jobs owner insert"

[supabase/migrations/20260710183000_mxshare_v15_media_push_release.sql:891](../../../supabase/migrations/20260710183000_mxshare_v15_media_push_release.sql#L891)

```sql
create policy "media jobs owner insert"
on public.media_processing_jobs for insert
with check (owner_id = auth.uid());
```

### media_processing_jobs / "media jobs owner select"

[supabase/migrations/20260710183000_mxshare_v15_media_push_release.sql:887](../../../supabase/migrations/20260710183000_mxshare_v15_media_push_release.sql#L887)

```sql
create policy "media jobs owner select"
on public.media_processing_jobs for select
using (owner_id = auth.uid());
```

### message_attachments / "message attachments conversation members select"

[supabase/migrations/20260723122000_mxshare_v2_attachments_protected_media.sql:286](../../../supabase/migrations/20260723122000_mxshare_v2_attachments_protected_media.sql#L286)

```sql
create policy "message attachments conversation members select"
on public.message_attachments for select
using (public.can_access_message_attachment(id, auth.uid()));
```

### message_attachments / "message attachments inserted by trusted functions"

[supabase/migrations/20260723135000_mxshare_v2_message_actions.sql:192](../../../supabase/migrations/20260723135000_mxshare_v2_message_actions.sql#L192)

```sql
create policy "message attachments inserted by trusted functions"
on public.message_attachments for insert
with check (false);
```

### message_attachments / "message attachments owner update"

[supabase/migrations/20260723122000_mxshare_v2_attachments_protected_media.sql:303](../../../supabase/migrations/20260723122000_mxshare_v2_attachments_protected_media.sql#L303)

```sql
create policy "message attachments owner update"
on public.message_attachments for update
using (owner_id = auth.uid())
with check (owner_id = auth.uid());
```

### messages / "messages insert through privacy"

[supabase/migrations/20260723123000_mxshare_v2_privacy_blocking.sql:787](../../../supabase/migrations/20260723123000_mxshare_v2_privacy_blocking.sql#L787)

```sql
create policy "messages insert through privacy"
on public.messages for insert
with check (
  sender_id = auth.uid()
  and public.can_send_message_to_conversation(conversation_id, auth.uid())
);
```

### messages / "messages member only"

[supabase/migrations/20260709001500_fix_message_rls_recursion.sql:35](../../../supabase/migrations/20260709001500_fix_message_rls_recursion.sql#L35)

```sql
create policy "messages member only"
on public.messages for select
using (public.is_conversation_member(messages.conversation_id));
```

### messages / "messages update own"

[supabase/migrations/20260709001500_fix_message_rls_recursion.sql:48](../../../supabase/migrations/20260709001500_fix_message_rls_recursion.sql#L48)

```sql
create policy "messages update own"
on public.messages for update
using (
  sender_id = auth.uid()
  and public.is_conversation_member(messages.conversation_id)
)
with check (
  sender_id = auth.uid()
  and public.is_conversation_member(messages.conversation_id)
);
```

### notification_preferences / "notification preferences owner insert"

[supabase/migrations/20260710183000_mxshare_v15_media_push_release.sql:916](../../../supabase/migrations/20260710183000_mxshare_v15_media_push_release.sql#L916)

```sql
create policy "notification preferences owner insert"
on public.notification_preferences for insert
with check (profile_id = auth.uid());
```

### notification_preferences / "notification preferences owner select"

[supabase/migrations/20260710183000_mxshare_v15_media_push_release.sql:912](../../../supabase/migrations/20260710183000_mxshare_v15_media_push_release.sql#L912)

```sql
create policy "notification preferences owner select"
on public.notification_preferences for select
using (profile_id = auth.uid());
```

### notification_preferences / "notification preferences owner update"

[supabase/migrations/20260710183000_mxshare_v15_media_push_release.sql:920](../../../supabase/migrations/20260710183000_mxshare_v15_media_push_release.sql#L920)

```sql
create policy "notification preferences owner update"
on public.notification_preferences for update
using (profile_id = auth.uid())
with check (profile_id = auth.uid());
```

### notifications / "notifications recipient only"

[supabase/migrations/20260707190000_mxshare_v1.sql:953](../../../supabase/migrations/20260707190000_mxshare_v1.sql#L953)

```sql
create policy "notifications recipient only"
on public.notifications for select
using (recipient_id = auth.uid());
```

### notifications / "notifications recipient update"

[supabase/migrations/20260707190000_mxshare_v1.sql:957](../../../supabase/migrations/20260707190000_mxshare_v1.sql#L957)

```sql
create policy "notifications recipient update"
on public.notifications for update
using (recipient_id = auth.uid())
with check (recipient_id = auth.uid());
```

### post_credits / "post credits visible through release"

[supabase/migrations/20260723125000_mxshare_v2_release_pages_moderation.sql:486](../../../supabase/migrations/20260723125000_mxshare_v2_release_pages_moderation.sql#L486)

```sql
create policy "post credits visible through release"
on public.post_credits for select
using (public.can_view_post(post_id, auth.uid()));
```

### post_drafts / "post drafts owner delete"

[supabase/migrations/20260730120000_mxtrove_post_drafts.sql:43](../../../supabase/migrations/20260730120000_mxtrove_post_drafts.sql#L43)

```sql
create policy "post drafts owner delete"
on public.post_drafts
for delete
using (owner_id = auth.uid());
```

### post_drafts / "post drafts owner insert"

[supabase/migrations/20260730120000_mxtrove_post_drafts.sql:30](../../../supabase/migrations/20260730120000_mxtrove_post_drafts.sql#L30)

```sql
create policy "post drafts owner insert"
on public.post_drafts
for insert
with check (owner_id = auth.uid());
```

### post_drafts / "post drafts owner select"

[supabase/migrations/20260730120000_mxtrove_post_drafts.sql:24](../../../supabase/migrations/20260730120000_mxtrove_post_drafts.sql#L24)

```sql
create policy "post drafts owner select"
on public.post_drafts
for select
using (owner_id = auth.uid());
```

### post_drafts / "post drafts owner update"

[supabase/migrations/20260730120000_mxtrove_post_drafts.sql:36](../../../supabase/migrations/20260730120000_mxtrove_post_drafts.sql#L36)

```sql
create policy "post drafts owner update"
on public.post_drafts
for update
using (owner_id = auth.uid())
with check (owner_id = auth.uid());
```

### post_external_links / "post external links visible through release"

[supabase/migrations/20260723125000_mxshare_v2_release_pages_moderation.sql:490](../../../supabase/migrations/20260723125000_mxshare_v2_release_pages_moderation.sql#L490)

```sql
create policy "post external links visible through release"
on public.post_external_links for select
using (public.can_view_post(post_id, auth.uid()));
```

### post_hearts / "post hearts readable with release access"

[supabase/migrations/20260723137000_mxshare_v2_social_privacy_hardening.sql:39](../../../supabase/migrations/20260723137000_mxshare_v2_social_privacy_hardening.sql#L39)

```sql
create policy "post hearts readable with release access"
on public.post_hearts for select
using (
  profile_id = auth.uid()
  or public.can_view_post(post_id, auth.uid())
);
```

### post_hearts / "post hearts self-delete"

[supabase/migrations/20260707190000_mxshare_v1.sql:847](../../../supabase/migrations/20260707190000_mxshare_v1.sql#L847)

```sql
create policy "post hearts self-delete"
on public.post_hearts for delete
using (profile_id = auth.uid());
```

### post_hearts / "post hearts self-owned unblocked"

[supabase/migrations/20260723123000_mxshare_v2_privacy_blocking.sql:804](../../../supabase/migrations/20260723123000_mxshare_v2_privacy_blocking.sql#L804)

```sql
create policy "post hearts self-owned unblocked"
on public.post_hearts for insert
with check (
  profile_id = auth.uid()
  and public.can_view_post(post_id, auth.uid())
  and not exists (
    select 1 from public.posts where id = post_id and owner_id = auth.uid()
  )
);
```

### posts / "posts delete own"

[supabase/migrations/20260707190000_mxshare_v1.sql:763](../../../supabase/migrations/20260707190000_mxshare_v1.sql#L763)

```sql
create policy "posts delete own"
on public.posts for delete
using (owner_id = auth.uid());
```

### posts / "posts insert own"

[supabase/migrations/20260707190000_mxshare_v1.sql:754](../../../supabase/migrations/20260707190000_mxshare_v1.sql#L754)

```sql
create policy "posts insert own"
on public.posts for insert
with check (owner_id = auth.uid());
```

### posts / "posts read through v2 visibility"

[supabase/migrations/20260723121000_mxshare_v2_feedback_sharing.sql:1070](../../../supabase/migrations/20260723121000_mxshare_v2_feedback_sharing.sql#L1070)

```sql
create policy "posts read through v2 visibility"
on public.posts for select
using (public.can_view_post(id, auth.uid()));
```

### posts / "posts update own"

[supabase/migrations/20260707190000_mxshare_v1.sql:758](../../../supabase/migrations/20260707190000_mxshare_v1.sql#L758)

```sql
create policy "posts update own"
on public.posts for update
using (owner_id = auth.uid())
with check (owner_id = auth.uid());
```

### profile_appearance_settings / "appearance settings owner select"

[supabase/migrations/20260723124000_mxshare_v2_appearance_cloud_providers.sql:220](../../../supabase/migrations/20260723124000_mxshare_v2_appearance_cloud_providers.sql#L220)

```sql
create policy "appearance settings owner select"
on public.profile_appearance_settings for select
using (profile_id = auth.uid());
```

### profile_blocks / "profile blocks owner select"

[supabase/migrations/20260723123000_mxshare_v2_privacy_blocking.sql:761](../../../supabase/migrations/20260723123000_mxshare_v2_privacy_blocking.sql#L761)

```sql
create policy "profile blocks owner select"
on public.profile_blocks for select
using (blocker_id = auth.uid());
```

### profile_mutes / "profile mutes owner select"

[supabase/migrations/20260723123000_mxshare_v2_privacy_blocking.sql:765](../../../supabase/migrations/20260723123000_mxshare_v2_privacy_blocking.sql#L765)

```sql
create policy "profile mutes owner select"
on public.profile_mutes for select
using (muter_id = auth.uid());
```

### profile_privacy_settings / "privacy settings owner select"

[supabase/migrations/20260723123000_mxshare_v2_privacy_blocking.sql:769](../../../supabase/migrations/20260723123000_mxshare_v2_privacy_blocking.sql#L769)

```sql
create policy "privacy settings owner select"
on public.profile_privacy_settings for select
using (profile_id = auth.uid());
```

### profiles / "profiles delete own row"

[supabase/migrations/20260707190000_mxshare_v1.sql:642](../../../supabase/migrations/20260707190000_mxshare_v1.sql#L642)

```sql
create policy "profiles delete own row"
on public.profiles for delete
using (id = auth.uid());
```

### profiles / "profiles insert own row"

[supabase/migrations/20260707190000_mxshare_v1.sql:633](../../../supabase/migrations/20260707190000_mxshare_v1.sql#L633)

```sql
create policy "profiles insert own row"
on public.profiles for insert
with check (id = auth.uid());
```

### profiles / "profiles readable through privacy"

[supabase/migrations/20260723123000_mxshare_v2_privacy_blocking.sql:782](../../../supabase/migrations/20260723123000_mxshare_v2_privacy_blocking.sql#L782)

```sql
create policy "profiles readable through privacy"
on public.profiles for select
using (public.can_view_profile(id, auth.uid()));
```

### profiles / "profiles update own row"

[supabase/migrations/20260707190000_mxshare_v1.sql:637](../../../supabase/migrations/20260707190000_mxshare_v1.sql#L637)

```sql
create policy "profiles update own row"
on public.profiles for update
using (id = auth.uid())
with check (id = auth.uid());
```

### protected_media_assets / "protected media owner metadata select"

[supabase/migrations/20260729130000_mxtrove_protected_message_attachment_access.sql:79](../../../supabase/migrations/20260729130000_mxtrove_protected_message_attachment_access.sql#L79)

```sql
create policy "protected media owner metadata select"
on public.protected_media_assets for select
using (
  owner_id = auth.uid()
  or (
    message_id is not null
    and public.can_access_protected_media(id, auth.uid(), null)
  )
  or (
    project_id is not null
    and public.can_view_collaboration_project(project_id, auth.uid())
  )
  or (
    post_id is not null
    and public.can_view_post(post_id, auth.uid())
  )
);
```

### protected_media_quotas / "protected quota owner select"

[supabase/migrations/20260723121000_mxshare_v2_feedback_sharing.sql:968](../../../supabase/migrations/20260723121000_mxshare_v2_feedback_sharing.sql#L968)

```sql
create policy "protected quota owner select"
on public.protected_media_quotas for select
using (profile_id = auth.uid());
```

### push_subscriptions / "push subscriptions owner delete"

[supabase/migrations/20260710183000_mxshare_v15_media_push_release.sql:908](../../../supabase/migrations/20260710183000_mxshare_v15_media_push_release.sql#L908)

```sql
create policy "push subscriptions owner delete"
on public.push_subscriptions for delete
using (profile_id = auth.uid());
```

### push_subscriptions / "push subscriptions owner insert"

[supabase/migrations/20260710183000_mxshare_v15_media_push_release.sql:899](../../../supabase/migrations/20260710183000_mxshare_v15_media_push_release.sql#L899)

```sql
create policy "push subscriptions owner insert"
on public.push_subscriptions for insert
with check (profile_id = auth.uid());
```

### push_subscriptions / "push subscriptions owner select"

[supabase/migrations/20260710183000_mxshare_v15_media_push_release.sql:895](../../../supabase/migrations/20260710183000_mxshare_v15_media_push_release.sql#L895)

```sql
create policy "push subscriptions owner select"
on public.push_subscriptions for select
using (profile_id = auth.uid());
```

### push_subscriptions / "push subscriptions owner update"

[supabase/migrations/20260710183000_mxshare_v15_media_push_release.sql:903](../../../supabase/migrations/20260710183000_mxshare_v15_media_push_release.sql#L903)

```sql
create policy "push subscriptions owner update"
on public.push_subscriptions for update
using (profile_id = auth.uid())
with check (profile_id = auth.uid());
```

### release_tracks / "release tracks modify own post"

[supabase/migrations/20260707190000_mxshare_v1.sql:808](../../../supabase/migrations/20260707190000_mxshare_v1.sql#L808)

```sql
create policy "release tracks modify own post"
on public.release_tracks for all
using (
  exists (
    select 1
    from public.posts
    where posts.id = release_tracks.post_id
      and posts.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.posts
    where posts.id = release_tracks.post_id
      and posts.owner_id = auth.uid()
  )
);
```

### release_tracks / "release tracks read through post visibility"

[supabase/migrations/20260723121000_mxshare_v2_feedback_sharing.sql:1080](../../../supabase/migrations/20260723121000_mxshare_v2_feedback_sharing.sql#L1080)

```sql
create policy "release tracks read through post visibility"
on public.release_tracks for select
using (public.can_view_post(post_id, auth.uid()));
```

### report_admin_notes / "report admin notes admins only"

[supabase/migrations/20260723125000_mxshare_v2_release_pages_moderation.sql:502](../../../supabase/migrations/20260723125000_mxshare_v2_release_pages_moderation.sql#L502)

```sql
create policy "report admin notes admins only"
on public.report_admin_notes for select
using (public.is_app_admin(auth.uid(), 'moderator'));
```

### reports / "reports admins update"

[supabase/migrations/20260723125000_mxshare_v2_release_pages_moderation.sql:514](../../../supabase/migrations/20260723125000_mxshare_v2_release_pages_moderation.sql#L514)

```sql
create policy "reports admins update"
on public.reports for update
using (public.is_app_admin(auth.uid(), 'moderator'))
with check (public.is_app_admin(auth.uid(), 'moderator'));
```

### reports / "reports reporter create"

[supabase/migrations/20260806120000_mxtrove_app_feedback.sql:23](../../../supabase/migrations/20260806120000_mxtrove_app_feedback.sql#L23)

```sql
create policy "reports reporter create"
on public.reports for insert
with check (
  reporter_id = auth.uid()
  and target_type <> 'app_feedback'
);
```

### reports / "reports reporter or admins select"

[supabase/migrations/20260723125000_mxshare_v2_release_pages_moderation.sql:507](../../../supabase/migrations/20260723125000_mxshare_v2_release_pages_moderation.sql#L507)

```sql
create policy "reports reporter or admins select"
on public.reports for select
using (
  reporter_id = auth.uid()
  or public.is_app_admin(auth.uid(), 'moderator')
);
```

### share_link_access_logs / "share link access log owner select"

[supabase/migrations/20260723121000_mxshare_v2_feedback_sharing.sql:1058](../../../supabase/migrations/20260723121000_mxshare_v2_feedback_sharing.sql#L1058)

```sql
create policy "share link access log owner select"
on public.share_link_access_logs for select
using (
  exists (
    select 1
    from public.share_links
    where share_links.id = share_link_access_logs.share_link_id
      and share_links.owner_id = auth.uid()
  )
);
```

### share_links / "share links owner select"

[supabase/migrations/20260723121000_mxshare_v2_feedback_sharing.sql:1054](../../../supabase/migrations/20260723121000_mxshare_v2_feedback_sharing.sql#L1054)

```sql
create policy "share links owner select"
on public.share_links for select
using (owner_id = auth.uid());
```

### single_posts / "single posts modify own post"

[supabase/migrations/20260707190000_mxshare_v1.sql:778](../../../supabase/migrations/20260707190000_mxshare_v1.sql#L778)

```sql
create policy "single posts modify own post"
on public.single_posts for all
using (
  exists (
    select 1
    from public.posts
    where posts.id = single_posts.post_id
      and posts.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.posts
    where posts.id = single_posts.post_id
      and posts.owner_id = auth.uid()
  )
);
```

### single_posts / "single posts read through post visibility"

[supabase/migrations/20260723121000_mxshare_v2_feedback_sharing.sql:1075](../../../supabase/migrations/20260723121000_mxshare_v2_feedback_sharing.sql#L1075)

```sql
create policy "single posts read through post visibility"
on public.single_posts for select
using (public.can_view_post(post_id, auth.uid()));
```

### social_preview_cache / "social preview cache service only"

[supabase/migrations/20260723125000_mxshare_v2_release_pages_moderation.sql:494](../../../supabase/migrations/20260723125000_mxshare_v2_release_pages_moderation.sql#L494)

```sql
create policy "social preview cache service only"
on public.social_preview_cache for select
using (false);
```

### song_versions / "song versions delete via owner"

[supabase/migrations/20260707190000_mxshare_v1.sql:739](../../../supabase/migrations/20260707190000_mxshare_v1.sql#L739)

```sql
create policy "song versions delete via owner"
on public.song_versions for delete
using (
  exists (
    select 1
    from public.songs
    where songs.id = song_versions.song_id
      and songs.owner_id = auth.uid()
  )
);
```

### song_versions / "song versions insert via owner or project contributor"

[supabase/migrations/20260723120000_mxshare_v2_projects_collaboration.sql:1526](../../../supabase/migrations/20260723120000_mxshare_v2_projects_collaboration.sql#L1526)

```sql
create policy "song versions insert via owner or project contributor"
on public.song_versions for insert
with check (
  owner_id = auth.uid()
  and (
    exists (
      select 1
      from public.songs
      where songs.id = song_versions.song_id
        and songs.owner_id = auth.uid()
    )
    or (
      collaboration_project_id is not null
      and public.can_upload_project_version(collaboration_project_id, auth.uid())
    )
  )
);
```

### song_versions / "song versions owner project member or published"

[supabase/migrations/20260723120000_mxshare_v2_projects_collaboration.sql:1513](../../../supabase/migrations/20260723120000_mxshare_v2_projects_collaboration.sql#L1513)

```sql
create policy "song versions owner project member or published"
on public.song_versions for select
using (
  owner_id = auth.uid()
  or is_published = true
  or (
    collaboration_project_id is not null
    and sharing_mode = 'project_members'
    and public.can_view_collaboration_project(collaboration_project_id, auth.uid())
  )
);
```

### song_versions / "song versions update via owner or project editor"

[supabase/migrations/20260723120000_mxshare_v2_projects_collaboration.sql:1545](../../../supabase/migrations/20260723120000_mxshare_v2_projects_collaboration.sql#L1545)

```sql
create policy "song versions update via owner or project editor"
on public.song_versions for update
using (
  owner_id = auth.uid()
  or (
    collaboration_project_id is not null
    and public.can_edit_collaboration_project(collaboration_project_id, auth.uid())
  )
)
with check (
  owner_id = auth.uid()
  or (
    collaboration_project_id is not null
    and public.can_edit_collaboration_project(collaboration_project_id, auth.uid())
  )
);
```

### songs / "songs delete own"

[supabase/migrations/20260707190000_mxshare_v1.sql:693](../../../supabase/migrations/20260707190000_mxshare_v1.sql#L693)

```sql
create policy "songs delete own"
on public.songs for delete
using (owner_id = auth.uid());
```

### songs / "songs insert own"

[supabase/migrations/20260707190000_mxshare_v1.sql:684](../../../supabase/migrations/20260707190000_mxshare_v1.sql#L684)

```sql
create policy "songs insert own"
on public.songs for insert
with check (owner_id = auth.uid());
```

### songs / "songs owner or collaboration member"

[supabase/migrations/20260723120000_mxshare_v2_projects_collaboration.sql:1500](../../../supabase/migrations/20260723120000_mxshare_v2_projects_collaboration.sql#L1500)

```sql
create policy "songs owner or collaboration member"
on public.songs for select
using (
  owner_id = auth.uid()
  or exists (
    select 1
    from public.collaboration_project_tracks as track
    where track.song_id = songs.id
      and public.can_view_collaboration_project(track.project_id, auth.uid())
  )
);
```

### songs / "songs update own"

[supabase/migrations/20260707190000_mxshare_v1.sql:688](../../../supabase/migrations/20260707190000_mxshare_v1.sql#L688)

```sql
create policy "songs update own"
on public.songs for update
using (owner_id = auth.uid())
with check (owner_id = auth.uid());
```

### terms_acceptances / "terms acceptance readable by account owner"

[supabase/migrations/20260805120000_mxtrove_terms_acceptance.sql:18](../../../supabase/migrations/20260805120000_mxtrove_terms_acceptance.sql#L18)

```sql
create policy "terms acceptance readable by account owner"
  on public.terms_acceptances
  for select
  using (profile_id = auth.uid());
```

### version_hearts / "version hearts readable with version access"

[supabase/migrations/20260723137000_mxshare_v2_social_privacy_hardening.sql:47](../../../supabase/migrations/20260723137000_mxshare_v2_social_privacy_hardening.sql#L47)

```sql
create policy "version hearts readable with version access"
on public.version_hearts for select
using (
  profile_id = auth.uid()
  or public.can_profile_view_song_version(song_version_id, auth.uid())
);
```

### version_hearts / "version hearts self-delete"

[supabase/migrations/20260707190000_mxshare_v1.sql:859](../../../supabase/migrations/20260707190000_mxshare_v1.sql#L859)

```sql
create policy "version hearts self-delete"
on public.version_hearts for delete
using (profile_id = auth.uid());
```

### version_hearts / "version hearts self-owned unblocked"

[supabase/migrations/20260723123000_mxshare_v2_privacy_blocking.sql:815](../../../supabase/migrations/20260723123000_mxshare_v2_privacy_blocking.sql#L815)

```sql
create policy "version hearts self-owned unblocked"
on public.version_hearts for insert
with check (
  profile_id = auth.uid()
  and exists (
    select 1
    from public.song_versions as version
    join public.songs as song on song.id = version.song_id
    where version.id = song_version_id
      and song.owner_id <> auth.uid()
      and not public.is_profile_blocked_pair(song.owner_id, auth.uid())
  )
);
```

## Views

### post_public_metrics

[supabase/migrations/20260807120000_mxtrove_release_updates_security_cache.sql:3](../../../supabase/migrations/20260807120000_mxtrove_release_updates_security_cache.sql#L3)

```sql
create or replace view public.post_public_metrics
with (security_invoker = true)
as
select
  posts.id as post_id,
  count(distinct post_hearts.profile_id) as heart_count,
  count(distinct comments.id) filter (where comments.deleted_at is null) as comment_count,
  count(distinct version_hearts.profile_id) as featured_version_heart_count
from public.posts
left join public.post_hearts on post_hearts.post_id = posts.id
left join public.comments on comments.post_id = posts.id
left join public.single_posts on single_posts.post_id = posts.id
left join public.version_hearts on version_hearts.song_version_id = single_posts.featured_version_id
group by posts.id;
```

### profile_public_metrics

[supabase/migrations/20260710103000_mxshare_v15_social_graph.sql:13](../../../supabase/migrations/20260710103000_mxshare_v15_social_graph.sql#L13)

```sql
create or replace view public.profile_public_metrics
with (security_invoker = true)
as
with follower_counts as (
  select
    follows.followed_id as profile_id,
    count(*)::integer as followers_count
  from public.follows
  group by follows.followed_id
),
following_counts as (
  select
    follows.follower_id as profile_id,
    count(*)::integer as following_count
  from public.follows
  group by follows.follower_id
),
public_post_counts as (
  select
    posts.owner_id as profile_id,
    count(*)::integer as public_posts_count,
    count(*) filter (where posts.post_type = 'single')::integer as single_count,
    count(*) filter (where posts.post_type = 'ep')::integer as ep_count,
    count(*) filter (where posts.post_type = 'album')::integer as album_count,
    max(posts.activity_at) as last_public_activity_at
  from public.posts
  where posts.visibility = 'public'
  group by posts.owner_id
)
select
  profiles.id as profile_id,
  coalesce(follower_counts.followers_count, 0)::integer as followers_count,
  coalesce(following_counts.following_count, 0)::integer as following_count,
  coalesce(public_post_counts.public_posts_count, 0)::integer as public_posts_count,
  coalesce(public_post_counts.single_count, 0)::integer as single_count,
  coalesce(public_post_counts.ep_count, 0)::integer as ep_count,
  coalesce(public_post_counts.album_count, 0)::integer as album_count,
  public_post_counts.last_public_activity_at
from public.profiles
left join follower_counts
  on follower_counts.profile_id = profiles.id
left join following_counts
  on following_counts.profile_id = profiles.id
left join public_post_counts
  on public_post_counts.profile_id = profiles.id;
```
