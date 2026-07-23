import { useEffect } from "react";

import { getSupabaseBrowserClient } from "@/lib/supabase";
import { queryClient } from "@/lib/query-client";

export function useNotificationsRealtime(profileId: string | null) {
  useEffect(() => {
    const client = getSupabaseBrowserClient();
    if (!client || !profileId) return;

    const channel = client
      .channel(`notifications:${profileId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `recipient_id=eq.${profileId}`,
        },
        () => {
          void queryClient.invalidateQueries({ queryKey: ["notifications", profileId] });
          void queryClient.invalidateQueries({ queryKey: ["notifications-unread", profileId] });
        },
      );
    channel.subscribe();
    return () => {
      void client.removeChannel(channel);
    };
  }, [profileId]);
}
