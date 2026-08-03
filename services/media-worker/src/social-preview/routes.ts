import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import type { FastifyInstance, FastifyReply } from "fastify";
import sharp from "sharp";

import { config } from "../config.js";
import { supabaseAdmin } from "../supabase/service.js";

interface PublicAssetRow {
  provider: "google_drive" | "dropbox" | "onedrive";
  remote_file_id: string;
  share_url: string | null;
  view_url: string | null;
  thumbnail_url: string | null;
}

interface PublicPostCard {
  id: string;
  title: string;
  description: string | null;
  post_type: string;
  updated_at: string;
  owner: { username: string; display_name: string } | null;
  artwork: PublicAssetRow | null;
}

interface PublicReleaseTrackCard {
  id: string;
  post_id: string;
  track_title: string;
  updated_at: string;
}

interface PublicProfileCard {
  id: string;
  username: string;
  display_name: string;
  bio: string | null;
  updated_at: string;
  avatar: PublicAssetRow | null;
}

const GOOGLE_DRIVE_HOST = "https://drive.google.com";
const GOOGLE_DRIVE_USERCONTENT_HOST = "https://drive.usercontent.google.com";
const GOOGLE_DRIVE_IMAGE_HOST = "https://lh3.googleusercontent.com";
const SOCIAL_PREVIEW_RENDER_VERSION = "mxtrove-v2";

function escapeMarkup(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function truncate(value: string | null | undefined, maxLength: number) {
  const normalized = value?.replace(/\s+/g, " ").trim() ?? "";
  return normalized.length > maxLength
    ? `${normalized.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`
    : normalized;
}

function looksLikeGoogleDriveFileId(fileId: string | null | undefined) {
  const normalized = fileId?.trim() ?? "";
  return /^[A-Za-z0-9_-]{20,}$/.test(normalized);
}

function uniqueStrings(values: Array<string | null | undefined>) {
  return values.filter((value, index, entries): value is string => {
    if (!value?.trim()) {
      return false;
    }

    return entries.indexOf(value) === index;
  });
}

function buildGoogleDriveThumbnailUrl(fileId: string, size = "w1200") {
  return `${GOOGLE_DRIVE_HOST}/thumbnail?id=${encodeURIComponent(fileId)}&sz=${encodeURIComponent(size)}`;
}

function buildGoogleDriveEmbeddableImageUrl(fileId: string, size = "w1200") {
  return `${GOOGLE_DRIVE_IMAGE_HOST}/d/${encodeURIComponent(fileId)}=${encodeURIComponent(size)}`;
}

function buildGoogleDrivePublicImageUrl(fileId: string) {
  return `${GOOGLE_DRIVE_HOST}/uc?export=view&id=${encodeURIComponent(fileId)}`;
}

function buildGoogleDriveUserContentUrl(fileId: string) {
  return `${GOOGLE_DRIVE_USERCONTENT_HOST}/download?id=${encodeURIComponent(fileId)}&export=view&authuser=0`;
}

function buildPublicMediaProxyUrl(asset: PublicAssetRow) {
  if (!config.supabaseUrl) {
    return null;
  }

  const proxyUrl = new URL("/functions/v1/drive-media", config.supabaseUrl);
  proxyUrl.searchParams.set("kind", "image");

  if (asset.provider === "google_drive" && looksLikeGoogleDriveFileId(asset.remote_file_id)) {
    proxyUrl.searchParams.set("fileId", asset.remote_file_id);
    proxyUrl.searchParams.set("size", "w1200");
    return proxyUrl.toString();
  }

  if (asset.provider === "dropbox" && asset.share_url) {
    proxyUrl.searchParams.set("provider", "dropbox");
    proxyUrl.searchParams.set("url", asset.share_url);
    return proxyUrl.toString();
  }

  return null;
}

export function getPublicAssetUrls(asset: PublicAssetRow | null) {
  if (!asset) return [];

  if (asset.provider === "google_drive" && looksLikeGoogleDriveFileId(asset.remote_file_id)) {
    return uniqueStrings([
      buildPublicMediaProxyUrl(asset),
      asset.thumbnail_url,
      buildGoogleDriveThumbnailUrl(asset.remote_file_id),
      buildGoogleDriveEmbeddableImageUrl(asset.remote_file_id),
      buildGoogleDriveUserContentUrl(asset.remote_file_id),
      buildGoogleDrivePublicImageUrl(asset.remote_file_id),
      asset.share_url,
      asset.view_url,
    ]);
  }

  if (asset.provider === "dropbox" && asset.share_url) {
    const url = new URL(asset.share_url);
    url.searchParams.delete("dl");
    url.searchParams.set("raw", "1");
    return uniqueStrings([
      buildPublicMediaProxyUrl(asset),
      asset.thumbnail_url,
      url.toString(),
      asset.share_url,
      asset.view_url,
    ]);
  }

  return uniqueStrings([asset.thumbnail_url, asset.share_url, asset.view_url]);
}

async function fetchImageDataUrl(candidates: string[] | string | null) {
  const urls = Array.isArray(candidates) ? candidates : candidates ? [candidates] : [];
  for (const url of urls) {
    const imageDataUrl = await fetchImageDataUrlCandidate(url);
    if (imageDataUrl) {
      return imageDataUrl;
    }
  }

  return null;
}

async function fetchImageDataUrlCandidate(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: { "User-Agent": "MxTrove-Social-Preview/1.0" },
    });

    if (!response.ok) return null;
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.byteLength === 0 || buffer.byteLength > 12 * 1024 * 1024) return null;

    const metadata = await sharp(buffer).metadata().catch(() => null);
    if (!metadata || metadata.format === "svg") return null;

    const normalized = await sharp(buffer)
      .rotate()
      .resize(720, 720, { fit: "cover" })
      .png({ compressionLevel: 9, adaptiveFiltering: true })
      .toBuffer();
    return `data:image/png;base64,${normalized.toString("base64")}`;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function buildAssetCacheKey(asset: PublicAssetRow | null) {
  if (!asset) {
    return "no-asset";
  }

  return [
    asset.provider,
    asset.remote_file_id,
    asset.thumbnail_url ?? "",
    asset.share_url ?? "",
    asset.view_url ?? "",
  ].join("|");
}

