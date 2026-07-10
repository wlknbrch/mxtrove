import { useMemo } from "react";

import { useAuth } from "@/hooks/use-auth";
import { demoViewerProfile } from "@/lib/demo-data";
import { env } from "@/lib/env";

export function useAppViewer() {
  const { user } = useAuth();

  return useMemo(
    () => ({
      userId: user?.id ?? (env.demoMode ? demoViewerProfile.id : null),
      email: user?.email ?? (env.demoMode ? "demo@mxshare.app" : null),
      isDemoViewer: !user && env.demoMode,
    }),
    [user],
  );
}
