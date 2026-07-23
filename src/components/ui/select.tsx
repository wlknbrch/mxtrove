import { forwardRef, type SelectHTMLAttributes } from "react";

import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ children, className, ...props }, ref) => (
    <div className="relative">
      <select
        ref={ref}
        className={cn(
          "min-h-12 w-full appearance-none rounded-[18px] border border-border bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.018))] px-4 py-3 pr-11 text-sm text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] outline-none transition-[border-color,background-color,box-shadow] focus:border-accent/55 focus:bg-white/[0.06] focus:shadow-[0_0_0_4px_rgba(var(--accent-rgb),0.08)]",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-subtle-foreground" />
    </div>
  ),
);

Select.displayName = "Select";
