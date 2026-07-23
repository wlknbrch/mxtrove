import type { PropsWithChildren, ReactNode } from "react";

import { cn } from "@/lib/utils";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: PropsWithChildren<{
  eyebrow?: ReactNode;
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}>) {
  return (
    <div
      className={cn(
        "relative mb-8 flex flex-col gap-6 lg:mb-10 lg:flex-row lg:items-end lg:justify-between",
        className,
      )}
    >
      <div className="max-w-3xl space-y-4">
        {eyebrow ? (
          <p className="text-[0.72rem] uppercase tracking-[0.32em] text-accent-secondary/82">{eyebrow}</p>
        ) : null}
        <h1 className="font-display text-5xl font-semibold leading-none tracking-[-0.05em] md:text-6xl xl:text-7xl">
          {title}
        </h1>
        {description ? (
          <p className="max-w-3xl text-base leading-8 text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex items-center gap-3 lg:justify-end">{actions}</div> : null}
    </div>
  );
}
