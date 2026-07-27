import { useDeferredValue, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FolderKanban, MessageCircleMore, Music2, Search, UserRound } from "lucide-react";
import { Link } from "react-router-dom";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Tabs } from "@/components/ui/tabs";

import {
  getSearchResultPath,
  searchV2,
  type SearchCategory,
} from "@/features/search/api";

const categories: Array<{ value: SearchCategory | "all"; label: string }> = [
  { value: "all", label: "All" },
  { value: "creator", label: "Creators" },
  { value: "release", label: "Releases" },
  { value: "song", label: "Songs" },
  { value: "project", label: "Projects" },
  { value: "message", label: "Messages" },
];

const categoryIcons = {
  creator: UserRound,
  release: Music2,
  song: Music2,
  project: FolderKanban,
  message: MessageCircleMore,
};

export function SearchPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<SearchCategory | "all">("all");
  const deferredQuery = useDeferredValue(query.trim());
  const resultsQuery = useQuery({
    queryKey: ["search-v2", deferredQuery],
    queryFn: () => searchV2(deferredQuery),
    enabled: deferredQuery.length >= 2,
  });
  const results = (resultsQuery.data ?? []).filter(
    (result) => category === "all" || result.result_kind === category,
  );

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Search V2"
        title="Find the work around the music"
        description="Public discovery and your private collaboration context share one permission-aware search surface."
      />
      <Card className="velvet-hero">
        <label className="grid gap-3">
          <span className="text-xs uppercase tracking-[0.24em] text-accent-secondary">Search MxTrove</span>
          <Input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
            placeholder="Creator, release, song, project, feedback, or message"
          />
        </label>
        <Tabs
          className="mt-5"
          value={category}
          onValueChange={(value) => setCategory(value as typeof category)}
          items={categories}
          wrap
          stretch
        />
      </Card>
      <div className="space-y-4">
        {results.map((result) => {
          const Icon = categoryIcons[result.result_kind];
          return (
            <Link key={`${result.result_kind}:${result.result_id}`} to={getSearchResultPath(result)} className="block">
              <Card className="transition-colors hover:border-accent/30">
                <div className="flex items-center gap-4">
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-[18px] bg-accent/12 text-accent-secondary">
                    <Icon className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle className="truncate">{result.title}</CardTitle>
                      <Badge variant="neutral">{result.result_kind}</Badge>
                    </div>
                    <CardDescription className="mt-2 line-clamp-2">{result.subtitle}</CardDescription>
                  </div>
                </div>
              </Card>
            </Link>
          );
        })}
        {deferredQuery.length < 2 ? (
          <EmptyState icon={Search} title="Start with two characters" description="Only data you are allowed to access can appear here." />
        ) : !resultsQuery.isPending && !results.length ? (
          <EmptyState icon={Search} title="No matching results" description="Try a different phrase or category." />
        ) : null}
      </div>
    </div>
  );
}