export async function resolvePublicAssetImageDataUrl(asset: PublicAssetRow | null) {
  return fetchImageDataUrl(getPublicAssetUrls(asset));
}

async function getPublicPost(postId: string): Promise<PublicPostCard | null> {
  const { data, error } = await supabaseAdmin
    .from("posts")
    .select(`
      id,
      title,
      description,
      post_type,
      updated_at,
      owner:profiles!posts_owner_id_fkey(username, display_name),
      artwork:assets!posts_artwork_asset_id_fkey(
        provider,
        remote_file_id,
        share_url,
        view_url,
        thumbnail_url
      )
    `)
    .eq("id", postId)
    .eq("visibility", "public")
    .eq("is_published", true)
    .is("hidden_at", null)
    .maybeSingle();
  if (error) throw error;
  return data as unknown as PublicPostCard | null;
}

async function getPublicReleaseTrack(postId: string, trackId: string): Promise<PublicReleaseTrackCard | null> {
  const { data, error } = await supabaseAdmin
    .from("release_tracks")
    .select("id, post_id, track_title, updated_at")
    .eq("id", trackId)
    .eq("post_id", postId)
    .maybeSingle();
  if (error) throw error;
  return data as PublicReleaseTrackCard | null;
}

async function getPublicProfile(username: string): Promise<PublicProfileCard | null> {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select(`
      id,
      username,
      display_name,
      bio,
      updated_at,
      avatar:assets!profiles_avatar_asset_id_fkey(
        provider,
        remote_file_id,
        share_url,
        view_url,
        thumbnail_url
      ),
      privacy:profile_privacy_settings!profile_privacy_settings_profile_id_fkey(profile_visibility)
    `)
    .eq("username", username)
    .is("deactivated_at", null)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const privacy = (data as unknown as { privacy?: { profile_visibility?: string } | null }).privacy;
  if (privacy?.profile_visibility && privacy.profile_visibility !== "public") return null;
  return data as unknown as PublicProfileCard;
}

