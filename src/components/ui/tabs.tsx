import { cn } from "@/lib/utils";

export function Tabs({
  value,
  onValueChange,
  items,
  className,
  stretch = false,
}: {
  value: string;
  onValueChange: (nextValue: string) => void;
  items: Array<{ value: string; label: string }>;
  className?: string;
  stretch?: boolean;
}) {
  return (
    <div
      className={cn(
        "inline-flex rounded-[22px] border border-border bg-[linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.025))] p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]",
        stretch && "flex w-full",
        className,
      )}
    >
      {items.map((item) => {
        const selected = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            aria-pressed={selected}
            className={cn(
              "rounded-[16px] px-4 py-2.5 text-sm transition-[background-color,color,box-shadow]",
              stretch && "flex-1",
              selected
                ? "bg-[linear-gradient(90deg,rgba(157,92,255,0.95),rgba(193,126,255,0.92))] text-white shadow-[0_14px_32px_rgba(120,65,231,0.34)]"
                : "text-muted-foreground hover:bg-white/[0.04] hover:text-foreground",
            )}
            onClick={() => onValueChange(item.value)}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
