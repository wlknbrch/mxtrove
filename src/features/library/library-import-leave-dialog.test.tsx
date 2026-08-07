import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { LibraryImportLeaveDialog } from "@/features/library/library-import-leave-dialog";

describe("LibraryImportLeaveDialog", () => {
  it("keeps destructive cleanup out of the abort warning and lets the user stay", () => {
    const onStay = vi.fn();
    render(
      <LibraryImportLeaveDialog
        open
        aborting={false}
        onAbort={vi.fn()}
        onStay={onStay}
      />,
    );

    expect(screen.getByRole("dialog", { name: "Abort this import?" })).toBeInTheDocument();
    expect(screen.getByText(/already finished remain safely in your Library/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Keep uploading" }));
    expect(onStay).toHaveBeenCalledOnce();
  });
});
