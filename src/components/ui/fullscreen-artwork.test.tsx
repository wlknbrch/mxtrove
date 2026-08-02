import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FullscreenArtwork } from "@/components/ui/fullscreen-artwork";

describe("FullscreenArtwork", () => {
  it("opens fullscreen, locks scrolling, and closes with Escape", () => {
    render(
      <FullscreenArtwork
        src="data:image/png;base64,aW1hZ2U="
        alt="Test release"
        className="size-40"
      />,
    );

    const trigger = screen.getByRole("button", {
      name: "Open Test release artwork fullscreen",
    });
    fireEvent.click(trigger);

    expect(screen.getByRole("dialog", { name: "Test release" })).toBeInTheDocument();
    expect(document.body.style.overflow).toBe("hidden");

    fireEvent.keyDown(window, { key: "Escape" });

    expect(screen.queryByRole("dialog", { name: "Test release" })).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe("");
    expect(trigger).toHaveFocus();
  });

  it("does not offer fullscreen viewing without artwork", () => {
    render(<FullscreenArtwork src={null} alt="Missing release" className="size-40" />);

    expect(
      screen.queryByRole("button", { name: "Open Missing release artwork fullscreen" }),
    ).not.toBeInTheDocument();
  });
});
