import { createDemoDelay, isDemoModeEnabled, requireSupabase } from "@/lib/service-utils";
import type { ProfileAppearanceSettings } from "@/types/domain";

export const defaultAppearanceSettings: Omit<
  ProfileAppearanceSettings,
  "profile_id" | "created_at" | "updated_at"
> = {
  theme: "dark",
  accent: "violet",
  interface_density: "comfortable",
  show_waveforms: true,
  reduced_motion: false,
  autoplay_next: true,
  remember_volume: true,
  player_volume: 0.8,
  increase_contrast: false,
  reduce_transparency: false,
  reduce_motion: false,
  larger_ui_text: false,
};

export async function getAppearanceSettings(profileId: string) {
  if (isDemoModeEnabled()) {
    await createDemoDelay(100);
    return {
      profile_id: profileId,
      ...defaultAppearanceSettings,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } satisfies ProfileAppearanceSettings;
  }

  const client = requireSupabase();
  const { data, error } = await client
    .from("profile_appearance_settings")
    .select("*")
    .eq("profile_id", profileId)
    .maybeSingle();
  if (error) {
    throw error;
  }
  return data as ProfileAppearanceSettings | null;
}

export async function saveAppearanceSettings(
  settings: Omit<ProfileAppearanceSettings, "profile_id" | "created_at" | "updated_at">,
) {
  if (isDemoModeEnabled()) {
    await createDemoDelay(100);
    return settings;
  }

  const client = requireSupabase();
  const { data, error } = await client.rpc("update_appearance_settings", {
    next_theme: settings.theme,
    next_accent: settings.accent,
    next_interface_density: settings.interface_density,
    next_show_waveforms: settings.show_waveforms,
    next_reduced_motion: settings.reduced_motion,
    next_autoplay_next: settings.autoplay_next,
    next_remember_volume: settings.remember_volume,
    next_player_volume: settings.player_volume,
    next_increase_contrast: settings.increase_contrast,
    next_reduce_transparency: settings.reduce_transparency,
    next_reduce_motion: settings.reduce_motion,
    next_larger_ui_text: settings.larger_ui_text,
  });
  if (error) {
    throw error;
  }
  return data as ProfileAppearanceSettings;
}
