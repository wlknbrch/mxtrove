import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

export function OverflowMarqueeText({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLSpanElement | null>(null);
  const [overflowDistance, setOverflowDistance] = useState(0);

  useEffect(() => {
    const viewport = viewportRef.current;
    const content = contentRef.current;
    if (!viewport || !content) return;

    const measure = () => {
      setOverflowDistance(Math.max(0, Math.ceil(content.scrollWidth - viewport.clientWidth)));
    };
    measure();

    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    observer.observe(content);
    return () => observer.disconnect();
  }, [text]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || overflowDistance <= 4) {
      viewport?.scrollTo({ left: 0 });
      return;
    }

    const startPauseMs = 420;
    const endPauseMs = 700;
    const travelMs = Math.min(9_500, Math.max(3_800, 2_900 + overflowDistance * 20));
    const cycleMs = startPauseMs + travelMs + endPauseMs;
    const startedAt = performance.now();
    let frameId = 0;

    const animate = (now: number) => {
      const elapsed = (now - startedAt) % cycleMs;
      const progress = elapsed <= startPauseMs
        ? 0
        : elapsed >= startPauseMs + travelMs
          ? 1
          : (elapsed - startPauseMs) / travelMs;
      // Ease the actual scroll position so it remains reliable across desktop and mobile browsers.
      const easedProgress = progress * progress * (3 - 2 * progress);
      viewport.scrollLeft = overflowDistance * easedProgress;
      frameId = window.requestAnimationFrame(animate);
    };

    frameId = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(frameId);
  }, [overflowDistance]);

  const isOverflowing = overflowDistance > 4;

  return (
    <div
      ref={viewportRef}
      className={cn("player-title-marquee", className)}
      data-overflowing={isOverflowing ? "true" : "false"}
      title={text}
    >
      <span ref={contentRef} className="player-title-marquee__content">
        {text}
      </span>
    </div>
  );
}
