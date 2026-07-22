import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Compass, Sparkles } from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription } from "@/components/ui/card";
import { FollowButton } from "@/features/follows/follow-button";
import { listCreatorDiscovery } from "@/features/follows/api";
import { useAppViewer } from "@/hooks/use-app-viewer";

export function CreatorDiscoverySection({
  title = "Suggested creators",
  description = "Public artists worth following so Home can turn into a real signal feed.",
  limit = 4,
}: {
  title?: string;
  description?: string;
  limit?: number;
}) {
  const viewer = useAppViewer();
  const discoveryQuery = useQuery({
    queryKey: ["creator-discovery", viewer.userId, limit],
    queryFn: () =>
      listCreatorDiscovery({
        viewerId: viewer.userId,
        limit,
      }),
    enabled: Boolean(viewer.userId),
  });

  const creators = discoveryQuery.data ?? [];

  if (!creators.length) {
    return null;
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.28em] text-accent-secondary/82">
            <Compass className="size-3.5" />
            Creator discovery
          </p>
          <h2 className="mt-2 font-display text-3xl tracking-[-0.04em]">{title}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-muted-foreground">{description}</p>
        </div>
        <Badge variant="neutral">{creators.length} profiles</Badge>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {creators.map((item) => (
          <Card key={item.profile.id}>
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="flex min-w-0 gap-4">
                <Link to={`/@${item.profile.username}`}>
                  <Avatar
                    alt={item.profile.display_name}
                    initials={item.profile.display_name.slice(0, 2).toUpperCase()}
                    className="size-14"
                  />
                </Link>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link to={`/@${item.profile.username}`} className="truncate font-medium hover:text-accent-secondary">
                      {item.profile.display_name}
                    </Link>
                    <span className="text-sm text-muted-foreground">@{item.profile.username}</span>
                    {item.followsYou ? <Badge variant="accent">Follows you</Badge> : null}
                  </div>
                  <CardDescription className="mt-2 line-clamp-2">
                    {item.profile.bio?.trim() || "Fresh public releases and profile activity are ready to follow."}
                  </CardDescription>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge variant="neutral">{item.metrics.followers_count} followers</Badge>
                    <Badge variant="neutral">{item.metrics.public_posts_count} public releases</Badge>
                    {item.metrics.last_public_activity_at ? (
                      <Badge variant="neutral">Recently active</Badge>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-3">
                {item.metrics.last_public_activity_at ? (
                  <Sparkles className="size-4 text-accent-secondary/80" />
                ) : null}
                <FollowButton
                  profileId={item.profile.id}
                  isFollowing={item.viewerFollowsProfile}
                  isOwnProfile={viewer.userId === item.profile.id}
                  size="sm"
                />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}
