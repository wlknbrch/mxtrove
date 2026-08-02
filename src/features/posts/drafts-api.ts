import { createDemoDelay, isDemoModeEnabled, requireSupabase } from "@/lib/service-utils";
import type { PostDraft, PostType } from "@/types/domain";

import type { PostDraftPayload } from "./drafts";

const demoStorageKey = "mxtrove:post-drafts:v1";

function readDemoDrafts() {
  if (typeof window === "undefined") return [] as PostDraft[];

  try {
    return JSON.parse(window.localStorage.getItem(demoStorageKey) ?? "[]") as PostDraft[];
  } catch {
    return [];
  }
}

function writeDemoDrafts(drafts: PostDraft[]) {
  window.localStorage.setItem(demoStorageKey, JSON.stringify(drafts));
}

export async function listPostDrafts(ownerId: string) {
  if (isDemoModeEnabled()) {
    await createDemoDelay(80);
    return readDemoDrafts()
      .filter((draft) => draft.owner_id === ownerId)
      .sort((left, right) => right.updated_at.localeCompare(left.updated_at));
  }

  const client = requireSupabase();
  const { data, error } = await client
    .from("post_drafts")
    .select("*")
    .eq("owner_id", ownerId)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as PostDraft[];
}

export async function getPostDraft(draftId: string) {
  if (isDemoModeEnabled()) {
    await createDemoDelay(60);
    return readDemoDrafts().find((draft) => draft.id === draftId) ?? null;
  }

  const client = requireSupabase();
  const { data, error } = await client
    .from("post_drafts")
    .select("*")
    .eq("id", draftId)
    .maybeSingle();

  if (error) throw error;
  return data as PostDraft | null;
}

export async function upsertPostDraft(input: {
  id: string;
  ownerId: string;
  postType: PostType;
  title: string;
  currentStep: number;
  payload: PostDraftPayload;
}) {
  const now = new Date().toISOString();
  const values = {
    id: input.id,
    owner_id: input.ownerId,
    post_type: input.postType,
    title: input.title,
    current_step: input.currentStep,
    schema_version: input.payload.schemaVersion,
    payload: input.payload,
  };

  if (isDemoModeEnabled()) {
    await createDemoDelay(80);
    const drafts = readDemoDrafts();
    const existing = drafts.find((draft) => draft.id === input.id);
    const saved: PostDraft = {
      ...values,
      payload: input.payload as unknown as Record<string, unknown>,
      created_at: existing?.created_at ?? now,
      updated_at: now,
    };
    writeDemoDrafts([saved, ...drafts.filter((draft) => draft.id !== input.id)]);
    return saved;
  }

  const client = requireSupabase();
  const { data, error } = await client
    .from("post_drafts")
    .upsert(values, { onConflict: "id" })
    .select("*")
    .single();

  if (error) throw error;
  return data as PostDraft;
}

export async function deletePostDraft(draftId: string) {
  if (isDemoModeEnabled()) {
    await createDemoDelay(60);
    writeDemoDrafts(readDemoDrafts().filter((draft) => draft.id !== draftId));
    return;
  }

  const client = requireSupabase();
  const { error } = await client.from("post_drafts").delete().eq("id", draftId);
  if (error) throw error;
}
