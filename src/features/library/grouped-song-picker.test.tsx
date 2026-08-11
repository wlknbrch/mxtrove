import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { GroupedSongPicker } from "@/features/library/grouped-song-picker";
import type { Song } from "@/types/domain";

function makeSong(id: string, title: string, createdAt: string): Song {
  return {
    id,
    owner_id: "owner-id",
    title,
    notes: null,
    lyrics: null,
    musical_key: null,
    tempo_bpm: null,
    tempo_confidence: null,
    key_confidence: null,
    audio_analysis_updated_at: null,
    default_artwork_asset_id: null,
    created_at: createdAt,
    updated_at: createdAt,
  };
}

describe("GroupedSongPicker", () => {
  it("groups songs, filters loosely by title, and selects the requested song", async () => {
    const user = userEvent.setup();
    const onToggleSong = vi.fn();
    const winterSong = makeSong("winter", "Winter Sketch", "2026-01-18T10:00:00.000Z");

    render(
      <GroupedSongPicker
        songs={[
          makeSong("summer", "Summer Signal", "2026-02-10T10:00:00.000Z"),
          winterSong,
        ]}
        selectedSongIds={[]}
        onToggleSong={onToggleSong}
        mode="multiple"
      />,
    );

    expect(screen.getByText("February 2026")).toBeInTheDocument();
    expect(screen.getByText("January 2026")).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText("Search your library"), "winter");
    expect(await screen.findByText("Winter Sketch")).toBeInTheDocument();
    expect(screen.queryByText("Summer Signal")).not.toBeInTheDocument();

    await user.click(screen.getByText("Winter Sketch"));
    expect(onToggleSong).toHaveBeenCalledWith(winterSong);
  });

  it("collapses and restores the complete library song panel", async () => {
    const user = userEvent.setup();
    window.localStorage.removeItem("mxtrove:release-editor:library-songs-expanded");

    const { container, unmount } = render(
      <GroupedSongPicker
        songs={[makeSong("song", "A Library Song", "2026-02-10T10:00:00.000Z")]}
        selectedSongIds={["song"]}
        onToggleSong={vi.fn()}
        mode="single"
      />,
    );

    const libraryToggle = container.querySelector('button[aria-controls]');
    expect(libraryToggle).not.toBeNull();
    const searchInput = container.querySelector<HTMLInputElement>('input[placeholder="Search your library"]');
    expect(searchInput).not.toBeNull();
    expect(searchInput).toBeVisible();
    expect(container).toHaveTextContent("1 selected");

    await user.click(libraryToggle!);
    expect(searchInput).not.toBeInTheDocument();
    expect(container).toHaveTextContent("1 selected");
    expect(window.localStorage.getItem("mxtrove:release-editor:library-songs-expanded")).toBe("false");

    unmount();
    const restored = render(
      <GroupedSongPicker
        songs={[makeSong("song", "A Library Song", "2026-02-10T10:00:00.000Z")]}
        selectedSongIds={["song"]}
        onToggleSong={vi.fn()}
        mode="single"
      />,
    );
    const restoredSearch = restored.container.querySelector<HTMLInputElement>('input[placeholder="Search your library"]');
    expect(restoredSearch).toBeNull();

    await user.click(restored.container.querySelector('button[aria-controls]')!);
    expect(restored.container.querySelector('input[placeholder="Search your library"]')).toBeVisible();
    expect(restored.container).toHaveTextContent("A Library Song");
  });
});
