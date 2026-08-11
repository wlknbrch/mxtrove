import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import { LyricsDialogTrigger } from "@/features/songs/lyrics-dialog";

afterEach(() => cleanup());

describe("LyricsDialogTrigger", () => {
  it("opens a themed dialog and restores the page after closing", async () => {
    const user = userEvent.setup();

    render(
      <LyricsDialogTrigger
        lyrics={"First line\nSecond line"}
        title="Midnight Echo"
        artistName="Dev Test"
      />,
    );

    await user.click(screen.getByRole("button", { name: "Open lyrics for Midnight Echo" }));

    const dialog = screen.getByRole("dialog", { name: "Midnight Echo" });
    expect(dialog.querySelector(".lyrics-panel")).toBeInTheDocument();
    expect(dialog.querySelector(".modal-scrim")).toBeInTheDocument();
    expect(screen.getByText("First line Second line")).toBeVisible();
    expect(document.body.style.overflow).toBe("hidden");

    await user.click(screen.getAllByRole("button", { name: "Close lyrics" })[1]);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe("");
  });

  it("does not render a trigger for an empty lyrics value", () => {
    render(<LyricsDialogTrigger lyrics="  " title="Instrumental" />);

    expect(screen.queryByRole("button", { name: /open lyrics/i })).not.toBeInTheDocument();
  });
});
