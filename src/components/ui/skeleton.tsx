export function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-[18px] bg-white/6 ${className ?? ""}`} />;
}
