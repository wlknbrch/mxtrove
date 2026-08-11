export type Visibility = "private" | "followers" | "unlisted" | "public";
export type PostType = "single" | "ep" | "album";
export type AssetType =
  | "audio_original"
  | "audio_preview"
  | "cover_artwork"
  | "avatar";
export type CloudProvider = "google_drive" | "dropbox" | "onedrive";
export type ConversationKind = "direct" | "project";
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
  | "share_link_review";
export type PreviewGeneration = "manual" | "automatic";
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
export type ReportReason =
  | "spam"
  | "harassment"
  | "copyright"
  | "hate"
  | "sexual_content"
  | "illegal_content"
  | "other";

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

export interface SinglePost {
  post_id: string;
  song_id: string;
  featured_version_id: string;
  show_lyrics: boolean;
}

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

export interface Follow {
  follower_id: string;
  followed_id: string;
  created_at: string;
}

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

export interface Conversation {
  id: string;
  kind: ConversationKind;
  project_id: string | null;
  history_visible_from: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConversationMember {
  conversation_id: string;
  profile_id: string;
  joined_at: string;
  last_read_at: string | null;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  edited_at: string | null;
  deleted_at: string | null;
}

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
  is_read: boolean;
  created_at: string;
}

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

export interface WaveformDataV1 {
  version: 1;
  durationSeconds: number;
  sourceSampleRate: number;
  analysisSampleRate: 8000;
  bucketCount: number;
  peaks: Array<[number, number]>;
}

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

export interface FeedEvent {
  id: string;
  actor_id: string;
  post_id: string;
  song_version_id: string | null;
  event_type: "single_release" | "single_update" | "release_publish";
  created_at: string;
}

export type CollaborationProjectType = "single" | "ep" | "album" | "loose_collection";
export type CollaborationProjectVisibility = "private" | "members_only" | "link_invite";
export type CollaborationProjectStatus =
  | "planning"
  | "active"
  | "review"
  | "finalizing"
  | "completed"
  | "archived";
export type CollaborationRole =
  | "owner"
  | "admin"
  | "editor"
  | "contributor"
  | "reviewer"
  | "viewer";
export type CollaborationTrackStatus =
  | "idea"
  | "draft"
  | "recording"
  | "arrangement"
  | "mixing"
  | "review"
  | "approved"
  | "final";

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

export interface FeedbackReply {
  id: string;
  thread_id: string;
  author_id: string;
  body: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface FeedbackReaction {
  thread_id: string;
  profile_id: string;
  reaction: "agree" | "disagree" | "done" | "important";
  created_at: string;
}

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

export interface PostCredit {
  id: string;
  post_id: string;
  profile_id: string | null;
  display_name: string;
  role: string;
  position: number;
  created_at: string;
}

export interface PostExternalLink {
  id: string;
  post_id: string;
  platform: string;
  label: string;
  url: string;
  position: number;
  created_at: string;
}

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
