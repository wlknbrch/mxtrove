import type { PropsWithChildren } from "react";

import { cn } from "@/lib/utils";

export function Card({
  children,
  className,
}: PropsWithChildren<{ className?: string }>) {
  return (
    <div
      className={cn(
        "glass-panel rounded-[30px] border border-border px-5 py-5 text-foreground shadow-[0_28px_72px_rgba(2,0,12,0.38)] md:px-6",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  children,
  className,
}: PropsWithChildren<{ className?: string }>) {
  return <div className={cn("mb-5 flex items-start justify-between gap-4", className)}>{children}</div>;
}

export function CardTitle({
  children,
  className,
}: PropsWithChildren<{ className?: string }>) {
  return (
    <h2 className={cn("font-display text-xl font-semibold tracking-[-0.02em]", className)}>
      {children}
    </h2>
  );
}

export function CardDescription({
  children,
  className,
}: PropsWithChildren<{ className?: string }>) {
  return <p className={cn("text-sm text-muted-foreground", className)}>{children}</p>;
}
