import { demoFeedEvents } from "@/lib/demo-data";
import { createDemoDelay, isDemoModeEnabled, requireSupabase } from "@/lib/service-utils";
import type { FeedEvent } from "@/types/domain";

import { getResolvedPostById, listResolvedPosts } from "@/features/posts/api";

const HOME_PRIMARY_LIMIT = 12;
const HOME_TRENDING_LIMIT = 12;
const HOME_FEED_LIMIT = 18;

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

export async function listHomeFeed(viewerId: string | null) {
  if (!viewerId && !isDemoModeEnabled()) {
    return [];
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
      HOME_FEED_LIMIT,
    );

    return orderedIds
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
  }

  const client = requireSupabase();
  const [{ data: homeRows, error: homeError }, { data: trendingRows, error: trendingError }, resolvedPosts] =
    await Promise.all([
      client.rpc("list_home_feed_post_ids", {
        limit_count: HOME_PRIMARY_LIMIT,
        offset_count: 0,
      }),
      client.rpc("list_trending_public_post_ids", {
        limit_count: HOME_TRENDING_LIMIT,
        offset_count: 0,
      }),
      listResolvedPosts({ visibility: "public", viewerId }),
    ]);

  if (homeError) {
    throw homeError;
  }

  if (trendingError) {
    throw trendingError;
  }

  const primaryPostIds = ((homeRows ?? []) as Array<{ post_id: string }>).map((row) => row.post_id);
  const trendingPostIds = ((trendingRows ?? []) as Array<{ post_id: string }>).map((row) => row.post_id);
  const latestPublicPostIds = resolvedPosts.map((post) => post.post.id);
  const orderedPostIds = mergeUniquePostIds(
    [primaryPostIds, trendingPostIds, latestPublicPostIds],
    HOME_FEED_LIMIT,
  );
  const resolvedById = new Map(resolvedPosts.map((post) => [post.post.id, post]));
  const feedEventsResult = orderedPostIds.length
    ? await client
        .from("feed_events")
        .select("*")
        .in("post_id", orderedPostIds)
        .order("created_at", { ascending: false })
    : { data: [], error: null };

  if (feedEventsResult.error) {
    throw feedEventsResult.error;
  }

  const latestFeedEventByPostId = getLatestFeedEventByPostId((feedEventsResult.data ?? []) as FeedEvent[]);

  return orderedPostIds
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
}

export async function listExploreFeed(params?: {
  postType?: "single" | "ep" | "album" | "all";
  search?: string;
  viewerId?: string | null;
  mode?: "latest" | "trending";
}) {
  if (params?.search?.trim()) {
    const searchResults = await searchExploreCatalog({
      query: params.search,
      viewerId: params.viewerId,
      postType: params.postType,
    });
    return searchResults.posts;
  }

  if (params?.mode === "trending" && !isDemoModeEnabled()) {
    const client = requireSupabase();
    const { data, error } = await client.rpc("list_trending_public_post_ids", {
      limit_count: 40,
      offset_count: 0,
    });

    if (error) {
      throw error;
    }

    const rankedPostIds = ((data ?? []) as Array<{ post_id: string }>).map((row) => row.post_id);
    const resolvedPosts = await Promise.all(
      rankedPostIds.map((postId) => getResolvedPostById(postId, params.viewerId)),
    );

    return resolvedPosts
      .filter(Boolean)
      .filter((post) => (params?.postType && params.postType !== "all" ? post!.post.post_type === params.postType : true));
  }

  return listResolvedPosts({
    visibility: "public",
    postType: params?.postType ?? "all",
    search: params?.search,
    viewerId: params?.viewerId,
  });
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
  const resolvedPosts = await Promise.all(
    postRows.map((row) => getResolvedPostById(row.post_id!, params.viewerId)),
  );

  return {
    creators: creatorRows,
    posts: resolvedPosts
      .filter(Boolean)
      .filter((post) => (params.postType && params.postType !== "all" ? post!.post.post_type === params.postType : true)),
  };
}
