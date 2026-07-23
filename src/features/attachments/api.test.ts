import { describe, expect, it } from "vitest";

import { getUploadableAttachmentKind } from "@/features/attachments/api";

describe("message attachment selection", () => {
  it("accepts the supported audio, raster image, and document groups", () => {
    expect(getUploadableAttachmentKind(new File(["audio"], "mix.wav", { type: "audio/wav" }))).toBe("audio");
    expect(getUploadableAttachmentKind(new File(["image"], "cover.webp", { type: "image/webp" }))).toBe("image");
    expect(getUploadableAttachmentKind(new File(["notes"], "notes.md", { type: "" }))).toBe("document");
    expect(getUploadableAttachmentKind(new File(["pdf"], "notes.pdf", { type: "application/pdf" }))).toBe("document");
  });

  it("rejects active images, archives, and executable files before upload", () => {
    expect(getUploadableAttachmentKind(new File(["svg"], "cover.svg", { type: "image/svg+xml" }))).toBeNull();
    expect(getUploadableAttachmentKind(new File(["zip"], "session.zip", { type: "application/zip" }))).toBeNull();
    expect(getUploadableAttachmentKind(new File(["exe"], "tool.exe", { type: "application/octet-stream" }))).toBeNull();
  });
});
