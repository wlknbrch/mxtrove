import { demoFeedEvents } from "@/lib/demo-data";
import { createDemoDelay, isDemoModeEnabled, requireSupabase } from "@/lib/service-utils";

import { listResolvedPosts } from "@/features/posts/api";

export async function listHomeFeed(viewerId: string | null) {
  if (!viewerId && !isDemoModeEnabled()) {
    return [];
  }

  if (isDemoModeEnabled()) {
    await createDemoDelay();
    const posts = await listResolvedPosts({ visibility: "public", viewerId });
    return posts.map((post) => ({
      ...post,
      feedEvent: demoFeedEvents.find((event) => event.post_id === post.post.id) ?? post.feedEvent,
    }));
  }

  const client = requireSupabase();
  const { data, error } = await client
    .from("feed_events")
    .select("post_id")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  const uniquePostIds = Array.from(new Set(((data ?? []) as Array<{ post_id: string }>).map((row) => row.post_id)));
  const posts = await Promise.all(
    uniquePostIds.map((postId) =>
      listResolvedPosts({ visibility: "public", viewerId }).then(
        (list) => list.find((entry) => entry.post.id === postId) ?? null,
      ),
    ),
  );
  return posts.filter(Boolean);
}

export async function listExploreFeed(params?: {
  postType?: "single" | "ep" | "album" | "all";
  search?: string;
  viewerId?: string | null;
}) {
  return listResolvedPosts({
    visibility: "public",
    postType: params?.postType ?? "all",
    search: params?.search,
    viewerId: params?.viewerId,
  });
}
