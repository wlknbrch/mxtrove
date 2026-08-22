import { demoFeedEvents } from "@/lib/demo-data";
import { createDemoDelay, isDemoModeEnabled, requireSupabase } from "@/lib/service-utils";
import type { FeedEvent } from "@/types/domain";

import { getResolvedPostCardsByIds, listResolvedPosts } from "@/features/posts/api";
import type { ResolvedPostCard } from "@/features/posts/types";

export const HOME_FEED_PAGE_SIZE = 6;
export const EXPLORE_FEED_PAGE_SIZE = 8;

function mergeUniquePostIds(groups: string[][], limit: number) {
  const seen = new Set<string>();
  const orderedIds: string[] = [];

  groups.forEach((group) => {
    group.forEach((postId) => {
      if (seen.has(postId) || orderedIds.length >= limit) {
        return;
      }

      seen.add(postId);
      orderedIds.push(postId);
    });
  });

  return orderedIds;
}

function getLatestFeedEventByPostId(feedEvents: FeedEvent[]) {
  const latestByPostId = new Map<string, FeedEvent>();

  feedEvents
    .slice()
    .sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime())
    .forEach((event) => {
      if (!latestByPostId.has(event.post_id)) {
        latestByPostId.set(event.post_id, event);
      }
    });

  return latestByPostId;
}

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

export interface HomeFeedPage {
  items: ResolvedPostCard[];
  nextOffset: number | null;
}

async function resolveFeedPosts(postIds: string[], viewerId?: string | null) {
  return getResolvedPostCardsByIds(postIds, viewerId);
}

export async function listHomeFeedPage(
  viewerId: string | null,
  options: { offset?: number; limit?: number } = {},
): Promise<HomeFeedPage> {
  const offset = Math.max(0, options.offset ?? 0);
  const limit = Math.max(1, options.limit ?? HOME_FEED_PAGE_SIZE);

  if (!viewerId && !isDemoModeEnabled()) {
    return { items: [], nextOffset: null };
  }

  if (isDemoModeEnabled()) {
    await createDemoDelay();
    const posts = await listResolvedPosts({ visibility: "public", viewerId });
    const resolvedById = new Map(posts.map((post) => [post.post.id, post]));
    const latestFeedEventByPostId = getLatestFeedEventByPostId(demoFeedEvents);
    const orderedIds = mergeUniquePostIds(
      [
        demoFeedEvents
          .slice()
          .sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime())
          .map((event) => event.post_id),
        posts.map((post) => post.post.id),
      ],
      Number.MAX_SAFE_INTEGER,
    );
    const pageIds = orderedIds.slice(offset, offset + limit);
    const items = pageIds
      .map((postId) => {
        const post = resolvedById.get(postId);
        if (!post) {
          return null;
        }

        return {
          ...post,
          feedEvent: latestFeedEventByPostId.get(postId) ?? post.feedEvent ?? null,
        };
      })
      .filter((post): post is NonNullable<typeof post> => Boolean(post));

    return {
      items,
      nextOffset: offset + pageIds.length < orderedIds.length
        ? offset + pageIds.length
        : null,
    };
  }

  const client = requireSupabase();
  const [
    { data: homeRows, error: homeError },
    { data: trendingRows, error: trendingError },
    { data: latestRows, error: latestError },
  ] =
    await Promise.all([
      client.rpc("list_home_feed_post_ids", {
        limit_count: limit + 1,
        offset_count: offset,
      }),
      client.rpc("list_trending_public_post_ids", {
        limit_count: limit + 1,
        offset_count: offset,
      }),
      client
        .from("posts")
        .select("id")
        .eq("visibility", "public")
        .order("activity_at", { ascending: false })
        .range(offset, offset + limit),
    ]);

  if (homeError) {
    throw homeError;
  }

  if (trendingError) {
    throw trendingError;
  }
  if (latestError) {
    throw latestError;
  }

  const primaryPostIds = ((homeRows ?? []) as Array<{ post_id: string }>).map((row) => row.post_id);
  const trendingPostIds = ((trendingRows ?? []) as Array<{ post_id: string }>).map((row) => row.post_id);
  const latestPublicPostIds = ((latestRows ?? []) as Array<{ id: string }>).map((row) => row.id);
  const orderedPostIds = mergeUniquePostIds(
    [primaryPostIds, trendingPostIds, latestPublicPostIds],
    limit,
  );
  const resolvedPosts = await resolveFeedPosts(orderedPostIds, viewerId);
  const resolvedById = new Map(
    resolvedPosts
      .filter((post): post is ResolvedPostCard => Boolean(post))
      .map((post) => [post.post.id, post]),
  );

  const items = orderedPostIds
    .map((postId) => {
      const post = resolvedById.get(postId);
      if (!post) {
        return null;
      }

      return {
        ...post,
        feedEvent: post.feedEvent ?? null,
      };
    })
    .filter((post): post is NonNullable<typeof post> => Boolean(post));
  const hasMore =
    primaryPostIds.length > limit
    || trendingPostIds.length > limit
    || latestPublicPostIds.length > limit;

  return {
    items,
    nextOffset: hasMore ? offset + limit : null,
  };
}

