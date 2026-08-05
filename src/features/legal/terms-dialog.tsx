import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { FileCheck2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { TermsOfServiceContent } from "@/features/legal/terms-content";
import { CURRENT_TERMS_LAST_UPDATED } from "@/features/legal/terms";

interface TermsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TermsDialog({ open, onOpenChange }: TermsDialogProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onOpenChange(false);
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    closeRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onOpenChange, open]);

  if (!open || typeof document === "undefined") {
    return null;
  }

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
        aria-label="Close Terms of Service"
        onClick={() => onOpenChange(false)}
      />
      <section className="relative z-10 flex max-h-[calc(100dvh-1.5rem)] w-full max-w-4xl flex-col overflow-hidden rounded-[30px] border border-accent/22 bg-[radial-gradient(circle_at_top,rgba(var(--accent-rgb),0.18),transparent_34%),linear-gradient(180deg,rgba(19,14,38,0.99),rgba(8,7,20,0.99))] shadow-[0_36px_120px_rgba(0,0,0,0.72)] sm:max-h-[calc(100dvh-3rem)] sm:rounded-[36px]">
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-white/[0.08] px-5 py-5 sm:px-8 sm:py-7">
          <div className="flex min-w-0 items-start gap-4">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-accent/25 bg-accent/12 text-accent-secondary sm:size-12">
              <FileCheck2 className="size-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.28em] text-accent-secondary/80">Legal agreement</p>
              <h2 id={titleId} className="mt-2 font-display text-2xl tracking-[-0.035em] text-foreground sm:text-3xl">
                Terms of Service
              </h2>
              <p id={descriptionId} className="mt-1 text-sm text-muted-foreground">
                Current version · {CURRENT_TERMS_LAST_UPDATED}
              </p>
            </div>
          </div>
          <Button
            ref={closeRef}
            variant="ghost"
            size="sm"
            className="size-11 shrink-0 rounded-full border border-white/10 bg-white/[0.04] p-0"
            aria-label="Close Terms of Service"
            onClick={() => onOpenChange(false)}
          >
            <X className="size-5" aria-hidden="true" />
          </Button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-6 sm:px-8 sm:py-8">
          <TermsOfServiceContent />
        </div>
        <footer className="flex shrink-0 justify-end border-t border-white/[0.06] px-5 py-4 sm:px-8">
          <Button onClick={() => onOpenChange(false)}>Close and return</Button>
        </footer>
      </section>
    </div>,
    document.body,
  );
}
