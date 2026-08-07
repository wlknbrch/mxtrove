import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { UploadDropzone } from "@/features/drive/components/upload-dropzone";

describe("UploadDropzone", () => {
  it("renders only the upload control in compact mode", () => {
    render(
      <UploadDropzone
        compact
        title="Drop one song into your library"
        description="A redundant explanation"
        parentFolderId="folder-id"
        onUpload={vi.fn()}
      />,
    );

    expect(screen.getByText("Drag an audio file here or choose one from your device.")).toBeInTheDocument();
    expect(screen.getByText("Choose file")).toBeInTheDocument();
    expect(screen.queryByText("Drop one song into your library")).not.toBeInTheDocument();
    expect(screen.queryByText("A redundant explanation")).not.toBeInTheDocument();
  });

  it("hands multiple selected files to the batch importer instead of starting a single upload", () => {
    const onUpload = vi.fn();
    const onMultipleFiles = vi.fn();
    const { container } = render(
      <UploadDropzone
        compact
        multiple
        parentFolderId="folder-id"
        onUpload={onUpload}
        onMultipleFiles={onMultipleFiles}
      />,
    );
    const files = [
      new File(["first"], "First.wav", { type: "audio/wav" }),
      new File(["second"], "Second.wav", { type: "audio/wav" }),
    ];

    fireEvent.change(container.querySelector("input[type='file']")!, { target: { files } });

    expect(onMultipleFiles).toHaveBeenCalledWith(files);
    expect(onUpload).not.toHaveBeenCalled();
    expect(screen.getByText("Choose files")).toBeInTheDocument();
  });
});
