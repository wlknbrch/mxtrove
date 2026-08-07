import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Flag, ShieldAlert } from "lucide-react";
import { Link } from "react-router-dom";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Tabs } from "@/components/ui/tabs";
import { formatRelativeTime } from "@/lib/utils";

import { getCurrentAdminRole, listAdminReports, type ReportStatus } from "@/features/admin/api";

export function AdminReportsPage() {
  const [status, setStatus] = useState<ReportStatus | "all">("open");
  const roleQuery = useQuery({ queryKey: ["admin-role"], queryFn: getCurrentAdminRole });
  const reportsQuery = useQuery({
    queryKey: ["admin-reports", status],
    queryFn: () => listAdminReports(status),
    enabled: Boolean(roleQuery.data),
  });

  if (!roleQuery.isPending && !roleQuery.data) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="Administrator access required"
        description="MxTrove checks the server-managed admin role before any report data is loaded."
      />
    );
  }

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Administration"
        title="Reports and feedback"
        description="Review moderation reports and signed-in product feedback, document decisions, and apply narrowly scoped actions."
      />
      <Tabs
        value={status}
        onValueChange={(value) => setStatus(value as ReportStatus | "all")}
        items={[
          { value: "open", label: "Open" },
          { value: "reviewing", label: "Reviewing" },
          { value: "action_taken", label: "Action taken" },
          { value: "dismissed", label: "Dismissed" },
          { value: "all", label: "All" },
        ]}
      />
      <div className="space-y-4">
        {(reportsQuery.data ?? []).map((report) => (
          <Link key={report.id} to={`/admin/reports/${report.id}`} className="block">
            <Card className="transition-colors hover:border-accent/30">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle>{report.subject ?? report.target_type.replaceAll("_", " ")}</CardTitle>
                    <Badge variant="warning">{report.reason.replaceAll("_", " ")}</Badge>
                    <Badge variant="neutral">{report.status.replaceAll("_", " ")}</Badge>
                  </div>
                  <CardDescription className="mt-2 line-clamp-2">
                    {report.details || "No additional report details."}
                  </CardDescription>
                  <p className="mt-3 text-xs text-muted-foreground">
                    Reported by {report.reporter?.display_name ?? report.reporter?.username ?? "Unknown account"} · {formatRelativeTime(report.created_at)}
                  </p>
                </div>
                <Flag className="size-5 shrink-0 text-accent-secondary" />
              </div>
            </Card>
          </Link>
        ))}
        {!reportsQuery.isPending && !(reportsQuery.data ?? []).length ? (
          <EmptyState icon={Flag} title="No reports in this view" description="The current moderation queue is clear." />
        ) : null}
      </div>
    </div>
  );
}
