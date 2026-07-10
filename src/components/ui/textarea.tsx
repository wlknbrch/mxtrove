import { forwardRef, type TextareaHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "min-h-28 w-full rounded-[22px] border border-border bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.018))] px-4 py-3 text-sm text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] outline-none transition-[border-color,background-color,box-shadow] placeholder:text-subtle-foreground/90 focus:border-accent/55 focus:bg-white/[0.06] focus:shadow-[0_0_0_4px_rgba(157,92,255,0.08)]",
      className,
    )}
    {...props}
  />
));

Textarea.displayName = "Textarea";
