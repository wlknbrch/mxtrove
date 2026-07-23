import { useEffect } from "react";
import type { QueryClient } from "@tanstack/react-query";

import { getSupabaseBrowserClient } from "@/lib/supabase";

const realtimeTables = [
  { table: "collaboration_projects", column: "id" },
  { table: "collaboration_project_members", column: "project_id" },
  { table: "collaboration_project_tracks", column: "project_id" },
  { table: "collaboration_activity", column: "project_id" },
  { table: "feedback_threads", column: "project_id" },
  { table: "feedback_replies", column: "project_id" },
  { table: "protected_media_assets", column: "project_id" },
] as const;

export function useProjectRealtime(projectId: string | undefined, queryClient: QueryClient) {
  useEffect(() => {
    const client = getSupabaseBrowserClient();
    if (!client || !projectId) {
      return;
    }

    const channel = client.channel(`project:${projectId}`);
    realtimeTables.forEach(({ table, column }) => {
      channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table,
          filter: `${column}=eq.${projectId}`,
        },
        () => {
          void queryClient.invalidateQueries({ queryKey: ["project", projectId] });
          void queryClient.invalidateQueries({ queryKey: ["projects"] });
        },
      );
    });
    channel.subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [projectId, queryClient]);
}
