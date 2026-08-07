import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";

import { ReleaseCreditsInput } from "@/features/posts/release-credits-input";

function CreditsInputHarness() {
  const [value, setValue] = useState("");
  return <ReleaseCreditsInput value={value} onChange={setValue} />;
}

afterEach(cleanup);

describe("ReleaseCreditsInput", () => {
  it("keeps role choices hidden until the user starts entering a role", async () => {
    const user = userEvent.setup();
    render(<CreditsInputHarness />);

    const input = screen.getByRole("textbox", { name: "Credits" });
    expect(screen.queryByRole("listbox", { name: "Matching credit roles" })).not.toBeInTheDocument();
    expect(screen.queryByText("Available roles:")).not.toBeInTheDocument();

    await user.type(input, "Ari Vega | pro");

    expect(screen.getByRole("listbox", { name: "Matching credit roles" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /producer/i })).toBeInTheDocument();
  });

  it("accepts the highlighted suggestion without leaving a persistent menu", async () => {
    const user = userEvent.setup();
    render(<CreditsInputHarness />);

    const input = screen.getByRole("textbox", { name: "Credits" });
    await user.type(input, "Ari Vega | pro");
    await user.keyboard("{Enter}");

    expect(input).toHaveValue("Ari Vega | producer");
    expect(screen.queryByRole("listbox", { name: "Matching credit roles" })).not.toBeInTheDocument();
  });
});
