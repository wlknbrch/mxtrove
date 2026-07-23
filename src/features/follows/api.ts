import { demoPosts, demoProfiles, demoViewerProfile } from "@/lib/demo-data";
import { createDemoDelay, getViewerId, isDemoModeEnabled, requireSupabase } from "@/lib/service-utils";
import type { Follow, Profile, ProfilePublicMetrics } from "@/types/domain";

const demoFollows: Follow[] = [
  {
    follower_id: demoViewerProfile.id,
    followed_id: demoProfiles[1].id,
    created_at: new Date().toISOString(),
  },
  {
    follower_id: demoProfiles[1].id,
    followed_id: demoViewerProfile.id,
    created_at: new Date().toISOString(),
  },
];

export interface FollowState {
  viewerFollowsProfile: boolean;
  profileFollowsViewer: boolean;
}

export interface SocialProfileCard {
  profile: Profile;
  metrics: ProfilePublicMetrics;
  followsYou: boolean;
  viewerFollowsProfile: boolean;
  connectedAt?: string | null;
}

function buildEmptyMetrics(profileId: string): ProfilePublicMetrics {
  return {
    profile_id: profileId,
    followers_count: 0,
    following_count: 0,
    public_posts_count: 0,
    single_count: 0,
    ep_count: 0,
    album_count: 0,
    last_public_activity_at: null,
  };
}

function buildDemoMetrics(profileId: string): ProfilePublicMetrics {
  const publicPosts = demoPosts.filter((post) => post.owner_id === profileId && post.visibility === "public");

  return {
    profile_id: profileId,
    followers_count: demoFollows.filter((follow) => follow.followed_id === profileId).length,
    following_count: demoFollows.filter((follow) => follow.follower_id === profileId).length,
    public_posts_count: publicPosts.length,
    single_count: publicPosts.filter((post) => post.post_type === "single").length,
    ep_count: publicPosts.filter((post) => post.post_type === "ep").length,
    album_count: publicPosts.filter((post) => post.post_type === "album").length,
    last_public_activity_at:
      publicPosts
        .slice()
        .sort((left, right) => new Date(right.activity_at).getTime() - new Date(left.activity_at).getTime())[0]
        ?.activity_at ?? null,
  };
}

function toSocialProfileCard(profile: Profile, viewerId: string | null | undefined, connectedAt?: string | null): SocialProfileCard {
  const resolvedViewerId = getViewerId(viewerId);
  return {
    profile,
    metrics: buildDemoMetrics(profile.id),
    followsYou: Boolean(
      resolvedViewerId &&
        demoFollows.some((follow) => follow.follower_id === profile.id && follow.followed_id === resolvedViewerId),
    ),
    viewerFollowsProfile: Boolean(
      resolvedViewerId &&
        demoFollows.some((follow) => follow.follower_id === resolvedViewerId && follow.followed_id === profile.id),
    ),
    connectedAt: connectedAt ?? null,
  };
}

export async function getProfileMetrics(profileId: string): Promise<ProfilePublicMetrics> {
  if (isDemoModeEnabled()) {
    await createDemoDelay(140);
    return buildDemoMetrics(profileId);
  }

  const client = requireSupabase();
  const { data, error } = await client.rpc("get_profile_metrics_v2", {
    target_profile_id: profileId,
  });

  if (error) {
    throw error;
  }

  return (data as ProfilePublicMetrics | null) ?? buildEmptyMetrics(profileId);
}

export async function getFollowState(input: {
  viewerId?: string | null;
  profileId: string;
}): Promise<FollowState> {
  const viewerId = getViewerId(input.viewerId);

  if (!viewerId || viewerId === input.profileId) {
    return {
      viewerFollowsProfile: false,
      profileFollowsViewer: false,
    };
  }

  if (isDemoModeEnabled()) {
    await createDemoDelay(120);
    return {
      viewerFollowsProfile: demoFollows.some(
        (follow) => follow.follower_id === viewerId && follow.followed_id === input.profileId,
      ),
      profileFollowsViewer: demoFollows.some(
        (follow) => follow.follower_id === input.profileId && follow.followed_id === viewerId,
      ),
    };
  }

  const client = requireSupabase();
  const { data, error } = await client.rpc("get_follow_state_v2", {
    target_profile_id: input.profileId,
  });

  if (error) {
    throw error;
  }

  const state = Array.isArray(data) ? data[0] : data;
  return {
    viewerFollowsProfile: Boolean(state?.viewer_follows_profile),
    profileFollowsViewer: Boolean(state?.profile_follows_viewer),
  };
}

export async function followProfile(targetProfileId: string) {
  if (isDemoModeEnabled()) {
    await createDemoDelay(140);
    return true;
  }

  const client = requireSupabase();
  const { data, error } = await client.rpc("follow_profile", {
    target_profile_id: targetProfileId,
  });

  if (error) {
    throw error;
  }

  return Boolean(data);
}

export async function unfollowProfile(targetProfileId: string) {
  if (isDemoModeEnabled()) {
    await createDemoDelay(140);
    return true;
  }

  const client = requireSupabase();
  const { data, error } = await client.rpc("unfollow_profile", {
    target_profile_id: targetProfileId,
  });

  if (error) {
    throw error;
  }

  return Boolean(data);
}

