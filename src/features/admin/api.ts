import { requireSupabase } from "@/lib/service-utils";
import type { Profile, ReportReason } from "@/types/domain";

export type ReportStatus = "open" | "reviewing" | "action_taken" | "dismissed";
export type AdminRemovableContentType = "post" | "comment";
export type AdminRemovalReason =
  | "copyright"
  | "hate"
  | "harassment"
  | "sexual_content"
  | "illegal_content"
  | "spam"
  | "other";

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

export interface AdminDashboardData {
  generated_at: string;
  window_days: number;
  privacy_boundary: {
    public_releases_only: boolean;
    public_comments_only: boolean;
    discoverable_profiles_only: boolean;
    private_assets_excluded: boolean;
    messages_excluded: boolean;
  };
  totals: {
    public_releases: number;
    public_comments: number;
    discoverable_creators: number;
    public_media_assets: number;
    public_media_bytes: number;
    open_reports: number;
    reports_last_30_days: number;
  };
  daily_activity: Array<{
    date: string;
    releases: number;
    comments: number;
    creators: number;
  }>;
  release_mix: Array<{ type: "single" | "ep" | "album"; count: number }>;
  storage_mix: Array<{ provider: string; assets: number; bytes: number }>;
  report_statuses: Array<{ status: ReportStatus; count: number }>;
  recent_releases: Array<{
    id: string;
    title: string;
    post_type: "single" | "ep" | "album";
    activity_at: string;
    owner_id: string;
    username: string;
    display_name: string;
    heart_count: number;
    comment_count: number;
  }>;
  recent_comments: Array<{
    id: string;
    body: string;
    created_at: string;
    post_id: string;
    post_title: string;
    author_id: string;
    username: string;
    display_name: string;
    heart_count: number;
    reply_count: number;
  }>;
  recent_creators: Array<{
    id: string;
    username: string;
    display_name: string;
    created_at: string;
    public_release_count: number;
  }>;
  recent_media: Array<{
    id: string;
    asset_type: "audio_preview" | "cover_artwork";
    provider: string;
    bytes: number | null;
    created_at: string;
    post_id: string;
    post_title: string;
  }>;
}

function asCount(value: unknown) {
  const count = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(count) ? count : 0;
}

function normalizeDashboard(data: unknown): AdminDashboardData {
  const dashboard = (data ?? {}) as Partial<AdminDashboardData>;
  const totals = dashboard.totals ?? ({} as AdminDashboardData["totals"]);
  return {
    generated_at: dashboard.generated_at ?? new Date().toISOString(),
    window_days: asCount(dashboard.window_days) || 14,
    privacy_boundary: {
      public_releases_only: dashboard.privacy_boundary?.public_releases_only !== false,
      public_comments_only: dashboard.privacy_boundary?.public_comments_only !== false,
      discoverable_profiles_only: dashboard.privacy_boundary?.discoverable_profiles_only !== false,
      private_assets_excluded: dashboard.privacy_boundary?.private_assets_excluded !== false,
      messages_excluded: dashboard.privacy_boundary?.messages_excluded !== false,
    },
    totals: {
      public_releases: asCount(totals.public_releases),
      public_comments: asCount(totals.public_comments),
      discoverable_creators: asCount(totals.discoverable_creators),
      public_media_assets: asCount(totals.public_media_assets),
      public_media_bytes: asCount(totals.public_media_bytes),
      open_reports: asCount(totals.open_reports),
      reports_last_30_days: asCount(totals.reports_last_30_days),
    },
    daily_activity: (dashboard.daily_activity ?? []).map((item) => ({
      ...item,
      releases: asCount(item.releases),
      comments: asCount(item.comments),
      creators: asCount(item.creators),
    })),
    release_mix: (dashboard.release_mix ?? []).map((item) => ({ ...item, count: asCount(item.count) })),
    storage_mix: (dashboard.storage_mix ?? []).map((item) => ({
      ...item,
      assets: asCount(item.assets),
      bytes: asCount(item.bytes),
    })),
    report_statuses: (dashboard.report_statuses ?? []).map((item) => ({ ...item, count: asCount(item.count) })),
    recent_releases: (dashboard.recent_releases ?? []).map((item) => ({
      ...item,
      heart_count: asCount(item.heart_count),
      comment_count: asCount(item.comment_count),
    })),
    recent_comments: (dashboard.recent_comments ?? []).map((item) => ({
      ...item,
      heart_count: asCount(item.heart_count),
      reply_count: asCount(item.reply_count),
    })),
    recent_creators: (dashboard.recent_creators ?? []).map((item) => ({
      ...item,
      public_release_count: asCount(item.public_release_count),
    })),
    recent_media: dashboard.recent_media ?? [],
  };
}

export async function getCurrentAdminRole(profileId: string | null | undefined) {
  if (!profileId) return null;

  const client = requireSupabase();
  const { data, error } = await client
    .from("app_admin_roles")
    .select("role")
    .eq("profile_id", profileId)
    .in("role", ["moderator", "admin"]);
  if (error) throw error;

  if (data?.some((entry) => entry.role === "admin")) return "admin" as const;
  if (data?.some((entry) => entry.role === "moderator")) return "moderator" as const;
  return null;
}

export async function getAdminDashboard(activityDays = 14) {
  const client = requireSupabase();
  const { data, error } = await client.rpc("get_admin_dashboard_v1", {
    activity_days: activityDays,
  });
  if (error) throw error;
  return normalizeDashboard(data);
}

export async function removePublicContent(input: {
  targetType: AdminRemovableContentType;
  targetId: string;
  reason: AdminRemovalReason;
}) {
  const client = requireSupabase();
  const { data, error } = await client.rpc("remove_public_content_for_moderation", {
    target_content_type: input.targetType,
    target_content_id: input.targetId,
    removal_reason: input.reason,
  });
  if (error) throw error;
  return data;
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
  const [{ data, error }, notesResult, targetProfileResult] = await Promise.all([
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
    client.rpc("get_admin_report_target_profile_id", { target_report_id: reportId }),
  ]);
  if (error) throw error;
  if (notesResult.error) throw notesResult.error;
  if (targetProfileResult.error) throw targetProfileResult.error;
  return {
    report: data as unknown as AdminReport | null,
    notes: (notesResult.data ?? []) as AdminReportNote[],
    targetProfileId: (targetProfileResult.data as string | null) ?? null,
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
