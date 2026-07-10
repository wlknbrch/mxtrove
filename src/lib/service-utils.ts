import { env } from "@/lib/env";
import { demoViewerProfile } from "@/lib/demo-data";
import { getSupabaseBrowserClient } from "@/lib/supabase";

export function isDemoModeEnabled() {
  return env.demoMode;
}

export function requireSupabase() {
  const client = getSupabaseBrowserClient();

  if (!client) {
    throw new Error("Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.");
  }

  return client;
}

export function getViewerId(userId?: string | null) {
  return userId ?? (isDemoModeEnabled() ? demoViewerProfile.id : null);
}

export function createDemoDelay(duration = 200) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, duration);
  });
}
