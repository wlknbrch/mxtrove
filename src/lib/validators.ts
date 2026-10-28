import { z } from "zod";

export const usernamePattern = /^[a-z0-9_]{3,30}$/;

export const usernameSchema = z
  .string()
  .trim()
  .min(3, "Username must be at least 3 characters long.")
  .max(30, "Username must be at most 30 characters long.")
  .regex(
    usernamePattern,
    "Use only lowercase letters, numbers, and underscores.",
  );

export const optionalUrlSchema = z
  .string()
  .trim()
  .optional()
  .or(z.literal(""))
  .transform((value) => value || null)
  .refine(
    (value) => !value || /^https?:\/\//.test(value),
    "Please enter a valid http or https URL.",
  );

export function normalizeOptionalTempoInput(value: unknown) {
  if (value == null || (typeof value === "string" && value.trim() === "")) {
    return null;
  }

  return typeof value === "number" ? value : Number(value);
}

export const profileSchema = z.object({
  display_name: z.string().trim().min(2, "Display name is required.").max(60),
  username: usernameSchema,
  bio: z.string().trim().max(280).optional().or(z.literal("")),
  location: z.string().trim().max(100).optional().or(z.literal("")),
  website_url: optionalUrlSchema,
  instagram_url: optionalUrlSchema,
  spotify_url: optionalUrlSchema,
  youtube_url: optionalUrlSchema,
  support_url: optionalUrlSchema,
  avatar_asset_id: z.string().uuid().optional().nullable(),
});

export const songSchema = z.object({
  title: z.string().trim().min(1, "Song title is required.").max(120),
  notes: z.string().trim().max(4000).optional().or(z.literal("")),
  lyrics: z.string().trim().max(50000, "Lyrics must be 50,000 characters or fewer.").optional().or(z.literal("")),
  musical_key: z.string().trim().max(32, "Musical key must be 32 characters or fewer.").optional().or(z.literal("")),
  tempo_bpm: z.preprocess(
    (value: string | number | null | undefined) => normalizeOptionalTempoInput(value),
    z
      .number({ error: "Please enter a valid tempo." })
      .finite("Please enter a valid tempo.")
      .min(20, "Tempo must be at least 20 BPM.")
      .max(400, "Tempo must be at most 400 BPM.")
      .nullable()
      .optional(),
  ),
  default_artwork_asset_id: z.string().uuid().optional().nullable(),
});

export const versionSchema = z.object({
  version_label: z.string().trim().min(1).max(80),
  production_stage: z.string().trim().min(1).max(50),
  changelog: z.string().trim().max(2000).optional().or(z.literal("")),
  source_asset_id: z.string().uuid(),
  preview_asset_id: z.string().uuid().optional().nullable(),
});

export const singlePublishSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  visibility: z.enum(["private", "followers", "unlisted", "public"]),
  artwork_asset_id: z.string().uuid().optional().nullable(),
  show_lyrics: z.boolean().optional().default(false),
});

export const commentSchema = z.object({
  body: z.string().trim().min(1).max(1200),
  parent_comment_id: z.string().uuid().optional().nullable(),
});

export const messageSchema = z.object({
  body: z.string().trim().min(1).max(2000),
});

export type ProfileFormValues = z.infer<typeof profileSchema>;
export type ProfileFormInput = z.input<typeof profileSchema>;
export type SongFormValues = z.infer<typeof songSchema>;
export type SongFormInput = z.input<typeof songSchema>;
export type VersionFormValues = z.infer<typeof versionSchema>;
export type SinglePublishValues = z.infer<typeof singlePublishSchema>;
export type CommentFormValues = z.infer<typeof commentSchema>;
export type MessageFormValues = z.infer<typeof messageSchema>;
