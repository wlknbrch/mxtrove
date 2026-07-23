import { useDeferredValue, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Clock3, Compass, Heart, Search, Sparkles, UserRound } from "lucide-react";
import { Link } from "react-router-dom";

import { PageHeader } from "@/components/layout/page-header";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Tabs } from "@/components/ui/tabs";
import { useAppViewer } from "@/hooks/use-app-viewer";

import { listExploreFeed, searchExploreCatalog } from "@/features/feed/api";
import { FeedPostCard } from "@/features/feed/feed-post-card";
import { CreatorDiscoverySection } from "@/features/follows/creator-discovery-section";

export function ExplorePage() {
  const viewer = useAppViewer();
  const [postType, setPostType] = useState<"all" | "single" | "ep" | "album">("all");
  const [mode, setMode] = useState<"latest" | "trending">("trending");
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);

  const feedQuery = useQuery({
    queryKey: ["explore-feed", viewer.userId, postType, deferredSearch, mode],
    queryFn: () =>
      listExploreFeed({
        postType,
        search: deferredSearch.trim() || undefined,
        viewerId: viewer.userId,
        mode,
      }),
  });
  const searchCatalogQuery = useQuery({
    queryKey: ["explore-search-catalog", viewer.userId, postType, deferredSearch],
    queryFn: () =>
      searchExploreCatalog({
        query: deferredSearch.trim(),
        viewerId: viewer.userId,
        postType,
      }),
    enabled: Boolean(deferredSearch.trim()),
  });
  const items = feedQuery.data ?? [];
  const creatorMatches = searchCatalogQuery.data?.creators ?? [];
  const activeItems = (deferredSearch.trim() ? searchCatalogQuery.data?.posts ?? [] : items).filter(
    (item): item is NonNullable<typeof item> => Boolean(item),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Explore"
        title="Explore"
        description="Public releases, active version updates, and a calmer editorial layer over the raw timeline."
        actions={
          <Link to="/search">
            <Button variant="secondary"><Search className="size-4" /> Search everything</Button>
          </Link>
        }
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
              <Tabs
                value={mode}
                onValueChange={(nextValue) => setMode(nextValue as typeof mode)}
                items={[
                  { value: "trending", label: "Trending" },
                  { value: "latest", label: "Latest" },
                ]}
              />
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
                <p className="mt-3 text-3xl font-semibold tracking-[-0.04em]">{activeItems.length}</p>
                <p className="mt-1 text-sm text-muted-foreground">Visible releases with the current filter set.</p>
              </div>
              <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
                <p className="text-xs uppercase tracking-[0.24em] text-accent-secondary/75">Mode</p>
                <p className="mt-3 text-lg font-medium capitalize text-foreground">
                  {deferredSearch.trim() ? "search" : mode}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {deferredSearch.trim()
                    ? "Search combines creator matches with public release matches."
                    : "Ranking stays intentionally simple while the visual layer does the storytelling."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {deferredSearch.trim() && creatorMatches.length ? (
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs uppercase tracking-[0.28em] text-accent-secondary/82">Matching creators</p>
            <Badge variant="neutral">{creatorMatches.length} profiles</Badge>
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            {creatorMatches.map((creator) => (
              <Card key={`${creator.result_kind}-${creator.profile_id}`}>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-4">
                    <Link to={`/@${creator.username}`}>
                      <Avatar
                        alt={creator.display_name ?? creator.username ?? "Creator"}
                        initials={(creator.display_name ?? creator.username ?? "MX").slice(0, 2).toUpperCase()}
                        className="size-14"
                      />
                    </Link>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link to={`/@${creator.username}`} className="truncate font-medium hover:text-accent-secondary">
                          {creator.display_name ?? creator.username}
                        </Link>
                        {creator.username ? (
                          <span className="text-sm text-muted-foreground">@{creator.username}</span>
                        ) : null}
                      </div>
                      <p className="mt-2 line-clamp-2 text-sm leading-7 text-muted-foreground">
                        {creator.description ?? "Public releases are searchable here once the profile is active."}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <UserRound className="size-4 text-accent-secondary" />
                    <Badge variant="neutral">{creator.followers_count ?? 0} followers</Badge>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs uppercase tracking-[0.28em] text-accent-secondary/82">
            {deferredSearch.trim() ? "Matching releases" : mode === "trending" ? "Trending now" : "Latest drops"}
          </p>
          <p className="text-sm text-muted-foreground">
            {deferredSearch.trim()
              ? "Public releases matching the current search query."
              : mode === "trending"
                ? "Trending balances hearts, comments, version hearts, and recency."
                : "Recent public activity, sorted for V1 clarity."}
          </p>
        </div>
        <div className="space-y-5">
          {activeItems.map((item) => (
            <FeedPostCard key={item.post.id} item={item} compact />
          ))}
        </div>
      </div>

      <CreatorDiscoverySection
        title="More artists to follow"
        description="Explore does not just surface releases. It should also help you shape who Home listens to next."
        limit={6}
      />
    </div>
  );
}
