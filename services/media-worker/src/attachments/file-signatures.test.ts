import { describe, expect, it } from "vitest";

import { detectAttachmentSignature } from "./file-signatures.js";

describe("detectAttachmentSignature", () => {
  it("detects supported image, document, and audio signatures", () => {
    expect(detectAttachmentSignature(Buffer.from([0xff, 0xd8, 0xff, 0x00]), "cover.bin"))
      .toMatchObject({ kind: "image", mimeType: "image/jpeg" });
    expect(detectAttachmentSignature(Buffer.from("%PDF-1.7"), "notes.bin"))
      .toMatchObject({ kind: "document", mimeType: "application/pdf" });
    expect(detectAttachmentSignature(Buffer.from("fLaC0000"), "mix.bin"))
      .toMatchObject({ kind: "audio", mimeType: "audio/flac" });
  });

  it("allows UTF-8 text only for explicit text extensions", () => {
    expect(detectAttachmentSignature(Buffer.from("# Session notes"), "notes.md"))
      .toMatchObject({ kind: "document", mimeType: "text/markdown" });
    expect(detectAttachmentSignature(Buffer.from("# Session notes"), "notes.exe")).toBeNull();
    expect(detectAttachmentSignature(Buffer.from([0x00, 0x01, 0x02]), "notes.txt")).toBeNull();
  });

  it("rejects active web content and executable payloads", () => {
    expect(detectAttachmentSignature(Buffer.from("<svg><script>alert(1)</script></svg>"), "cover.svg"))
      .toBeNull();
    expect(detectAttachmentSignature(Buffer.from("<!doctype html><script>alert(1)</script>"), "page.html"))
      .toBeNull();
    expect(detectAttachmentSignature(Buffer.from([0x4d, 0x5a, 0x90, 0x00]), "notes.pdf"))
      .toBeNull();
  });
});