export function buildCardSvg(input: {
  eyebrow: string;
  title: string;
  subtitle: string;
  description: string;
  imageDataUrl: string | null;
  roundImage?: boolean;
}) {
  const title = escapeMarkup(truncate(input.title, 42));
  const subtitle = escapeMarkup(truncate(input.subtitle, 58));
  const description = escapeMarkup(truncate(input.description, 150));
  const image = input.imageDataUrl
    ? `<image href="${input.imageDataUrl}" x="64" y="64" width="430" height="502" preserveAspectRatio="xMidYMid slice" clip-path="url(#artClip)" />`
    : `<rect x="64" y="64" width="430" height="502" rx="${input.roundImage ? 215 : 44}" fill="url(#fallback)" />
       <circle cx="279" cy="315" r="88" fill="none" stroke="#d9b8ff" stroke-width="14" opacity=".86" />
       <path d="M235 347V259l94-24v88" fill="none" stroke="#f8f1ff" stroke-width="15" stroke-linecap="round" stroke-linejoin="round" />
       <circle cx="222" cy="354" r="24" fill="#f8f1ff" /><circle cx="316" cy="330" r="24" fill="#f8f1ff" />`;
  const clipRadius = input.roundImage ? 215 : 44;

  return `
    <svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop stop-color="#090615"/>
          <stop offset=".52" stop-color="#170c2d"/>
          <stop offset="1" stop-color="#080611"/>
        </linearGradient>
        <radialGradient id="glow" cx=".17" cy=".02" r=".95">
          <stop stop-color="#9d5cff" stop-opacity=".52"/>
          <stop offset="1" stop-color="#9d5cff" stop-opacity="0"/>
        </radialGradient>
        <linearGradient id="fallback" x1="0" y1="0" x2="1" y2="1">
          <stop stop-color="#9d5cff"/><stop offset=".55" stop-color="#4c2187"/><stop offset="1" stop-color="#130b26"/>
        </linearGradient>
        <clipPath id="artClip"><rect x="64" y="64" width="430" height="502" rx="${clipRadius}"/></clipPath>
      </defs>
      <rect width="1200" height="630" fill="url(#bg)"/>
      <rect width="1200" height="630" fill="url(#glow)"/>
      <path d="M0 540C266 435 430 646 720 514s352-65 480-118v234H0Z" fill="#9d5cff" opacity=".08"/>
      ${image}
      <rect x="64" y="64" width="430" height="502" rx="${clipRadius}" fill="none" stroke="#c28bff" stroke-opacity=".36" stroke-width="2"/>
      <text x="554" y="106" fill="#cda7ef" font-size="20" font-family="Arial, sans-serif" letter-spacing="7">${escapeMarkup(input.eyebrow.toUpperCase())}</text>
      <text x="554" y="188" fill="#fff9ff" font-size="58" font-weight="700" font-family="Georgia, serif">${title}</text>
      <text x="554" y="238" fill="#c6b8d4" font-size="26" font-family="Arial, sans-serif">${subtitle}</text>
      <foreignObject x="554" y="282" width="570" height="150">
        <div xmlns="http://www.w3.org/1999/xhtml" style="font: 25px/1.5 Arial, sans-serif; color:#a99bb8">${description}</div>
      </foreignObject>
      <g transform="translate(554 500)">
        <circle cx="24" cy="24" r="23" fill="#9d5cff"/>
        <path d="M15 31V15l22-6v16" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round"/>
        <circle cx="12" cy="33" r="5" fill="#fff"/><circle cx="34" cy="27" r="5" fill="#fff"/>
        <text x="64" y="34" fill="#fff9ff" font-size="31" font-weight="700" font-family="Arial, sans-serif">MxTrove</text>
        <text x="205" y="33" fill="#a99bb8" font-size="20" font-family="Arial, sans-serif">Share music. Share versions.</text>
      </g>
    </svg>`;
}

async function renderCachedPng(input: {
  cacheKey: string;
  svg: string;
}) {
  await fs.mkdir(config.socialPreviewCacheDir, { recursive: true });
  const digest = createHash("sha256").update(input.cacheKey).digest("hex").slice(0, 32);
  const outputPath = path.join(config.socialPreviewCacheDir, `${digest}.png`);
  const stats = await fs.stat(outputPath).catch(() => null);
  if (stats && Date.now() - stats.mtimeMs < config.socialPreviewCacheTtlSeconds * 1000) {
    return fs.readFile(outputPath);
  }
  const png = await sharp(Buffer.from(input.svg)).png({ compressionLevel: 9 }).toBuffer();
  await fs.writeFile(outputPath, png, { mode: 0o600 });
  return png;
}

