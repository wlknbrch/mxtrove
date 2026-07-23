import { createDemoDelay, isDemoModeEnabled, requireSupabase } from "@/lib/service-utils";

export type SearchCategory = "creator" | "release" | "song" | "project" | "message";

export interface SearchResult {
  result_kind: SearchCategory;
  result_id: string;
  context_id: string | null;
  title: string;
  subtitle: string | null;
  rank: number;
}

export async function searchV2(query: string) {
  if (isDemoModeEnabled()) {
    await createDemoDelay();
    return [] as SearchResult[];
  }
  const client = requireSupabase();
  const { data, error } = await client.rpc("search_v2_catalog", {
    raw_query: query,
    result_limit: 60,
  });
  if (error) throw error;
  return (data ?? []) as SearchResult[];
}

export function getSearchResultPath(result: SearchResult) {
  if (result.result_kind === "creator") return `/@${result.subtitle?.replace(/^@/, "") ?? ""}`;
  if (result.result_kind === "release") return `/post/${result.context_id ?? result.result_id}`;
  if (result.result_kind === "song") return `/library/songs/${result.context_id ?? result.result_id}`;
  if (result.result_kind === "project") return `/projects/${result.context_id ?? result.result_id}`;
  return `/messages/${result.context_id ?? result.result_id}`;
}
