import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { FileClock, Save, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";

export function ReleaseEditLeaveDialog({
  open,
  pendingAction,
  onPublish,
  onKeepDraft,
  onDiscard,
  onCancel,
}: {
  open: boolean;
  pendingAction: "publish" | "draft" | "discard" | null;
  onPublish: () => void;
  onKeepDraft: () => void;
  onDiscard: () => void;
  onCancel: () => void;
}) {
  const titleId = useId();
  const descriptionId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !pendingAction) onCancel();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    cancelRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onCancel, open, pendingAction]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-6"
    >
      <button
        type="button"
        className="absolute inset-0 bg-[rgba(3,2,10,0.9)] backdrop-blur-xl"
        aria-label="Stay in release editor"
        disabled={Boolean(pendingAction)}
        onClick={onCancel}
      />
      <section className="relative z-10 w-full max-w-2xl rounded-[30px] border border-accent/22 bg-[radial-gradient(circle_at_top,rgba(var(--accent-rgb),0.17),transparent_40%),linear-gradient(180deg,rgba(19,14,38,0.99),rgba(8,7,20,0.99))] p-5 shadow-[0_36px_120px_rgba(0,0,0,0.72)] sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-4">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-accent/25 bg-accent/12 text-accent-secondary">
              <FileClock className="size-5" />
            </span>
            <div>
              <p className="text-xs uppercase tracking-[0.26em] text-accent-secondary/80">Unsaved release changes</p>
              <h2 id={titleId} className="mt-2 font-display text-3xl tracking-[-0.035em]">What should happen before you leave?</h2>
              <p id={descriptionId} className="mt-3 text-sm leading-7 text-muted-foreground">
                Your latest work is autosaved as a private draft. Publish it now, keep the draft for later, or discard it and return to the current live release.
              </p>
            </div>
          </div>
          <Button ref={cancelRef} variant="ghost" size="sm" className="size-10 shrink-0 p-0" disabled={Boolean(pendingAction)} onClick={onCancel} aria-label="Stay in editor">
            <X className="size-4" />
          </Button>
        </div>

        <div className="mt-7 grid gap-3 sm:grid-cols-3">
          <Button disabled={Boolean(pendingAction)} onClick={onPublish}>
            <Save className="size-4" />
            {pendingAction === "publish" ? "Publishing…" : "Publish changes"}
          </Button>
          <Button variant="secondary" disabled={Boolean(pendingAction)} onClick={onKeepDraft}>
            <FileClock className="size-4" />
            {pendingAction === "draft" ? "Saving…" : "Keep draft"}
          </Button>
          <Button variant="ghost" disabled={Boolean(pendingAction)} onClick={onDiscard}>
            <Trash2 className="size-4" />
            {pendingAction === "discard" ? "Discarding…" : "Discard changes"}
          </Button>
        </div>
      </section>
    </div>,
    document.body,
  );
}
