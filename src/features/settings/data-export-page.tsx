import { useMutation, useQuery } from "@tanstack/react-query";
import { Archive, Download } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  listDataExportRequests,
  requestDataExport,
} from "@/features/privacy/account-api";
import { createProtectedMediaReadUrl } from "@/features/media-processing/api";
import { SettingsSidebar } from "@/features/settings/settings-shell";
import { useAppViewer } from "@/hooks/use-app-viewer";
import { queryClient } from "@/lib/query-client";
import { formatRelativeTime } from "@/lib/utils";

export function DataExportPage() {
  const viewer = useAppViewer();
  const exportsQuery = useQuery({
    queryKey: ["data-exports", viewer.userId],
    queryFn: () => listDataExportRequests(viewer.userId!),
    enabled: Boolean(viewer.userId),
    refetchInterval: (query) => query.state.data?.some((item) => ["queued", "processing"].includes(item.status))
      ? 5000
      : false,
  });
  const requestMutation = useMutation({
    mutationFn: requestDataExport,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["data-exports", viewer.userId] });
      toast.success("Data export queued.");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not request the export."),
  });

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Settings"
        title="Data export"
        description="Create a portable archive of account metadata. Personal cloud binaries stay with their provider and are referenced, not copied."
      />
      <div className="grid gap-6 2xl:grid-cols-[310px_minmax(0,1fr)]">
        <SettingsSidebar driveReady />
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="inline-flex items-center gap-3">
                <Archive className="size-5 text-accent-secondary" />
                New archive
              </CardTitle>
              <CardDescription>
                Includes profile, social graph, posts, messages, projects, feedback, credits, and cloud references.
              </CardDescription>
            </CardHeader>
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => requestMutation.mutate("json")} disabled={requestMutation.isPending}>
                Request JSON
              </Button>
              <Button variant="secondary" onClick={() => requestMutation.mutate("json_csv")} disabled={requestMutation.isPending}>
                Request JSON + CSV
              </Button>
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Export history</CardTitle>
            </CardHeader>
            <div className="space-y-3">
              {(exportsQuery.data ?? []).map((item) => (
                <div key={item.id} className="flex flex-wrap items-center gap-4 rounded-[22px] border border-border bg-surface-soft p-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{item.format === "json_csv" ? "JSON + CSV archive" : "JSON archive"}</p>
                    <p className="mt-1 text-sm text-muted-foreground">Requested {formatRelativeTime(item.requested_at)}</p>
                  </div>
                  <Badge variant={item.status === "ready" ? "success" : item.status === "failed" ? "warning" : "neutral"}>
                    {item.status}
                  </Badge>
                  {item.status === "ready" && item.protected_asset_id ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        void createProtectedMediaReadUrl(item.protected_asset_id!).then((url) => {
                          window.open(url, "_blank", "noopener,noreferrer");
                        }).catch((error) => {
                          toast.error(error instanceof Error ? error.message : "Could not open this export.");
                        });
                      }}
                    >
                      <Download className="size-4" />
                      Download
                    </Button>
                  ) : null}
                </div>
              ))}
              {!exportsQuery.isPending && !(exportsQuery.data ?? []).length ? (
                <p className="text-sm text-muted-foreground">No export has been requested yet.</p>
              ) : null}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
