import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, EyeOff, ShieldCheck } from "lucide-react";
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
  getCurrentAdminRole,
  moderateReport,
  type ReportStatus,
} from "@/features/admin/api";

export function AdminReportDetailPage() {
  const { reportId = "" } = useParams();
  const [status, setStatus] = useState<ReportStatus>("reviewing");
  const [note, setNote] = useState("");
  const roleQuery = useQuery({ queryKey: ["admin-role"], queryFn: getCurrentAdminRole });
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
        title={`${report.target_type.replaceAll("_", " ")} report`}
        description={`Reason: ${report.reason.replaceAll("_", " ")} · submitted ${formatRelativeTime(report.created_at)}`}
      />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Reported target</CardTitle>
                <CardDescription className="mt-2">Server identifier and reporter-provided context.</CardDescription>
              </div>
              <Badge variant="neutral">{report.status.replaceAll("_", " ")}</Badge>
            </CardHeader>
            <div className="space-y-4">
              <div className="rounded-[20px] border border-border bg-white/3 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-accent-secondary">Target ID</p>
                <p className="mt-2 break-all font-mono text-sm">{report.target_id}</p>
              </div>
              <p className="whitespace-pre-wrap text-sm leading-7 text-muted-foreground">
                {report.details || "No additional details were supplied."}
              </p>
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
            <Select value={status} onChange={(event) => setStatus(event.currentTarget.value as ReportStatus)}>
              <option value="open">Open</option>
              <option value="reviewing">Reviewing</option>
              <option value="action_taken">Action taken</option>
              <option value="dismissed">Dismissed</option>
            </Select>
            <Textarea value={note} onChange={(event) => setNote(event.currentTarget.value)} placeholder="Internal moderation note" />
            <Button fullWidth onClick={() => mutation.mutate({})} disabled={mutation.isPending}>
              <ShieldCheck className="size-4" /> Save decision
            </Button>
            <Button
              fullWidth
              variant="secondary"
              onClick={() => mutation.mutate({ hideTarget: true })}
              disabled={mutation.isPending}
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
              disabled={mutation.isPending}
            >
              Suspend account for 7 days
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
