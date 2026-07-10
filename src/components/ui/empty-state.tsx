import type { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="glass-panel flex flex-col items-start gap-4 rounded-[28px] border border-dashed border-border px-6 py-7">
      <div className="flex size-12 items-center justify-center rounded-full border border-border bg-white/5">
        <Icon className="size-5 text-accent" />
      </div>
      <div className="space-y-2">
        <h3 className="font-display text-lg font-semibold">{title}</h3>
        <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>
      </div>
      {actionLabel && onAction ? <Button variant="secondary" onClick={onAction}>{actionLabel}</Button> : null}
    </div>
  );
}
