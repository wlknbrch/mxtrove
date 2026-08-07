import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, LogOut, X } from "lucide-react";

import { Button } from "@/components/ui/button";

export function LibraryImportLeaveDialog({
  open,
  aborting,
  onAbort,
  onStay,
}: {
  open: boolean;
  aborting: boolean;
  onAbort: () => void;
  onStay: () => void;
}) {
  const titleId = useId();
  const descriptionId = useId();
  const stayRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !aborting) onStay();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    stayRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [aborting, onStay, open]);

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
        aria-label="Stay on multi-upload screen"
        disabled={aborting}
        onClick={onStay}
      />
      <section className="relative z-10 w-full max-w-xl rounded-[30px] border border-warning/25 bg-[radial-gradient(circle_at_top,rgba(236,179,80,0.14),transparent_42%),linear-gradient(180deg,rgba(19,14,38,0.99),rgba(8,7,20,0.99))] p-5 shadow-[0_36px_120px_rgba(0,0,0,0.72)] sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-4">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-warning/30 bg-warning/10 text-warning">
              <AlertTriangle className="size-5" />
            </span>
            <div>
              <p className="text-xs uppercase tracking-[0.26em] text-warning/80">Uploads in progress</p>
              <h2 id={titleId} className="mt-2 font-display text-3xl tracking-[-0.035em]">Abort this import?</h2>
              <p id={descriptionId} className="mt-3 text-sm leading-7 text-muted-foreground">
                Leaving stops every active upload. Songs and files that already finished remain safely in your Library; unfinished tracks are marked for attention instead of being deleted.
              </p>
            </div>
          </div>
          <Button ref={stayRef} variant="ghost" size="sm" className="size-10 shrink-0 p-0" disabled={aborting} onClick={onStay} aria-label="Stay on multi-upload screen">
            <X className="size-4" />
          </Button>
        </div>

        <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="ghost" disabled={aborting} onClick={onAbort}>
            <LogOut className="size-4" />
            {aborting ? "Stopping uploads…" : "Abort uploads & leave"}
          </Button>
          <Button disabled={aborting} onClick={onStay}>Keep uploading</Button>
        </div>
      </section>
    </div>,
    document.body,
  );
}
