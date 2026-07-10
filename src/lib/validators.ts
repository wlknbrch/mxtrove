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
  visibility: z.enum(["private", "public"]),
  artwork_asset_id: z.string().uuid().optional().nullable(),
});

export const commentSchema = z.object({
  body: z.string().trim().min(1).max(1200),
  parent_comment_id: z.string().uuid().optional().nullable(),
});

export const messageSchema = z.object({
  body: z.string().trim().min(1).max(2000),
});

export type ProfileFormValues = z.infer<typeof profileSchema>;
export type SongFormValues = z.infer<typeof songSchema>;
export type VersionFormValues = z.infer<typeof versionSchema>;
export type SinglePublishValues = z.infer<typeof singlePublishSchema>;
export type CommentFormValues = z.infer<typeof commentSchema>;
export type MessageFormValues = z.infer<typeof messageSchema>;
