import { Link } from "react-router-dom";
import { Disc3, Layers3, Radio } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";

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
