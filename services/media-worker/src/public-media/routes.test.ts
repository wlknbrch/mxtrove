import { describe, expect, it } from "vitest";

import { getDropboxPublicMediaUrl } from "./routes.js";

describe("public media proxy validation", () => {
  it("accepts public Dropbox HTTPS links", () => {
    expect(getDropboxPublicMediaUrl("https://www.dropbox.com/scl/fi/id/preview.mp3?raw=1"))
      .toBe("https://www.dropbox.com/scl/fi/id/preview.mp3?raw=1");
  });

  it("rejects non-Dropbox and credential-bearing links", () => {
    expect(getDropboxPublicMediaUrl("https://example.com/file.mp3")).toBeNull();
    expect(getDropboxPublicMediaUrl("https://user:pass@dropbox.com/file.mp3")).toBeNull();
    expect(getDropboxPublicMediaUrl("http://dropbox.com/file.mp3")).toBeNull();
  });
});
