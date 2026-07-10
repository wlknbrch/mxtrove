import { createClient, type Session, type SupabaseClient } from "@supabase/supabase-js";

import { envState, env } from "@/lib/env";

let browserClient: SupabaseClient | null = null;

export function getSupabaseBrowserClient() {
  if (!envState.hasSupabase) {
    return null;
  }

  if (!browserClient) {
    browserClient = createClient(env.supabaseUrl, env.supabasePublishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }

  return browserClient;
}

export async function getCurrentSession() {
  const client = getSupabaseBrowserClient();

  if (!client) {
    return null;
  }

  const { data } = await client.auth.getSession();
  return data.session;
}

export function onAuthSessionChange(callback: (session: Session | null) => void) {
  const client = getSupabaseBrowserClient();

  if (!client) {
    return () => undefined;
  }

  const { data } = client.auth.onAuthStateChange((_event, session) => callback(session));
  return () => data.subscription.unsubscribe();
}
