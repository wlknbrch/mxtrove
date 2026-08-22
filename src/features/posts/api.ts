import {
  demoAssets,
  demoComments,
  demoFeedEvents,
  demoViewerProfile,
  demoPosts,
  demoProfiles,
  demoReleaseTracks,
  demoSinglePosts,
  demoSongVersions,
  demoSongs,
  getDemoProfileById,
} from "@/lib/demo-data";
import {
  createDemoDelay,
  getViewerId,
  isDemoModeEnabled,
  requireSupabase,
} from "@/lib/service-utils";
import { ASSET_SELECT_WITHOUT_WAVEFORM, withNullAssetWaveform } from "@/lib/supabase-selects";
import type { CommentFormValues, SinglePublishValues } from "@/lib/validators";
import type {
  Asset,
  FeedEvent,
  Post,
  PostCredit,
  PostExternalLink,
  PostType,
  Profile,
  ReleaseTrack,
  ShareLink,
  SinglePost,
  Song,
  SongVersion,
  Visibility,
} from "@/types/domain";
import { createProtectedMediaReadUrl } from "@/features/media-processing/api";
import { getVisiblePostLyrics } from "@/features/posts/lyrics-visibility";
import { resolveAvailableProtectedReadUrls } from "@/features/posts/protected-preview";
import type { ProtectedMediaAsset } from "@/types/domain";

import type { ResolvedComment, ResolvedPostCard, ResolvedReleaseTrack, ResolvedSingleInfo } from "@/features/posts/types";

let hasWarnedAboutMissingCommentEngagement = false;
let hasWarnedAboutMissingPostSongMetadata = false;
let hasWarnedAboutMissingOptimizedPostCards = false;

const PROTECTED_MEDIA_CARD_SELECT = [
  "id",
  "owner_id",
  "purpose",
  "status",
  "filename",
  "mime_type",
  "bytes",
  "duration_seconds",
  "waveform_data",
  "post_id",
  "project_id",
  "song_version_id",
  "message_id",
  "created_at",
  "ready_at",
].join(", ");

function getApiErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string" &&
    (error as { message: string }).message.trim()
  ) {
    return (error as { message: string }).message;
  }

  if (
    error &&
    typeof error === "object" &&
    "details" in error &&
    typeof (error as { details?: unknown }).details === "string" &&
    (error as { details: string }).details.trim()
  ) {
    return (error as { details: string }).details;
  }

  return fallback;
}

