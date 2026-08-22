import type { Session, User } from "@supabase/supabase-js";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";

import { getCurrentSession, getSupabaseBrowserClient, onAuthSessionChange } from "@/lib/supabase";
import { unsubscribeCurrentDeviceFromPush } from "@/lib/pwa";
import { setPushSubscriptionActive } from "@/features/notifications/api";
import { clearPersistedQueryCache, queryClient } from "@/lib/query-client";

interface AuthContextValue {
  loading: boolean;
  session: Session | null;
  user: User | null;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const PUSH_SIGN_OUT_CLEANUP_TIMEOUT_MS = 1_000;

function waitForPushCleanupTimeout() {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, PUSH_SIGN_OUT_CLEANUP_TIMEOUT_MS);
  });
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    let active = true;

    getCurrentSession()
      .then((initialSession) => {
        if (!active) {
          return;
        }

        setSession(initialSession);
        setLoading(false);
      })
      .catch(() => {
        if (active) {
          setLoading(false);
        }
      });

    const unsubscribe = onAuthSessionChange((nextSession) => {
      setSession(nextSession);
      setLoading(false);
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      loading,
      session,
      user: session?.user ?? null,
      signOut: async () => {
        const client = getSupabaseBrowserClient();
        if (client) {
          const cleanupPushSubscription = async () => {
            const endpoint = await unsubscribeCurrentDeviceFromPush().catch(() => null);
            if (endpoint && session?.user?.id) {
              await setPushSubscriptionActive({
                profileId: session.user.id,
                endpoint,
                isActive: false,
              }).catch(() => undefined);
            }
          };

          await Promise.race([
            cleanupPushSubscription(),
            waitForPushCleanupTimeout(),
          ]);

          const { error } = await client.auth.signOut({ scope: "local" });
          if (error) {
            throw error;
          }
          clearPersistedQueryCache();
          queryClient.clear();
          setSession(null);
        }
      },
    }),
    [loading, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);

  if (!value) {
    throw new Error("useAuth must be used within AuthProvider.");
  }

  return value;
}
