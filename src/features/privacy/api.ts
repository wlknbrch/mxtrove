import { createDemoDelay, isDemoModeEnabled, requireSupabase } from "@/lib/service-utils";
import type { ProfilePrivacySettings } from "@/types/domain";

export const defaultPrivacySettings: Omit<
  ProfilePrivacySettings,
  "profile_id" | "created_at" | "updated_at"
> = {
  profile_visibility: "public",
  message_permission: "everyone",
  project_invite_permission: "everyone",
  show_location: true,
  show_follower_counts: true,
  show_activity_status: true,
  allow_profile_discovery: true,
};

export async function getPrivacySettings(profileId: string) {
  if (isDemoModeEnabled()) {
    await createDemoDelay(100);
    return {
      profile_id: profileId,
      ...defaultPrivacySettings,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } satisfies ProfilePrivacySettings;
  }

  const client = requireSupabase();
  const { data, error } = await client
    .from("profile_privacy_settings")
    .select(
      "profile_id, profile_visibility, message_permission, project_invite_permission, show_location, show_follower_counts, show_activity_status, allow_profile_discovery, created_at, updated_at",
    )
    .eq("profile_id", profileId)
    .maybeSingle();
  if (error) {
    throw error;
  }
  return data as ProfilePrivacySettings | null;
}

export async function savePrivacySettings(
  values: Omit<ProfilePrivacySettings, "profile_id" | "created_at" | "updated_at">,
) {
  if (isDemoModeEnabled()) {
    await createDemoDelay(100);
    return values;
  }

  const client = requireSupabase();
  const { data, error } = await client.rpc("update_privacy_settings", {
    next_profile_visibility: values.profile_visibility,
    next_message_permission: values.message_permission,
    next_project_invite_permission: values.project_invite_permission,
    next_show_location: values.show_location,
    next_show_follower_counts: values.show_follower_counts,
    next_show_activity_status: values.show_activity_status,
    next_allow_profile_discovery: values.allow_profile_discovery,
  });
  if (error) {
    throw error;
  }
  return data as ProfilePrivacySettings;
}

export async function blockProfile(profileId: string) {
  const client = requireSupabase();
  const { data, error } = await client.rpc("block_profile", {
    target_profile_id: profileId,
  });
  if (error) {
    throw error;
  }
  return Number(data ?? 0);
}

export async function unblockProfile(profileId: string) {
  const client = requireSupabase();
  const { data, error } = await client.rpc("unblock_profile", {
    target_profile_id: profileId,
  });
  if (error) {
    throw error;
  }
  return Boolean(data);
}

export async function muteProfile(input: {
  profileId: string;
  posts?: boolean;
  notifications?: boolean;
  messages?: boolean;
}) {
  const client = requireSupabase();
  const { error } = await client.rpc("mute_profile", {
    target_profile_id: input.profileId,
    should_mute_posts: input.posts ?? true,
    should_mute_notifications: input.notifications ?? true,
    should_mute_messages: input.messages ?? false,
  });
  if (error) {
    throw error;
  }
}

export async function unmuteProfile(profileId: string) {
  const client = requireSupabase();
  const { data, error } = await client.rpc("unmute_profile", {
    target_profile_id: profileId,
  });
  if (error) {
    throw error;
  }
  return Boolean(data);
}

export interface BlockedProfileRow {
  profile_id: string;
  username: string;
  display_name: string;
  avatar_asset_id: string | null;
  blocked_at: string;
}

export async function listBlockedProfiles() {
  if (isDemoModeEnabled()) {
    await createDemoDelay(100);
    return [] as BlockedProfileRow[];
  }
  const client = requireSupabase();
  const { data, error } = await client.rpc("list_blocked_profiles");
  if (error) {
    throw error;
  }
  return (data ?? []) as BlockedProfileRow[];
}
