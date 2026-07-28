import { demoPosts, demoProfiles, demoViewerProfile, getDemoProfileByUsername } from "@/lib/demo-data";
import { createDemoDelay, getViewerId, isDemoModeEnabled, requireSupabase } from "@/lib/service-utils";
import type { ProfileFormValues } from "@/lib/validators";
import type { Post, Profile } from "@/types/domain";

function normalizeProfileUsername(username: string) {
  return username.trim().replace(/^@+/, "").toLowerCase();
}

function buildFallbackDisplayName(email?: string | null, metadataDisplayName?: string | null) {
  if (metadataDisplayName?.trim()) {
    return metadataDisplayName.trim();
  }

  const localPart = email?.split("@")[0]?.trim();
  if (localPart) {
    return localPart.slice(0, 60);
  }

  return "New artist";
}

export async function getCurrentProfile(userId?: string | null): Promise<Profile | null> {
  const viewerId = getViewerId(userId);

  if (!viewerId) {
    return null;
  }

  if (isDemoModeEnabled()) {
    await createDemoDelay();
    return demoViewerProfile;
  }

  const client = requireSupabase();
  const { data, error } = await client.rpc("get_current_profile_v2");

  if (error) {
    throw error;
  }

  if (data) {
    return data as Profile;
  }

  const { data: userResult, error: userError } = await client.auth.getUser();
  if (userError) {
    throw userError;
  }

  if (!userResult.user || userResult.user.id !== viewerId) {
    return null;
  }

  const insertPayload = {
    id: viewerId,
    display_name: buildFallbackDisplayName(
      userResult.user.email,
      typeof userResult.user.user_metadata?.display_name === "string"
        ? userResult.user.user_metadata.display_name
        : null,
    ),
    onboarding_completed: false,
  };

  const { data: createdProfile, error: createError } = await client
    .from("profiles")
    .insert(insertPayload)
    .select("*")
    .single();

  if (createError) {
    const { data: retryProfile, error: retryError } = await client
      .from("profiles")
      .select("*")
      .eq("id", viewerId)
      .maybeSingle();

    if (retryError) {
      throw retryError;
    }

    return retryProfile as Profile | null;
  }

  return createdProfile as Profile;
}

export async function getProfileByUsername(username: string): Promise<Profile | null> {
  const normalizedUsername = normalizeProfileUsername(username);

  if (!normalizedUsername) {
    return null;
  }

  if (isDemoModeEnabled()) {
    await createDemoDelay();
    return getDemoProfileByUsername(normalizedUsername);
  }

  const client = requireSupabase();
  const { data, error } = await client.rpc("get_profile_by_username_v2", {
    target_username: normalizedUsername,
  });

  if (error) {
    throw error;
  }

  return data as Profile | null;
}

export async function getProfilesByIds(profileIds: string[]): Promise<Profile[]> {
  const uniqueProfileIds = [...new Set(profileIds.filter(Boolean))];

  if (!uniqueProfileIds.length) {
    return [];
  }

  if (isDemoModeEnabled()) {
    await createDemoDelay();
    return demoProfiles.filter((profile) => uniqueProfileIds.includes(profile.id));
  }

  const client = requireSupabase();
  const { data, error } = await client
    .from("profiles")
    .select("*")
    .in("id", uniqueProfileIds);

  if (error) {
    throw error;
  }

  return (data ?? []) as Profile[];
}

export async function saveProfile(userId: string, values: ProfileFormValues): Promise<Profile> {
  if (isDemoModeEnabled()) {
    await createDemoDelay();
    return {
      ...demoViewerProfile,
      ...values,
      bio: values.bio || null,
      location: values.location || null,
      updated_at: new Date().toISOString(),
    };
  }

  const client = requireSupabase();
  const { data, error } = await client.rpc("save_profile_v2", {
    next_display_name: values.display_name,
    next_username: values.username,
    next_bio: values.bio || "",
    next_location: values.location || "",
    next_website_url: values.website_url || "",
    next_instagram_url: values.instagram_url || "",
    next_spotify_url: values.spotify_url || "",
    next_youtube_url: values.youtube_url || "",
    next_support_url: values.support_url || "",
    next_avatar_asset_id: values.avatar_asset_id ?? null,
  });

  if (error) {
    throw error;
  }

  return data as Profile;
}

export async function updateProfileAvatar(userId: string, avatarAssetId: string | null): Promise<Profile> {
  if (isDemoModeEnabled()) {
    await createDemoDelay(140);
    return {
      ...demoViewerProfile,
      avatar_asset_id: avatarAssetId,
      updated_at: new Date().toISOString(),
    };
  }

  const client = requireSupabase();
  const { data, error } = await client
    .from("profiles")
    .upsert({
      id: userId,
      avatar_asset_id: avatarAssetId,
      onboarding_completed: true,
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as Profile;
}

export async function getProfilePosts(profileId: string): Promise<Post[]> {
  if (isDemoModeEnabled()) {
    await createDemoDelay();
    return demoPosts.filter((post) => post.owner_id === profileId);
  }

  const client = requireSupabase();
  const { data, error } = await client
    .from("posts")
    .select("*")
    .eq("owner_id", profileId)
    .eq("visibility", "public")
    .order("activity_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as Post[];
}

export function getDemoAvatarForProfile(profile: Profile) {
  const seed = demoProfiles.findIndex((entry) => entry.id === profile.id);
  return `/not-used-${seed}`;
}
