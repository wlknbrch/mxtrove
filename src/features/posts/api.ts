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
import type { CommentFormValues, SinglePublishValues } from "@/lib/validators";
import type { PostType, Visibility } from "@/types/domain";

import type { ResolvedComment, ResolvedPostCard, ResolvedReleaseTrack, ResolvedSingleInfo } from "@/features/posts/types";

function resolveDemoPost(postId: string, viewerId?: string | null) {
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
    }));
  const releaseTracks = demoReleaseTracks
    .filter((track) => track.post_id === post.id)
    .map<ResolvedReleaseTrack>((track) => ({
      track,
      song: demoSongs.find((song) => song.id === track.song_id) ?? null,
      version: demoSongVersions.find((version) => version.id === track.song_version_id) ?? null,
      previewAsset: demoAssets.find((asset) => asset.id === track.preview_asset_id) ?? null,
    }));

  return {
    post,
    owner: getDemoProfileById(post.owner_id),
    artwork,
    single: singleLink
      ? {
          song: demoSongs.find((song) => song.id === singleLink.song_id) ?? null,
          featuredVersion,
          previousVersion,
          previewAsset,
        }
      : null,
    releaseTracks,
    comments,
    heartCount: post.post_type === "single" ? 24 : 19,
    viewerHasHearted: viewerId === demoViewerProfile.id && post.id === demoPosts[0]?.id,
    versionHeartCount: featuredVersion ? 9 : 0,
    commentCount: comments.length,
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
    releaseTracksResult,
    metricsResult,
    viewerHeartResult,
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
      .is("deleted_at", null)
      .order("created_at", { ascending: true }),
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
  ]);

  ownerResult.error && console.warn(ownerResult.error.message);
  artworkResult.error && console.warn(artworkResult.error.message);
  singleResult.error && console.warn(singleResult.error.message);

  if (commentsResult.error) {
    throw commentsResult.error;
  }

  if (releaseTracksResult.error) {
    throw releaseTracksResult.error;
  }

  const singleLink = singleResult.data as { song_id: string; featured_version_id: string } | null;
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

  const releaseTracks = await Promise.all(
    ((releaseTracksResult.data ?? []) as Array<{
      id: string;
      song_id: string;
      song_version_id: string | null;
      preview_asset_id: string | null;
    }>).map(async (track) => {
      const [song, version, previewAsset] = await Promise.all([
        client.from("songs").select("*").eq("id", track.song_id).maybeSingle(),
        track.song_version_id
          ? client.from("song_versions").select("*").eq("id", track.song_version_id).maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        track.preview_asset_id
          ? client.from("assets").select("*").eq("id", track.preview_asset_id).maybeSingle()
          : Promise.resolve({ data: null, error: null }),
      ]);

      return {
        track: track as ResolvedReleaseTrack["track"],
        song: song.data as ResolvedReleaseTrack["song"],
        version: version.data as ResolvedReleaseTrack["version"],
        previewAsset: previewAsset.data as ResolvedReleaseTrack["previewAsset"],
      };
    }),
  );

  return {
    post: post as ResolvedPostCard["post"],
    owner: ownerResult.data as ResolvedPostCard["owner"],
    artwork: artworkResult.data as ResolvedPostCard["artwork"],
    single: singleLink
      ? {
          song: songResult.data as ResolvedSingleInfo["song"],
          featuredVersion: featuredVersionResult.data as ResolvedSingleInfo["featuredVersion"],
          previousVersion: previousVersionResult.data as ResolvedSingleInfo["previousVersion"],
          previewAsset: previewAssetResult.data as ResolvedSingleInfo["previewAsset"],
        }
      : null,
    releaseTracks,
    comments: ((commentsResult.data ?? []) as Array<ResolvedComment>).map((comment) => ({
      ...comment,
      author: (comment as { author: ResolvedComment["author"] }).author ?? null,
    })),
    heartCount: Number((metricsResult.data as { heart_count?: number } | null)?.heart_count ?? 0),
    viewerHasHearted: Boolean(viewerHeartResult.data),
    versionHeartCount: Number(
      (metricsResult.data as { featured_version_heart_count?: number } | null)
        ?.featured_version_heart_count ?? 0,
    ),
    commentCount: Number((metricsResult.data as { comment_count?: number } | null)?.comment_count ?? 0),
    feedEvent: null,
  };
}

export async function listResolvedPosts(params?: {
  visibility?: Visibility;
  postType?: PostType | "all";
  ownerId?: string;
  search?: string;
  viewerId?: string | null;
}) {
  const viewerId = getViewerId(params?.viewerId);

  if (isDemoModeEnabled()) {
    await createDemoDelay();
    return demoPosts
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

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  const resolved = await Promise.all(
    ((data ?? []) as Array<{ id: string }>).map((row) => resolveSupabasePost(row.id, viewerId)),
  );

  return resolved.filter(Boolean) as ResolvedPostCard[];
}

export async function getResolvedPostById(postId: string, viewerId?: string | null) {
  const resolvedViewerId = getViewerId(viewerId);

  if (isDemoModeEnabled()) {
    await createDemoDelay();
    return resolveDemoPost(postId, resolvedViewerId);
  }

  return resolveSupabasePost(postId, resolvedViewerId);
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
  const now = new Date().toISOString();
  const { data: post, error: postError } = await client
    .from("posts")
    .insert({
      owner_id: input.ownerId,
      post_type: "single",
      title: input.values.title,
      description: input.values.description || null,
      visibility: input.values.visibility,
      artwork_asset_id: input.values.artwork_asset_id || null,
      is_published: input.values.visibility === "public",
      published_at: input.values.visibility === "public" ? now : null,
      activity_at: now,
    })
    .select("*")
    .single();

  if (postError) {
    throw postError;
  }

  const { error: singleError } = await client.from("single_posts").insert({
    post_id: post.id,
    song_id: input.songId,
    featured_version_id: input.featuredVersionId,
  });

  if (singleError) {
    throw singleError;
  }

  return post;
}

export async function createReleasePost(input: {
  ownerId: string;
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
  }>;
}) {
  if (isDemoModeEnabled()) {
    await createDemoDelay(250);
    return demoPosts[1];
  }

  const client = requireSupabase();
  const now = new Date().toISOString();
  const { data: post, error } = await client
    .from("posts")
    .insert({
      owner_id: input.ownerId,
      post_type: input.postType,
      title: input.title,
      description: input.description || null,
      release_url: input.releaseUrl || null,
      artwork_asset_id: input.artworkAssetId ?? null,
      visibility: input.visibility,
      is_published: input.visibility === "public",
      published_at: input.visibility === "public" ? now : null,
      activity_at: now,
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  const { error: tracksError } = await client.from("release_tracks").insert(
    input.tracks.map((track) => ({
      post_id: post.id,
      ...track,
    })),
  );

  if (tracksError) {
    throw tracksError;
  }

  return post;
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
