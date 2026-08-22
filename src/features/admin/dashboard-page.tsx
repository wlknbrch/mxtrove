import { useDeferredValue, useState, type ComponentType } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  AudioLines,
  ChartNoAxesCombined,
  ChevronRight,
  CircleGauge,
  Clock3,
  Cloud,
  FileImage,
  Flag,
  MessageCircle,
  Music2,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserRound,
  UsersRound,
} from "lucide-react";
import { Link } from "react-router-dom";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Tabs } from "@/components/ui/tabs";
import { AdminNavigation } from "@/features/admin/admin-navigation";
import {
  ContentRemovalDialog,
  type AdminRemovalTarget,
} from "@/features/admin/content-removal-dialog";
import {
  getAdminDashboard,
  removePublicContent,
  type AdminRemovalReason,
  type AdminDashboardData,
} from "@/features/admin/api";
import { useAdminRole } from "@/features/admin/use-admin-role";
import { useAppViewer } from "@/hooks/use-app-viewer";
import { queryClient } from "@/lib/query-client";
import { formatBytes, formatRelativeTime } from "@/lib/utils";
import { toast } from "sonner";

type ActivityFilter = "all" | "releases" | "comments" | "creators" | "media";

const providerLabels: Record<string, string> = {
  google_drive: "Google Drive",
  dropbox: "Dropbox",
  onedrive: "OneDrive",
};

const reportLabels: Record<string, string> = {
  open: "Open",
  reviewing: "Reviewing",
  action_taken: "Action taken",
  dismissed: "Dismissed",
};

function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
  tone = "accent",
}: {
  label: string;
  value: string | number;
  detail: string;
  icon: ComponentType<{ className?: string }>;
  tone?: "accent" | "success" | "warning";
}) {
  const toneClasses = {
    accent: "border-accent/20 bg-accent/10 text-accent-secondary",
    success: "border-success/20 bg-success/10 text-success",
    warning: "border-warning/20 bg-warning/10 text-warning",
  };

  return (
    <Card className="min-w-0 overflow-hidden">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">{label}</p>
          <p className="mt-4 truncate font-display text-4xl font-semibold tracking-[-0.04em]">{value}</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{detail}</p>
        </div>
        <span className={`grid size-11 shrink-0 place-items-center rounded-[17px] border ${toneClasses[tone]}`}>
          <Icon className="size-5" />
        </span>
      </div>
    </Card>
  );
}

