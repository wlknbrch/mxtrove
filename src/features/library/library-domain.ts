import type { SongFormValues } from "@/lib/validators";

export function buildSongInsertPayload(ownerId: string, values: SongFormValues) {
  return {
    owner_id: ownerId,
    title: values.title.trim(),
    notes: values.notes?.trim() ? values.notes.trim() : null,
    default_artwork_asset_id: values.default_artwork_asset_id || null,
  };
}
