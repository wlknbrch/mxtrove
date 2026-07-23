import { useDeferredValue, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";

import { PageHeader } from "@/components/layout/page-header";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { FollowButton } from "@/features/follows/follow-button";
import { listProfileConnections } from "@/features/follows/api";
import { getProfileByUsername } from "@/features/profile/api";
import { useAppViewer } from "@/hooks/use-app-viewer";
import { cn } from "@/lib/utils";
import { Users } from "lucide-react";

export function ProfileConnectionsPage({
  relation,
}: {
  relation: "followers" | "following";
}) {
  const { username = "" } = useParams();
  const viewer = useAppViewer();
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);

  const profileQuery = useQuery({
    queryKey: ["profile-by-username", username],
    queryFn: () => getProfileByUsername(username),
    enabled: Boolean(username),
  });

  const connectionsQuery = useQuery({
    queryKey: ["profile-connections", profileQuery.data?.id, relation, deferredSearch, viewer.userId],
    queryFn: () =>
      listProfileConnections({
        profileId: profileQuery.data!.id,
        relation,
        viewerId: viewer.userId,
        search: deferredSearch.trim() || undefined,
        limit: 60,
      }),
    enabled: Boolean(profileQuery.data?.id),
  });

  const profile = profileQuery.data;
  const items = connectionsQuery.data ?? [];

  if (!profile) {
    return (
      <Card>
        <CardTitle>Profile not found</CardTitle>
        <CardDescription className="mt-2">
          This artist could not be found.
        </CardDescription>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Social graph"
        title={relation === "followers" ? "Followers" : "Following"}
        description={
          relation === "followers"
            ? `People currently following @${profile.username}.`
            : `Artists and listeners @${profile.username} currently follows.`
        }
      />

      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex items-center gap-2 rounded-full border border-border bg-white/[0.02] p-1">
          <Link
            to={`/@${profile.username}/followers`}
            className={cn(
              "rounded-full px-4 py-2 text-sm transition-colors",
              relation === "followers"
                ? "bg-[linear-gradient(90deg,rgba(var(--accent-rgb),0.9),var(--accent-strong))] text-white"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Followers
          </Link>
          <Link
            to={`/@${profile.username}/following`}
            className={cn(
              "rounded-full px-4 py-2 text-sm transition-colors",
              relation === "following"
                ? "bg-[linear-gradient(90deg,rgba(var(--accent-rgb),0.9),var(--accent-strong))] text-white"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Following
          </Link>
        </div>
        <div className="w-full md:max-w-sm">
          <Input
            value={search}
            onChange={(event) => setSearch(event.currentTarget.value)}
            placeholder={`Search ${relation}`}
          />
        </div>
      </div>

      {items.length ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {items.map((item) => (
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
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link to={`/@${item.profile.username}`} className="truncate font-medium hover:text-accent-secondary">
                        {item.profile.display_name}
                      </Link>
                      <span className="text-sm text-muted-foreground">@{item.profile.username}</span>
                      {item.followsYou ? <Badge variant="accent">Follows you</Badge> : null}
                    </div>
                    <p className="line-clamp-2 text-sm leading-7 text-muted-foreground">
                      {item.profile.bio?.trim() || "No public bio yet."}
                    </p>
                    <p className="text-xs uppercase tracking-[0.2em] text-accent-secondary/75">
                      {item.metrics.followers_count} followers · {item.metrics.following_count} following · {item.metrics.public_posts_count} public releases
                    </p>
                  </div>
                </div>

                <FollowButton
                  profileId={item.profile.id}
                  isFollowing={item.viewerFollowsProfile}
                  isOwnProfile={viewer.userId === item.profile.id}
                  size="sm"
                />
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Users}
          title={relation === "followers" ? "No followers yet" : "No following yet"}
          description={
            relation === "followers"
              ? "Once people start following this profile, they will appear here."
              : "This profile is not following anyone yet, or the current search did not match anything."
          }
        />
      )}
    </div>
  );
}
