import { startTransition, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Disc3, Radio, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Card } from "@/components/ui/card";
import { usePlayerStore } from "@/components/audio/player-store";
import { useAppViewer } from "@/hooks/use-app-viewer";
import { getArtworkAssetUrls } from "@/lib/asset-urls";
import { env } from "@/lib/env";

import { listHomeFeed } from "@/features/feed/api";
import { FeedPostCard } from "@/features/feed/feed-post-card";
import { CreatorDiscoverySection } from "@/features/follows/creator-discovery-section";
import { buildPostPlaybackTracks } from "@/features/posts/post-playback";

export function HomePage() {
  const viewer = useAppViewer();
  const feedQuery = useQuery({
    queryKey: ["home-feed", viewer.userId],
    queryFn: () => listHomeFeed(viewer.userId),
  });
  const items = (feedQuery.data ?? []).filter((item): item is NonNullable<typeof item> => Boolean(item));
  const enqueue = usePlayerStore((state) => state.enqueue);
  const activeTrackId = usePlayerStore((state) => state.activeTrackId);
  const playableCount = items.filter((item) => buildPostPlaybackTracks(item).length > 0).length;
  const updateCount = items.filter((item) => item.feedEvent?.event_type === "single_update").length;
  const releaseCount = items.length - updateCount;
  const spotlightItem = useMemo(
    () => items.find((item) => buildPostPlaybackTracks(item).length > 0) ?? items[0] ?? null,
    [items],
  );
  const orderedItems = useMemo(() => {
    if (!spotlightItem) {
      return items;
    }

    return [spotlightItem, ...items.filter((item) => item.post.id !== spotlightItem.post.id)];
  }, [items, spotlightItem]);
  const spotlightTitle = spotlightItem?.post.title ?? "No spotlight release yet";

  useEffect(() => {
    if (!env.demoMode || activeTrackId || items.length === 0) {
      return;
    }

    const firstPlayable = items.find((item) => buildPostPlaybackTracks(item).length > 0);
    if (!firstPlayable) {
      return;
    }

    const playbackTracks = buildPostPlaybackTracks(firstPlayable);
    if (playbackTracks.length === 0) {
      return;
    }

    startTransition(() => {
      enqueue(
        [
          {
            ...playbackTracks[0],
            artworkUrl: getArtworkAssetUrls(firstPlayable.artwork),
          },
        ],
        playbackTracks[0].id,
        false,
      );
    });
  }, [activeTrackId, enqueue, items]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={env.demoMode ? "Demo mode" : "Following feed"}
        title="Home"
        description="New single versions, public releases, and activity from artists you follow."
        actions={
          <Link
            to="/create"
            className="hidden min-w-[390px] items-center justify-between gap-4 rounded-full border border-border bg-[linear-gradient(90deg,rgba(255,255,255,0.04),rgba(157,92,255,0.14)_110%)] px-6 py-3 text-sm transition-colors hover:border-border-strong md:flex"
          >
            <span className="inline-flex items-center gap-3 text-muted-foreground">
              <Sparkles className="size-4 text-accent-secondary" />
              Share an update...
            </span>
            <span className="rounded-full bg-[linear-gradient(90deg,rgba(157,92,255,0.92),rgba(183,120,255,0.94))] px-4 py-2 font-medium text-white shadow-[0_12px_26px_rgba(102,55,201,0.28)]">
              Post
            </span>
          </Link>
        }
      />

      <Card className="velvet-hero overflow-hidden border-accent/14 px-0 py-0">
        <div className="grid gap-0 xl:grid-cols-[minmax(0,1.2fr)_320px]">
          <div className="px-6 py-7 md:px-8 md:py-9 xl:px-10">
            <p className="text-xs uppercase tracking-[0.28em] text-accent-secondary/82">Public Alpha / Early Access</p>
            <p className="mt-4 max-w-3xl font-display text-4xl leading-[0.98] tracking-[-0.05em] md:text-5xl xl:text-6xl">
              A softer, deeper way to follow every version drop, release, and late-night update.
            </p>
            <p className="mt-4 max-w-2xl text-sm leading-8 text-muted-foreground md:text-base">
              Comments stay with the release, versions keep their own identity, and playback always points to the
              specific preview an artist decided to share.
            </p>
            <div className="mt-8 grid gap-3 md:grid-cols-3">
              <div className="rounded-[24px] border border-white/8 bg-white/[0.035] px-4 py-4">
                <p className="text-xs uppercase tracking-[0.24em] text-accent-secondary/80">In rotation</p>
                <p className="mt-3 text-3xl font-semibold tracking-[-0.04em]">{playableCount}</p>
                <p className="mt-1 text-sm text-muted-foreground">Playable previews in your feed.</p>
              </div>
              <div className="rounded-[24px] border border-white/8 bg-white/[0.03] px-4 py-4">
                <p className="text-xs uppercase tracking-[0.24em] text-accent-secondary/80">Fresh updates</p>
                <p className="mt-3 text-3xl font-semibold tracking-[-0.04em]">{updateCount}</p>
                <p className="mt-1 text-sm text-muted-foreground">Version changes and new notes from artists.</p>
              </div>
              <div className="rounded-[24px] border border-white/8 bg-white/[0.03] px-4 py-4">
                <p className="text-xs uppercase tracking-[0.24em] text-accent-secondary/80">Public drops</p>
                <p className="mt-3 text-3xl font-semibold tracking-[-0.04em]">{releaseCount}</p>
                <p className="mt-1 text-sm text-muted-foreground">Singles, EPs, and albums now live.</p>
              </div>
            </div>
          </div>

          <div className="border-t border-white/8 px-6 py-7 xl:border-l xl:border-t-0">
            <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.28em] text-accent-secondary/82">
              <Radio className="size-3.5" />
              Tonight&apos;s pulse
            </p>
            <div className="mt-5 space-y-3">
              <div className="rounded-[24px] border border-white/8 bg-white/[0.035] px-4 py-4">
                <p className="text-sm font-medium text-foreground">Now in focus</p>
                <p className="mt-2 font-display text-2xl tracking-[-0.04em]">{spotlightTitle}</p>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">
                  Spotlight prefers the freshest playable release. When your following graph is quiet, Home fills the
                  rest with trending and recent public drops so the page still feels alive.
                </p>
              </div>
              <div className="rounded-[24px] border border-white/8 bg-white/[0.03] px-4 py-4">
                <p className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
                  <Disc3 className="size-4 text-accent-secondary" />
                  Private previews only
                </p>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">
                  Originals stay in Drive. Feed playback only ever uses the artwork and preview the artist explicitly
                  published.
                </p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {items.length ? (
        <div className="space-y-5">
          {orderedItems.map((item, index) => (
            <FeedPostCard key={item.post.id} item={item} spotlight={index === 0} />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          <EmptyState
            icon={Sparkles}
            title="Your feed is quiet for now"
            description="Follow a few artists or publish your first single so Home can surface new versions and releases."
          />
          <CreatorDiscoverySection />
        </div>
      )}
    </div>
  );
}
