import { useEffect, useId, useMemo, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import { downsampleWaveform } from "@/lib/waveform";
import type { WaveformDataV1 } from "@/types/domain";

const VIEWBOX_WIDTH = 1000;
const VIEWBOX_HEIGHT = 140;

function shapePeak(value: number) {
  const clamped = Math.max(-1, Math.min(1, value));
  const magnitude = Math.pow(Math.abs(clamped), 0.82);
  return Math.sign(clamped) * magnitude;
}

function buildWaveformPaths(peaks: Array<[number, number]>) {
  if (!peaks.length) {
    return null;
  }

  const centerY = VIEWBOX_HEIGHT / 2;
  const verticalPadding = 8;
  const halfHeight = centerY - verticalPadding;
  const lastIndex = Math.max(peaks.length - 1, 1);
  const upperPoints: Array<[number, number]> = [];
  const lowerPoints: Array<[number, number]> = [];

  peaks.forEach(([min, max], index) => {
    const x = (index / lastIndex) * VIEWBOX_WIDTH;
    const shapedTop = shapePeak(max);
    const shapedBottom = shapePeak(min);
    upperPoints.push([x, centerY - shapedTop * halfHeight]);
    lowerPoints.push([x, centerY - shapedBottom * halfHeight]);
  });

  const upperPath = upperPoints
    .map(([x, y], index) => `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`)
    .join(" ");
  const lowerPath = lowerPoints
    .map(([x, y], index) => `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`)
    .join(" ");
  const areaPath = `${upperPath} ${[...lowerPoints]
    .reverse()
    .map(([x, y]) => `L ${x.toFixed(2)} ${y.toFixed(2)}`)
    .join(" ")} Z`;

  return {
    centerY,
    areaPath,
    upperPath,
    lowerPath,
  };
}

export function Waveform({
  waveform,
  durationSeconds,
  currentTime = 0,
  onSeek,
  disabled = false,
  barCount = 56,
  variant = "default",
  className,
  trackClassName,
  showFallbackLine = true,
  markers = [],
  onMarkerSelect,
}: {
  waveform: WaveformDataV1 | null;
  durationSeconds: number | null;
  currentTime?: number;
  onSeek?: (nextTime: number) => void;
  disabled?: boolean;
  barCount?: number;
  variant?: "default" | "preview";
  className?: string;
  trackClassName?: string;
  showFallbackLine?: boolean;
  markers?: Array<{
    id: string;
    timeSeconds: number;
    label: string;
    status?: "open" | "in_progress" | "resolved" | "wont_fix";
  }>;
  onMarkerSelect?: (markerId: string, timeSeconds: number) => void;
}) {
  const rawId = useId();
  const inputId = `${rawId}-seek`;
  const gradientId = `${rawId.replace(/[:]/g, "")}-waveform-gradient`;
  const playedGradientId = `${rawId.replace(/[:]/g, "")}-waveform-played-gradient`;
  const clipPathId = `${rawId.replace(/[:]/g, "")}-waveform-progress`;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [measuredWidth, setMeasuredWidth] = useState(0);
  const normalizedDuration = durationSeconds && Number.isFinite(durationSeconds) && durationSeconds > 0 ? durationSeconds : 0;
  const progressPercent = normalizedDuration
    ? Math.min(100, Math.max(0, (currentTime / normalizedDuration) * 100))
    : 0;
  const targetBucketCount = useMemo(() => {
    const sourceCount = waveform?.peaks.length ?? 0;
    if (!sourceCount) {
      return barCount;
    }

    const estimatedWidth = measuredWidth || Math.max(360, barCount * 10);
    return Math.min(
      sourceCount,
      Math.max(barCount * 4, Math.round(estimatedWidth * 0.55)),
    );
  }, [barCount, measuredWidth, waveform?.peaks.length]);
  const reducedWaveform = useMemo(
    () => downsampleWaveform(waveform, targetBucketCount),
    [targetBucketCount, waveform],
  );
  const bars = reducedWaveform?.peaks ?? [];
  const waveformPaths = useMemo(() => buildWaveformPaths(bars), [bars]);
  const palette = variant === "preview"
    ? {
        idleStart: "rgba(var(--accent-rgb), 0.32)",
        idleMid: "rgba(243, 233, 255, 0.62)",
        idleEnd: "rgba(var(--accent-rgb), 0.28)",
        playedStart: "rgba(var(--accent-rgb), 0.9)",
        playedEnd: "var(--accent-secondary)",
        upperIdle: "rgba(255,255,255,0.3)",
        lowerIdle: "rgba(238,228,255,0.2)",
        upperPlayed: "rgba(255,255,255,0.92)",
        lowerPlayed: "rgba(246,239,255,0.72)",
        centerLine: "rgba(255,255,255,0.08)",
      }
    : {
        idleStart: "rgba(var(--accent-rgb), 0.18)",
        idleMid: "rgba(233, 222, 255, 0.38)",
        idleEnd: "rgba(var(--accent-rgb), 0.16)",
        playedStart: "rgba(var(--accent-rgb), 0.78)",
        playedEnd: "var(--accent-secondary)",
        upperIdle: "rgba(255,255,255,0.18)",
        lowerIdle: "rgba(255,255,255,0.14)",
        upperPlayed: "rgba(255,255,255,0.78)",
        lowerPlayed: "rgba(242,232,255,0.56)",
        centerLine: "rgba(255,255,255,0.06)",
      };

  useEffect(() => {
    const element = containerRef.current;
    if (!element) {
      return;
    }

    const updateWidth = () => {
      setMeasuredWidth(element.clientWidth);
    };

    updateWidth();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateWidth);
      return () => {
        window.removeEventListener("resize", updateWidth);
      };
    }

    const observer = new ResizeObserver(() => {
      updateWidth();
    });
    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div className={cn("relative block", className)}>
      <input
        id={inputId}
        className="absolute inset-0 z-20 h-full w-full cursor-pointer opacity-0"
        type="range"
        min="0"
        max={normalizedDuration || 0}
        step="0.1"
        value={normalizedDuration ? Math.min(currentTime, normalizedDuration) : 0}
        disabled={disabled || !normalizedDuration}
        aria-label="Seek playback"
        onChange={(event) => onSeek?.(Number(event.currentTarget.value))}
      />
      {normalizedDuration
        ? markers.map((marker) => {
            const left = Math.min(100, Math.max(0, (marker.timeSeconds / normalizedDuration) * 100));
            return (
              <button
                key={marker.id}
                type="button"
                title={`${marker.label} · ${Math.floor(marker.timeSeconds / 60)}:${String(Math.floor(marker.timeSeconds % 60)).padStart(2, "0")}`}
                aria-label={`Open feedback ${marker.label}`}
                className={cn(
                  "absolute top-0 z-30 h-full w-5 -translate-x-1/2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                  marker.status === "resolved" || marker.status === "wont_fix"
                    ? "text-success"
                    : "text-accent-secondary",
                )}
                style={{ left: `${left}%` }}
                onClick={() => onMarkerSelect?.(marker.id, marker.timeSeconds)}
              >
                <span className="absolute left-1/2 top-1 h-[calc(100%-0.5rem)] w-px -translate-x-1/2 bg-current/45" />
                <span className="absolute left-1/2 top-0 size-2.5 -translate-x-1/2 rounded-full border border-background bg-current shadow-[0_0_14px_currentColor]" />
              </button>
            );
          })
        : null}
      <div ref={containerRef} className={cn("relative h-full overflow-hidden", trackClassName)}>
        {showFallbackLine ? (
          <>
            <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-white/8" />
            <div
              className="absolute left-0 top-1/2 h-[2px] -translate-y-1/2 rounded-full bg-gradient-to-r from-accent to-accent-secondary/90"
              style={{ width: `${progressPercent}%` }}
            />
          </>
        ) : null}
        {waveformPaths ? (
          <svg
            viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
            preserveAspectRatio="none"
            className="absolute inset-0 h-full w-full"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id={gradientId} x1="0%" x2="100%" y1="0%" y2="0%">
                <stop offset="0%" stopColor={palette.idleStart} />
                <stop offset="48%" stopColor={palette.idleMid} />
                <stop offset="100%" stopColor={palette.idleEnd} />
              </linearGradient>
              <linearGradient id={playedGradientId} x1="0%" x2="100%" y1="0%" y2="0%">
                <stop offset="0%" stopColor={palette.playedStart} />
                <stop offset="100%" stopColor={palette.playedEnd} />
              </linearGradient>
              <clipPath id={clipPathId}>
                <rect
                  x="0"
                  y="0"
                  width={Math.max(0, Math.min(VIEWBOX_WIDTH, (progressPercent / 100) * VIEWBOX_WIDTH))}
                  height={VIEWBOX_HEIGHT}
                />
              </clipPath>
            </defs>

            <path d={waveformPaths.areaPath} fill={`url(#${gradientId})`} opacity="0.8" />
            <path d={waveformPaths.upperPath} fill="none" stroke={palette.upperIdle} strokeWidth={variant === "preview" ? "1.9" : "1.6"} strokeLinecap="round" />
            <path d={waveformPaths.lowerPath} fill="none" stroke={palette.lowerIdle} strokeWidth={variant === "preview" ? "1.45" : "1.2"} strokeLinecap="round" />

            <g clipPath={`url(#${clipPathId})`}>
              <path d={waveformPaths.areaPath} fill={`url(#${playedGradientId})`} opacity="0.92" />
              <path d={waveformPaths.upperPath} fill="none" stroke={palette.upperPlayed} strokeWidth={variant === "preview" ? "2" : "1.8"} strokeLinecap="round" />
              <path d={waveformPaths.lowerPath} fill="none" stroke={palette.lowerPlayed} strokeWidth={variant === "preview" ? "1.55" : "1.3"} strokeLinecap="round" />
            </g>

            <path
              d={`M 0 ${waveformPaths.centerY.toFixed(2)} L ${VIEWBOX_WIDTH} ${waveformPaths.centerY.toFixed(2)}`}
              fill="none"
              stroke={palette.centerLine}
              strokeWidth="0.8"
            />
          </svg>
        ) : showFallbackLine ? (
          <div className="relative z-[1] flex h-full items-center justify-center">
            <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Waveform pending</span>
          </div>
        ) : null}
        {!waveformPaths && !showFallbackLine ? (
          <div className="relative z-[1] flex h-full items-center justify-center">
            <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Waveform pending</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
