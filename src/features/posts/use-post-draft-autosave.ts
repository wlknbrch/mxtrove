import { useEffect, useRef, useState } from "react";
import { useBlocker } from "react-router-dom";
import { toast } from "sonner";

import { queryClient } from "@/lib/query-client";
import type { PostType } from "@/types/domain";

import { deletePostDraft, upsertPostDraft } from "./drafts-api";
import type { PostDraftPayload } from "./drafts";

export type DraftSaveStatus = "idle" | "saving" | "saved" | "error";

interface AutosaveSnapshot {
  ownerId: string;
  postType: PostType;
  title: string;
  currentStep: number;
  payload: PostDraftPayload;
  isMeaningful: boolean;
}

export function usePostDraftAutosave({
  ownerId,
  initialDraftId,
  postType,
  title,
  currentStep,
  payload,
  isMeaningful,
  enabled,
}: AutosaveSnapshot & {
  initialDraftId: string | null;
  enabled: boolean;
}) {
  const [draftId, setDraftId] = useState<string | null>(initialDraftId);
  const draftIdRef = useRef<string | null>(initialDraftId);
  const [status, setStatus] = useState<DraftSaveStatus>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const latestSnapshotRef = useRef<AutosaveSnapshot>({
    ownerId,
    postType,
    title,
    currentStep,
    payload,
    isMeaningful,
  });
  const timerRef = useRef<number | null>(null);
  const saveQueueRef = useRef(Promise.resolve());
  const savedFingerprintRef = useRef("");
  const bypassNavigationRef = useRef(false);

  const fingerprint = JSON.stringify({ postType, title, currentStep, payload });
  latestSnapshotRef.current = { ownerId, postType, title, currentStep, payload, isMeaningful };

  async function saveLatestDraft() {
    const snapshot = latestSnapshotRef.current;
    if (!enabled || !snapshot.ownerId || !snapshot.isMeaningful || bypassNavigationRef.current) {
      return null;
    }

    if (savedFingerprintRef.current === JSON.stringify({
      postType: snapshot.postType,
      title: snapshot.title,
      currentStep: snapshot.currentStep,
      payload: snapshot.payload,
    })) {
      return draftIdRef.current;
    }

    const nextDraftId = draftIdRef.current ?? crypto.randomUUID();
    if (!draftIdRef.current) {
      draftIdRef.current = nextDraftId;
      setDraftId(nextDraftId);
      const url = new URL(window.location.href);
      url.searchParams.set("draft", nextDraftId);
      window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
    }

    setStatus("saving");
    try {
      const saved = await upsertPostDraft({
        id: nextDraftId,
        ownerId: snapshot.ownerId,
        postType: snapshot.postType,
        title: snapshot.title,
        currentStep: snapshot.currentStep,
        payload: snapshot.payload,
      });
      savedFingerprintRef.current = JSON.stringify({
        postType: snapshot.postType,
        title: snapshot.title,
        currentStep: snapshot.currentStep,
        payload: snapshot.payload,
      });
      setLastSavedAt(saved.updated_at);
      setStatus("saved");
      await queryClient.invalidateQueries({ queryKey: ["post-drafts", snapshot.ownerId] });
      return saved.id;
    } catch (error) {
      setStatus("error");
      throw error;
    }
  }

  function enqueueSave() {
    const queued = saveQueueRef.current.then(saveLatestDraft, saveLatestDraft);
    saveQueueRef.current = queued.then(() => undefined, () => undefined);
    return queued;
  }

  useEffect(() => {
    if (!enabled || !ownerId || !isMeaningful || bypassNavigationRef.current) return;
    if (savedFingerprintRef.current === fingerprint) return;

    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      void enqueueSave().catch((error) => {
        toast.error(error instanceof Error ? error.message : "The draft could not be saved.");
      });
    }, 650);

    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [enabled, fingerprint, isMeaningful, ownerId]);

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      enabled
      && isMeaningful
      && !bypassNavigationRef.current
      && (
        currentLocation.pathname !== nextLocation.pathname
        || currentLocation.search !== nextLocation.search
      ),
  );

  useEffect(() => {
    if (blocker.state !== "blocked") return;

    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    void enqueueSave()
      .then(() => {
        toast.success("Draft saved automatically.");
        blocker.proceed();
      })
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : "The draft could not be saved.");
        blocker.reset();
      });
  }, [blocker]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!enabled || !isMeaningful || savedFingerprintRef.current === fingerprint) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [enabled, fingerprint, isMeaningful]);

  async function completeDraft() {
    bypassNavigationRef.current = true;
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    await saveQueueRef.current;
    if (draftIdRef.current) {
      await deletePostDraft(draftIdRef.current);
      await queryClient.invalidateQueries({ queryKey: ["post-drafts", ownerId] });
    }
  }

  return {
    draftId,
    status,
    lastSavedAt,
    saveNow: enqueueSave,
    completeDraft,
  };
}