function ActivityChart({ data }: { data: AdminDashboardData["daily_activity"] }) {
  const maxTotal = Math.max(1, ...data.map((day) => day.releases + day.comments + day.creators));

  return (
    <div className="overflow-x-auto pb-2">
      <div
        className="grid min-w-[620px] items-end gap-2"
        style={{ gridTemplateColumns: `repeat(${Math.max(data.length, 1)}, minmax(24px, 1fr))` }}
      >
        {data.map((day, index) => {
          const total = day.releases + day.comments + day.creators;
          const height = total ? Math.max(10, (total / maxTotal) * 168) : 4;
          const commentShare = total ? (day.comments / total) * 100 : 0;
          const releaseShare = total ? (day.releases / total) * 100 : 0;
          const labelInterval = data.length > 20 ? 5 : data.length > 14 ? 3 : 2;
          return (
            <div key={day.date} className="group flex min-w-0 flex-col items-center gap-3">
              <div className="relative flex h-44 w-full items-end justify-center">
                <div
                  className="w-full max-w-9 overflow-hidden rounded-t-[10px] border border-white/8 bg-white/[0.025] transition-[filter,transform] group-hover:-translate-y-1 group-hover:brightness-125"
                  style={{ height }}
                  title={`${day.date}: ${day.releases} releases, ${day.comments} comments, ${day.creators} creators`}
                >
                  <div className="w-full bg-accent-secondary/85" style={{ height: `${commentShare}%` }} />
                  <div className="w-full bg-accent/90" style={{ height: `${releaseShare}%` }} />
                  <div className="min-h-1 w-full flex-1 bg-warning/80" />
                </div>
                <span className="pointer-events-none absolute -top-7 rounded-full border border-border bg-surface-strong px-2 py-1 text-[10px] opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                  {total}
                </span>
              </div>
              <span className="h-4 text-[10px] text-muted-foreground">
                {index % labelInterval === 0
                  ? new Date(`${day.date}T00:00:00`).toLocaleDateString(undefined, { day: "2-digit", month: "short" })
                  : ""}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ReleaseMix({ data }: { data: AdminDashboardData["release_mix"] }) {
  const total = data.reduce((sum, item) => sum + item.count, 0);
  const colors = ["rgb(var(--accent-rgb))", "var(--accent-secondary)", "var(--warning)"];
  let progress = 0;
  const slices = data.map((item, index) => {
    const start = total ? (progress / total) * 100 : 0;
    progress += item.count;
    const end = total ? (progress / total) * 100 : 0;
    return `${colors[index % colors.length]} ${start}% ${end}%`;
  });

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row">
      <div
        className="relative grid size-40 shrink-0 place-items-center rounded-full"
        style={{ background: slices.length ? `conic-gradient(${slices.join(",")})` : "rgba(255,255,255,0.05)" }}
      >
        <div className="grid size-[108px] place-items-center rounded-full border border-border bg-surface-strong text-center shadow-[inset_0_0_30px_rgba(0,0,0,0.16)]">
          <div>
            <p className="font-display text-3xl font-semibold">{total}</p>
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Public</p>
          </div>
        </div>
      </div>
      <div className="w-full space-y-3">
        {data.map((item, index) => (
          <div key={item.type} className="flex items-center justify-between gap-4 rounded-[18px] border border-border bg-white/[0.025] px-4 py-3">
            <span className="flex items-center gap-3 text-sm capitalize">
              <span className="size-2.5 rounded-full" style={{ background: colors[index % colors.length] }} />
              {item.type}
            </span>
            <span className="font-mono text-sm text-muted-foreground">{item.count}</span>
          </div>
        ))}
        {!data.length ? <p className="text-sm text-muted-foreground">No public releases yet.</p> : null}
      </div>
    </div>
  );
}

function ActivityStream({
  data,
  viewerId,
  onRemove,
}: {
  data: AdminDashboardData;
  viewerId: string | null;
  onRemove: (target: AdminRemovalTarget) => void;
}) {
  const [filter, setFilter] = useState<ActivityFilter>("all");
  const deferredFilter = useDeferredValue(filter);
  const entries = [
    ...data.recent_releases.map((item) => ({
      id: `release-${item.id}`,
      kind: "releases" as const,
      date: item.activity_at,
      title: item.title,
      description: `${item.display_name} · ${item.post_type.toUpperCase()} · ${item.heart_count} hearts · ${item.comment_count} comments`,
      to: `/post/${item.id}`,
      icon: Music2,
      removalTarget: item.owner_id === viewerId
        ? null
        : { type: "post" as const, id: item.id, label: item.title },
    })),
    ...data.recent_comments.map((item) => ({
      id: `comment-${item.id}`,
      kind: "comments" as const,
      date: item.created_at,
      title: `${item.display_name} on ${item.post_title}`,
      description: item.body,
      to: `/post/${item.post_id}`,
      icon: MessageCircle,
      removalTarget: item.author_id === viewerId
        ? null
        : { type: "comment" as const, id: item.id, label: item.body },
    })),
    ...data.recent_creators.map((item) => ({
      id: `creator-${item.id}`,
      kind: "creators" as const,
      date: item.created_at,
      title: item.display_name,
      description: `@${item.username} · ${item.public_release_count} public releases`,
      to: `/${item.username}`,
      icon: UserRound,
      removalTarget: null,
    })),
    ...data.recent_media.map((item) => ({
      id: `media-${item.id}`,
      kind: "media" as const,
      date: item.created_at,
      title: item.asset_type === "cover_artwork" ? `Artwork · ${item.post_title}` : `Audio preview · ${item.post_title}`,
      description: `${providerLabels[item.provider] ?? item.provider} · ${formatBytes(item.bytes)}`,
      to: `/post/${item.post_id}`,
      icon: item.asset_type === "cover_artwork" ? FileImage : AudioLines,
      removalTarget: null,
    })),
  ]
    .filter((item) => deferredFilter === "all" || item.kind === deferredFilter)
    .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime())
    .slice(0, 18);

  return (
    <Card>
      <CardHeader className="flex-col lg:flex-row lg:items-center">
        <div>
          <CardTitle>Public activity stream</CardTitle>
          <CardDescription className="mt-2">A focused timeline of content already visible on MxTrove.</CardDescription>
        </div>
        <Tabs
          value={filter}
          onValueChange={(value) => setFilter(value as ActivityFilter)}
          wrap
          items={[
            { value: "all", label: "All" },
            { value: "releases", label: "Releases" },
            { value: "comments", label: "Comments" },
            { value: "creators", label: "Creators" },
            { value: "media", label: "Media" },
          ]}
          className="lg:w-auto"
        />
      </CardHeader>
      <div className="divide-y divide-border overflow-hidden rounded-[24px] border border-border">
        {entries.map((entry) => {
          const Icon = entry.icon;
          return (
            <div
              key={entry.id}
              className="group grid gap-4 bg-white/[0.018] px-4 py-4 transition-colors hover:bg-accent/[0.07] sm:grid-cols-[42px_minmax(0,1fr)_auto] sm:items-center"
            >
              <span className="grid size-10 place-items-center rounded-[15px] border border-accent/18 bg-accent/10 text-accent-secondary">
                <Icon className="size-4" />
              </span>
              <Link to={entry.to} className="min-w-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate font-medium">{entry.title}</p>
                  <Badge variant="neutral">{entry.kind}</Badge>
                </div>
                <p className="mt-1 line-clamp-2 text-sm leading-6 text-muted-foreground">{entry.description}</p>
              </Link>
              <div className="flex items-center justify-between gap-3 sm:justify-end">
                <span className="text-xs text-muted-foreground">{formatRelativeTime(entry.date)}</span>
                {entry.removalTarget ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:bg-danger/10 hover:text-danger"
                    onClick={() => onRemove(entry.removalTarget!)}
                    aria-label={`Remove ${entry.kind === "releases" ? "release" : "comment"}`}
                  >
                    <Trash2 className="size-4" />
                    <span className="hidden xl:inline">Remove</span>
                  </Button>
                ) : null}
                <Link to={entry.to} aria-label={`Open ${entry.title}`} className="rounded-full p-2 text-muted-foreground transition-colors hover:text-accent-secondary">
                  <ChevronRight className="size-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
            </div>
          );
        })}
        {!entries.length ? (
          <div className="px-5 py-10 text-center text-sm text-muted-foreground">No public activity in this view.</div>
        ) : null}
      </div>
    </Card>
  );
}

export function AdminDashboardPage() {
  const viewer = useAppViewer();
  const [windowDays, setWindowDays] = useState(14);
  const [removalTarget, setRemovalTarget] = useState<AdminRemovalTarget | null>(null);
  const roleQuery = useAdminRole();
  const dashboardQuery = useQuery({
    queryKey: ["admin-dashboard", windowDays],
    queryFn: () => getAdminDashboard(windowDays),
    enabled: Boolean(roleQuery.data),
    staleTime: 60_000,
  });
  const removalMutation = useMutation({
    mutationFn: ({ target, reason }: { target: AdminRemovalTarget; reason: AdminRemovalReason }) =>
      removePublicContent({ targetType: target.type, targetId: target.id, reason }),
    onSuccess: async (_, variables) => {
      setRemovalTarget(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-reports"] }),
        queryClient.invalidateQueries({ queryKey: ["posts"] }),
        queryClient.invalidateQueries({ queryKey: ["feed"] }),
      ]);
      toast.success(`${variables.target.type === "post" ? "Release" : "Comment"} removed from MxTrove.`);
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "The content could not be removed."),
  });

  if (!roleQuery.isPending && !roleQuery.data) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="Administrator access required"
        description="This dashboard is protected by the server-managed moderator or administrator role."
      />
    );
  }

  const dashboard = dashboardQuery.data;

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="MxTrove control room"
        title="Public pulse"
        description="Monitor visible community activity, inspect public releases and media, and move directly into moderation without crossing into private libraries or conversations."
        actions={(
          <Button
            variant="ghost"
            onClick={() => void dashboardQuery.refetch()}
            disabled={dashboardQuery.isFetching}
          >
            <RefreshCw className={`size-4 ${dashboardQuery.isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        )}
      />

      <AdminNavigation />

      {dashboardQuery.isError ? (
        <Card className="border-danger/25 bg-danger/[0.06]">
          <CardTitle>Dashboard data unavailable</CardTitle>
          <CardDescription className="mt-2">
            {dashboardQuery.error instanceof Error ? dashboardQuery.error.message : "The public monitoring snapshot could not be loaded."}
          </CardDescription>
        </Card>
      ) : null}

      {!dashboard ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((item) => <Card key={item} className="h-40 animate-pulse bg-white/[0.025]" />)}
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Public releases"
              value={dashboard.totals.public_releases}
              detail="Published and currently visible"
              icon={Music2}
            />
            <MetricCard
              label="Public comments"
              value={dashboard.totals.public_comments}
              detail="Deleted and private threads excluded"
              icon={MessageCircle}
              tone="success"
            />
            <MetricCard
              label="Discoverable creators"
              value={dashboard.totals.discoverable_creators}
              detail="Public profiles available for discovery"
              icon={UsersRound}
            />
            <MetricCard
              label="Moderation queue"
              value={dashboard.totals.open_reports}
              detail={`${dashboard.totals.reports_last_30_days} reports received in 30 days`}
              icon={Flag}
              tone={dashboard.totals.open_reports ? "warning" : "success"}
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.75fr)]">
            <Card className="overflow-hidden">
              <CardHeader className="flex-col sm:flex-row sm:items-center">
                <div>
                  <CardTitle>Activity velocity</CardTitle>
                  <CardDescription className="mt-2">Releases, comments, and newly discoverable creators per day.</CardDescription>
                </div>
                <Tabs
                  value={String(windowDays)}
                  onValueChange={(value) => setWindowDays(Number(value))}
                  items={[
                    { value: "14", label: "14 days" },
                    { value: "30", label: "30 days" },
                  ]}
                />
              </CardHeader>
              <div className="mb-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-2"><i className="size-2 rounded-full bg-accent-secondary" /> Comments</span>
                <span className="flex items-center gap-2"><i className="size-2 rounded-full bg-accent" /> Releases</span>
                <span className="flex items-center gap-2"><i className="size-2 rounded-full bg-warning" /> Creators</span>
              </div>
              <ActivityChart data={dashboard.daily_activity} />
            </Card>

            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Release shape</CardTitle>
                  <CardDescription className="mt-2">The public catalogue by format.</CardDescription>
                </div>
                <ChartNoAxesCombined className="size-5 text-accent-secondary" />
              </CardHeader>
              <ReleaseMix data={dashboard.release_mix} />
            </Card>
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(310px,0.55fr)]">
            <ActivityStream data={dashboard} viewerId={viewer.userId} onRemove={setRemovalTarget} />

            <div className="space-y-6">
              <Card className="border-success/15 bg-[linear-gradient(145deg,rgba(var(--success-rgb),0.08),rgba(255,255,255,0.015))]">
                <CardHeader>
                  <div>
                    <CardTitle>Privacy boundary</CardTitle>
                    <CardDescription className="mt-2">Enforced inside the dashboard RPC, not by visual filters.</CardDescription>
                  </div>
                  <ShieldCheck className="size-5 text-success" />
                </CardHeader>
                <div className="space-y-3 text-sm">
                  {[
                    "Only public, published releases",
                    "Only comments on public releases",
                    "Only discoverable public profiles",
                    "No private originals or unused assets",
                    "No messages or attachments",
                  ].map((label) => (
                    <div key={label} className="flex items-center gap-3 rounded-[17px] border border-success/10 bg-success/[0.045] px-3 py-2.5">
                      <ShieldCheck className="size-3.5 shrink-0 text-success" />
                      <span>{label}</span>
                    </div>
                  ))}
                </div>
              </Card>

              <Card>
                <CardHeader>
                  <div>
                    <CardTitle>Public media footprint</CardTitle>
                    <CardDescription className="mt-2">
                      {dashboard.totals.public_media_assets} referenced assets · {formatBytes(dashboard.totals.public_media_bytes)}
                    </CardDescription>
                  </div>
                  <Cloud className="size-5 text-accent-secondary" />
                </CardHeader>
                <div className="space-y-4">
                  {dashboard.storage_mix.map((provider) => {
                    const largest = Math.max(1, ...dashboard.storage_mix.map((item) => item.assets));
                    return (
                      <div key={provider.provider}>
                        <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                          <span>{providerLabels[provider.provider] ?? provider.provider}</span>
                          <span className="font-mono text-xs text-muted-foreground">{provider.assets} · {formatBytes(provider.bytes)}</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-white/[0.045]">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-accent to-accent-secondary"
                            style={{ width: `${Math.max(4, (provider.assets / largest) * 100)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                  {!dashboard.storage_mix.length ? <p className="text-sm text-muted-foreground">No public media references yet.</p> : null}
                </div>
              </Card>

              <Card>
                <CardHeader>
                  <div>
                    <CardTitle>Moderation status</CardTitle>
                    <CardDescription className="mt-2">Current report-case distribution.</CardDescription>
                  </div>
                  <CircleGauge className="size-5 text-warning" />
                </CardHeader>
                <div className="space-y-2">
                  {dashboard.report_statuses.map((item) => (
                    <div key={item.status} className="flex items-center justify-between rounded-[17px] border border-border bg-white/[0.025] px-3 py-2.5 text-sm">
                      <span>{reportLabels[item.status] ?? item.status}</span>
                      <Badge variant={item.status === "open" ? "warning" : item.status === "action_taken" ? "success" : "neutral"}>{item.count}</Badge>
                    </div>
                  ))}
                </div>
                <Link to="/admin/reports" className="mt-4 flex items-center justify-between rounded-[18px] border border-accent/18 bg-accent/[0.07] px-4 py-3 text-sm text-accent-secondary transition-colors hover:bg-accent/12">
                  Open moderation queue
                  <ChevronRight className="size-4" />
                </Link>
              </Card>

              <Card className="border-warning/15 bg-warning/[0.035]">
                <div className="flex items-start gap-4">
                  <Clock3 className="mt-1 size-5 shrink-0 text-warning" />
                  <div>
                    <CardTitle className="text-lg">Compliance runway</CardTitle>
                    <CardDescription className="mt-2 leading-6">
                      The report queue is ready for a future DSA notice flow. Legal-basis capture, reporter confirmation, statements of reasons, and appeals remain a separate release.
                    </CardDescription>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </>
      )}

      <ContentRemovalDialog
        target={removalTarget}
        pending={removalMutation.isPending}
        onClose={() => {
          if (!removalMutation.isPending) setRemovalTarget(null);
        }}
        onConfirm={(reason) => {
          if (removalTarget) removalMutation.mutate({ target: removalTarget, reason });
        }}
      />
    </div>
  );
}
