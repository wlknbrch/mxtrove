import { dehydrate, hydrate, QueryClient } from "@tanstack/react-query";

const QUERY_CACHE_KEY = "mxtrove:query-cache:v2";
const QUERY_CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const QUERY_CACHE_MAX_LENGTH = 4_500_000;
const PERSISTED_QUERY_ROOTS = new Set([
  "home-feed",
  "explore-feed",
  "creator-discovery",
  "profile",
  "profile-by-username",
  "profile-posts",
  "current-profile",
  "cloud-connection",
  "cloud-connections",
  "library",
  "library-posts",
  "projects",
  "post",
  "player-post",
  "conversations",
  "messages-unread",
  "notifications-unread",
]);

const LONG_LIVED_QUERY_ROOTS = new Set([
  "home-feed",
  "explore-feed",
  "creator-discovery",
  "profile",
  "profile-by-username",
  "profile-posts",
  "current-profile",
  "cloud-connection",
  "cloud-connections",
  "library",
  "library-posts",
  "projects",
  "conversations",
]);

const DETAIL_QUERY_ROOTS = new Set([
  "post",
  "player-post",
]);

function isPersistableQuery(queryKey: readonly unknown[]) {
  return typeof queryKey[0] === "string" && PERSISTED_QUERY_ROOTS.has(queryKey[0]);
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 10 * 60 * 1000,
      gcTime: 24 * 60 * 60 * 1000,
    },
    mutations: {
      retry: 0,
    },
  },
});

for (const root of LONG_LIVED_QUERY_ROOTS) {
  queryClient.setQueryDefaults([root], {
    staleTime: 30 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
  });
}

for (const root of DETAIL_QUERY_ROOTS) {
  queryClient.setQueryDefaults([root], {
    staleTime: 15 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
  });
}

function restoreQueryCache() {
  if (typeof window === "undefined") return;

  try {
    const raw = window.localStorage.getItem(QUERY_CACHE_KEY);
    if (!raw) return;
    const cached = JSON.parse(raw) as { savedAt?: number; state?: unknown };
    if (
      typeof cached.savedAt !== "number"
      || Date.now() - cached.savedAt > QUERY_CACHE_MAX_AGE_MS
      || !cached.state
    ) {
      window.localStorage.removeItem(QUERY_CACHE_KEY);
      return;
    }
    hydrate(queryClient, cached.state as Parameters<typeof hydrate>[1]);
  } catch {
    window.localStorage.removeItem(QUERY_CACHE_KEY);
  }
}

let persistTimer: number | null = null;

function scheduleQueryCachePersist() {
  if (typeof window === "undefined" || persistTimer !== null) return;
  persistTimer = window.setTimeout(() => {
    persistTimer = null;
    try {
      const state = dehydrate(queryClient, {
        shouldDehydrateQuery: (query) =>
          query.state.status === "success" && isPersistableQuery(query.queryKey),
      });
      const serialized = JSON.stringify({ savedAt: Date.now(), state });
      if (serialized.length <= QUERY_CACHE_MAX_LENGTH) {
        window.localStorage.setItem(QUERY_CACHE_KEY, serialized);
      }
    } catch {
      // Storage can be unavailable in private browsing or under quota pressure.
    }
  }, 750);
}

export function clearPersistedQueryCache() {
  if (typeof window === "undefined") return;
  if (persistTimer !== null) {
    window.clearTimeout(persistTimer);
    persistTimer = null;
  }
  window.localStorage.removeItem(QUERY_CACHE_KEY);
}

restoreQueryCache();
queryClient.getQueryCache().subscribe((event) => {
  if (event?.query && isPersistableQuery(event.query.queryKey)) {
    scheduleQueryCachePersist();
  }
});
