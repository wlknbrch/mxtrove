import { useEffect } from "react";

import { queryClient } from "@/lib/query-client";
import { getSupabaseBrowserClient } from "@/lib/supabase";

export function useFeedRealtime() {
  useEffect(() => {
    const client = getSupabaseBrowserClient();
    if (!client) return;

    const refreshFeeds = () => {
      void queryClient.invalidateQueries({ queryKey: ["home-feed"] });
      void queryClient.invalidateQueries({ queryKey: ["explore-feed"] });
      void queryClient.invalidateQueries({ queryKey: ["library-posts"] });
      void queryClient.invalidateQueries({ queryKey: ["profile-posts"] });
    };
    const channel = client
      .channel("public-feed-cache-invalidation")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "posts" },
        refreshFeeds,
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "feed_events" },
        refreshFeeds,
      );

    channel.subscribe();
    return () => {
      void client.removeChannel(channel);
    };
  }, []);
}
