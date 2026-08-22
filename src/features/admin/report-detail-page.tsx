import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, EyeOff, ShieldAlert, ShieldCheck } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { queryClient } from "@/lib/query-client";
import { formatRelativeTime } from "@/lib/utils";

import {
  getAdminReport,
  moderateReport,
  type ReportStatus,
} from "@/features/admin/api";
import { useAdminRole } from "@/features/admin/use-admin-role";
import { useAppViewer } from "@/hooks/use-app-viewer";

export function AdminReportDetailPage() {
  const { reportId = "" } = useParams();
  const [status, setStatus] = useState<ReportStatus>("reviewing");
  const [note, setNote] = useState("");
  const viewer = useAppViewer();
  const roleQuery = useAdminRole();
  const reportQuery = useQuery({
    queryKey: ["admin-report", reportId],
    queryFn: () => getAdminReport(reportId),
    enabled: Boolean(reportId && roleQuery.data),
  });
  const mutation = useMutation({
    mutationFn: (input: { hideTarget?: boolean; suspensionDays?: number | null }) =>
      moderateReport({
        reportId,
        status,
        note,
        hideTarget: input.hideTarget,
        suspensionDays: input.suspensionDays,
      }),
    onSuccess: async () => {
      setNote("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-report", reportId] }),
        queryClient.invalidateQueries({ queryKey: ["admin-reports"] }),
      ]);
      toast.success("Moderation decision saved.");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not save this decision."),
  });
  const report = reportQuery.data?.report;
  const isOwnTarget = Boolean(
    viewer.userId
    && reportQuery.data?.targetProfileId
    && viewer.userId === reportQuery.data.targetProfileId,
  );

  if (!roleQuery.isPending && !roleQuery.data) {
    return <Card><CardTitle>Administrator access required</CardTitle></Card>;
  }
  if (!reportQuery.isPending && !report) {
    return <Card><CardTitle>Report unavailable</CardTitle></Card>;
  }
  if (!report) return <Card><CardTitle>Loading report…</CardTitle></Card>;

  return (
    <div className="space-y-7">
      <Link to="/admin/reports" className="inline-flex items-center gap-2 text-sm text-accent-secondary">
        <ArrowLeft className="size-4" /> Back to reports
      </Link>
      <PageHeader
        eyebrow="Moderation case"
        title={report.subject ?? `${report.target_type.replaceAll("_", " ")} report`}
        description={report.target_type === "app_feedback"
          ? `${String(report.client_context?.kind ?? "feedback").replaceAll("_", " ")} · submitted ${formatRelativeTime(report.created_at)}`
          : `Reason: ${report.reason.replaceAll("_", " ")} · submitted ${formatRelativeTime(report.created_at)}`}
      />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>{report.target_type === "app_feedback" ? "Product feedback" : "Reported target"}</CardTitle>
                <CardDescription className="mt-2">
                  {report.target_type === "app_feedback"
                    ? "Reporter-provided reproduction details and automatic client context."
                    : "Server identifier and reporter-provided context."}
                </CardDescription>
              </div>
              <Badge variant="neutral">{report.status.replaceAll("_", " ")}</Badge>
            </CardHeader>
            <div className="space-y-4">
              {report.target_type === "app_feedback" ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[20px] border border-border bg-white/3 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-accent-secondary">Affected area</p>
                    <p className="mt-2 text-sm">{report.page_context ?? "Screenshot supplied instead"}</p>
                  </div>
                  <div className="rounded-[20px] border border-border bg-white/3 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-accent-secondary">Client</p>
                    <p className="mt-2 break-words text-sm text-muted-foreground">
                      {String(report.client_context?.viewport ?? "Unknown viewport")}
                      {report.client_context?.installed_app ? " · installed app" : " · browser"}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="rounded-[20px] border border-border bg-white/3 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-accent-secondary">Target ID</p>
                  <p className="mt-2 break-all font-mono text-sm">{report.target_id}</p>
                </div>
              )}
              <p className="whitespace-pre-wrap text-sm leading-7 text-muted-foreground">
                {report.details || "No additional details were supplied."}
              </p>
              {report.attachment_url ? (
                <a
                  href={report.attachment_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex text-sm font-medium text-accent-secondary hover:text-foreground"
                >
                  Open attached screenshot
                </a>
              ) : null}
            </div>
          </Card>
          <Card>
            <CardTitle>Internal notes</CardTitle>
            <div className="mt-4 space-y-3">
              {(reportQuery.data?.notes ?? []).map((entry) => (
                <div key={entry.id} className="rounded-[20px] border border-border bg-white/3 p-4">
                  <p className="text-sm leading-7">{entry.body}</p>
                  <p className="mt-2 text-xs text-muted-foreground">{formatRelativeTime(entry.created_at)}</p>
                </div>
              ))}
              {!(reportQuery.data?.notes ?? []).length ? (
                <p className="text-sm text-muted-foreground">No internal notes yet.</p>
              ) : null}
            </div>
          </Card>
        </div>
        <Card className="h-fit">
          <CardHeader>
            <div>
              <CardTitle>Decision</CardTitle>
              <CardDescription className="mt-2">Actions are enforced by server-side admin roles and RPC checks.</CardDescription>
            </div>
          </CardHeader>
          <div className="space-y-4">
            {isOwnTarget ? (
              <div className="rounded-[20px] border border-warning/25 bg-warning/[0.07] p-4">
                <div className="flex items-start gap-3">
                  <ShieldAlert className="mt-0.5 size-5 shrink-0 text-warning" />
                  <div>
                    <p className="font-medium">Another moderator must review this case</p>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      This report concerns your own account or content. Use the normal owner controls for your content instead of moderating yourself.
                    </p>
                  </div>
                </div>
              </div>
            ) : null}
            <Select
              value={status}
              onChange={(event) => setStatus(event.currentTarget.value as ReportStatus)}
              disabled={isOwnTarget}
            >
              <option value="open">Open</option>
              <option value="reviewing">Reviewing</option>
              <option value="action_taken">Action taken</option>
              <option value="dismissed">Dismissed</option>
            </Select>
            <Textarea
              value={note}
              onChange={(event) => setNote(event.currentTarget.value)}
              placeholder="Internal moderation note"
              disabled={isOwnTarget}
            />
            <Button fullWidth onClick={() => mutation.mutate({})} disabled={mutation.isPending || isOwnTarget}>
              <ShieldCheck className="size-4" /> Save decision
            </Button>
            {report.target_type !== "app_feedback" ? (
              <>
                <Button
                  fullWidth
                  variant="secondary"
                  onClick={() => mutation.mutate({ hideTarget: true })}
                  disabled={mutation.isPending || isOwnTarget}
                >
                  <EyeOff className="size-4" /> Hide or revoke target
                </Button>
                <Button
                  fullWidth
                  variant="danger"
                  onClick={() => {
                    if (window.confirm("Temporarily suspend the responsible account for seven days?")) {
                      mutation.mutate({ suspensionDays: 7 });
                    }
                  }}
                  disabled={mutation.isPending || isOwnTarget}
                >
                  Suspend account for 7 days
                </Button>
              </>
            ) : null}
          </div>
        </Card>
      </div>
    </div>
  );
}