export async function listProfileConnections(input: {
  profileId: string;
  relation: "followers" | "following";
  viewerId?: string | null;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<SocialProfileCard[]> {
  const viewerId = getViewerId(input.viewerId);

  if (isDemoModeEnabled()) {
    await createDemoDelay();
    const relationRows = demoFollows.filter((follow) =>
      input.relation === "followers"
        ? follow.followed_id === input.profileId
        : follow.follower_id === input.profileId,
    );
    const filteredProfiles = relationRows
      .map((follow) =>
        demoProfiles.find((profile) =>
          profile.id === (input.relation === "followers" ? follow.follower_id : follow.followed_id),
        ) ?? null,
      )
      .filter((profile): profile is Profile => Boolean(profile))
      .filter((profile) => {
        const query = input.search?.trim().toLowerCase();
        if (!query) {
          return true;
        }

        return (
          profile.username.toLowerCase().includes(query) ||
          profile.display_name.toLowerCase().includes(query)
        );
      });

    return filteredProfiles.map((profile) => {
      const connection = relationRows.find((follow) =>
        input.relation === "followers"
          ? follow.follower_id === profile.id
          : follow.followed_id === profile.id,
      );
      return toSocialProfileCard(profile, viewerId, connection?.created_at ?? null);
    });
  }

  const client = requireSupabase();
  const { data, error } = await client.rpc("list_profile_connections", {
    target_profile_id: input.profileId,
    relation: input.relation,
    search_query: input.search?.trim() || null,
    limit_count: input.limit ?? 50,
    offset_count: input.offset ?? 0,
  });

  if (error) {
    throw error;
  }

  return ((data ?? []) as Array<{
    profile_id: string;
    username: string;
    display_name: string;
    bio: string | null;
    avatar_asset_id: string | null;
    followers_count: number;
    following_count: number;
    public_posts_count: number;
    single_count: number;
    ep_count: number;
    album_count: number;
    follows_you: boolean;
    viewer_follows_profile: boolean;
    connected_at: string | null;
  }>).map((row) => ({
    profile: {
      id: row.profile_id,
      username: row.username,
      display_name: row.display_name,
      bio: row.bio,
      location: null,
      website_url: null,
      instagram_url: null,
      spotify_url: null,
      youtube_url: null,
      support_url: null,
      avatar_asset_id: row.avatar_asset_id,
      pinned_post_id: null,
      onboarding_completed: true,
      created_at: row.connected_at ?? new Date().toISOString(),
      updated_at: row.connected_at ?? new Date().toISOString(),
    },
    metrics: {
      profile_id: row.profile_id,
      followers_count: row.followers_count,
      following_count: row.following_count,
      public_posts_count: row.public_posts_count,
      single_count: row.single_count,
      ep_count: row.ep_count,
      album_count: row.album_count,
      last_public_activity_at: null,
    },
    followsYou: row.follows_you,
    viewerFollowsProfile: row.viewer_follows_profile,
    connectedAt: row.connected_at,
  }));
}

export async function listCreatorDiscovery(input?: {
  viewerId?: string | null;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<SocialProfileCard[]> {
  const viewerId = getViewerId(input?.viewerId);

  if (isDemoModeEnabled()) {
    await createDemoDelay();
    return demoProfiles
      .filter((profile) => profile.id !== viewerId)
      .filter((profile) => buildDemoMetrics(profile.id).public_posts_count > 0)
      .filter((profile) => {
        const query = input?.search?.trim().toLowerCase();
        if (!query) {
          return true;
        }

        return (
          profile.username.toLowerCase().includes(query) ||
          profile.display_name.toLowerCase().includes(query)
        );
      })
      .map((profile) => toSocialProfileCard(profile, viewerId))
      .sort((left, right) => {
        const activityDelta =
          new Date(right.metrics.last_public_activity_at ?? 0).getTime() -
          new Date(left.metrics.last_public_activity_at ?? 0).getTime();
        if (activityDelta !== 0) {
          return activityDelta;
        }

        return right.metrics.followers_count - left.metrics.followers_count;
      });
  }

  const client = requireSupabase();
  const { data, error } = await client.rpc("list_public_creators", {
    search_query: input?.search?.trim() || null,
    limit_count: input?.limit ?? 18,
    offset_count: input?.offset ?? 0,
  });

  if (error) {
    throw error;
  }

  return ((data ?? []) as Array<{
    profile_id: string;
    username: string;
    display_name: string;
    bio: string | null;
    avatar_asset_id: string | null;
    followers_count: number;
    following_count: number;
    public_posts_count: number;
    single_count: number;
    ep_count: number;
    album_count: number;
    follows_you: boolean;
    viewer_follows_profile: boolean;
    last_public_activity_at: string | null;
  }>).map((row) => ({
    profile: {
      id: row.profile_id,
      username: row.username,
      display_name: row.display_name,
      bio: row.bio,
      location: null,
      website_url: null,
      instagram_url: null,
      spotify_url: null,
      youtube_url: null,
      support_url: null,
      avatar_asset_id: row.avatar_asset_id,
      pinned_post_id: null,
      onboarding_completed: true,
      created_at: row.last_public_activity_at ?? new Date().toISOString(),
      updated_at: row.last_public_activity_at ?? new Date().toISOString(),
    },
    metrics: {
      profile_id: row.profile_id,
      followers_count: row.followers_count,
      following_count: row.following_count,
      public_posts_count: row.public_posts_count,
      single_count: row.single_count,
      ep_count: row.ep_count,
      album_count: row.album_count,
      last_public_activity_at: row.last_public_activity_at,
    },
    followsYou: row.follows_you,
    viewerFollowsProfile: row.viewer_follows_profile,
    connectedAt: null,
  }));
}
