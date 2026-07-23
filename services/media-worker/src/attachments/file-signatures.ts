import path from "node:path";

export type AttachmentKind = "audio" | "image" | "document";

export interface DetectedAttachment {
  kind: AttachmentKind;
  mimeType: string;
  extension: string;
}

function startsWith(buffer: Buffer, signature: number[]) {
  return signature.every((value, index) => buffer[index] === value);
}

function isPlainText(buffer: Buffer) {
  if (buffer.includes(0)) {
    return false;
  }
  const decoded = buffer.toString("utf8");
  const replacementCount = Array.from(decoded).filter((character) => character === "\uFFFD").length;
  return replacementCount <= Math.max(1, Math.floor(decoded.length * 0.01));
}

export function detectAttachmentSignature(
  header: Buffer,
  filename: string,
): DetectedAttachment | null {
  if (startsWith(header, [0xff, 0xd8, 0xff])) {
    return { kind: "image", mimeType: "image/jpeg", extension: ".jpg" };
  }
  if (startsWith(header, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return { kind: "image", mimeType: "image/png", extension: ".png" };
  }
  if (header.subarray(0, 6).toString("ascii").match(/^GIF8[79]a$/)) {
    return { kind: "image", mimeType: "image/gif", extension: ".gif" };
  }
  if (
    header.subarray(0, 4).toString("ascii") === "RIFF"
    && header.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return { kind: "image", mimeType: "image/webp", extension: ".webp" };
  }
  if (header.subarray(0, 4).toString("ascii") === "%PDF") {
    return { kind: "document", mimeType: "application/pdf", extension: ".pdf" };
  }
  if (
    header.subarray(0, 4).toString("ascii") === "RIFF"
    && header.subarray(8, 12).toString("ascii") === "WAVE"
  ) {
    return { kind: "audio", mimeType: "audio/wav", extension: ".wav" };
  }
  if (header.subarray(0, 4).toString("ascii") === "fLaC") {
    return { kind: "audio", mimeType: "audio/flac", extension: ".flac" };
  }
  if (
    header.subarray(0, 4).toString("ascii") === "FORM"
    && ["AIFF", "AIFC"].includes(header.subarray(8, 12).toString("ascii"))
  ) {
    return { kind: "audio", mimeType: "audio/aiff", extension: ".aiff" };
  }
  if (
    header.subarray(0, 3).toString("ascii") === "ID3"
    || (header[0] === 0xff && (header[1] & 0xe0) === 0xe0)
  ) {
    return { kind: "audio", mimeType: "audio/mpeg", extension: ".mp3" };
  }
  if (header.subarray(4, 8).toString("ascii") === "ftyp") {
    return { kind: "audio", mimeType: "audio/mp4", extension: ".m4a" };
  }

  const extension = path.extname(filename).toLowerCase();
  if ([".txt", ".md"].includes(extension) && isPlainText(header)) {
    return {
      kind: "document",
      mimeType: extension === ".md" ? "text/markdown" : "text/plain",
      extension,
    };
  }

  return null;
}