function uniqueStrings(values: Array<string | null | undefined>) {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

function resolveDemoPost(postId: string, viewerId?: string | null): ResolvedPostCard | null {
  const post = demoPosts.find((entry) => entry.id === postId);

  if (!post) {
    return null;
  }

  const singleLink = demoSinglePosts.find((entry) => entry.post_id === post.id) ?? null;
  const featuredVersion = singleLink
    ? demoSongVersions.find((version) => version.id === singleLink.featured_version_id) ?? null
    : null;
  const previousVersion = singleLink
    ? demoSongVersions
        .filter((version) => version.song_id === singleLink.song_id && version.id !== singleLink.featured_version_id)
        .sort((left, right) => right.version_number - left.version_number)[0] ?? null
    : null;
  const previewAsset = featuredVersion
    ? demoAssets.find((asset) => asset.id === featuredVersion.preview_asset_id) ?? null
    : null;
  const artwork = demoAssets.find((asset) => asset.id === post.artwork_asset_id) ?? null;
  const comments = demoComments
    .filter((comment) => comment.post_id === post.id)
    .map<ResolvedComment>((comment) => ({
      ...comment,
      author: getDemoProfileById(comment.author_id),
      heartCount: comment.parent_comment_id ? 2 : 7,
      replyCount: comment.parent_comment_id
        ? 0
        : demoComments.filter((reply) => reply.parent_comment_id === comment.id).length,
      viewerHasHearted: false,
    }));
  const releaseTracks = demoReleaseTracks
    .filter((track) => track.post_id === post.id)
    .map<ResolvedReleaseTrack>((track) => ({
      track,
      song: (() => {
        const song = demoSongs.find((entry) => entry.id === track.song_id) ?? null;
        return song
          ? {
              ...song,
              lyrics: getVisiblePostLyrics({
                lyrics: song.lyrics,
                showLyrics: track.show_lyrics,
                ownerId: post.owner_id,
                viewerId,
              }),
            }
          : null;
      })(),
      version: demoSongVersions.find((version) => version.id === track.song_version_id) ?? null,
      versionLabel:
        demoSongVersions.find((version) => version.id === track.song_version_id)?.version_label
        ?? null,
      previewAsset: demoAssets.find((asset) => asset.id === track.preview_asset_id) ?? null,
      protectedPreview: null,
      versionHeartCount: track.song_version_id === demoSongVersions[1]?.id ? 7 : 0,
      viewerHasHeartedVersion: Boolean(viewerId === demoViewerProfile.id && track.song_version_id === demoSongVersions[1]?.id),
    }));

  return {
    post,
    owner: getDemoProfileById(post.owner_id),
    artwork,
    single: singleLink
      ? {
          song: (() => {
            const song = demoSongs.find((entry) => entry.id === singleLink.song_id) ?? null;
            return song
              ? {
                  ...song,
                  lyrics: getVisiblePostLyrics({
                    lyrics: song.lyrics,
                    showLyrics: singleLink.show_lyrics,
                    ownerId: post.owner_id,
                    viewerId,
                  }),
                }
              : null;
          })(),
          showLyrics: singleLink.show_lyrics,
          featuredVersion,
          previousVersion,
          previewAsset,
          protectedPreview: null,
          versionHeartCount: featuredVersion ? 9 : 0,
          viewerHasHeartedVersion: Boolean(viewerId === demoViewerProfile.id && featuredVersion),
        }
      : null,
    releaseTracks,
    comments,
    heartCount: post.post_type === "single" ? 24 : 19,
    viewerHasHearted: viewerId === demoViewerProfile.id && post.id === demoPosts[0]?.id,
    versionHeartCount: featuredVersion ? 9 : 0,
    viewerHasHeartedVersion: Boolean(viewerId === demoViewerProfile.id && featuredVersion),
    commentCount: comments.length,
    credits: [],
    externalLinks: post.release_url
      ? [{
          id: `demo-link-${post.id}`,
          post_id: post.id,
          platform: "website",
          label: "Release link",
          url: post.release_url,
          position: 0,
          created_at: post.created_at,
        }]
      : [],
    feedEvent: demoFeedEvents.find((event) => event.post_id === post.id) ?? null,
  } satisfies ResolvedPostCard;
}

async function resolveSupabasePost(postId: string, viewerId?: string | null): Promise<ResolvedPostCard | null> {
  const client = requireSupabase();
  const { data: post, error: postError } = await client
    .from("posts")
    .select("*")
    .eq("id", postId)
    .maybeSingle();

  if (postError) {
    throw postError;
  }

  if (!post) {
    return null;
  }

  const [
    ownerResult,
    artworkResult,
    singleResult,
    commentsResult,
    commentEngagementResult,
    releaseTracksResult,
    metricsResult,
    viewerHeartResult,
    creditsResult,
    externalLinksResult,
    releaseVersionLabelsResult,
    postSongMetadataResult,
  ] = await Promise.all([
    client.from("profiles").select("*").eq("id", post.owner_id).maybeSingle(),
    post.artwork_asset_id
      ? client.from("assets").select("*").eq("id", post.artwork_asset_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    post.post_type === "single"
      ? client.from("single_posts").select("*").eq("post_id", post.id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    client
      .from("comments")
      .select("*, author:profiles!comments_author_id_fkey(*)")
      .eq("post_id", post.id)
      .order("created_at", { ascending: true }),
    client.rpc("get_comment_engagement", { target_post_id: post.id }),
    client
      .from("release_tracks")
      .select("*")
      .eq("post_id", post.id)
      .order("track_number", { ascending: true }),
    client.from("post_public_metrics").select("*").eq("post_id", post.id).maybeSingle(),
    viewerId
      ? client
          .from("post_hearts")
          .select("post_id")
          .eq("post_id", post.id)
          .eq("profile_id", viewerId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    client.from("post_credits").select("*").eq("post_id", post.id).order("position"),
    client.from("post_external_links").select("*").eq("post_id", post.id).order("position"),
    post.post_type === "single"
      ? Promise.resolve({ data: [], error: null })
      : client.rpc("get_release_track_version_labels", { target_post_id: post.id }),
    client.rpc("get_post_song_metadata", { target_post_id: post.id }),
  ]);

  ownerResult.error && console.warn(ownerResult.error.message);
  artworkResult.error && console.warn(artworkResult.error.message);
  singleResult.error && console.warn(singleResult.error.message);

  if (commentsResult.error) {
    throw commentsResult.error;
  }
  if (commentEngagementResult.error && !hasWarnedAboutMissingCommentEngagement) {
    hasWarnedAboutMissingCommentEngagement = true;
    console.warn("Comment engagement is unavailable until the latest migration is applied.", commentEngagementResult.error.message);
  }

  if (releaseTracksResult.error) {
    throw releaseTracksResult.error;
  }
  if (creditsResult.error) throw creditsResult.error;
  if (externalLinksResult.error) throw externalLinksResult.error;
  if (releaseVersionLabelsResult.error) throw releaseVersionLabelsResult.error;
  if (postSongMetadataResult.error && !hasWarnedAboutMissingPostSongMetadata) {
    hasWarnedAboutMissingPostSongMetadata = true;
    console.warn(
      "Shared song metadata is unavailable until the latest migration is applied.",
      postSongMetadataResult.error.message,
    );
  }

  const postSongMetadataRows = (postSongMetadataResult.data ?? []) as Array<{
    release_track_id: string | null;
    song: ResolvedSingleInfo["song"];
  }>;
  const singlePostSong = postSongMetadataRows.find((row) => row.release_track_id == null)?.song ?? null;
  const releasePostSongs = new Map(
    postSongMetadataRows
      .filter((row): row is typeof row & { release_track_id: string } => Boolean(row.release_track_id))
      .map((row) => [row.release_track_id, row.song]),
  );

  const releaseVersionLabels = new Map(
    ((releaseVersionLabelsResult.data ?? []) as Array<{
      track_id: string;
      version_label: string;
    }>).map((entry) => [entry.track_id, entry.version_label]),
  );
  const commentEngagement = new Map(
    ((commentEngagementResult.data ?? []) as Array<{
      comment_id: string;
      heart_count: number | string;
      reply_count: number | string;
      viewer_has_hearted: boolean;
    }>).map((entry) => [entry.comment_id, entry]),
  );

  const singleLink = singleResult.data as {
    song_id: string;
    featured_version_id: string;
    show_lyrics: boolean;
  } | null;
  const [songResult, featuredVersionResult, previousVersionResult] = singleLink
    ? await Promise.all([
        client.from("songs").select("*").eq("id", singleLink.song_id).maybeSingle(),
        client.from("song_versions").select("*").eq("id", singleLink.featured_version_id).maybeSingle(),
        client
          .from("song_versions")
          .select("*")
          .eq("song_id", singleLink.song_id)
          .neq("id", singleLink.featured_version_id)
          .order("version_number", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ])
    : [
        { data: null, error: null },
        { data: null, error: null },
        { data: null, error: null },
      ];

  const previewAssetId = (featuredVersionResult.data as { preview_asset_id: string | null } | null)
    ?.preview_asset_id;
  const previewAssetResult = previewAssetId
    ? await client.from("assets").select("*").eq("id", previewAssetId).maybeSingle()
    : { data: null, error: null };

  const releaseTrackRows = (releaseTracksResult.data ?? []) as Array<{
    id: string;
    song_id: string;
    song_version_id: string | null;
    preview_asset_id: string | null;
    show_lyrics: boolean;
  }>;
  const versionIds = [
    singleLink?.featured_version_id ?? null,
    ...releaseTrackRows.map((track) => track.song_version_id),
  ].filter((value): value is string => Boolean(value));
  const versionHeartsResult = versionIds.length
    ? await client
        .from("version_hearts")
        .select("song_version_id, profile_id")
        .in("song_version_id", versionIds)
    : { data: [], error: null };

  if (versionHeartsResult.error) {
    throw versionHeartsResult.error;
  }

  const versionHearts = (versionHeartsResult.data ?? []) as Array<{
    song_version_id: string;
    profile_id: string;
  }>;
  const protectedAssetsResult = versionIds.length
    ? await client
        .from("protected_media_assets")
        .select("*")
        .in("song_version_id", versionIds)
        .eq("status", "ready")
        .is("deleted_at", null)
    : { data: [], error: null };
  if (protectedAssetsResult.error) {
    throw protectedAssetsResult.error;
  }
  const protectedAssets = (protectedAssetsResult.data ?? []) as ProtectedMediaAsset[];
  const protectedReadUrls = await resolveAvailableProtectedReadUrls(
    protectedAssets,
    createProtectedMediaReadUrl,
  );
  const versionHeartCounts = new Map<string, number>();
  const viewerHeartedVersionIds = new Set<string>();

  versionHearts.forEach((row) => {
    versionHeartCounts.set(row.song_version_id, (versionHeartCounts.get(row.song_version_id) ?? 0) + 1);
    if (viewerId && row.profile_id === viewerId) {
      viewerHeartedVersionIds.add(row.song_version_id);
    }
  });

  const releaseTracks = await Promise.all(
    releaseTrackRows.map(async (track) => {
      const [song, version, previewAsset] = await Promise.all([
        client.from("songs").select("*").eq("id", track.song_id).maybeSingle(),
        track.song_version_id
          ? client.from("song_versions").select("*").eq("id", track.song_version_id).maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        track.preview_asset_id
          ? client.from("assets").select("*").eq("id", track.preview_asset_id).maybeSingle()
          : Promise.resolve({ data: null, error: null }),
      ]);
      const resolvedSong = (song.data as ResolvedReleaseTrack["song"])
        ?? releasePostSongs.get(track.id)
        ?? null;

      return {
        track: track as ResolvedReleaseTrack["track"],
        song: resolvedSong
          ? {
              ...resolvedSong,
              lyrics: getVisiblePostLyrics({
                lyrics: resolvedSong.lyrics,
                showLyrics: track.show_lyrics,
                ownerId: post.owner_id,
                viewerId,
              }),
            }
          : null,
        version: version.data as ResolvedReleaseTrack["version"],
        versionLabel:
          (version.data as ResolvedReleaseTrack["version"])?.version_label
          ?? releaseVersionLabels.get(track.id)
          ?? null,
        previewAsset: previewAsset.data as ResolvedReleaseTrack["previewAsset"],
        protectedPreview: (() => {
          const asset = protectedAssets.find((entry) => entry.song_version_id === track.song_version_id);
          const readUrl = asset ? protectedReadUrls.get(asset.id) : null;
          return asset && readUrl ? { asset, readUrl } : null;
        })(),
        versionHeartCount: track.song_version_id ? versionHeartCounts.get(track.song_version_id) ?? 0 : 0,
        viewerHasHeartedVersion: track.song_version_id ? viewerHeartedVersionIds.has(track.song_version_id) : false,
      };
    }),
  );

  return {
    post: post as ResolvedPostCard["post"],
    owner: ownerResult.data as ResolvedPostCard["owner"],
    artwork: artworkResult.data as ResolvedPostCard["artwork"],
    single: singleLink
      ? {
          song: (() => {
            const resolvedSong = (songResult.data as ResolvedSingleInfo["song"])
              ?? singlePostSong;
            return resolvedSong
              ? {
                  ...resolvedSong,
                  lyrics: getVisiblePostLyrics({
                    lyrics: resolvedSong.lyrics,
                    showLyrics: singleLink.show_lyrics,
                    ownerId: post.owner_id,
                    viewerId,
                  }),
                }
              : null;
          })(),
          showLyrics: Boolean(singleLink.show_lyrics),
          featuredVersion: featuredVersionResult.data as ResolvedSingleInfo["featuredVersion"],
          previousVersion: previousVersionResult.data as ResolvedSingleInfo["previousVersion"],
          previewAsset: previewAssetResult.data as ResolvedSingleInfo["previewAsset"],
          protectedPreview: (() => {
            const asset = protectedAssets.find((entry) => entry.song_version_id === singleLink.featured_version_id);
            const readUrl = asset ? protectedReadUrls.get(asset.id) : null;
            return asset && readUrl ? { asset, readUrl } : null;
          })(),
          versionHeartCount: singleLink?.featured_version_id
            ? versionHeartCounts.get(singleLink.featured_version_id) ?? 0
            : 0,
          viewerHasHeartedVersion: singleLink?.featured_version_id
            ? viewerHeartedVersionIds.has(singleLink.featured_version_id)
            : false,
        }
      : null,
    releaseTracks,
    comments: ((commentsResult.data ?? []) as Array<ResolvedComment>).map((comment) => ({
      ...comment,
      author: (comment as { author: ResolvedComment["author"] }).author ?? null,
      heartCount: Number(commentEngagement.get(comment.id)?.heart_count ?? 0),
      replyCount: Number(commentEngagement.get(comment.id)?.reply_count ?? 0),
      viewerHasHearted: Boolean(commentEngagement.get(comment.id)?.viewer_has_hearted),
    })),
    heartCount: Number((metricsResult.data as { heart_count?: number } | null)?.heart_count ?? 0),
    viewerHasHearted: Boolean(viewerHeartResult.data),
    versionHeartCount: Number(
      (metricsResult.data as { featured_version_heart_count?: number } | null)
        ?.featured_version_heart_count ?? 0,
    ),
    viewerHasHeartedVersion: singleLink?.featured_version_id
      ? viewerHeartedVersionIds.has(singleLink.featured_version_id)
      : false,
    commentCount: Number((metricsResult.data as { comment_count?: number } | null)?.comment_count ?? 0),
    credits: (creditsResult.data ?? []) as PostCredit[],
    externalLinks: (externalLinksResult.data ?? []) as PostExternalLink[],
    feedEvent: null,
  };
}

type OptimizedPostCardPayload = Omit<ResolvedPostCard, "single" | "releaseTracks"> & {
  single: (Omit<ResolvedSingleInfo, "protectedPreview"> & {
    protectedPreview?: null;
    protectedPreviewAsset?: ProtectedMediaAsset | null;
  }) | null;
  releaseTracks: Array<Omit<ResolvedReleaseTrack, "protectedPreview"> & {
    protectedPreview?: null;
    protectedPreviewAsset?: ProtectedMediaAsset | null;
  }>;
};

async function attachProtectedCardReadUrls(card: OptimizedPostCardPayload): Promise<ResolvedPostCard> {
  const protectedAssets = [
    card.single?.protectedPreviewAsset ?? null,
    ...card.releaseTracks.map((track) => track.protectedPreviewAsset ?? null),
  ].filter((asset): asset is ProtectedMediaAsset => Boolean(asset));
  const readUrls = await resolveAvailableProtectedReadUrls(protectedAssets, createProtectedMediaReadUrl);

  return {
    ...card,
    single: card.single
      ? {
          ...card.single,
          protectedPreview: card.single.protectedPreviewAsset && readUrls.has(card.single.protectedPreviewAsset.id)
            ? {
                asset: card.single.protectedPreviewAsset,
                readUrl: readUrls.get(card.single.protectedPreviewAsset.id)!,
              }
            : null,
        }
      : null,
    releaseTracks: card.releaseTracks.map((track) => ({
      ...track,
      protectedPreview: track.protectedPreviewAsset && readUrls.has(track.protectedPreviewAsset.id)
        ? {
            asset: track.protectedPreviewAsset,
            readUrl: readUrls.get(track.protectedPreviewAsset.id)!,
          }
        : null,
    })),
  };
}

async function resolveSupabasePostCardsFallback(
  postIds: string[],
  viewerId?: string | null,
): Promise<ResolvedPostCard[]> {
  const client = requireSupabase();
  const { data: postRows, error: postError } = await client
    .from("posts")
    .select("*")
    .in("id", postIds);

  if (postError) {
    throw postError;
  }

  const posts = (postRows ?? []) as Post[];
  if (!posts.length) {
    return [];
  }

  const postIdsInResult = posts.map((post) => post.id);
  const ownerIds = uniqueStrings(posts.map((post) => post.owner_id));
  const artworkIds = uniqueStrings(posts.map((post) => post.artwork_asset_id));

  const [
    ownersResult,
    artworksResult,
    singleLinksResult,
    releaseTracksResult,
    metricsResult,
    viewerHeartsResult,
    feedEventsResult,
  ] = await Promise.all([
    ownerIds.length
      ? client.from("profiles").select("*").in("id", ownerIds)
      : Promise.resolve({ data: [], error: null }),
    artworkIds.length
      ? client.from("assets").select(ASSET_SELECT_WITHOUT_WAVEFORM).in("id", artworkIds)
      : Promise.resolve({ data: [], error: null }),
    client.from("single_posts").select("*").in("post_id", postIdsInResult),
    client.from("release_tracks").select("*").in("post_id", postIdsInResult).order("track_number", { ascending: true }),
    client
      .from("post_public_metrics")
      .select("post_id, heart_count, featured_version_heart_count, comment_count")
      .in("post_id", postIdsInResult),
    viewerId
      ? client.from("post_hearts").select("post_id").in("post_id", postIdsInResult).eq("profile_id", viewerId)
      : Promise.resolve({ data: [], error: null }),
    client.from("feed_events").select("*").in("post_id", postIdsInResult).order("created_at", { ascending: false }),
  ]);

  if (ownersResult.error) throw ownersResult.error;
  if (artworksResult.error) throw artworksResult.error;
  if (singleLinksResult.error) throw singleLinksResult.error;
  if (releaseTracksResult.error) throw releaseTracksResult.error;
  if (metricsResult.error) throw metricsResult.error;
  if (viewerHeartsResult.error) throw viewerHeartsResult.error;
  if (feedEventsResult.error) throw feedEventsResult.error;

  const singleLinks = (singleLinksResult.data ?? []) as SinglePost[];
  const releaseTracks = (releaseTracksResult.data ?? []) as ReleaseTrack[];
  const singleSongIds = uniqueStrings(singleLinks.map((link) => link.song_id));
  const releaseSongIds = uniqueStrings(releaseTracks.map((track) => track.song_id));
  const songIds = uniqueStrings([...singleSongIds, ...releaseSongIds]);
  const referencedVersionIds = uniqueStrings([
    ...singleLinks.map((link) => link.featured_version_id),
    ...releaseTracks.map((track) => track.song_version_id),
  ]);

  const [songsResult, referencedVersionsResult, singleVersionHistoryResult] = await Promise.all([
    songIds.length
      ? client.from("songs").select("*").in("id", songIds)
      : Promise.resolve({ data: [], error: null }),
    referencedVersionIds.length
      ? client.from("song_versions").select("*").in("id", referencedVersionIds)
      : Promise.resolve({ data: [], error: null }),
    singleSongIds.length
      ? client.from("song_versions").select("*").in("song_id", singleSongIds).order("version_number", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (songsResult.error) throw songsResult.error;
  if (referencedVersionsResult.error) throw referencedVersionsResult.error;
  if (singleVersionHistoryResult.error) throw singleVersionHistoryResult.error;

  const referencedVersions = (referencedVersionsResult.data ?? []) as SongVersion[];
  const singleVersionHistory = (singleVersionHistoryResult.data ?? []) as SongVersion[];
  const previewAssetIds = uniqueStrings([
    ...referencedVersions.map((version) => version.preview_asset_id),
    ...releaseTracks.map((track) => track.preview_asset_id),
  ]);

  const [previewAssetsResult, protectedAssetsResult, versionHeartsResult] = await Promise.all([
    previewAssetIds.length
      ? client.from("assets").select("*").in("id", previewAssetIds)
      : Promise.resolve({ data: [], error: null }),
    referencedVersionIds.length
      ? client
          .from("protected_media_assets")
          .select(PROTECTED_MEDIA_CARD_SELECT)
          .in("song_version_id", referencedVersionIds)
          .eq("status", "ready")
          .is("deleted_at", null)
          .order("ready_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    referencedVersionIds.length
      ? client
          .from("version_hearts")
          .select("song_version_id, profile_id")
          .in("song_version_id", referencedVersionIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (previewAssetsResult.error) throw previewAssetsResult.error;
  if (protectedAssetsResult.error) throw protectedAssetsResult.error;
  if (versionHeartsResult.error) throw versionHeartsResult.error;

  const ownersById = new Map(
    ((ownersResult.data ?? []) as Profile[]).map((profile) => [profile.id, profile]),
  );
  const artworksById = new Map(
    ((artworksResult.data ?? []) as Array<Omit<Asset, "waveform_peaks">>)
      .map((asset) => {
        const normalized = withNullAssetWaveform(asset);
        return [normalized.id, normalized] as const;
      }),
  );
  const singleLinksByPostId = new Map(singleLinks.map((link) => [link.post_id, link]));
  const metricsByPostId = new Map(
    ((metricsResult.data ?? []) as Array<{
      post_id: string;
      heart_count: number | null;
      featured_version_heart_count: number | null;
      comment_count: number | null;
    }>).map((metric) => [metric.post_id, metric]),
  );
  const viewerHeartedPostIds = new Set(
    ((viewerHeartsResult.data ?? []) as Array<{ post_id: string }>).map((row) => row.post_id),
  );
  const latestFeedEventByPostId = new Map<string, FeedEvent>();
  ((feedEventsResult.data ?? []) as FeedEvent[]).forEach((event) => {
    if (!latestFeedEventByPostId.has(event.post_id)) {
      latestFeedEventByPostId.set(event.post_id, event);
    }
  });

  const tracksByPostId = new Map<string, ReleaseTrack[]>();
  releaseTracks.forEach((track) => {
    const current = tracksByPostId.get(track.post_id) ?? [];
    current.push(track);
    tracksByPostId.set(track.post_id, current);
  });

  const songsById = new Map(
    ((songsResult.data ?? []) as Song[]).map((song) => [song.id, song]),
  );
  const versionsById = new Map<string, SongVersion>();
  [...referencedVersions, ...singleVersionHistory].forEach((version) => {
    versionsById.set(version.id, version);
  });
  const singleVersionHistoryBySongId = new Map<string, SongVersion[]>();
  singleVersionHistory.forEach((version) => {
    const current = singleVersionHistoryBySongId.get(version.song_id) ?? [];
    current.push(version);
    singleVersionHistoryBySongId.set(version.song_id, current);
  });
  const previewAssetsById = new Map(
    ((previewAssetsResult.data ?? []) as Asset[]).map((asset) => [asset.id, asset]),
  );

  const protectedAssets = (protectedAssetsResult.data ?? []) as ProtectedMediaAsset[];
  const protectedAssetByVersionId = new Map<string, ProtectedMediaAsset>();
  protectedAssets.forEach((asset) => {
    if (asset.song_version_id && !protectedAssetByVersionId.has(asset.song_version_id)) {
      protectedAssetByVersionId.set(asset.song_version_id, asset);
    }
  });
  const protectedReadUrls = await resolveAvailableProtectedReadUrls(
    [...protectedAssetByVersionId.values()],
    createProtectedMediaReadUrl,
  );

  const versionHeartCounts = new Map<string, number>();
  const viewerHeartedVersionIds = new Set<string>();
  ((versionHeartsResult.data ?? []) as Array<{ song_version_id: string; profile_id: string }>).forEach((heart) => {
    versionHeartCounts.set(heart.song_version_id, (versionHeartCounts.get(heart.song_version_id) ?? 0) + 1);
    if (viewerId && heart.profile_id === viewerId) {
      viewerHeartedVersionIds.add(heart.song_version_id);
    }
  });

  const postsById = new Map(posts.map((post) => [post.id, post]));
  return postIds.flatMap((postId) => {
    const post = postsById.get(postId);
    if (!post) {
      return [];
    }

    const singleLink = singleLinksByPostId.get(post.id) ?? null;
    const featuredVersion = singleLink ? versionsById.get(singleLink.featured_version_id) ?? null : null;
    const previousVersion = singleLink
      ? (singleVersionHistoryBySongId.get(singleLink.song_id) ?? []).find(
          (version) => version.id !== singleLink.featured_version_id,
        ) ?? null
      : null;
    const singlePreviewAsset = featuredVersion?.preview_asset_id
      ? previewAssetsById.get(featuredVersion.preview_asset_id) ?? null
      : null;
    const singleProtectedAsset = singleLink
      ? protectedAssetByVersionId.get(singleLink.featured_version_id) ?? null
      : null;
    const singleProtectedReadUrl = singleProtectedAsset
      ? protectedReadUrls.get(singleProtectedAsset.id) ?? null
      : null;
    const metrics = metricsByPostId.get(post.id);

    const card: ResolvedPostCard = {
      post,
      owner: ownersById.get(post.owner_id) ?? null,
      artwork: post.artwork_asset_id ? artworksById.get(post.artwork_asset_id) ?? null : null,
      single: singleLink
        ? {
            song: (() => {
              const song = songsById.get(singleLink.song_id) ?? null;
              return song
                ? {
                    ...song,
                    lyrics: getVisiblePostLyrics({
                      lyrics: song.lyrics,
                      showLyrics: singleLink.show_lyrics,
                      ownerId: post.owner_id,
                      viewerId,
                    }),
                  }
                : null;
            })(),
            showLyrics: Boolean(singleLink.show_lyrics),
            featuredVersion,
            previousVersion,
            previewAsset: singlePreviewAsset,
            protectedPreview: singleProtectedAsset && singleProtectedReadUrl
              ? { asset: singleProtectedAsset, readUrl: singleProtectedReadUrl }
              : null,
            versionHeartCount: singleLink.featured_version_id
              ? versionHeartCounts.get(singleLink.featured_version_id) ?? Number(metrics?.featured_version_heart_count ?? 0)
              : 0,
            viewerHasHeartedVersion: singleLink.featured_version_id
              ? viewerHeartedVersionIds.has(singleLink.featured_version_id)
              : false,
          }
        : null,
      releaseTracks: (tracksByPostId.get(post.id) ?? []).map((track) => {
        const version = track.song_version_id ? versionsById.get(track.song_version_id) ?? null : null;
        const previewAssetId = track.preview_asset_id ?? version?.preview_asset_id ?? null;
        const previewAsset = previewAssetId ? previewAssetsById.get(previewAssetId) ?? null : null;
        const protectedAsset = track.song_version_id
          ? protectedAssetByVersionId.get(track.song_version_id) ?? null
          : null;
        const protectedReadUrl = protectedAsset ? protectedReadUrls.get(protectedAsset.id) ?? null : null;
        const song = songsById.get(track.song_id) ?? null;

        return {
          track,
          song: song
            ? {
                ...song,
                lyrics: getVisiblePostLyrics({
                  lyrics: song.lyrics,
                  showLyrics: track.show_lyrics,
                  ownerId: post.owner_id,
                  viewerId,
                }),
              }
            : null,
          version,
          versionLabel: version?.version_label ?? null,
          previewAsset,
          protectedPreview: protectedAsset && protectedReadUrl
            ? { asset: protectedAsset, readUrl: protectedReadUrl }
            : null,
          versionHeartCount: track.song_version_id ? versionHeartCounts.get(track.song_version_id) ?? 0 : 0,
          viewerHasHeartedVersion: track.song_version_id ? viewerHeartedVersionIds.has(track.song_version_id) : false,
        } satisfies ResolvedReleaseTrack;
      }),
      comments: [],
      heartCount: Number(metrics?.heart_count ?? 0),
      viewerHasHearted: viewerHeartedPostIds.has(post.id),
      versionHeartCount: singleLink?.featured_version_id
        ? versionHeartCounts.get(singleLink.featured_version_id) ?? Number(metrics?.featured_version_heart_count ?? 0)
        : 0,
      viewerHasHeartedVersion: singleLink?.featured_version_id
        ? viewerHeartedVersionIds.has(singleLink.featured_version_id)
        : false,
      commentCount: Number(metrics?.comment_count ?? 0),
      credits: [],
      externalLinks: [],
      feedEvent: latestFeedEventByPostId.get(post.id) ?? null,
    };

    return [card];
  });
}

export async function getResolvedPostCardsByIds(
  postIds: string[],
  viewerId?: string | null,
): Promise<ResolvedPostCard[]> {
  const uniquePostIds = [...new Set(postIds.filter(Boolean))].slice(0, 50);
  if (!uniquePostIds.length) return [];

  const resolvedViewerId = getViewerId(viewerId);
  if (isDemoModeEnabled()) {
    await createDemoDelay();
    return uniquePostIds
      .map((postId) => resolveDemoPost(postId, resolvedViewerId))
      .filter((post): post is ResolvedPostCard => Boolean(post));
  }

  const client = requireSupabase();
  const { data, error } = await client.rpc("get_resolved_post_cards", {
    target_post_ids: uniquePostIds,
  });

  if (error) {
    if (!hasWarnedAboutMissingOptimizedPostCards) {
      hasWarnedAboutMissingOptimizedPostCards = true;
      console.warn(
        "Optimized post-card loading is unavailable until the latest migration is applied; using the compatible fallback.",
        error.message,
      );
    }
    return resolveSupabasePostCardsFallback(uniquePostIds, resolvedViewerId);
  }

  const cardsById = new Map(
    await Promise.all(
      ((data ?? []) as Array<{ post_id: string; card: OptimizedPostCardPayload }>).map(async (row) => [
        row.post_id,
        await attachProtectedCardReadUrls(row.card),
      ] as const),
    ),
  );
  return uniquePostIds.flatMap((postId) => {
    const card = cardsById.get(postId);
    return card ? [card] : [];
  });
}

export async function listResolvedPosts(params?: {
  visibility?: Visibility;
  postType?: PostType | "all";
  ownerId?: string;
  search?: string;
  viewerId?: string | null;
  limit?: number;
  offset?: number;
}): Promise<ResolvedPostCard[]> {
  const viewerId = getViewerId(params?.viewerId);

  if (isDemoModeEnabled()) {
    await createDemoDelay();
    const matchingPosts = demoPosts
      .filter((post) => (params?.visibility ? post.visibility === params.visibility : true))
      .filter((post) => (params?.postType && params.postType !== "all" ? post.post_type === params.postType : true))
      .filter((post) => (params?.ownerId ? post.owner_id === params.ownerId : true))
      .filter((post) => {
        if (!params?.search) {
          return true;
        }
        const query = params.search.toLowerCase();
        return (
          post.title.toLowerCase().includes(query) ||
          (post.description ?? "").toLowerCase().includes(query) ||
          getDemoProfileById(post.owner_id)?.display_name.toLowerCase().includes(query)
        );
      })
      .map((post) => resolveDemoPost(post.id, viewerId)!)
      .sort((left, right) => new Date(right.post.activity_at).getTime() - new Date(left.post.activity_at).getTime());
    const offset = Math.max(0, params?.offset ?? 0);
    return typeof params?.limit === "number"
      ? matchingPosts.slice(offset, offset + Math.max(0, params.limit))
      : matchingPosts.slice(offset);
  }

  const client = requireSupabase();
  let query = client.from("posts").select("id").order("activity_at", { ascending: false });

  if (params?.visibility) {
    query = query.eq("visibility", params.visibility);
  }
  if (params?.postType && params.postType !== "all") {
    query = query.eq("post_type", params.postType);
  }
  if (params?.ownerId) {
    query = query.eq("owner_id", params.ownerId);
  }
  if (params?.search) {
    query = query.or(`title.ilike.%${params.search}%,description.ilike.%${params.search}%`);
  }
  if (typeof params?.limit === "number") {
    const offset = Math.max(0, params.offset ?? 0);
    const limit = Math.max(1, params.limit);
    query = query.range(offset, offset + limit - 1);
  } else if (params?.offset) {
    query = query.range(Math.max(0, params.offset), Math.max(0, params.offset) + 999);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return getResolvedPostCardsByIds(
    ((data ?? []) as Array<{ id: string }>).map((row) => row.id),
    viewerId,
  );
}

export async function getResolvedPostById(postId: string, viewerId?: string | null) {
  const resolvedViewerId = getViewerId(viewerId);

  if (isDemoModeEnabled()) {
    await createDemoDelay();
    return resolveDemoPost(postId, resolvedViewerId);
  }

  const [baseCard] = await getResolvedPostCardsByIds([postId], resolvedViewerId);
  if (!baseCard) return null;

  const client = requireSupabase();
  const [commentsResult, commentEngagementResult, creditsResult, externalLinksResult] = await Promise.all([
    client
      .from("comments")
      .select("*, author:profiles!comments_author_id_fkey(*)")
      .eq("post_id", postId)
      .order("created_at", { ascending: true }),
    client.rpc("get_comment_engagement", { target_post_id: postId }),
    client.from("post_credits").select("*").eq("post_id", postId).order("position"),
    client.from("post_external_links").select("*").eq("post_id", postId).order("position"),
  ]);

  if (commentsResult.error) throw commentsResult.error;
  if (creditsResult.error) throw creditsResult.error;
  if (externalLinksResult.error) throw externalLinksResult.error;
  if (commentEngagementResult.error && !hasWarnedAboutMissingCommentEngagement) {
    hasWarnedAboutMissingCommentEngagement = true;
    console.warn(
      "Comment engagement is unavailable until the latest migration is applied.",
      commentEngagementResult.error.message,
    );
  }

  const commentEngagement = new Map(
    ((commentEngagementResult.data ?? []) as Array<{
      comment_id: string;
      heart_count: number | string;
      reply_count: number | string;
      viewer_has_hearted: boolean;
    }>).map((entry) => [entry.comment_id, entry]),
  );
  const comments = ((commentsResult.data ?? []) as Array<ResolvedComment>).map((comment) => ({
    ...comment,
    author: (comment as { author: ResolvedComment["author"] }).author ?? null,
    heartCount: Number(commentEngagement.get(comment.id)?.heart_count ?? 0),
    replyCount: Number(commentEngagement.get(comment.id)?.reply_count ?? 0),
    viewerHasHearted: Boolean(commentEngagement.get(comment.id)?.viewer_has_hearted),
  }));

  return {
    ...baseCard,
    comments,
    commentCount: comments.filter((comment) => !comment.deleted_at).length,
    credits: (creditsResult.data ?? []) as PostCredit[],
    externalLinks: (externalLinksResult.data ?? []) as PostExternalLink[],
  };
}

export async function findSinglePostBySongId(songId: string) {
  if (isDemoModeEnabled()) {
    await createDemoDelay(120);
    const singleLink = demoSinglePosts.find((entry) => entry.song_id === songId);
    return singleLink ? demoPosts.find((post) => post.id === singleLink.post_id) ?? null : null;
  }

  const client = requireSupabase();
  const { data: singleLink, error } = await client
    .from("single_posts")
    .select("post_id")
    .eq("song_id", songId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!singleLink) {
    return null;
  }

  const { data: post, error: postError } = await client
    .from("posts")
    .select("*")
    .eq("id", singleLink.post_id)
    .maybeSingle();

  if (postError) {
    throw postError;
  }

  return post;
}

export async function publishSingleVersion(input: {
  versionId: string;
}) {
  if (isDemoModeEnabled()) {
    await createDemoDelay(250);
    return;
  }

  const client = requireSupabase();
  const { error } = await client.rpc("publish_single_version", {
    version_id: input.versionId,
  });

  if (error) {
    throw error;
  }
}

export async function createSinglePost(input: {
  ownerId: string;
  songId: string;
  featuredVersionId: string;
  values: SinglePublishValues;
}) {
  if (isDemoModeEnabled()) {
    await createDemoDelay(250);
    return demoPosts[0];
  }

  const client = requireSupabase();
  const { data: post, error } = await client.rpc("create_single_post", {
    target_song_id: input.songId,
    target_version_id: input.featuredVersionId,
    target_title: input.values.title,
    target_description: input.values.description || "",
    target_artwork_asset_id: input.values.artwork_asset_id || null,
    target_visibility: input.values.visibility,
  });

  if (error) {
    throw error;
  }

  const { error: lyricsVisibilityError } = await client
    .from("single_posts")
    .update({ show_lyrics: input.values.show_lyrics })
    .eq("post_id", post.id);

  if (lyricsVisibilityError) {
    throw lyricsVisibilityError;
  }

  return post;
}

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
}) {
  if (isDemoModeEnabled()) {
    await createDemoDelay(250);
    return demoPosts[1];
  }

  const client = requireSupabase();
  const { data: post, error } = await client.rpc("create_release_post", {
    next_post_type: input.postType,
    next_title: input.title,
    next_description: input.description ?? "",
    next_release_url: input.releaseUrl ?? "",
    next_artwork_asset_id: input.artworkAssetId ?? null,
    next_visibility: input.visibility,
    next_tracks: input.tracks,
  });

  if (error) {
    throw new Error(getApiErrorMessage(error, "Could not create the release."));
  }

  return post as Post;
}

export async function updateSinglePostForPublish(input: {
  postId: string;
  featuredVersionId: string;
  title: string;
  description?: string;
  artworkAssetId?: string | null;
  visibility: Visibility;
  showLyrics: boolean;
}) {
  if (isDemoModeEnabled()) {
    await createDemoDelay(180);
    return;
  }

  const client = requireSupabase();
  const published = input.visibility !== "private";
  const { error: postError } = await client
    .from("posts")
    .update({
      title: input.title.trim(),
      description: input.description?.trim() || null,
      artwork_asset_id: input.artworkAssetId ?? null,
      visibility: input.visibility,
      is_published: published,
      published_at: published ? new Date().toISOString() : null,
      activity_at: new Date().toISOString(),
    })
    .eq("id", input.postId);
  if (postError) throw postError;

  const { error: singleError } = await client
    .from("single_posts")
    .update({
      featured_version_id: input.featuredVersionId,
      show_lyrics: input.showLyrics,
    })
    .eq("post_id", input.postId);
  if (singleError) throw singleError;
}

export async function updateSingleLyricsVisibility(input: {
  postId: string;
  showLyrics: boolean;
}) {
  if (isDemoModeEnabled()) {
    await createDemoDelay(120);
    return;
  }

  const client = requireSupabase();
  const { data, error } = await client
    .from("single_posts")
    .update({ show_lyrics: input.showLyrics })
    .eq("post_id", input.postId)
    .select("post_id")
    .maybeSingle();

  if (error) {
    throw error;
  }
  if (!data) {
    throw new Error("Only the release owner can change lyrics visibility.");
  }
}

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
}) {
  if (isDemoModeEnabled()) {
    await createDemoDelay(220);
    return;
  }

  const client = requireSupabase();
  const { error } = await client.rpc("update_release_post", {
    target_post_id: input.postId,
    next_title: input.title,
    next_description: input.description ?? "",
    next_release_url: input.releaseUrl ?? "",
    next_artwork_asset_id: input.artworkAssetId ?? null,
    next_tracks: input.tracks,
  });

  if (error) {
    throw error;
  }
}

export async function updatePostVisibility(postId: string, visibility: Visibility) {
  if (isDemoModeEnabled()) {
    await createDemoDelay(120);
    return;
  }
  const client = requireSupabase();
  const published = visibility !== "private";
  const { error } = await client
    .from("posts")
    .update({
      visibility,
      is_published: published,
      published_at: published ? new Date().toISOString() : null,
      activity_at: new Date().toISOString(),
    })
    .eq("id", postId);
  if (error) throw error;
}

export async function makeVersionsPubliclyReadable(versionIds: string[]) {
  if (isDemoModeEnabled() || versionIds.length === 0) {
    return;
  }

  const client = requireSupabase();
  const uniqueVersionIds = Array.from(new Set(versionIds));
  const now = new Date().toISOString();
  const { error } = await client
    .from("song_versions")
    .update({
      is_published: true,
      published_at: now,
      updated_at: now,
    })
    .in("id", uniqueVersionIds)
    .eq("is_published", false);

  if (error) {
    throw error;
  }
}

export async function updateSinglePost(input: {
  postId: string;
  title: string;
  description?: string;
  releaseUrl?: string;
  artworkAssetId?: string | null;
  featuredVersionId: string;
  showLyrics: boolean;
}) {
  if (isDemoModeEnabled()) {
    await createDemoDelay(220);
    return;
  }

  const client = requireSupabase();
  const [{ data: post, error: postError }, { data: singleLink, error: singleError }, { data: version, error: versionError }] =
    await Promise.all([
      client.from("posts").select("id, post_type, visibility").eq("id", input.postId).maybeSingle(),
      client.from("single_posts").select("post_id, song_id, featured_version_id").eq("post_id", input.postId).maybeSingle(),
      client.from("song_versions").select("id, song_id, preview_asset_id").eq("id", input.featuredVersionId).maybeSingle(),
    ]);

  if (postError) {
    throw postError;
  }
  if (singleError) {
    throw singleError;
  }
  if (versionError) {
    throw versionError;
  }
  if (!post || post.post_type !== "single") {
    throw new Error("Single post not found.");
  }
  if (!singleLink) {
    throw new Error("This single is not linked to a song anymore.");
  }
  if (!version) {
    throw new Error("Selected version not found.");
  }
  if (version.song_id !== singleLink.song_id) {
    throw new Error("Selected version does not belong to this single.");
  }
  if (post.visibility === "public" && !version.preview_asset_id) {
    throw new Error("Public singles need a playback-ready preview for the selected version.");
  }

  const { error: metadataError } = await client.rpc("update_release_post", {
    target_post_id: input.postId,
    next_title: input.title,
    next_description: input.description ?? "",
    next_release_url: input.releaseUrl ?? "",
    next_artwork_asset_id: input.artworkAssetId ?? null,
    next_tracks: null,
  });

  if (metadataError) {
    throw metadataError;
  }

  if (singleLink.featured_version_id !== input.featuredVersionId) {
    if (post.visibility === "public") {
      await publishSingleVersion({ versionId: input.featuredVersionId });
    } else {
      const { error: versionUpdateError } = await client
        .from("single_posts")
        .update({ featured_version_id: input.featuredVersionId })
        .eq("post_id", input.postId);

      if (versionUpdateError) {
        throw versionUpdateError;
      }
    }
  }

  const { error: lyricsVisibilityError } = await client
    .from("single_posts")
    .update({ show_lyrics: input.showLyrics })
    .eq("post_id", input.postId);

  if (lyricsVisibilityError) {
    throw lyricsVisibilityError;
  }
}

export async function addCommentToPost(input: {
  postId: string;
  authorId: string;
  values: CommentFormValues;
}) {
  if (isDemoModeEnabled()) {
    await createDemoDelay(180);
    return;
  }

  const client = requireSupabase();
  const { error } = await client.from("comments").insert({
    post_id: input.postId,
    author_id: input.authorId,
    body: input.values.body,
    parent_comment_id: input.values.parent_comment_id ?? null,
  });

  if (error) {
    throw error;
  }
}

export async function updateCommentOnPost(input: {
  commentId: string;
  authorId: string;
  body: string;
}) {
  if (isDemoModeEnabled()) {
    await createDemoDelay(160);
    return;
  }

  const client = requireSupabase();
  const { error } = await client
    .from("comments")
    .update({
      body: input.body,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.commentId)
    .eq("author_id", input.authorId);

  if (error) {
    throw error;
  }
}

export async function deleteCommentOnPost(input: {
  commentId: string;
  authorId: string;
}) {
  if (isDemoModeEnabled()) {
    await createDemoDelay(140);
    return;
  }

  const client = requireSupabase();
  const { error } = await client
    .from("comments")
    .update({
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.commentId)
    .eq("author_id", input.authorId);

  if (error) {
    throw error;
  }
}

export async function toggleCommentHeart(input: {
  commentId: string;
  profileId: string;
  active: boolean;
}) {
  if (isDemoModeEnabled()) {
    await createDemoDelay(130);
    const comment = demoComments.find((entry) => entry.id === input.commentId);
    if (input.active && comment?.author_id === input.profileId) {
      throw new Error("You cannot heart your own comment.");
    }
    return;
  }

  const client = requireSupabase();
  if (input.active) {
    const { error } = await client.from("comment_hearts").insert({
      comment_id: input.commentId,
      profile_id: input.profileId,
    });
    if (error) throw error;
    return;
  }

  const { error } = await client
    .from("comment_hearts")
    .delete()
    .eq("comment_id", input.commentId)
    .eq("profile_id", input.profileId);
  if (error) throw error;
}

export async function togglePostHeart(input: {
  postId: string;
  profileId: string;
  active: boolean;
}) {
  if (isDemoModeEnabled()) {
    await createDemoDelay(150);
    const post = demoPosts.find((entry) => entry.id === input.postId) ?? null;

    if (input.active && post?.owner_id === input.profileId) {
      throw new Error("You cannot heart your own post.");
    }

    return {
      viewerHasHearted: Boolean(input.active),
      changed: true,
    };
  }

  const client = requireSupabase();

  const [{ data: post, error: postError }, { data: existingHeart, error: heartLookupError }] = await Promise.all([
    client.from("posts").select("owner_id").eq("id", input.postId).maybeSingle(),
    client
      .from("post_hearts")
      .select("post_id")
      .eq("post_id", input.postId)
      .eq("profile_id", input.profileId)
      .maybeSingle(),
  ]);

  if (postError) {
    throw postError;
  }

  if (heartLookupError) {
    throw heartLookupError;
  }

  if (input.active && post?.owner_id === input.profileId) {
    throw new Error("You cannot heart your own post.");
  }

  if (input.active && existingHeart) {
    return {
      viewerHasHearted: true,
      changed: false,
    };
  }

  if (!input.active && !existingHeart) {
    return {
      viewerHasHearted: false,
      changed: false,
    };
  }

  if (input.active) {
    const { error } = await client.from("post_hearts").insert({
      post_id: input.postId,
      profile_id: input.profileId,
    });

    if (error) {
      throw error;
    }

    return {
      viewerHasHearted: true,
      changed: true,
    };
  }

  const { error } = await client
    .from("post_hearts")
    .delete()
    .eq("post_id", input.postId)
    .eq("profile_id", input.profileId);

  if (error) {
    throw error;
  }

  return {
    viewerHasHearted: false,
    changed: true,
  };
}

export async function toggleVersionHeart(input: {
  versionId: string;
  profileId: string;
  active: boolean;
}) {
  if (isDemoModeEnabled()) {
    await createDemoDelay(150);
    const version = demoSongVersions.find((entry) => entry.id === input.versionId) ?? null;
    const song = version ? demoSongs.find((entry) => entry.id === version.song_id) ?? null : null;

    if (input.active && song?.owner_id === input.profileId) {
      throw new Error("You cannot heart your own song.");
    }

    return {
      viewerHasHearted: Boolean(input.active),
      changed: true,
    };
  }

  const client = requireSupabase();
  const { data, error } = await client.rpc("toggle_version_heart", {
    target_version_id: input.versionId,
    should_be_active: input.active,
  });

  if (error) {
    throw error;
  }

  const result = Array.isArray(data) ? data[0] : data;
  return {
    viewerHasHearted: Boolean(result?.viewer_has_hearted),
    changed: Boolean(result?.changed),
  };
}

export async function reportPost(input: {
  reporterId: string;
  targetId: string;
  reason: string;
  details?: string;
}) {
  if (isDemoModeEnabled()) {
    await createDemoDelay(150);
    return;
  }

  const client = requireSupabase();
  const { error } = await client.from("reports").insert({
    reporter_id: input.reporterId,
    target_type: "post",
    target_id: input.targetId,
    reason: input.reason,
    details: input.details || null,
    status: "open",
  });

  if (error) {
    throw error;
  }
}

export async function deletePost(postId: string) {
  if (isDemoModeEnabled()) {
    await createDemoDelay(150);
    return;
  }

  const client = requireSupabase();
  const { error } = await client.from("posts").delete().eq("id", postId);

  if (error) {
    throw error;
  }
}

export async function listPostShareLinks(postId: string) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("share_links")
    .select("*")
    .eq("target_type", "post")
    .eq("target_id", postId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ShareLink[];
}

export async function createPostShareLink(input: {
  postId: string;
  permission?: "view" | "review";
  expiresAt?: string | null;
  maxUses?: number | null;
}) {
  const client = requireSupabase();
  const { data, error } = await client.rpc("create_share_link", {
    target_kind: "post",
    target_entity_id: input.postId,
    target_permission: input.permission ?? "view",
    target_expires_at: input.expiresAt ?? null,
    target_max_uses: input.maxUses ?? null,
  });
  if (error) throw error;
  const row = (data as Array<{ share_link_id: string; share_token: string }> | null)?.[0];
  if (!row) throw new Error("The share token was not returned.");
  return row;
}

export async function revokePostShareLink(shareLinkId: string) {
  const client = requireSupabase();
  const { error } = await client.rpc("revoke_share_link", {
    target_share_link_id: shareLinkId,
  });
  if (error) throw error;
}

export async function replaceReleaseCredits(postId: string, credits: Array<{
  profile_id?: string | null;
  display_name: string;
  role: string;
  position: number;
}>) {
  const client = requireSupabase();
  const { error } = await client.rpc("replace_release_credits", {
    target_post_id: postId,
    next_credits: credits,
  });
  if (error) throw error;
}

export async function replaceReleaseExternalLinks(postId: string, links: Array<{
  platform: string;
  label: string;
  url: string;
  position: number;
}>) {
  const client = requireSupabase();
  const { error } = await client.rpc("replace_release_external_links", {
    target_post_id: postId,
    next_links: links,
  });
  if (error) throw error;
}

export async function updateReleasePresentation(input: {
  postId: string;
  releaseNotes?: string;
  allowEmbed: boolean;
}) {
  const client = requireSupabase();
  const { error } = await client
    .from("posts")
    .update({
      release_notes: input.releaseNotes?.trim() || null,
      allow_embed: input.allowEmbed,
    })
    .eq("id", input.postId);
  if (error) throw error;
}

interface SharedPostPayload {
  post: ResolvedPostCard["post"];
  owner: ResolvedPostCard["owner"];
  artwork: ResolvedPostCard["artwork"];
  single: null | {
    song: ResolvedSingleInfo["song"];
    showLyrics: boolean;
    featuredVersion: ResolvedSingleInfo["featuredVersion"];
    previewAsset: ResolvedSingleInfo["previewAsset"];
    protectedAsset: ProtectedMediaAsset | null;
  };
  releaseTracks: Array<{
    track: ResolvedReleaseTrack["track"];
    song: ResolvedReleaseTrack["song"];
    version: ResolvedReleaseTrack["version"];
    previewAsset: ResolvedReleaseTrack["previewAsset"];
    protectedAsset: ProtectedMediaAsset | null;
  }>;
  credits: PostCredit[];
  externalLinks: PostExternalLink[];
}

export async function getSharedPostByToken(token: string): Promise<ResolvedPostCard> {
  const client = requireSupabase();
  const { data, error } = await client.rpc("resolve_shared_post", {
    supplied_token: token,
  });
  if (error) throw error;
  const payload = data as SharedPostPayload | null;
  if (!payload?.post) {
    throw new Error("This shared release is unavailable.");
  }

  async function resolveProtected(asset: ProtectedMediaAsset | null) {
    if (!asset) return null;
    return {
      asset,
      readUrl: await createProtectedMediaReadUrl(asset.id, token),
    };
  }

  return {
    post: payload.post,
    owner: payload.owner,
    artwork: payload.artwork,
    single: payload.single
      ? {
          song: payload.single.song,
          showLyrics: Boolean(payload.single.showLyrics),
          featuredVersion: payload.single.featuredVersion,
          previousVersion: null,
          previewAsset: payload.single.previewAsset,
          protectedPreview: await resolveProtected(payload.single.protectedAsset),
          versionHeartCount: 0,
          viewerHasHeartedVersion: false,
        }
      : null,
    releaseTracks: await Promise.all(payload.releaseTracks.map(async (track) => ({
      track: track.track,
      song: track.song,
      version: track.version,
      versionLabel: track.version?.version_label ?? null,
      previewAsset: track.previewAsset,
      protectedPreview: await resolveProtected(track.protectedAsset),
      versionHeartCount: 0,
      viewerHasHeartedVersion: false,
    }))),
    comments: [],
    heartCount: 0,
    viewerHasHearted: false,
    versionHeartCount: 0,
    viewerHasHeartedVersion: false,
    commentCount: 0,
    credits: payload.credits ?? [],
    externalLinks: payload.externalLinks ?? [],
    feedEvent: null,
  };
}

export async function resolveSharedLinkTarget(token: string) {
  const client = requireSupabase();
  const { data, error } = await client.rpc("resolve_share_link_target", {
    supplied_token: token,
  });
  if (error) throw error;
  if (!data) throw new Error("This share link is invalid, expired, revoked, or fully used.");
  return data as ShareLink["target_type"];
}
