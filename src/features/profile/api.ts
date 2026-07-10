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
  const { data, error } = await client.from("profiles").select("*").eq("id", viewerId).maybeSingle();

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
  const { data, error } = await client
    .from("profiles")
    .select("*")
    .eq("username", normalizedUsername)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as Profile | null;
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
  const payload = {
    id: userId,
    ...values,
    bio: values.bio || null,
    location: values.location || null,
    onboarding_completed: true,
  };

  const { data, error } = await client.from("profiles").upsert(payload).select("*").single();

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

export async function toggleFollow(input: { viewerId: string; profileId: string; shouldFollow: boolean }) {
  if (input.viewerId === input.profileId) {
    throw new Error("You cannot follow yourself.");
  }

  if (isDemoModeEnabled()) {
    await createDemoDelay(150);
    return;
  }

  const client = requireSupabase();

  if (input.shouldFollow) {
    const { error } = await client.from("follows").insert({
      follower_id: input.viewerId,
      followed_id: input.profileId,
    });

    if (error) {
      throw error;
    }

    return;
  }

  const { error } = await client
    .from("follows")
    .delete()
    .eq("follower_id", input.viewerId)
    .eq("followed_id", input.profileId);

  if (error) {
    throw error;
  }
}

export function getDemoAvatarForProfile(profile: Profile) {
  const seed = demoProfiles.findIndex((entry) => entry.id === profile.id);
  return `/not-used-${seed}`;
}
