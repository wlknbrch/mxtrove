import { requireSupabase } from "@/lib/service-utils";
import type { Profile, ReportReason } from "@/types/domain";

export type ReportStatus = "open" | "reviewing" | "action_taken" | "dismissed";

export interface AdminReport {
  id: string;
  reporter_id: string;
  target_type: "profile" | "post" | "comment" | "message" | "project_invite" | "share_link" | "app_feedback";
  target_id: string;
  reason: ReportReason;
  details: string | null;
  status: ReportStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  target_hidden_at: string | null;
  subject: string | null;
  page_context: string | null;
  attachment_url: string | null;
  client_context: Record<string, string | number | boolean | null>;
  created_at: string;
  reporter: Pick<Profile, "id" | "username" | "display_name"> | null;
}

export interface AdminReportNote {
  id: string;
  report_id: string;
  author_id: string;
  body: string;
  created_at: string;
}

export async function getCurrentAdminRole() {
  const client = requireSupabase();
  const { data, error } = await client
    .from("app_admin_roles")
    .select("role")
    .in("role", ["moderator", "admin"])
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data?.role as "moderator" | "admin" | undefined) ?? null;
}

export async function listAdminReports(status?: ReportStatus | "all") {
  const client = requireSupabase();
  let query = client
    .from("reports")
    .select("*, reporter:profiles!reports_reporter_id_fkey(id, username, display_name)")
    .order("created_at", { ascending: false })
    .limit(200);
  if (status && status !== "all") query = query.eq("status", status);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((row) => ({
    ...(row as unknown as AdminReport),
    reporter: (row as unknown as { reporter?: AdminReport["reporter"] }).reporter ?? null,
  }));
}

export async function getAdminReport(reportId: string) {
  const client = requireSupabase();
  const [{ data, error }, notesResult] = await Promise.all([
    client
      .from("reports")
      .select("*, reporter:profiles!reports_reporter_id_fkey(id, username, display_name)")
      .eq("id", reportId)
      .maybeSingle(),
    client
      .from("report_admin_notes")
      .select("*")
      .eq("report_id", reportId)
      .order("created_at", { ascending: true }),
  ]);
  if (error) throw error;
  if (notesResult.error) throw notesResult.error;
  return {
    report: data as unknown as AdminReport | null,
    notes: (notesResult.data ?? []) as AdminReportNote[],
  };
}

export async function moderateReport(input: {
  reportId: string;
  status: ReportStatus;
  note?: string;
  hideTarget?: boolean;
  suspensionDays?: number | null;
}) {
  const client = requireSupabase();
  const { error } = await client.rpc("moderate_report_v2", {
    target_report_id: input.reportId,
    next_status: input.status,
    internal_note: input.note?.trim() || null,
    hide_target: input.hideTarget ?? false,
    suspension_days: input.suspensionDays ?? null,
  });
  if (error) throw error;
}
