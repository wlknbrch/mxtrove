import { useEffect } from "react";
import type { QueryClient } from "@tanstack/react-query";

import { getSupabaseBrowserClient } from "@/lib/supabase";

export function useConversationRealtime(
  conversationId: string,
  viewerId: string | null,
  queryClient: QueryClient,
) {
  useEffect(() => {
    const client = getSupabaseBrowserClient();
    if (!client || !conversationId || !viewerId) {
      return;
    }

    const channel = client
      .channel(`conversation:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          void queryClient.invalidateQueries({ queryKey: ["conversation", conversationId] });
          void queryClient.invalidateQueries({ queryKey: ["conversations", viewerId] });
          void queryClient.invalidateQueries({ queryKey: ["messages-unread", viewerId] });
        },
      );
    channel.subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [conversationId, queryClient, viewerId]);
}
