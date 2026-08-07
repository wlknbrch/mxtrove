import { useEffect } from "react";
import type { UseFormReturn } from "react-hook-form";

import type { SongFormValues } from "@/lib/validators";
import type { Song } from "@/types/domain";

export function getSongFormValues(song: Song): SongFormValues {
  return {
    title: song.title,
    notes: song.notes ?? "",
    lyrics: song.lyrics ?? "",
    musical_key: song.musical_key ?? "",
    tempo_bpm: song.tempo_bpm,
    default_artwork_asset_id: song.default_artwork_asset_id,
  };
}

export function useSongFormHydration(
  form: UseFormReturn<SongFormValues>,
  song: Song | null,
) {
  useEffect(() => {
    if (!song) {
      return;
    }

    form.reset(getSongFormValues(song), {
      // Asset, version, and analysis actions refetch the song. Keep any
      // metadata the artist is still editing instead of restoring stale data.
      keepDirtyValues: true,
    });
  }, [form, song]);
}
