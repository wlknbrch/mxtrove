import { act, renderHook, waitFor } from "@testing-library/react";
import { useForm } from "react-hook-form";
import { describe, expect, it } from "vitest";

import { useSongFormHydration } from "@/features/songs/use-song-form-hydration";
import type { SongFormValues } from "@/lib/validators";
import type { Song } from "@/types/domain";

function makeSong(overrides: Partial<Song> = {}): Song {
  return {
    id: "song-id",
    owner_id: "owner-id",
    title: "Original title",
    notes: "Original notes",
    lyrics: null,
    musical_key: null,
    tempo_bpm: null,
    tempo_confidence: null,
    key_confidence: null,
    audio_analysis_updated_at: null,
    default_artwork_asset_id: null,
    created_at: "2026-08-07T10:00:00.000Z",
    updated_at: "2026-08-07T10:00:00.000Z",
    ...overrides,
  };
}

function useHydratedSongForm(song: Song) {
  const form = useForm<SongFormValues>({
    defaultValues: {
      title: "",
      notes: "",
      lyrics: "",
      musical_key: "",
      tempo_bpm: null,
      default_artwork_asset_id: null,
    },
  });
  useSongFormHydration(form, song);
  return form;
}

describe("useSongFormHydration", () => {
  it("preserves edited metadata when the song query refreshes", async () => {
    const initialSong = makeSong();
    const { result, rerender } = renderHook(
      ({ song }) => useHydratedSongForm(song),
      { initialProps: { song: initialSong } },
    );

    await waitFor(() => expect(result.current.getValues("title")).toBe("Original title"));

    act(() => {
      result.current.setValue("title", "Unsaved new title", { shouldDirty: true });
    });

    rerender({
      song: makeSong({
        notes: "Notes refreshed after analysis",
        tempo_bpm: 128,
        updated_at: "2026-08-07T10:05:00.000Z",
      }),
    });

    await waitFor(() => {
      expect(result.current.getValues()).toMatchObject({
        title: "Unsaved new title",
        notes: "Notes refreshed after analysis",
        tempo_bpm: 128,
      });
    });
  });
});
