import { forwardRef, type InputHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "min-h-12 w-full rounded-[18px] border border-border bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.018))] px-4 py-3 text-sm text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] outline-none transition-[border-color,background-color,box-shadow] placeholder:text-subtle-foreground/90 focus:border-accent/55 focus:bg-white/[0.06] focus:shadow-[0_0_0_4px_rgba(var(--accent-rgb),0.08)]",
        className,
      )}
      {...props}
    />
  ),
);

Input.displayName = "Input";
