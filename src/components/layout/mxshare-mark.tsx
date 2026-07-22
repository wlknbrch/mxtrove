import { cn } from "@/lib/utils";

export function MxShareMark({ className }: { className?: string }) {
  return (
    <img
      src="/mxshare-icon-no-bg.png"
      alt=""
      aria-hidden="true"
      draggable="false"
      className={cn("size-10 shrink-0 select-none object-contain", className)}
    />
  );
}
