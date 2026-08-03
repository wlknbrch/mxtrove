import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Song } from "@/types/domain";

function formatTempo(tempo: number) {
  return Number.isInteger(tempo) ? String(tempo) : tempo.toFixed(1);
}

export function SongMetadataBadges({
  song,
  className,
}: {
  song: Pick<Song, "musical_key" | "tempo_bpm"> | null | undefined;
  className?: string;
}) {
  if (!song?.musical_key && song?.tempo_bpm == null) {
    return null;
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-2 md:w-max md:flex-nowrap", className)}>
      {song.musical_key ? <Badge variant="cyan">{song.musical_key}</Badge> : null}
      {song.tempo_bpm != null ? <Badge variant="accent">{formatTempo(song.tempo_bpm)} BPM</Badge> : null}
    </div>
  );
}
