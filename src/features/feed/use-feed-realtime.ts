import { useEffect } from "react";

import { queryClient } from "@/lib/query-client";
import { getSupabaseBrowserClient } from "@/lib/supabase";

export function useFeedRealtime() {
  useEffect(() => {
    const client = getSupabaseBrowserClient();
    if (!client) return;

    let refreshTimer: number | null = null;
    const refreshFeeds = () => {
      if (refreshTimer !== null) window.clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(() => {
        refreshTimer = null;
        void queryClient.invalidateQueries({ queryKey: ["home-feed"], refetchType: "active" });
        void queryClient.invalidateQueries({ queryKey: ["explore-feed"], refetchType: "active" });
        void queryClient.invalidateQueries({ queryKey: ["library-posts"], refetchType: "active" });
        void queryClient.invalidateQueries({ queryKey: ["profile-posts"], refetchType: "active" });
      }, 1_500);
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
      if (refreshTimer !== null) window.clearTimeout(refreshTimer);
      void client.removeChannel(channel);
    };
  }, []);
}
