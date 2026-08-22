import { useQuery } from "@tanstack/react-query";

import { getCurrentAdminRole } from "@/features/admin/api";
import { useAppViewer } from "@/hooks/use-app-viewer";

export function useAdminRole() {
  const viewer = useAppViewer();

  return useQuery({
    queryKey: ["admin-role", viewer.userId],
    queryFn: () => getCurrentAdminRole(viewer.userId),
    enabled: Boolean(viewer.userId),
    staleTime: 5 * 60_000,
  });
}
