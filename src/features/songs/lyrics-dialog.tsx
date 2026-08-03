import {
  useEffect,
  useId,
  useRef,
  useState,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { BookOpenText, X } from "lucide-react";

import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface LyricsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lyrics: string | null | undefined;
  title: string;
  artistName?: string | null;
  returnFocusRef?: RefObject<HTMLButtonElement | null>;
}

export function LyricsDialog({
  open,
  onOpenChange,
  lyrics,
  title,
  artistName,
  returnFocusRef,
}: LyricsDialogProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const content = lyrics?.trim();

  useEffect(() => {
    if (!open || !content) return;

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onOpenChange(false);
      if (event.key === "Tab") {
        event.preventDefault();
        closeRef.current?.focus();
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    closeRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      returnFocusRef?.current?.focus({ preventScroll: true });
    };
  }, [content, onOpenChange, open, returnFocusRef]);

  if (!open || !content || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-6"
    >
      <button
        type="button"
        className="absolute inset-0 bg-[rgba(3,2,10,0.88)] backdrop-blur-xl"
        onClick={() => onOpenChange(false)}
        aria-label="Close lyrics"
      />
      <section className="relative z-10 flex max-h-[calc(100dvh-1.5rem)] w-full max-w-4xl flex-col overflow-hidden rounded-[30px] border border-accent/22 bg-[radial-gradient(circle_at_top,rgba(var(--accent-rgb),0.2),transparent_35%),linear-gradient(180deg,rgba(19,14,38,0.99),rgba(8,7,20,0.99))] shadow-[0_36px_120px_rgba(0,0,0,0.72)] sm:max-h-[calc(100dvh-3rem)] sm:rounded-[36px]">
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-white/[0.08] px-5 py-5 sm:px-8 sm:py-7">
          <div className="flex min-w-0 items-start gap-4">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-accent/25 bg-accent/12 text-accent-secondary sm:size-12">
              <BookOpenText className="size-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.28em] text-accent-secondary/80">Lyrics</p>
              <h2 id={titleId} className="mt-2 break-words font-display text-2xl tracking-[-0.035em] text-foreground sm:text-3xl">
                {title}
              </h2>
              <p id={descriptionId} className="mt-1 truncate text-sm text-muted-foreground">
                {artistName ? `Lyrics shared by ${artistName}` : "Song lyrics"}
              </p>
            </div>
          </div>
          <Button
            ref={closeRef}
            variant="ghost"
            size="sm"
            className="size-11 shrink-0 rounded-full border border-white/10 bg-white/[0.04] p-0"
            onClick={() => onOpenChange(false)}
            aria-label="Close lyrics"
          >
            <X className="size-5" aria-hidden="true" />
          </Button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-7 sm:px-10 sm:py-10">
          <p className="mx-auto max-w-3xl whitespace-pre-wrap break-words text-center text-lg leading-9 text-foreground/88 sm:text-xl sm:leading-10">
            {content}
          </p>
        </div>
        <footer className="shrink-0 border-t border-white/[0.06] px-5 py-3 text-center text-[11px] uppercase tracking-[0.24em] text-muted-foreground/70">
          Playback continues while you read
        </footer>
      </section>
    </div>,
    document.body,
  );
}

interface LyricsDialogTriggerProps
  extends Pick<ButtonProps, "variant" | "size" | "className"> {
  lyrics: string | null | undefined;
  title: string;
  artistName?: string | null;
  label?: string;
}

export function LyricsDialogTrigger({
  lyrics,
  title,
  artistName,
  label = "Lyrics",
  variant = "ghost",
  size = "sm",
  className,
}: LyricsDialogTriggerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const content = lyrics?.trim();

  if (!content) {
    return null;
  }

  return (
    <>
      <Button
        ref={triggerRef}
        variant={variant}
        size={size}
        className={cn("rounded-full", className)}
        onClick={() => setIsOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-label={`Open lyrics for ${title}`}
      >
        <BookOpenText className="size-4" aria-hidden="true" />
        {label}
      </Button>
      <LyricsDialog
        open={isOpen}
        onOpenChange={setIsOpen}
        lyrics={content}
        title={title}
        artistName={artistName}
        returnFocusRef={triggerRef}
      />
    </>
  );
}
