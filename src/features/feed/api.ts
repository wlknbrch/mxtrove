import { demoFeedEvents } from "@/lib/demo-data";
import { createDemoDelay, isDemoModeEnabled, requireSupabase } from "@/lib/service-utils";

import { getResolvedPostById, listResolvedPosts } from "@/features/posts/api";

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
    return demoFeedEvents
      .slice()
      .sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime())
      .map((event) => {
        const post = resolvedById.get(event.post_id);
        if (!post) {
          return null;
        }

        return {
          ...post,
          feedEvent: event,
        };
      })
      .filter((post): post is NonNullable<typeof post> => Boolean(post));
  }

  const client = requireSupabase();
  const { data, error } = await client
    .rpc("list_home_feed_post_ids", {
      limit_count: 50,
      offset_count: 0,
    });

  if (error) {
    throw error;
  }

  const uniquePostIds = ((data ?? []) as Array<{ post_id: string }>).map((row) => row.post_id);
  const resolvedPosts = await listResolvedPosts({ visibility: "public", viewerId });
  const resolvedById = new Map(resolvedPosts.map((post) => [post.post.id, post]));
  return uniquePostIds
    .map((postId) => resolvedById.get(postId) ?? null)
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
