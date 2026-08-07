import { Check, ChevronDown, Music2, Search } from "lucide-react";
import { useDeferredValue, useMemo, useState, type ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { groupSongsByUploadMonth } from "@/features/library/song-upload-groups";
import { cn } from "@/lib/utils";
import type { Song } from "@/types/domain";

export function GroupedSongPicker({
  songs,
  selectedSongIds,
  onToggleSong,
  mode,
  accessory,
  newSongSelected = false,
  onSelectNewSong,
}: {
  songs: Song[];
  selectedSongIds: string[];
  onToggleSong: (song: Song) => void;
  mode: "single" | "multiple";
  accessory?: (song: Song) => ReactNode;
  newSongSelected?: boolean;
  onSelectNewSong?: () => void;
}) {
  const [query, setQuery] = useState("");
  const [libraryVisible, setLibraryVisible] = useState(true);
  const [groupVisibility, setGroupVisibility] = useState<Record<string, boolean>>({});
  const deferredQuery = useDeferredValue(query.trim().toLocaleLowerCase());
  const selectedSet = useMemo(() => new Set(selectedSongIds), [selectedSongIds]);
  const groups = useMemo(() => {
    const filtered = deferredQuery
      ? songs.filter((song) => song.title.toLocaleLowerCase().includes(deferredQuery))
      : songs;
    return groupSongsByUploadMonth(filtered);
  }, [deferredQuery, songs]);

  return (
    <details
      className="group/library overflow-hidden rounded-[26px] border border-white/[0.07] bg-white/[0.018]"
      open={libraryVisible}
      onToggle={(event) => setLibraryVisible(event.currentTarget.open)}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4 marker:hidden">
        <div className="min-w-0">
          <p className="text-sm font-medium">Library songs</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Grouped by upload month · {songs.length} total
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <Badge variant={selectedSongIds.length ? "accent" : "neutral"}>
            {selectedSongIds.length} selected
          </Badge>
          <span className="flex size-9 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.025] text-muted-foreground transition-colors group-hover/library:border-accent/25 group-hover/library:text-foreground">
            <ChevronDown className="size-4 transition-transform duration-300 group-open/library:rotate-180" />
          </span>
        </div>
      </summary>

      <div className="border-t border-white/[0.06]">
        <div className="p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-11"
              placeholder="Search your library"
              value={query}
              onChange={(event) => setQuery(event.currentTarget.value)}
            />
          </div>
          {onSelectNewSong ? (
            <button
              type="button"
              onClick={onSelectNewSong}
              className={cn(
                "mt-3 flex w-full items-center gap-3 rounded-[18px] border px-4 py-3 text-left transition-[border-color,background-color,transform]",
                newSongSelected
                  ? "border-accent/45 bg-accent/12"
                  : "border-white/[0.06] bg-white/[0.025] hover:border-accent/20 hover:bg-white/[0.045]",
              )}
              aria-pressed={newSongSelected}
            >
              <span className={cn(
                "flex size-8 items-center justify-center rounded-xl border",
                newSongSelected ? "border-accent/40 bg-accent/18 text-accent-secondary" : "border-border text-muted-foreground",
              )}>
                {newSongSelected ? <Check className="size-4" /> : <Music2 className="size-4" />}
              </span>
              <span>
                <span className="block text-sm font-medium">Create a new song</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">Start a fresh song while building this single.</span>
              </span>
            </button>
          ) : null}
        </div>

        <div className="max-h-[28rem] space-y-2 overflow-y-auto border-t border-white/[0.05] p-3 [scrollbar-width:thin]">
          {groups.length > 0 ? groups.map((group, groupIndex) => {
            const containsSelection = group.songs.some((song) => selectedSet.has(song.id));
            return (
              <details
                key={`${group.key}:${deferredQuery ? "search" : "browse"}`}
                className="group overflow-hidden rounded-[20px] border border-white/[0.06] bg-white/[0.018]"
                open={Boolean(deferredQuery) || (groupVisibility[group.key] ?? (groupIndex === 0 || containsSelection))}
                onToggle={(event) => {
                  if (deferredQuery) return;
                  const isOpen = event.currentTarget.open;
                  setGroupVisibility((current) => ({
                    ...current,
                    [group.key]: isOpen,
                  }));
                }}
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5 marker:hidden">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="font-medium">{group.label}</span>
                    <Badge variant={containsSelection ? "accent" : "neutral"}>{group.songs.length}</Badge>
                  </div>
                  <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform duration-300 group-open:rotate-180" />
                </summary>
                <div className="grid gap-2 border-t border-white/[0.05] p-2 sm:grid-cols-2">
                  {group.songs.map((song) => {
                    const selected = selectedSet.has(song.id);
                    return (
                      <button
                        key={song.id}
                        type="button"
                        onClick={() => onToggleSong(song)}
                        className={cn(
                          "flex min-w-0 items-center gap-3 rounded-[17px] border px-3 py-3 text-left transition-[transform,border-color,background-color,box-shadow] duration-200 [content-visibility:auto]",
                          selected
                            ? "border-accent/45 bg-accent/13 shadow-[0_10px_28px_rgba(var(--accent-rgb),0.12)]"
                            : "border-transparent bg-white/[0.02] hover:-translate-y-0.5 hover:border-white/[0.08] hover:bg-white/[0.045]",
                        )}
                        aria-pressed={selected}
                      >
                        <span className={cn(
                          "flex size-8 shrink-0 items-center justify-center rounded-xl border transition-colors",
                          selected
                            ? "border-accent/45 bg-accent/20 text-accent-secondary"
                            : "border-border bg-white/[0.025] text-muted-foreground",
                        )}>
                          {selected ? <Check className="size-4" /> : <Music2 className="size-4" />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium" title={song.title}>{song.title}</span>
                          <span className="mt-1 flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
                            {mode === "single" ? "Choose song" : selected ? "In tracklist" : "Add to tracklist"}
                          </span>
                        </span>
                        {accessory?.(song)}
                      </button>
                    );
                  })}
                </div>
              </details>
            );
          }) : (
            <div className="px-4 py-10 text-center">
              <Music2 className="mx-auto size-6 text-muted-foreground" />
              <p className="mt-3 text-sm font-medium">No songs match this search.</p>
              <p className="mt-1 text-xs text-muted-foreground">Try a shorter title or clear the search.</p>
            </div>
          )}
        </div>
      </div>
    </details>
  );
}
