import type { SongFormValues } from "@/lib/validators";

export function buildSongInsertPayload(ownerId: string, values: SongFormValues) {
  return {
    owner_id: ownerId,
    title: values.title.trim(),
    notes: values.notes?.trim() ? values.notes.trim() : null,
    lyrics: values.lyrics?.trim() ? values.lyrics.trim() : null,
    musical_key: values.musical_key?.trim() ? values.musical_key.trim() : null,
    tempo_bpm: values.tempo_bpm ?? null,
    default_artwork_asset_id: values.default_artwork_asset_id || null,
  };
}
