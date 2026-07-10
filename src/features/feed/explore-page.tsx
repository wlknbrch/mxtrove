import { useDeferredValue, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Clock3, Compass, Heart, Sparkles } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useAppViewer } from "@/hooks/use-app-viewer";

import { listExploreFeed } from "@/features/feed/api";
import { FeedPostCard } from "@/features/feed/feed-post-card";

export function ExplorePage() {
  const viewer = useAppViewer();
  const [postType, setPostType] = useState<"all" | "single" | "ep" | "album">("all");
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);

  const feedQuery = useQuery({
    queryKey: ["explore-feed", viewer.userId, postType, deferredSearch],
    queryFn: () =>
      listExploreFeed({
        postType,
        search: deferredSearch.trim() || undefined,
        viewerId: viewer.userId,
      }),
  });
  const items = feedQuery.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Explore"
        title="Explore"
        description="Public releases, active version updates, and a calmer editorial layer over the raw timeline."
      />

      <Card className="velvet-hero overflow-hidden border-accent/14 px-0 py-0">
        <div className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="px-6 py-7 md:px-8">
            <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.28em] text-accent-secondary/82">
              <Compass className="size-3.5" />
              Discover public releases
            </p>
            <div className="mt-5 grid gap-4 md:grid-cols-[220px_minmax(0,1fr)_auto]">
              <Select value={postType} onChange={(event) => setPostType(event.currentTarget.value as typeof postType)}>
                <option value="all">All release types</option>
                <option value="single">Singles</option>
                <option value="ep">EPs</option>
                <option value="album">Albums</option>
              </Select>
              <Input
                placeholder="Search artist, song, or release"
                value={search}
                onChange={(event) => setSearch(event.currentTarget.value)}
              />
              <Button
                variant="secondary"
                aria-label="Trending balances hearts and recency"
                title="Trending balances hearts and recency"
                className="gap-2"
              >
                <Heart className="size-4" />
                <Clock3 className="size-4" />
              </Button>
            </div>
            <div className="mt-6 grid gap-3 md:grid-cols-2">
              <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
                <p className="text-xs uppercase tracking-[0.24em] text-accent-secondary/75">Editorial layer</p>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  Explore stays intentionally transparent: a calm layout on top of recent public activity instead of a
                  mysterious algorithm.
                </p>
              </div>
              <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
                <p className="text-xs uppercase tracking-[0.24em] text-accent-secondary/75">Why it works</p>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  The filter bar narrows the library, while the feed cards carry artwork, version state, and playback
                  context.
                </p>
              </div>
            </div>
          </div>
          <div className="border-t border-white/8 px-6 py-7 xl:border-l xl:border-t-0">
            <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.28em] text-accent-secondary/82">
              <Sparkles className="size-3.5" />
              Filter status
            </p>
            <div className="mt-5 grid gap-3">
              <div className="rounded-[22px] border border-white/8 bg-white/[0.035] px-4 py-4">
                <p className="text-xs uppercase tracking-[0.24em] text-accent-secondary/75">Results</p>
                <p className="mt-3 text-3xl font-semibold tracking-[-0.04em]">{items.length}</p>
                <p className="mt-1 text-sm text-muted-foreground">Visible releases with the current filter set.</p>
              </div>
              <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
                <p className="text-xs uppercase tracking-[0.24em] text-accent-secondary/75">Mode</p>
                <p className="mt-3 text-lg font-medium capitalize text-foreground">{postType}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Ranking stays intentionally simple while the visual layer does the storytelling.
                </p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs uppercase tracking-[0.28em] text-accent-secondary/82">Latest drops</p>
          <p className="text-sm text-muted-foreground">Recent public activity, sorted for V1 clarity.</p>
        </div>
        <div className="space-y-5">
          {items.map((item) => (
            <FeedPostCard key={item.post.id} item={item} compact />
          ))}
        </div>
      </div>
    </div>
  );
}
