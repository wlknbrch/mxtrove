import { useDeferredValue, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  ArrowUpRight,
  Clock3,
  FolderKanban,
  MessageSquareText,
  Plus,
  UsersRound,
} from "lucide-react";
import { Link } from "react-router-dom";

import { PageHeader } from "@/components/layout/page-header";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Tabs } from "@/components/ui/tabs";
import { listPendingInvites, listProjects } from "@/features/projects/api";
import { useAppViewer } from "@/hooks/use-app-viewer";
import { useOfflineSnapshot } from "@/hooks/use-offline-snapshot";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { formatRelativeTime } from "@/lib/utils";

type ProjectFilter = "all" | "owned" | "collaborating" | "reviewing" | "completed" | "archived";

const filterItems = [
  { value: "all", label: "All" },
  { value: "owned", label: "Owned" },
  { value: "collaborating", label: "Collaborating" },
  { value: "reviewing", label: "Reviewing" },
  { value: "completed", label: "Completed" },
  { value: "archived", label: "Archived" },
];

export function ProjectsPage() {
  const viewer = useAppViewer();
  const isOnline = useOnlineStatus();
  const [filter, setFilter] = useState<ProjectFilter>("all");
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search.trim().toLowerCase());
  const projectsQuery = useQuery({
    queryKey: ["projects", viewer.userId],
    queryFn: () => listProjects(viewer.userId!),
    enabled: Boolean(viewer.userId),
  });
  const invitesQuery = useQuery({
    queryKey: ["project-invites", viewer.userId],
    queryFn: () => listPendingInvites(viewer.userId!),
    enabled: Boolean(viewer.userId),
  });
  const projectsSnapshot = useOfflineSnapshot(
    `mxshare:offline:v2:projects:${viewer.userId ?? "guest"}`,
    projectsQuery.data,
  );
  const projectItems = projectsQuery.data ?? (!isOnline ? projectsSnapshot : null) ?? [];

  const projects = projectItems.filter((item) => {
    if (deferredSearch && !`${item.project.title} ${item.project.description ?? ""}`.toLowerCase().includes(deferredSearch)) {
      return false;
    }
    if (filter === "owned") return item.viewerRole === "owner";
    if (filter === "collaborating") return !["owner", "reviewer", "viewer"].includes(item.viewerRole);
    if (filter === "reviewing") return item.viewerRole === "reviewer";
    if (filter === "completed") return item.project.status === "completed";
    if (filter === "archived") return item.project.status === "archived";
    return item.project.status !== "archived";
  });

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Collaboration rooms"
        title="Projects"
        description="Private listening rooms for shared records, evolving versions, and feedback that lands exactly where the music needs it."
        actions={
          <Link to={isOnline ? "/projects/new" : "#"} aria-disabled={!isOnline}>
            <Button disabled={!isOnline}>
              <Plus className="size-4" />
              New project
            </Button>
          </Link>
        }
      />
      {!isOnline && projectsSnapshot ? (
        <div className="rounded-[18px] border border-warning/25 bg-warning/8 px-4 py-3 text-sm text-warning">
          Offline project snapshot. Collaboration changes are disabled until the connection returns.
        </div>
      ) : null}

      {(invitesQuery.data ?? []).length ? (
        <Link to="/invites" className="block">
          <Card className="border-accent/25 bg-accent/8 transition-colors hover:border-accent/45">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex size-12 items-center justify-center rounded-[18px] bg-accent/16 text-accent-secondary">
                <UsersRound className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium">
                  {(invitesQuery.data ?? []).length} open project invitation{(invitesQuery.data ?? []).length === 1 ? "" : "s"}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">Accept a role and enter the room.</p>
              </div>
              <ArrowUpRight className="size-5 text-accent-secondary" />
            </div>
          </Card>
        </Link>
      ) : null}

      <Card className="space-y-5">
        <div className="flex flex-col gap-4 2xl:flex-row 2xl:items-center 2xl:justify-between">
          <Tabs
            value={filter}
            onValueChange={(value) => setFilter(value as ProjectFilter)}
            items={filterItems}
            className="w-full flex-wrap 2xl:w-auto"
          />
          <Input
            value={search}
            onChange={(event) => setSearch(event.currentTarget.value)}
            placeholder="Search project titles or notes"
            className="2xl:max-w-sm"
          />
        </div>
      </Card>

      {projects.length ? (
        <div className="grid gap-5 lg:grid-cols-2 2xl:grid-cols-3">
          {projects.map((item) => (
            <Link key={item.project.id} to={`/projects/${item.project.id}`} className="group">
              <Card className="h-full transition-[transform,border-color] group-hover:-translate-y-1 group-hover:border-accent/35">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex size-14 items-center justify-center rounded-[20px] border border-accent/20 bg-accent/12 text-accent-secondary">
                    <FolderKanban className="size-6" />
                  </div>
                  <div className="flex flex-wrap justify-end gap-2">
                    <Badge variant="accent">{item.project.project_type.replace("_", " ")}</Badge>
                    <Badge variant={item.project.status === "review" ? "warning" : "neutral"}>
                      {item.project.status}
                    </Badge>
                  </div>
                </div>
                <h2 className="mt-6 font-display text-3xl tracking-[-0.04em]">{item.project.title}</h2>
                <p className="mt-3 line-clamp-2 min-h-12 text-sm leading-6 text-muted-foreground">
                  {item.project.description ?? "No project note yet. The room is ready for its first track."}
                </p>

                <div className="mt-6 flex items-center justify-between gap-4 border-t border-border pt-5">
                  <div className="flex -space-x-2">
                    {item.members.slice(0, 4).map(({ member, profile }) => (
                      <Avatar
                        key={member.profile_id}
                        alt={profile?.display_name ?? "Project member"}
                        initials={(profile?.display_name ?? "?").slice(0, 2).toUpperCase()}
                        className="size-9 border-2 border-background"
                      />
                    ))}
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <p className="inline-flex items-center gap-1.5">
                      <MessageSquareText className="size-3.5" />
                      {item.openFeedbackCount} open
                    </p>
                    <p className="mt-1 inline-flex items-center gap-1.5">
                      <Clock3 className="size-3.5" />
                      {formatRelativeTime(item.lastActivity?.created_at ?? item.project.updated_at)}
                    </p>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      ) : projectsQuery.isPending ? (
        <Card><p className="text-sm text-muted-foreground">Loading collaboration rooms…</p></Card>
      ) : projectsQuery.isError ? (
        <EmptyState
          icon={Activity}
          title="Projects could not be loaded"
          description={projectsQuery.error instanceof Error
            ? projectsQuery.error.message
            : "The collaboration catalog is currently unavailable."}
          actionLabel="Try again"
          onAction={() => void projectsQuery.refetch()}
        />
      ) : (
        <EmptyState
          icon={Activity}
          title="No projects in this view"
          description="Start a private room for a single, EP, album, or loose collection and invite collaborators when it is ready."
          actionLabel="Create the first project"
          onAction={() => window.location.assign("/projects/new")}
        />
      )}
    </div>
  );
}
