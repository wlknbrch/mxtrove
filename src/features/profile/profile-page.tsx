import { useMutation, useQuery } from "@tanstack/react-query";
import {
  CalendarDays,
  ExternalLink,
  Heart,
  MapPin,
  MessageCircleMore,
  Music2,
  Share2,
  Sparkles,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import { usePlayerStore } from "@/components/audio/player-store";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { FullscreenArtwork } from "@/components/ui/fullscreen-artwork";
import { PlaybackDuration } from "@/components/ui/playback-duration";
import { ResolvedImage } from "@/components/ui/resolved-image";
import { Tabs } from "@/components/ui/tabs";
import { getAssetById } from "@/features/drive/api";
import { FollowButton } from "@/features/follows/follow-button";
import { getFollowState, getProfileMetrics } from "@/features/follows/api";
import { createDirectConversation } from "@/features/messages/api";
import { buildPostPlaybackTracks } from "@/features/posts/post-playback";
import { getAvatarAssetUrls, getArtworkAssetUrls } from "@/lib/asset-urls";
import { queryClient } from "@/lib/query-client";
import { shareWithSystemDialog } from "@/lib/native-share";
import { cn } from "@/lib/utils";
import { useAppViewer } from "@/hooks/use-app-viewer";

import { listResolvedPosts } from "@/features/posts/api";
import type { ResolvedPostCard } from "@/features/posts/types";
import { getProfileByUsername } from "@/features/profile/api";
import { isListedOnProfile } from "@/features/profile/profile-post-visibility";

function formatJoinDate(input: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" }).format(new Date(input));
}

function formatReleaseDate(input: string | null | undefined) {
  if (!input) {
    return "Draft";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(input));
}

function getReleaseMeta(item: ResolvedPostCard) {
  if (item.post.post_type === "single") {
    return item.single?.featuredVersion?.version_label ?? "Single";
  }

  return `${item.releaseTracks.length} track${item.releaseTracks.length === 1 ? "" : "s"}`;
}

function ProfileStat({
  label,
  value,
  to,
}: {
  label: string;
  value: string | number;
  to?: string;
}) {
  const content = (
    <div className="rounded-[22px] border border-white/[0.06] bg-white/[0.02] px-4 py-4">
      <p className="font-display text-3xl tracking-[-0.03em] md:text-[2.3rem]">{value}</p>
      <p className="mt-2 text-sm text-muted-foreground">{label}</p>
    </div>
  );

  if (!to) {
    return content;
  }

  return (
    <Link to={to} className="transition-transform hover:-translate-y-0.5">
      {content}
    </Link>
  );
}

function ProfileReleaseCard({
  item,
  spotlight = false,
}: {
  item: ResolvedPostCard;
  spotlight?: boolean;
}) {
  const enqueue = usePlayerStore((state) => state.enqueue);
  const playbackTracks = useMemo(() => buildPostPlaybackTracks(item), [item]);
  const primaryTrack = playbackTracks[0] ?? null;

  return (
    <Card className={cn("overflow-hidden", spotlight && "lg:grid lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-6")}>
      <FullscreenArtwork
        src={getArtworkAssetUrls(item.artwork)}
        alt={item.post.title}
        className={cn("relative overflow-hidden rounded-[24px] border border-white/[0.08] bg-background-muted", spotlight ? "min-h-[280px]" : "aspect-square")}
        imageClassName="absolute inset-0 h-full w-full object-cover"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(var(--accent-rgb),0.16),transparent_42%),linear-gradient(180deg,rgba(7,5,17,0.06),rgba(7,5,17,0.6))]" />
      </FullscreenArtwork>

      <div className={cn("space-y-4", spotlight && "py-2")}>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="accent">{item.post.post_type}</Badge>
          <Badge variant="neutral">{getReleaseMeta(item)}</Badge>
        </div>

        <div className="space-y-2">
          <CardTitle className={spotlight ? "text-4xl md:text-[3rem]" : "text-2xl"}>{item.post.title}</CardTitle>
          <CardDescription className="text-sm leading-7">
            {item.post.description ?? "No release note has been written yet."}
          </CardDescription>
        </div>

        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          <span>{formatReleaseDate(item.post.published_at ?? item.post.created_at)}</span>
          <span className="inline-flex items-center gap-2">
            <Heart className="size-4" />
            {item.heartCount}
          </span>
          <span className="inline-flex items-center gap-2">
            <MessageCircleMore className="size-4" />
            {item.commentCount}
          </span>
          {primaryTrack ? (
            <span>
              <PlaybackDuration
                src={primaryTrack.srcCandidates ?? primaryTrack.src}
                fallbackDurationSeconds={primaryTrack.durationSeconds ?? null}
              />
            </span>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-3">
          {primaryTrack ? (
            <Button
              onClick={() => enqueue(playbackTracks, primaryTrack.id, true)}
            >
              <Music2 className="size-4" />
              Play
            </Button>
          ) : null}
          <Link to={`/post/${item.post.id}`}>
            <Button variant="secondary">Open release</Button>
          </Link>
        </div>
      </div>
    </Card>
  );
}

export function ProfilePage() {
  const { username = "" } = useParams();
  const navigate = useNavigate();
  const viewer = useAppViewer();
  const [postFilter, setPostFilter] = useState<"all" | "single" | "ep" | "album">("all");

  const profileQuery = useQuery({
    queryKey: ["profile-by-username", username],
    queryFn: () => getProfileByUsername(username),
    enabled: Boolean(username),
  });

  const postsQuery = useQuery({
    queryKey: ["profile-posts", profileQuery.data?.id, viewer.userId],
    queryFn: async () => {
      const resolvedPosts = await listResolvedPosts({
        ownerId: profileQuery.data!.id,
        visibility: viewer.userId ? undefined : "public",
        viewerId: viewer.userId,
      });

      return resolvedPosts.filter((item) => isListedOnProfile(item.post.visibility));
    },
    enabled: Boolean(profileQuery.data?.id),
  });

  const avatarAssetQuery = useQuery({
    queryKey: ["asset", profileQuery.data?.avatar_asset_id],
    queryFn: () => getAssetById(profileQuery.data!.avatar_asset_id!),
    enabled: Boolean(profileQuery.data?.avatar_asset_id),
  });
  const metricsQuery = useQuery({
    queryKey: ["profile-metrics", profileQuery.data?.id, viewer.userId ?? "public"],
    queryFn: () => getProfileMetrics(profileQuery.data!.id),
    enabled: Boolean(profileQuery.data?.id),
    refetchOnMount: "always",
  });
  const followStateQuery = useQuery({
    queryKey: ["follow-state", viewer.userId, profileQuery.data?.id],
    queryFn: () => getFollowState({ viewerId: viewer.userId, profileId: profileQuery.data!.id }),
    enabled: Boolean(viewer.userId && profileQuery.data?.id && viewer.userId !== profileQuery.data.id),
  });

  const profile = profileQuery.data;
  const posts = postsQuery.data ?? [];
  const isOwnProfile = Boolean(profile?.id && viewer.userId === profile.id);
  const featuredPost =
    posts.find((item) => item.post.id === profile?.pinned_post_id) ??
    posts[0] ??
    null;
  const filteredPosts = posts.filter((item) => postFilter === "all" || item.post.post_type === postFilter);
  const metrics = metricsQuery.data ?? {
    profile_id: profile?.id ?? "",
    followers_count: 0,
    following_count: 0,
    public_posts_count: posts.length,
    single_count: posts.filter((item) => item.post.post_type === "single").length,
    ep_count: posts.filter((item) => item.post.post_type === "ep").length,
    album_count: posts.filter((item) => item.post.post_type === "album").length,
    last_public_activity_at: featuredPost?.post.activity_at ?? null,
  };
  const followState = followStateQuery.data ?? {
    viewerFollowsProfile: false,
    profileFollowsViewer: false,
  };
  const heartCount = posts.reduce((sum, item) => sum + item.heartCount, 0);
  const commentCount = posts.reduce((sum, item) => sum + item.commentCount, 0);
  const featuredArtworkUrls = getArtworkAssetUrls(featuredPost?.artwork);
  const hasFeaturedArtwork = featuredArtworkUrls.length > 0;
  const publicProfilePath = profile?.username ? `/@${profile.username}` : null;
  const followersPath = publicProfilePath ? `${publicProfilePath}/followers` : null;
  const followingPath = publicProfilePath ? `${publicProfilePath}/following` : null;
  const followerCountsVisible = metrics.follower_counts_visible !== false;

  const createConversationMutation = useMutation({
    mutationFn: async () => {
      if (!viewer.userId) {
        throw new Error("Please sign in first.");
      }
      if (!profile?.id) {
        throw new Error("This profile is unavailable.");
      }
      if (profile.id === viewer.userId) {
        throw new Error("You are already on your own profile.");
      }

      return createDirectConversation({ otherProfileId: profile.id });
    },
    onSuccess: async (conversationId) => {
      await queryClient.invalidateQueries({ queryKey: ["conversations", viewer.userId] });
      navigate(`/messages/${conversationId}`);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not start this conversation.");
    },
  });

  const profileLinks = [
    profile?.website_url
      ? { href: profile.website_url, label: "Website", className: buttonVariants({ variant: "secondary", size: "sm" }) }
      : null,
    profile?.support_url
      ? { href: profile.support_url, label: "Support", className: buttonVariants({ variant: "primary", size: "sm" }) }
      : null,
    profile?.instagram_url
      ? { href: profile.instagram_url, label: "Instagram", className: buttonVariants({ variant: "ghost", size: "sm" }) }
      : null,
    profile?.spotify_url
      ? { href: profile.spotify_url, label: "Spotify", className: buttonVariants({ variant: "ghost", size: "sm" }) }
      : null,
    profile?.youtube_url
      ? { href: profile.youtube_url, label: "YouTube", className: buttonVariants({ variant: "ghost", size: "sm" }) }
      : null,
  ].filter((link): link is { href: string; label: string; className: string } => Boolean(link));

  if (profileQuery.isPending) {
    return (
      <Card>
        <CardTitle>Loading profile</CardTitle>
        <CardDescription className="mt-2">We are pulling the artist surface together.</CardDescription>
      </Card>
    );
  }

  if (!profile) {
    return (
      <Card>
        <CardTitle>Profile not found</CardTitle>
        <CardDescription className="mt-2">
          This username does not exist or the public profile has not been completed yet.
        </CardDescription>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <Card className="relative overflow-hidden p-0">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(var(--accent-rgb),0.12),transparent_36%,rgba(255,255,255,0.02)_100%)]" />
        {hasFeaturedArtwork ? (
          <>
            <div className="pointer-events-none absolute inset-x-0 top-0 h-[72%] overflow-hidden">
              <ResolvedImage
                src={featuredArtworkUrls}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 h-full w-full scale-[1.08] object-cover opacity-18 blur-[1px]"
              />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(9,7,19,0.18)_0%,rgba(9,7,19,0.48)_48%,rgba(9,7,19,0.92)_100%)]" />
              <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(7,5,17,0.84)_10%,rgba(7,5,17,0.56)_44%,rgba(7,5,17,0.82)_100%)]" />
            </div>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(var(--accent-rgb),0.34),transparent_28%),radial-gradient(circle_at_top_right,rgba(var(--accent-rgb),0.12),transparent_24%),linear-gradient(180deg,rgba(9,7,19,0.18),rgba(9,7,19,0.94)_82%)]" />
          </>
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(var(--accent-rgb),0.28),transparent_26%),radial-gradient(circle_at_top_right,rgba(var(--accent-rgb),0.14),transparent_22%),linear-gradient(180deg,rgba(9,7,19,0.82),rgba(9,7,19,0.96))]" />
        )}

        <div className="relative space-y-8 px-6 py-6 md:px-8 md:py-8 lg:px-10 lg:py-10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Badge variant="neutral">Public profile</Badge>
            <div className="flex flex-wrap gap-3">
              <Button
                variant="secondary"
                onClick={async () => {
                  const result = await shareWithSystemDialog({
                    title: `${profile.display_name} on MxTrove`,
                    text: profile.bio ?? `Discover @${profile.username} on MxTrove.`,
                    url: `${window.location.origin}/social/profile/${encodeURIComponent(profile.username)}`,
                  });
                  if (result === "copied") {
                    toast.success("Native sharing is unavailable here, so the profile link was copied.");
                  }
                }}
              >
                <Share2 className="size-4" />
                Share profile
              </Button>
              {isOwnProfile ? (
                <Link to="/settings/profile">
                  <Button variant="secondary">Edit profile</Button>
                </Link>
              ) : (
                <>
                <FollowButton
                  profileId={profile.id}
                  isFollowing={followState.viewerFollowsProfile}
                  size="sm"
                />
                <Button
                  variant="secondary"
                  onClick={() => void createConversationMutation.mutateAsync()}
                  disabled={createConversationMutation.isPending}
                >
                  <MessageCircleMore className="size-4" />
                  Message artist
                </Button>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex max-w-4xl flex-col gap-6">
              <div className="flex flex-col gap-5 md:flex-row md:items-end">
                <div className="relative">
                  <Avatar
                    alt={profile.display_name}
                    src={getAvatarAssetUrls(avatarAssetQuery.data)}
                    initials={profile.display_name.slice(0, 2).toUpperCase()}
                    className="size-28 border-accent/35 text-lg shadow-[0_24px_54px_rgba(var(--accent-rgb),0.26)] md:size-32"
                  />
                  <div className="absolute inset-[-10px] -z-10 rounded-full bg-accent/18 blur-2xl" />
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <h1 className="font-display text-5xl tracking-[-0.05em] md:text-7xl">{profile.display_name}</h1>
                      <Badge variant="accent">Artist</Badge>
                      {isOwnProfile ? <Badge variant="neutral">You</Badge> : null}
                      {!isOwnProfile && followState.profileFollowsViewer ? <Badge variant="accent">Follows you</Badge> : null}
                    </div>
                    <p className="text-lg text-muted-foreground">@{profile.username}</p>
                  </div>

                  <p className="max-w-2xl text-base leading-8 text-muted-foreground">
                    {profile.bio ?? "Public singles, EPs, albums, and pinned work."}
                  </p>

                  <div className="flex flex-wrap gap-5 text-sm text-muted-foreground">
                    {profile.location ? (
                      <span className="inline-flex items-center gap-2">
                        <MapPin className="size-4 text-accent-secondary" />
                        {profile.location}
                      </span>
                    ) : null}
                    <span className="inline-flex items-center gap-2">
                      <CalendarDays className="size-4 text-accent-secondary" />
                      Joined {formatJoinDate(profile.created_at)}
                    </span>
                  </div>
                </div>
              </div>

              {profileLinks.length ? (
                <div className="flex flex-wrap gap-3">
                  {profileLinks.map((link) => (
                    <a
                      key={link.href}
                      href={link.href}
                      target="_blank"
                      rel="noreferrer"
                      className={link.className}
                    >
                      {link.label}
                      <ExternalLink className="size-4" />
                    </a>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="grid w-full gap-3 sm:grid-cols-2 lg:w-[360px] lg:grid-cols-1">
              <div className="rounded-[24px] border border-white/[0.08] bg-white/[0.04] px-5 py-5">
                <p className="text-xs uppercase tracking-[0.22em] text-accent-secondary/75">Profile pulse</p>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  {featuredPost
                    ? `Latest visible release: ${featuredPost.post.title}.`
                    : "No public release yet. Publish the first one to bring this page to life."}
                </p>
              </div>
              <div className="rounded-[24px] border border-white/[0.08] bg-white/[0.04] px-5 py-5">
                <p className="text-xs uppercase tracking-[0.22em] text-accent-secondary/75">Support surface</p>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  {profile.support_url
                    ? "A support link is already in place for fans who want to back the project."
                    : "Add a support link in Settings if you want this profile to convert interest into support."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <ProfileStat
          label="Followers"
          value={followerCountsVisible ? metrics.followers_count : "Private"}
          to={followerCountsVisible ? followersPath ?? undefined : undefined}
        />
        <ProfileStat
          label="Following"
          value={followerCountsVisible ? metrics.following_count : "Private"}
          to={followerCountsVisible ? followingPath ?? undefined : undefined}
        />
        <ProfileStat label="Public releases" value={metrics.public_posts_count} />
        <ProfileStat label="Singles" value={metrics.single_count} />
        <ProfileStat label="EPs" value={metrics.ep_count} />
        <ProfileStat label="Albums" value={metrics.album_count} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)]">
        {featuredPost ? (
          <ProfileReleaseCard item={featuredPost} spotlight />
        ) : (
          <Card>
            <CardTitle>No public releases yet</CardTitle>
            <CardDescription className="mt-2">
              Publish a single, EP, or album so this profile can start showing a featured release.
            </CardDescription>
          </Card>
        )}

        <Card className="space-y-4">
          <div className="flex items-center gap-3">
            <Sparkles className="size-4 text-accent-secondary" />
            <p className="font-medium">Profile summary</p>
          </div>
          <div className="space-y-3">
            <div className="rounded-[22px] border border-white/[0.06] bg-white/[0.02] px-4 py-4">
              <p className="text-sm text-muted-foreground">Total hearts</p>
              <p className="mt-2 font-display text-3xl tracking-[-0.03em]">{heartCount}</p>
            </div>
            <div className="rounded-[22px] border border-white/[0.06] bg-white/[0.02] px-4 py-4">
              <p className="text-sm text-muted-foreground">Total comments</p>
              <p className="mt-2 font-display text-3xl tracking-[-0.03em]">{commentCount}</p>
            </div>
            <div className="rounded-[22px] border border-white/[0.06] bg-white/[0.02] px-4 py-4">
              <p className="text-sm text-muted-foreground">Link presence</p>
              <p className="mt-2 font-display text-3xl tracking-[-0.03em]">{profileLinks.length}</p>
            </div>
            <div className="rounded-[22px] border border-white/[0.06] bg-white/[0.02] px-4 py-4">
              <p className="text-sm leading-7 text-muted-foreground">
                {profile.bio?.trim()
                  ? "This profile already has enough context for visitors to understand the project quickly."
                  : "A stronger bio will make this page feel much more alive and intentional."}
              </p>
            </div>
          </div>
        </Card>
      </div>

      <div className="space-y-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.24em] text-accent-secondary/80">Catalog</p>
            <h2 className="font-display text-4xl tracking-[-0.04em]">Releases</h2>
          </div>
          <Tabs
            value={postFilter}
            onValueChange={(nextValue) => {
              const normalized = nextValue === "single" || nextValue === "ep" || nextValue === "album" ? nextValue : "all";
              setPostFilter(normalized);
            }}
            items={[
              { value: "all", label: "All" },
              { value: "single", label: "Singles" },
              { value: "ep", label: "EPs" },
              { value: "album", label: "Albums" },
            ]}
          />
        </div>

        {filteredPosts.length ? (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {filteredPosts.map((item) => (
              <ProfileReleaseCard key={item.post.id} item={item} />
            ))}
          </div>
        ) : (
          <Card>
            <CardTitle>No releases in this filter</CardTitle>
            <CardDescription className="mt-2">
              Switch the filter or publish a release in this format to populate the profile catalog.
            </CardDescription>
          </Card>
        )}
      </div>
    </div>
  );
}
