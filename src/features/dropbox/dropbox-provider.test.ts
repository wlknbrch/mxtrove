import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DropboxProvider } from "@/features/dropbox/dropbox-provider";

const session = {
  accessToken: "dropbox-access-token",
  expiresAt: Date.now() + 60 * 60 * 1000,
  accountId: "dropbox-account",
  email: "artist@example.com",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("DropboxProvider MxTrove folder compatibility", () => {
  beforeEach(() => {
    sessionStorage.setItem("mxshare:dropbox:session", JSON.stringify(session));
  });

  afterEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("moves the legacy root atomically and preserves the expected folder paths", async () => {
    const requests: Array<{ url: string; body: unknown }> = [];
    vi.stubGlobal("fetch", vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      const body = init?.body ? JSON.parse(String(init.body)) as Record<string, unknown> : null;
      requests.push({ url, body });

      if (url.endsWith("/files/get_metadata")) {
        const path = body?.path;
        if (path === "/MxTrove") {
          return jsonResponse({ error_summary: "path/not_found/" }, 409);
        }
        return jsonResponse({
          id: `id:${path}`,
          name: String(path).split("/").at(-1),
          path_display: path,
        });
      }

      if (url.endsWith("/files/move_v2")) {
        return jsonResponse({
          metadata: {
            id: "id:legacy-root",
            name: "MxTrove",
            path_display: "/MxTrove",
          },
        });
      }

      throw new Error(`Unexpected Dropbox request: ${url}`);
    }));

    const provider = new DropboxProvider();
    expect(await provider.restoreSession()).toBe(true);
    const folders = await provider.ensureRootStructure();

    expect(folders).toMatchObject({
      rootFolderId: "/MxTrove",
      audioOriginalsFolderId: "/MxTrove/Audio/Originals",
      audioPreviewsFolderId: "/MxTrove/Audio/Previews",
      artworkFolderId: "/MxTrove/Artwork/Covers",
      avatarsFolderId: "/MxTrove/Artwork/Avatars",
    });
    expect(requests).toContainEqual({
      url: "https://api.dropboxapi.com/2/files/move_v2",
      body: {
        from_path: "/MxShare",
        to_path: "/MxTrove",
        autorename: false,
        allow_shared_folder: true,
      },
    });
  });

  it("normalizes a saved legacy parent path before uploading", async () => {
    let uploadPath = "";
    vi.stubGlobal("fetch", vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      if (!url.endsWith("/files/upload")) {
        throw new Error(`Unexpected Dropbox request: ${url}`);
      }
      const headers = new Headers(init?.headers);
      uploadPath = (JSON.parse(headers.get("Dropbox-API-Arg") ?? "{}") as { path?: string }).path ?? "";
      return jsonResponse({
        id: "id:new-file",
        name: "mix.wav",
        path_display: "/MxTrove/Audio/Originals/mix.wav",
        size: 4,
      });
    }));

    const provider = new DropboxProvider();
    expect(await provider.restoreSession()).toBe(true);
    const upload = await provider.uploadFile({
      file: new File(["test"], "mix.wav", { type: "audio/wav" }),
      parentFolderId: "/MxShare/Audio/Originals",
    });

    expect(uploadPath).toBe("/MxTrove/Audio/Originals/mix.wav");
    expect(upload.parentFolderId).toBe("/MxTrove/Audio/Originals");
    expect(upload.fileId).toBe("id:new-file");
  });
});
