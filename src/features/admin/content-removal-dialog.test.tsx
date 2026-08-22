import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ContentRemovalDialog } from "@/features/admin/content-removal-dialog";

afterEach(cleanup);

describe("ContentRemovalDialog", () => {
  it("requires a reason and explains that cloud originals stay untouched", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();

    render(
      <ContentRemovalDialog
        target={{ type: "post", id: "post-1", label: "A public release" }}
        pending={false}
        onClose={vi.fn()}
        onConfirm={onConfirm}
      />,
    );

    expect(screen.getByText(/cloud account are not deleted/i)).toBeVisible();
    expect(screen.getByText(/affected creator receives a system notification/i)).toBeVisible();
    const removeButton = screen.getByRole("button", { name: "Remove from MxTrove" });
    expect(removeButton).toBeDisabled();

    await user.selectOptions(screen.getByRole("combobox", { name: "Reason for removal" }), "copyright");
    await user.click(removeButton);

    expect(onConfirm).toHaveBeenCalledWith("copyright");
  });
});
