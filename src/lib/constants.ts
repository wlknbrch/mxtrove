import type { AssetType, PostType, Visibility } from "@/types/domain";

export const APP_NAME = "MxTrove";

export const productionStages = [
  "Idea",
  "Sketch",
  "Demo",
  "Arrangement",
  "Mix 1",
  "Mix 2",
  "Pre-Master",
  "Full Production",
  "Final",
] as const;

export const publicPreviewPreferredExtensions = [".mp3", ".m4a", ".aac", ".ogg"] as const;

export const acceptedAudioExtensions = [
  ".wav",
  ".mp3",
  ".flac",
  ".aiff",
  ".aif",
  ".m4a",
  ".aac",
  ".ogg",
  ".opus",
] as const;

export const acceptedAudioMimeTypes = [
  "audio/wav",
  "audio/x-wav",
  "audio/mpeg",
  "audio/flac",
  "audio/x-flac",
  "audio/aiff",
  "audio/x-aiff",
  "audio/mp4",
  "audio/aac",
  "audio/ogg",
  "audio/opus",
] as const;

export const acceptedArtworkExtensions = [".jpg", ".jpeg", ".png", ".webp", ".gif"] as const;

export const visibilityOptions: Array<{ value: Visibility; label: string }> = [
  { value: "private", label: "Private" },
  { value: "public", label: "Public" },
];

export const postTypeOptions: Array<{ value: PostType; label: string }> = [
  { value: "single", label: "Single" },
  { value: "ep", label: "EP" },
  { value: "album", label: "Album" },
];

export const assetTypeLabels: Record<AssetType, string> = {
  audio_original: "Original Audio",
  audio_preview: "Preview Audio",
  cover_artwork: "Cover Artwork",
  avatar: "Avatar",
};
