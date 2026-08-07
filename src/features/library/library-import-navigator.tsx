import { AlertTriangle, Check, ChevronLeft, ChevronRight, LoaderCircle, Music2 } from "lucide-react";
import { Link } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { readLibraryImportSession } from "@/features/library/library-import-session";
import { cn } from "@/lib/utils";

export function LibraryImportNavigator({
  batchId,
  currentSongId,
}: {
  batchId: string;
  currentSongId: string;
}) {
  const session = readLibraryImportSession(batchId);
  const songs = session?.items.filter((item) => item.songId) ?? [];
  const currentIndex = songs.findIndex((item) => item.songId === currentSongId);

  if (!session || songs.length === 0 || currentIndex < 0) {
    return null;
  }

  const previous = songs[currentIndex - 1] ?? null;
  const next = songs[currentIndex + 1] ?? null;

  return (
    <section className="glass-panel relative overflow-hidden rounded-[30px] border border-accent/20 p-4 shadow-[0_24px_70px_rgba(var(--accent-rgb),0.16)] md:p-5">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/70 to-transparent" />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-accent-secondary">Import session</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {currentIndex + 1} of {songs.length} · edit every song without losing your place
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link to={previous?.songId ? `/library/songs/${previous.songId}?batch=${batchId}` : "#"} aria-disabled={!previous}>
            <Button variant="ghost" size="sm" className="size-9 p-0" disabled={!previous} aria-label="Previous imported song">
              <ChevronLeft className="size-4" />
            </Button>
          </Link>
          <Link to={`/library/import/${batchId}`}>
            <Button variant="ghost" size="sm">Import overview</Button>
          </Link>
          <Link to={next?.songId ? `/library/songs/${next.songId}?batch=${batchId}` : "#"} aria-disabled={!next}>
            <Button variant="ghost" size="sm" className="size-9 p-0" disabled={!next} aria-label="Next imported song">
              <ChevronRight className="size-4" />
            </Button>
          </Link>
        </div>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:thin]">
        {songs.map((item, index) => {
          const active = item.songId === currentSongId;
          const StatusIcon = item.status === "failed"
            ? AlertTriangle
            : item.status === "ready" || item.status === "attention"
              ? Check
              : LoaderCircle;

          return (
            <Link
              key={item.id}
              to={`/library/songs/${item.songId}?batch=${batchId}`}
              className={cn(
                "group relative min-w-[13rem] overflow-hidden rounded-[22px] border px-4 py-3 transition-[transform,border-color,background-color,box-shadow] duration-300",
                active
                  ? "-translate-y-0.5 border-accent/55 bg-accent/14 shadow-[0_16px_38px_rgba(var(--accent-rgb),0.2)]"
                  : "border-white/[0.07] bg-white/[0.025] hover:-translate-y-0.5 hover:border-accent/25 hover:bg-white/[0.045]",
              )}
              aria-current={active ? "step" : undefined}
            >
              <div className="flex items-start gap-3">
                <span className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-xl border text-xs font-medium",
                  active ? "border-accent/40 bg-accent/18 text-accent-secondary" : "border-border bg-white/[0.035] text-muted-foreground",
                )}>
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{item.title}</p>
                  <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                    <StatusIcon className={cn("size-3.5", item.status === "uploading" || item.status === "creating" ? "animate-spin" : "")} />
                    <span>{active ? "Editing now" : item.status === "attention" ? "Preview needs attention" : item.status}</span>
                  </div>
                </div>
              </div>
              {active ? <div className="absolute inset-x-4 bottom-0 h-0.5 rounded-full bg-gradient-to-r from-accent to-accent-secondary" /> : null}
            </Link>
          );
        })}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Badge variant="neutral"><Music2 className="size-3.5" /> Batch workspace</Badge>
        <span className="text-xs text-muted-foreground">Versions remain intentionally manual.</span>
      </div>
    </section>
  );
}
