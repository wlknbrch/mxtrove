import type { Song } from "@/types/domain";

export interface SongUploadGroup {
  key: string;
  label: string;
  songs: Song[];
}

const monthFormatter = new Intl.DateTimeFormat("en", {
  month: "long",
  year: "numeric",
});

export function groupSongsByUploadMonth(songs: Song[]): SongUploadGroup[] {
  const groups = new Map<string, SongUploadGroup>();
  const sortedSongs = [...songs].sort((left, right) =>
    new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
  );

  for (const song of sortedSongs) {
    const createdAt = new Date(song.created_at);
    const validDate = !Number.isNaN(createdAt.getTime());
    const key = validDate
      ? `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, "0")}`
      : "unknown";
    const existing = groups.get(key);
    if (existing) {
      existing.songs.push(song);
    } else {
      groups.set(key, {
        key,
        label: validDate ? monthFormatter.format(createdAt) : "Unknown upload date",
        songs: [song],
      });
    }
  }

  return [...groups.values()];
}
