export type Visibility = "private" | "public";
export type PostType = "single" | "ep" | "album";
export type AssetType =
  | "audio_original"
  | "audio_preview"
  | "cover_artwork"
  | "avatar";
export type ConversationKind = "direct";
export type NotificationType =
  | "follow"
  | "post_heart"
  | "version_heart"
  | "comment"
  | "comment_reply"
  | "single_version"
  | "message";
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
  provider: "google_drive";
  provider_account_email: string | null;
  root_folder_id: string | null;
  audio_originals_folder_id: string | null;
  audio_previews_folder_id: string | null;
  artwork_folder_id: string | null;
  avatars_folder_id: string | null;
  connected_at: string;
  last_verified_at: string | null;
}

export interface Asset {
  id: string;
  owner_id: string;
  provider: "google_drive";
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
  is_published: boolean;
  published_at: string | null;
  activity_at: string;
  created_at: string;
  updated_at: string;
}

export interface SinglePost {
  post_id: string;
  song_id: string;
  featured_version_id: string;
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