export async function listExploreFeedPage(params?: {
  postType?: "single" | "ep" | "album" | "all";
  viewerId?: string | null;
  mode?: "latest" | "trending";
  offset?: number;
  limit?: number;
}): Promise<HomeFeedPage> {
  const offset = Math.max(0, params?.offset ?? 0);
  const limit = Math.max(1, params?.limit ?? EXPLORE_FEED_PAGE_SIZE);

  if (params?.mode === "trending" && !isDemoModeEnabled()) {
    const client = requireSupabase();
    const { data, error } = await client.rpc("list_trending_public_post_ids", {
      limit_count: limit + 1,
      offset_count: offset,
    });

    if (error) {
      throw error;
    }

    const rankedPostIds = ((data ?? []) as Array<{ post_id: string }>).map((row) => row.post_id);
    const pagePostIds = rankedPostIds.slice(0, limit);
    const resolvedPosts = await resolveFeedPosts(pagePostIds, params.viewerId);

    return {
      items: resolvedPosts
      .filter(Boolean)
      .filter((post) => (params?.postType && params.postType !== "all" ? post!.post.post_type === params.postType : true)),
      nextOffset: rankedPostIds.length > limit ? offset + limit : null,
    };
  }

  const resolvedPosts = await listResolvedPosts({
    visibility: "public",
    postType: params?.postType ?? "all",
    viewerId: params?.viewerId,
    limit: limit + 1,
    offset,
  });
  return {
    items: resolvedPosts.slice(0, limit),
    nextOffset: resolvedPosts.length > limit ? offset + limit : null,
  };
}

export async function searchExploreCatalog(params: {
  query: string;
  viewerId?: string | null;
  postType?: "single" | "ep" | "album" | "all";
}) {
  if (isDemoModeEnabled()) {
    await createDemoDelay(180);
    const posts = await listResolvedPosts({
      visibility: "public",
      postType: params.postType ?? "all",
      search: params.query,
      viewerId: params.viewerId,
    });

    return {
      creators: [],
      posts,
    };
  }

  const client = requireSupabase();
  const { data, error } = await client.rpc("search_public_catalog", {
    raw_query: params.query,
    limit_count: 30,
    offset_count: 0,
  });

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as ExploreCatalogResult[];
  const postRows = rows.filter((row) => row.result_kind === "post" && row.post_id);
  const creatorRows = rows.filter((row) => row.result_kind === "creator");
  const resolvedPosts = await resolveFeedPosts(
    postRows.map((row) => row.post_id!),
    params.viewerId,
  );

  return {
    creators: creatorRows,
    posts: resolvedPosts
      .filter(Boolean)
      .filter((post) => (params.postType && params.postType !== "all" ? post!.post.post_type === params.postType : true)),
  };
}