interface SocialHtmlInput {
  title: string;
  description: string;
  imageUrl: string;
  canonicalUrl: string;
  ogType?: "music.album" | "music.song" | "profile";
}

export function buildSocialHtml(input: SocialHtmlInput) {
  const title = escapeMarkup(input.title);
  const description = escapeMarkup(truncate(input.description, 200));
  const canonicalUrl = escapeMarkup(input.canonicalUrl);
  const imageUrl = escapeMarkup(input.imageUrl);
  return `<!doctype html><html lang="en"><head>
      <meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
      <meta http-equiv="refresh" content="0; url=${canonicalUrl}">
      <title>${title}</title><meta name="description" content="${description}">
      <link rel="canonical" href="${canonicalUrl}">
      <meta property="og:site_name" content="MxTrove"><meta property="og:type" content="${input.ogType ?? "music.album"}">
      <meta property="og:title" content="${title}"><meta property="og:description" content="${description}">
      <meta property="og:image" content="${imageUrl}"><meta property="og:image:secure_url" content="${imageUrl}">
      <meta property="og:image:type" content="image/png">
      <meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
      <meta property="og:url" content="${canonicalUrl}">
      <meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${title}">
      <meta name="twitter:description" content="${description}"><meta name="twitter:image" content="${imageUrl}">
      </head><body style="background:#090615;color:#fff;font-family:sans-serif;padding:3rem">
      <p>Opening <a style="color:#cda7ef" href="${canonicalUrl}">${title}</a> on MxTrove.</p>
      </body></html>`;
}

function sendSocialHtml(reply: FastifyReply, input: SocialHtmlInput) {
  return reply
    .type("text/html; charset=utf-8")
    .header("Cache-Control", "public, max-age=300, stale-while-revalidate=3600")
    .header("X-Content-Type-Options", "nosniff")
    .header("Content-Security-Policy", "default-src 'none'; img-src https: data:; style-src 'unsafe-inline';")
    .send(buildSocialHtml(input));
}

