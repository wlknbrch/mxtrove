import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Maximize2, X } from "lucide-react";

import { ResolvedImage } from "@/components/ui/resolved-image";
import { cn } from "@/lib/utils";

interface FullscreenArtworkProps {
  src?: string | string[] | null;
  alt: string;
  className?: string;
  imageClassName?: string;
  children?: ReactNode;
  allowFullscreen?: boolean;
  priority?: boolean;
}

function hasArtworkSource(src: FullscreenArtworkProps["src"]) {
  return Array.isArray(src) ? src.some(Boolean) : Boolean(src);
}

export function FullscreenArtwork({
  src,
  alt,
  className,
  imageClassName,
  children,
  allowFullscreen = true,
  priority = false,
}: FullscreenArtworkProps) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const hasSource = hasArtworkSource(src);
  const canOpenFullscreen = hasSource && allowFullscreen;

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    closeRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      triggerRef.current?.focus({ preventScroll: true });
    };
  }, [isOpen]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={!canOpenFullscreen}
        className={cn(
          "group/artwork relative block overflow-hidden text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/80 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          canOpenFullscreen ? "cursor-zoom-in" : "cursor-default",
          className,
        )}
        onClick={() => {
          if (canOpenFullscreen) setIsOpen(true);
        }}
        aria-label={canOpenFullscreen ? `Open ${alt} artwork fullscreen` : undefined}
      >
        <ResolvedImage
          src={src}
          alt={alt}
          className={imageClassName}
          {...(priority ? { loading: "eager" as const, fetchPriority: "high" as const } : {})}
        />
        {children}
        {canOpenFullscreen ? (
          <span className="absolute right-3 top-3 z-30 flex size-9 items-center justify-center rounded-full border border-white/20 bg-black/55 text-white shadow-lg backdrop-blur-md transition md:opacity-0 md:group-hover/artwork:opacity-100 md:group-focus-visible/artwork:opacity-100">
            <Maximize2 className="size-4" aria-hidden="true" />
          </span>
        ) : null}
      </button>

      {isOpen && typeof document !== "undefined"
        ? createPortal(
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6"
            >
              <button
                type="button"
                className="absolute inset-0 cursor-zoom-out bg-[rgba(3,2,10,0.94)] backdrop-blur-xl"
                onClick={() => setIsOpen(false)}
                aria-label="Close fullscreen artwork"
              />
              <div className="pointer-events-none relative z-10 flex max-h-full max-w-full flex-col items-center gap-4">
                <ResolvedImage
                  src={src}
                  alt={alt}
                  className="pointer-events-auto max-h-[calc(100dvh-7.5rem)] max-w-[calc(100vw-1.5rem)] rounded-[24px] object-contain shadow-[0_30px_100px_rgba(0,0,0,0.75)] sm:max-w-[calc(100vw-3rem)]"
                />
                <p
                  id={titleId}
                  className="max-w-[min(90vw,52rem)] truncate text-center text-sm font-medium tracking-wide text-white/75"
                >
                  {alt}
                </p>
              </div>
              <button
                ref={closeRef}
                type="button"
                className="absolute right-4 top-[calc(env(safe-area-inset-top)+1rem)] z-20 flex size-12 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white shadow-xl backdrop-blur-md transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:right-6 sm:top-6"
                onClick={() => setIsOpen(false)}
                aria-label="Close fullscreen artwork"
              >
                <X className="size-5" aria-hidden="true" />
              </button>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
