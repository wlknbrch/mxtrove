import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { queryClient } from "@/lib/query-client";
import type { PostType } from "@/types/domain";

import { deletePostDraft, upsertPostDraft } from "./drafts-api";
import type { ReleaseEditDraftPayload } from "./drafts";
import type { DraftSaveStatus } from "./use-post-draft-autosave";

export function useReleaseEditDraft({
  ownerId,
  postId,
  postType,
  title,
  payload,
  enabled,
}: {
  ownerId: string;
  postId: string;
  postType: PostType;
  title: string;
  payload: ReleaseEditDraftPayload;
  enabled: boolean;
}) {
  const [status, setStatus] = useState<DraftSaveStatus>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const latestRef = useRef({ ownerId, postId, postType, title, payload, enabled });
  const timerRef = useRef<number | null>(null);
  const saveQueueRef = useRef(Promise.resolve());
  const savedFingerprintRef = useRef("");
  const fingerprint = JSON.stringify(payload);
  latestRef.current = { ownerId, postId, postType, title, payload, enabled };

  async function saveLatest() {
    const latest = latestRef.current;
    const latestFingerprint = JSON.stringify(latest.payload);
    if (!latest.enabled || !latest.ownerId || !latest.postId) return null;
    if (savedFingerprintRef.current === latestFingerprint) return latest.postId;

    setStatus("saving");
    try {
      const saved = await upsertPostDraft({
        id: latest.postId,
        ownerId: latest.ownerId,
        postType: latest.postType,
        title: latest.title,
        currentStep: 1,
        payload: latest.payload,
      });
      savedFingerprintRef.current = latestFingerprint;
      setLastSavedAt(saved.updated_at);
      setStatus("saved");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["post-drafts", latest.ownerId] }),
        queryClient.invalidateQueries({ queryKey: ["release-edit-draft", latest.postId] }),
      ]);
      return saved.id;
    } catch (error) {
      setStatus("error");
      throw error;
    }
  }

  function saveNow() {
    const queued = saveQueueRef.current.then(saveLatest, saveLatest);
    saveQueueRef.current = queued.then(() => undefined, () => undefined);
    return queued;
  }

  useEffect(() => {
    if (!enabled || !ownerId || !postId || savedFingerprintRef.current === fingerprint) return;
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      void saveNow().catch((error) => {
        toast.error(error instanceof Error ? error.message : "The edit draft could not be saved.");
      });
    }, 650);

    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [enabled, fingerprint, ownerId, postId]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!enabled || savedFingerprintRef.current === fingerprint) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [enabled, fingerprint]);

  async function discardDraft() {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    await saveQueueRef.current;
    await deletePostDraft(postId);
    savedFingerprintRef.current = "";
    setStatus("idle");
    setLastSavedAt(null);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["post-drafts", ownerId] }),
      queryClient.invalidateQueries({ queryKey: ["release-edit-draft", postId] }),
    ]);
  }

  return {
    status,
    lastSavedAt,
    saveNow,
    discardDraft,
  };
}
