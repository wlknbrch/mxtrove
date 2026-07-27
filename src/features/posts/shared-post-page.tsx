import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, ExternalLink, Play, ShieldCheck } from "lucide-react";
import { Link, useParams } from "react-router-dom";

import { usePlayerStore } from "@/components/audio/player-store";
import { MxShareMark } from "@/components/layout/mxshare-mark";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ResolvedImage } from "@/components/ui/resolved-image";
import { getSharedPostByToken, resolveSharedLinkTarget } from "@/features/posts/api";
import { SharedProjectPage } from "@/features/projects/shared-project-page";
import { buildPostPlaybackTracks, getPlaybackQueueDurationSeconds } from "@/features/posts/post-playback";
import { getArtworkAssetUrls } from "@/lib/asset-urls";
import { formatDuration } from "@/lib/utils";

export function SharedPostPage() {
  const { token = "" } = useParams();
  const enqueue = usePlayerStore((state) => state.enqueue);
  const targetQuery = useQuery({
    queryKey: ["shared-target", token],
    queryFn: () => resolveSharedLinkTarget(token),
    enabled: Boolean(token),
    retry: false,
  });
  const postQuery = useQuery({
    queryKey: ["shared-post", token],
    queryFn: () => getSharedPostByToken(token),
    enabled: Boolean(token && targetQuery.data === "post"),
    retry: false,
  });

  if (targetQuery.isPending || (targetQuery.data === "post" && postQuery.isPending)) {
    return <SharedShell><Card>Opening protected release…</Card></SharedShell>;
  }
  if (targetQuery.data === "collaboration_project" || targetQuery.data === "song_version") {
    return <SharedProjectPage token={token} />;
  }
  if (targetQuery.isError || !postQuery.data || postQuery.isError) {
    return (
      <SharedShell>
        <Card>
          <ShieldCheck className="size-8 text-accent-secondary" />
          <h1 className="mt-5 font-display text-4xl">Shared release unavailable</h1>
          <p className="mt-3 text-muted-foreground">
            This private link is invalid, expired, revoked, or has reached its access limit.
          </p>
        </Card>
      </SharedShell>
    );
  }

  const item = postQuery.data;
  const playbackTracks = buildPostPlaybackTracks(item).map((track) => ({
    ...track,
    postId: null,
  }));
  const duration = getPlaybackQueueDurationSeconds(playbackTracks);

  return (
    <SharedShell>
      <div className="grid gap-7 lg:grid-cols-[minmax(280px,480px)_minmax(0,1fr)]">
        <Card className="overflow-hidden p-3">
          <ResolvedImage
            alt={item.post.title}
            src={getArtworkAssetUrls(item.artwork)}
            className="aspect-square w-full rounded-[24px] object-cover"
          />
        </Card>

        <div className="flex flex-col justify-center">
          <div className="flex flex-wrap gap-2">
            <Badge variant="accent">{item.post.post_type}</Badge>
            <Badge variant="neutral">Private share</Badge>
            {duration ? <Badge variant="neutral">{formatDuration(duration)}</Badge> : null}
          </div>
          <h1 className="mt-5 font-display text-5xl leading-[0.95] tracking-[-0.05em] md:text-7xl">
            {item.post.title}
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            {item.owner?.display_name ?? "MxTrove artist"}
          </p>
          {item.post.description ? (
            <p className="mt-6 max-w-2xl text-base leading-8 text-muted-foreground">{item.post.description}</p>
          ) : null}
          <div className="mt-7 flex flex-wrap gap-3">
            <Button
              size="lg"
              disabled={!playbackTracks.length}
              onClick={() => enqueue(playbackTracks, playbackTracks[0]?.id)}
            >
              <Play className="size-5 fill-current" />
              Play release
            </Button>
            <Link to="/login">
              <Button size="lg" variant="secondary">
                Open MxTrove
                <ArrowUpRight className="size-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {playbackTracks.length > 1 ? (
        <Card>
          <p className="text-xs uppercase tracking-[0.22em] text-accent-secondary">Tracklist</p>
          <div className="mt-4 divide-y divide-border">
            {playbackTracks.map((track, index) => (
              <button
                key={track.id}
                type="button"
                className="flex w-full items-center gap-4 py-4 text-left"
                onClick={() => enqueue(playbackTracks, track.id)}
              >
                <span className="w-7 text-sm text-muted-foreground">{index + 1}</span>
                <span className="min-w-0 flex-1 truncate font-medium">{track.title}</span>
                <span className="text-sm text-muted-foreground">{formatDuration(track.durationSeconds)}</span>
                <Play className="size-4" />
              </button>
            ))}
          </div>
        </Card>
      ) : null}

      {item.credits.length || item.externalLinks.length ? (
        <div className="grid gap-6 md:grid-cols-2">
          {item.credits.length ? (
            <Card>
              <h2 className="font-display text-3xl">Credits</h2>
              <div className="mt-5 space-y-3">
                {item.credits.map((credit) => (
                  <div key={credit.id} className="flex items-center justify-between gap-4">
                    <span>{credit.display_name}</span>
                    <span className="text-sm capitalize text-muted-foreground">{credit.role.replace("_", " ")}</span>
                  </div>
                ))}
              </div>
            </Card>
          ) : null}
          {item.externalLinks.length ? (
            <Card>
              <h2 className="font-display text-3xl">Listen elsewhere</h2>
              <div className="mt-5 flex flex-wrap gap-2">
                {item.externalLinks.map((link) => (
                  <a key={link.id} href={link.url} target="_blank" rel="noreferrer">
                    <Button variant="secondary" size="sm">
                      {link.label}
                      <ExternalLink className="size-3.5" />
                    </Button>
                  </a>
                ))}
              </div>
            </Card>
          ) : null}
        </div>
      ) : null}
    </SharedShell>
  );
}

function SharedShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="page-shell min-h-screen px-4 py-6 pb-36 md:px-8">
      <header className="mx-auto mb-10 flex max-w-7xl items-center justify-between">
        <Link to="/login" className="flex items-center gap-3">
          <MxShareMark className="size-11" />
          <div>
            <p className="font-display text-2xl">MxTrove</p>
            <p className="text-xs text-muted-foreground">Protected listening link</p>
          </div>
        </Link>
        <Badge variant="success"><ShieldCheck className="mr-1 size-3.5" />Protected</Badge>
      </header>
      <main className="mx-auto max-w-7xl space-y-7">{children}</main>
    </div>
  );
}