export async function registerSocialPreviewRoutes(app: FastifyInstance) {
  app.get("/og/post/:postId/track/:trackId.png", async (request, reply) => {
    const { postId, trackId } = request.params as { postId: string; trackId: string };
    const [post, track] = await Promise.all([
      getPublicPost(postId),
      getPublicReleaseTrack(postId, trackId),
    ]);
    if (!post || !track || post.post_type === "single") {
      return reply.code(404).send({ error: "Public release song not found." });
    }

    const imageDataUrl = await resolvePublicAssetImageDataUrl(post.artwork);
    const artistName = post.owner?.display_name ?? post.owner?.username ?? "MxTrove artist";
    const png = await renderCachedPng({
      cacheKey: `${SOCIAL_PREVIEW_RENDER_VERSION}:track:${post.id}:${post.updated_at}:${track.id}:${track.updated_at}:${buildAssetCacheKey(post.artwork)}:${Boolean(imageDataUrl)}`,
      svg: buildCardSvg({
        eyebrow: `Track from ${post.post_type}`,
        title: track.track_title,
        subtitle: `${artistName} · ${post.title}`,
        description: `Listen to this song from the ${post.post_type} “${post.title}” on MxTrove.`,
        imageDataUrl,
      }),
    });
    return reply
      .type("image/png")
      .header("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800")
      .header("X-Content-Type-Options", "nosniff")
      .send(png);
  });

  app.get("/og/post/:postId.png", async (request, reply) => {
    const { postId } = request.params as { postId: string };
    const post = await getPublicPost(postId);
    if (!post) return reply.code(404).send({ error: "Public release not found." });
    const imageDataUrl = await resolvePublicAssetImageDataUrl(post.artwork);
    const png = await renderCachedPng({
      cacheKey: `${SOCIAL_PREVIEW_RENDER_VERSION}:post:${post.id}:${post.updated_at}:${buildAssetCacheKey(post.artwork)}:${Boolean(imageDataUrl)}`,
      svg: buildCardSvg({
        eyebrow: `${post.post_type} release`,
        title: post.title,
        subtitle: post.owner?.display_name ?? post.owner?.username ?? "MxTrove artist",
        description: post.description ?? "Listen to this release and follow its versions on MxTrove.",
        imageDataUrl,
      }),
    });
    return reply
      .type("image/png")
      .header("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800")
      .header("X-Content-Type-Options", "nosniff")
      .send(png);
  });

  app.get("/og/profile/:username.png", async (request, reply) => {
    const { username } = request.params as { username: string };
    const profile = await getPublicProfile(username);
    if (!profile) return reply.code(404).send({ error: "Public profile not found." });
    const imageDataUrl = await resolvePublicAssetImageDataUrl(profile.avatar);
    const png = await renderCachedPng({
      cacheKey: `${SOCIAL_PREVIEW_RENDER_VERSION}:profile:${profile.id}:${profile.updated_at}:${buildAssetCacheKey(profile.avatar)}:${Boolean(imageDataUrl)}`,
      svg: buildCardSvg({
        eyebrow: "Creator profile",
        title: profile.display_name,
        subtitle: `@${profile.username}`,
        description: profile.bio ?? "Discover releases, works in progress, and version history on MxTrove.",
        imageDataUrl,
        roundImage: true,
      }),
    });
    return reply
      .type("image/png")
      .header("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800")
      .header("X-Content-Type-Options", "nosniff")
      .send(png);
  });

  app.get("/social/post/:postId", async (request, reply) => {
    const { postId } = request.params as { postId: string };
    const post = await getPublicPost(postId);
    if (!post) return reply.code(404).send({ error: "Public release not found." });
    const origin = config.publicAppUrl;
    const imageVersion = createHash("sha256")
      .update(`${SOCIAL_PREVIEW_RENDER_VERSION}:${post.updated_at}:${buildAssetCacheKey(post.artwork)}`)
      .digest("hex")
      .slice(0, 12);
    return sendSocialHtml(reply, {
      title: `${post.title} · ${post.owner?.display_name ?? "MxTrove"}`,
      description: post.description ?? "Listen to this public release on MxTrove.",
      imageUrl: `${origin}/og/post/${encodeURIComponent(post.id)}.png?v=${imageVersion}`,
      canonicalUrl: `${origin}/post/${encodeURIComponent(post.id)}`,
    });
  });

  app.get("/social/post/:postId/track/:trackId", async (request, reply) => {
    const { postId, trackId } = request.params as { postId: string; trackId: string };
    const [post, track] = await Promise.all([
      getPublicPost(postId),
      getPublicReleaseTrack(postId, trackId),
    ]);
    if (!post || !track || post.post_type === "single") {
      return reply.code(404).send({ error: "Public release song not found." });
    }

    const origin = config.publicAppUrl;
    const artistName = post.owner?.display_name ?? post.owner?.username ?? "MxTrove artist";
    const imageVersion = createHash("sha256")
      .update(`${SOCIAL_PREVIEW_RENDER_VERSION}:${post.updated_at}:${track.updated_at}:${buildAssetCacheKey(post.artwork)}`)
      .digest("hex")
      .slice(0, 12);
    return sendSocialHtml(reply, {
      title: `${track.track_title} · ${artistName}`,
      description: `${track.track_title} by ${artistName}, from the ${post.post_type} “${post.title}” on MxTrove.`,
      imageUrl: `${origin}/og/post/${encodeURIComponent(post.id)}/track/${encodeURIComponent(track.id)}.png?v=${imageVersion}`,
      canonicalUrl: `${origin}/post/${encodeURIComponent(post.id)}?track=${encodeURIComponent(track.id)}`,
      ogType: "music.song",
    });
  });

  app.get("/social/profile/:username", async (request, reply) => {
    const { username } = request.params as { username: string };
    const profile = await getPublicProfile(username);
    if (!profile) return reply.code(404).send({ error: "Public profile not found." });
    const origin = config.publicAppUrl;
    const imageVersion = createHash("sha256")
      .update(`${SOCIAL_PREVIEW_RENDER_VERSION}:${profile.updated_at}:${buildAssetCacheKey(profile.avatar)}`)
      .digest("hex")
      .slice(0, 12);
    return sendSocialHtml(reply, {
      title: `${profile.display_name} (@${profile.username}) · MxTrove`,
      description: profile.bio ?? "Discover this creator on MxTrove.",
      imageUrl: `${origin}/og/profile/${encodeURIComponent(profile.username)}.png?v=${imageVersion}`,
      canonicalUrl: `${origin}/@${encodeURIComponent(profile.username)}`,
      ogType: "profile",
    });
  });
}
