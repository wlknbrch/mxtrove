import { Link } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Clock3, Disc3, Layers3, Radio, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { deletePostDraft, listPostDrafts } from "@/features/posts/drafts-api";
import { getDraftFallbackTitle, getDraftRoute } from "@/features/posts/drafts";
import { useAppViewer } from "@/hooks/use-app-viewer";
import { queryClient } from "@/lib/query-client";
import { formatRelativeTime } from "@/lib/utils";

const createOptions = [
  {
    title: "Single",
    description: "Publish one track, generate the public preview from the original, and keep version history attached to the same post.",
    to: "/create/single",
    icon: Radio,
  },
  {
    title: "EP",
    description: "Group a compact release, select the songs from your library, and order the tracklist before publishing.",
    to: "/create/ep",
    icon: Layers3,
  },
  {
    title: "Album",
    description: "Build a larger release with ordered tracks while keeping later track reorders out of the public activity feed.",
    to: "/create/album",
    icon: Disc3,
  },
];

export function CreateIndexPage() {
  const viewer = useAppViewer();
  const draftsQuery = useQuery({
    queryKey: ["post-drafts", viewer.userId],
    queryFn: () => listPostDrafts(viewer.userId!),
    enabled: Boolean(viewer.userId),
  });
  const deleteDraftMutation = useMutation({
    mutationFn: deletePostDraft,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["post-drafts", viewer.userId] });
      toast.success("Draft deleted.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "The draft could not be deleted.");
    },
  });
  const drafts = draftsQuery.data ?? [];

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Create"
        title="Choose a release format"
        description="Start with a single, EP, or album. Each flow keeps the public post separate from your private library sources."
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <Card className="overflow-hidden">
            <div className="rounded-[28px] border border-accent/18 bg-[radial-gradient(circle_at_top_right,rgba(var(--accent-rgb),0.24),rgba(255,255,255,0.02)_58%,rgba(255,255,255,0.01))] p-6 md:p-7">
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="accent">Publishing flow</Badge>
                <Badge variant="neutral">Drive-aware</Badge>
              </div>
              <p className="mt-5 max-w-4xl font-display text-4xl leading-[1.02] tracking-[-0.04em] md:text-[3.4rem]">
                Pick the shape of the release first, then build the public story around it.
              </p>
              <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
                Singles keep version history attached to one post. EPs and albums let you group a larger release while
                preserving track order and shared presentation.
              </p>
            </div>
          </Card>

          <div className="grid gap-6 xl:grid-cols-3">
            {createOptions.map((option, index) => {
              const Icon = option.icon;
              return (
                <Link key={option.to} to={option.to}>
                  <Card className="h-full transition-transform hover:-translate-y-1">
                    <div className="mb-5 flex items-center justify-between gap-3">
                      <div className="flex size-14 items-center justify-center rounded-[20px] bg-[radial-gradient(circle_at_top,rgba(var(--accent-rgb),0.28),rgba(var(--accent-rgb),0.08)_60%,rgba(255,255,255,0.02))] text-accent-secondary">
                        <Icon className="size-6" />
                      </div>
                      {index === 0 ? <Badge variant="accent">Fastest</Badge> : <Badge variant="neutral">Structured</Badge>}
                    </div>
                    <CardTitle className="text-3xl">{option.title}</CardTitle>
                    <CardDescription className="mt-4 text-base leading-7">{option.description}</CardDescription>
                    <div className="mt-6 text-sm text-accent-secondary">Open flow →</div>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="space-y-6">
          <Card>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-accent-secondary/80">Your drafts</p>
                <p className="mt-2 font-display text-3xl tracking-[-0.03em]">Continue creating</p>
              </div>
              <Badge variant={drafts.length ? "accent" : "neutral"}>{drafts.length}</Badge>
            </div>

            <div className="mt-5 space-y-3">
              {draftsQuery.isLoading ? (
                <div className="rounded-[20px] border border-white/[0.06] bg-white/[0.02] px-4 py-4 text-sm text-muted-foreground">
                  Loading drafts…
                </div>
              ) : drafts.length ? (
                drafts.map((draft) => (
                  <div
                    key={draft.id}
                    className="rounded-[20px] border border-white/[0.07] bg-white/[0.025] p-4 transition-colors hover:border-accent/25"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <Link to={getDraftRoute(draft)} className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="neutral">{draft.post_type.toUpperCase()}</Badge>
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock3 className="size-3.5" />
                            {formatRelativeTime(draft.updated_at)}
                          </span>
                        </div>
                        <p className="mt-3 truncate font-medium">
                          {draft.title.trim() || getDraftFallbackTitle(draft.post_type)}
                        </p>
                        <p className="mt-1 text-sm text-accent-secondary">Continue draft →</p>
                      </Link>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="size-10 p-0"
                        aria-label={`Delete ${draft.title || draft.post_type} draft`}
                        disabled={deleteDraftMutation.isPending}
                        onClick={() => {
                          if (window.confirm("Delete this draft? Uploaded library assets will stay in your library.")) {
                            deleteDraftMutation.mutate(draft.id);
                          }
                        }}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-[20px] border border-dashed border-white/[0.09] bg-white/[0.015] px-4 py-5 text-sm leading-6 text-muted-foreground">
                  Started releases appear here automatically. Songs and uploaded assets remain linked when you return.
                </div>
              )}
            </div>
          </Card>

          <Card>
            <div className="space-y-4">
              <p className="text-xs uppercase tracking-[0.24em] text-accent-secondary/80">Good to know</p>
              <p className="font-display text-3xl tracking-[-0.03em]">Public posts are separate from your private sources.</p>
              <p className="text-sm leading-7 text-muted-foreground">
                Originals stay private in Drive. What listeners see and hear comes from the preview and artwork you
                explicitly attach to the release.
              </p>
            </div>
          </Card>

          <Card>
            <div className="space-y-3">
              {[
                "Singles are best when you want one clear story and version lineage.",
                "EPs work well for a compact cluster of songs that belong together.",
                "Albums give you more space for a broader catalog moment.",
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-[20px] border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-sm leading-7 text-muted-foreground"
                >
                  {item}
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
