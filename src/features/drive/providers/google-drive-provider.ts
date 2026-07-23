import { env } from "@/lib/env";
import {
  buildGoogleDriveFilePageUrl,
  buildGoogleDrivePublicDownloadUrl,
} from "@/lib/asset-urls";

import type {
  CloudAssetResult,
  CloudConnectionResult,
  CloudFileMetadata,
  CloudFolderStructure,
  CloudStorageProvider,
  PublicAssetResult,
  UploadFileInput,
} from "@/features/drive/providers/cloud-storage";

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: { access_token?: string; expires_in?: number; error?: string }) => void;
            error_callback?: (error: unknown) => void;
          }) => {
            requestAccessToken: (options?: { prompt?: string }) => void;
          };
        };
      };
    };
  }
}

const GOOGLE_SCRIPT = "https://accounts.google.com/gsi/client";
const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";

interface GoogleDriveState {
  accessToken: string | null;
  expiresAt: number | null;
  folders: CloudFolderStructure | null;
  email: string | null;
}

interface GoogleApiErrorPayload {
  error?: {
    code?: number;
    message?: string;
    errors?: Array<{
      message?: string;
      reason?: string;
    }>;
  };
}

function assertDriveId(value: string, label: "file" | "folder") {
  const trimmed = value.trim();
  if (!trimmed || trimmed === "." || trimmed === "null" || trimmed === "undefined") {
    throw new Error(
      `Google Drive ${label} setup is missing or invalid. Reconnect Google Drive in Settings to rebuild the MxShare folder structure.`,
    );
  }

  return trimmed;
}

function formatGoogleApiError(response: Response, rawMessage: string) {
  try {
    const payload = JSON.parse(rawMessage) as GoogleApiErrorPayload;
    const reason = payload.error?.errors?.[0]?.reason;
    const message = payload.error?.message ?? rawMessage;

    if (response.status === 404 && reason === "notFound") {
      return "Google Drive could not find the selected file or folder. Reconnect Google Drive in Settings to refresh the MxShare folder setup, then try again.";
    }

    return message;
  } catch {
    return rawMessage || `Google Drive request failed with status ${response.status}.`;
  }
}

function loadGoogleScript() {
  return new Promise<void>((resolve, reject) => {
    if (window.google?.accounts?.oauth2) {
      resolve();
      return;
    }

    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GOOGLE_SCRIPT}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Google Identity script failed to load.")), {
        once: true,
      });
      return;
    }

    const script = document.createElement("script");
    script.src = GOOGLE_SCRIPT;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Google Identity script failed to load."));
    document.head.appendChild(script);
  });
}

async function authorizedFetch(input: string, accessToken: string, init?: RequestInit) {
  const response = await fetch(input, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(formatGoogleApiError(response, message));
  }

  return response;
}

function extractMetadata(payload: {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  webViewLink?: string | null;
  webContentLink?: string | null;
  thumbnailLink?: string | null;
}): CloudFileMetadata {
  return {
    id: payload.id,
    name: payload.name,
    mimeType: payload.mimeType,
    size: payload.size ? Number(payload.size) : null,
    webViewLink: payload.webViewLink ?? null,
    webContentLink: payload.webContentLink ?? null,
    thumbnailLink: payload.thumbnailLink ?? null,
  };
}

async function xhrUpload(params: {
  url: string;
  method: "POST" | "PUT";
  accessToken: string;
  body: Document | XMLHttpRequestBodyInit | null;
  signal?: AbortSignal;
  onProgress?: (progress: number) => void;
  headers?: Record<string, string>;
}) {
  return new Promise<string>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(params.method, params.url);
    xhr.responseType = "text";
    xhr.setRequestHeader("Authorization", `Bearer ${params.accessToken}`);

    Object.entries(params.headers ?? {}).forEach(([key, value]) => {
      xhr.setRequestHeader(key, value);
    });

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable || !params.onProgress) {
        return;
      }

      params.onProgress(Math.round((event.loaded / event.total) * 100));
    };

    xhr.onerror = () => reject(new Error("Google Drive upload failed."));
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(xhr.responseText);
        return;
      }

      reject(new Error(xhr.responseText || `Google Drive upload failed with status ${xhr.status}.`));
    };

    if (params.signal) {
      params.signal.addEventListener(
        "abort",
        () => {
          xhr.abort();
          reject(new DOMException("Upload aborted.", "AbortError"));
        },
        { once: true },
      );
    }

    xhr.send(params.body);
  });
}

export class GoogleDriveProvider implements CloudStorageProvider {
  readonly provider = "google_drive" as const;
  private state: GoogleDriveState = {
    accessToken: null,
    expiresAt: null,
    folders: null,
    email: null,
  };

  private async requestAccessToken(prompt: "" | "consent" = "consent") {
    if (!env.googleDriveClientId) {
      throw new Error("VITE_GOOGLE_DRIVE_CLIENT_ID is missing.");
    }

    await loadGoogleScript();

    return new Promise<{ accessToken: string; expiresAt: number | null }>((resolve, reject) => {
      const tokenClient = window.google?.accounts.oauth2.initTokenClient({
        client_id: env.googleDriveClientId,
        scope: DRIVE_SCOPE,
        callback: (response) => {
          if (!response.access_token) {
            reject(new Error(response.error || "Google Drive access token was not returned."));
            return;
          }

          resolve({
            accessToken: response.access_token,
            expiresAt: response.expires_in ? Date.now() + response.expires_in * 1000 : null,
          });
        },
        error_callback: (error) => reject(error),
      });

      tokenClient?.requestAccessToken({ prompt });
    });
  }

  private async ensureAuthenticated() {
    if (this.state.accessToken && (!this.state.expiresAt || this.state.expiresAt - Date.now() > 60_000)) {
      return this.state.accessToken;
    }

    const prefersSilentRefresh = Boolean(this.state.accessToken || this.state.email || this.state.folders);
    let token;

    try {
      token = await this.requestAccessToken(prefersSilentRefresh ? "" : "consent");
    } catch (error) {
      if (!prefersSilentRefresh) {
        throw error;
      }

      token = await this.requestAccessToken("consent");
    }

    this.state.accessToken = token.accessToken;
    this.state.expiresAt = token.expiresAt;
    return token.accessToken;
  }

  hydrateConnection(input: {
    email?: string | null;
    folders?: CloudFolderStructure | null;
  }) {
    if (typeof input.email !== "undefined") {
      this.state.email = input.email;
    }

    if (input.folders) {
      this.state.folders = input.folders;
    }
  }

  getCachedFolders() {
    return this.state.folders;
  }

  private async fetchAbout(accessToken: string) {
    const response = await authorizedFetch(
      "https://www.googleapis.com/drive/v3/about?fields=user(emailAddress)",
      accessToken,
    );
    const payload = (await response.json()) as {
      user?: {
        emailAddress?: string;
      };
    };
    this.state.email = payload.user?.emailAddress ?? null;
    return this.state.email;
  }

  private async findFolderByName(name: string, parentId?: string) {
    const accessToken = await this.ensureAuthenticated();
    const queryParts = [
      `mimeType = 'application/vnd.google-apps.folder'`,
      `name = '${name.replace(/'/g, "\\'")}'`,
      "trashed = false",
    ];

    if (parentId) {
      queryParts.push(`'${parentId}' in parents`);
    }

    const response = await authorizedFetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(queryParts.join(" and "))}&fields=files(id,name)`,
      accessToken,
    );

    const payload = (await response.json()) as {
      files?: Array<{ id: string; name: string }>;
    };

    return payload.files?.[0] ?? null;
  }

  private async createFolder(name: string, parentId?: string) {
    const accessToken = await this.ensureAuthenticated();
    const response = await authorizedFetch("https://www.googleapis.com/drive/v3/files", accessToken, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        mimeType: "application/vnd.google-apps.folder",
        parents: parentId ? [parentId] : undefined,
      }),
    });

    const payload = (await response.json()) as { id: string; name: string };
    return payload;
  }

  private async findOrCreateFolder(name: string, parentId?: string) {
    const existing = await this.findFolderByName(name, parentId);
    if (existing) {
      return existing;
    }

    return this.createFolder(name, parentId);
  }

  async connect(): Promise<CloudConnectionResult> {
    const accessToken = await this.ensureAuthenticated();
    const email = await this.fetchAbout(accessToken);
    const folders = await this.ensureRootStructure();

    return {
      provider: "google_drive",
      accountId: email,
      email,
      accessToken,
      expiresAt: this.state.expiresAt,
      folders,
    };
  }

  async disconnect(): Promise<void> {
    this.state = {
      accessToken: null,
      expiresAt: null,
      folders: null,
      email: null,
    };
  }

  async restoreSession(): Promise<boolean> {
    return Boolean(
      this.state.accessToken
      && (!this.state.expiresAt || this.state.expiresAt - Date.now() > 60_000),
    );
  }

  async ensureRootStructure(): Promise<CloudFolderStructure> {
    if (this.state.folders) {
      return this.state.folders;
    }

    await this.ensureAuthenticated();
    const root = await this.findOrCreateFolder("MxShare");
    const audio = await this.findOrCreateFolder("Audio", root.id);
    const originals = await this.findOrCreateFolder("Originals", audio.id);
    const previews = await this.findOrCreateFolder("Previews", audio.id);
    const artwork = await this.findOrCreateFolder("Artwork", root.id);
    const avatars = await this.findOrCreateFolder("Avatars", artwork.id);
    const exportsFolder = await this.findOrCreateFolder("Exports", root.id);

    this.state.folders = {
      rootFolderId: root.id,
      audioFolderId: audio.id,
      audioOriginalsFolderId: originals.id,
      audioPreviewsFolderId: previews.id,
      artworkFolderId: artwork.id,
      avatarsFolderId: avatars.id,
      exportsFolderId: exportsFolder.id,
    };

    return this.state.folders;
  }

  async uploadFile(input: UploadFileInput): Promise<CloudAssetResult> {
    const accessToken = await this.ensureAuthenticated();
    const parentFolderId = assertDriveId(input.parentFolderId, "folder");
    const metadata = {
      name: input.filename ?? input.file.name,
      parents: [parentFolderId],
    };

    const boundary = `mxshare-${crypto.randomUUID()}`;
    const body =
      `--${boundary}\r\n` +
      "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
      `${JSON.stringify(metadata)}\r\n` +
      `--${boundary}\r\n` +
      `Content-Type: ${input.file.type || "application/octet-stream"}\r\n\r\n`;

    const tail = `\r\n--${boundary}--`;
    const blob = new Blob([body, input.file, tail]);

    const responseText = await xhrUpload({
      url: "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size,webViewLink,webContentLink,thumbnailLink",
      method: "POST",
      accessToken,
      body: blob,
      signal: input.signal,
      onProgress: input.onProgress,
      headers: {
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
    });

    const payload = JSON.parse(responseText) as {
      id: string;
      name: string;
      mimeType: string;
      size?: string;
      webViewLink?: string | null;
      webContentLink?: string | null;
      thumbnailLink?: string | null;
    };

    return {
      fileId: payload.id,
      filename: payload.name,
      mimeType: payload.mimeType,
      bytes: Number(payload.size ?? input.file.size),
      parentFolderId,
      viewUrl: payload.webViewLink ?? null,
      shareUrl: payload.webContentLink ?? null,
      thumbnailUrl: payload.thumbnailLink ?? null,
    };
  }

  async uploadResumable(input: UploadFileInput): Promise<CloudAssetResult> {
    const accessToken = await this.ensureAuthenticated();
    const parentFolderId = assertDriveId(input.parentFolderId, "folder");
    const sessionResponse = await authorizedFetch(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,name,mimeType,size,webViewLink,webContentLink,thumbnailLink",
      accessToken,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=UTF-8",
          "X-Upload-Content-Type": input.file.type || "application/octet-stream",
          "X-Upload-Content-Length": String(input.file.size),
        },
        body: JSON.stringify({
          name: input.filename ?? input.file.name,
          parents: [parentFolderId],
        }),
      },
    );

    const uploadUrl = sessionResponse.headers.get("Location");

    if (!uploadUrl) {
      throw new Error("Google Drive resumable upload URL was not returned.");
    }

    const responseText = await xhrUpload({
      url: uploadUrl,
      method: "PUT",
      accessToken,
      body: input.file,
      signal: input.signal,
      onProgress: input.onProgress,
      headers: {
        "Content-Length": String(input.file.size),
        "Content-Type": input.file.type || "application/octet-stream",
        "Content-Range": `bytes 0-${input.file.size - 1}/${input.file.size}`,
      },
    });

    const finalPayload = JSON.parse(responseText) as {
      id: string;
      name: string;
      mimeType: string;
      size?: string;
      webViewLink?: string | null;
      webContentLink?: string | null;
      thumbnailLink?: string | null;
    };

    return {
      fileId: finalPayload.id,
      filename: finalPayload.name,
      mimeType: finalPayload.mimeType,
      bytes: Number(finalPayload.size ?? input.file.size),
      parentFolderId,
      viewUrl: finalPayload.webViewLink ?? null,
      shareUrl: finalPayload.webContentLink ?? null,
      thumbnailUrl: finalPayload.thumbnailLink ?? null,
    };
  }

  async getPrivateFileBlob(fileId: string): Promise<Blob> {
    const accessToken = await this.ensureAuthenticated();
    const safeFileId = assertDriveId(fileId, "file");
    const response = await authorizedFetch(
      `https://www.googleapis.com/drive/v3/files/${safeFileId}?alt=media`,
      accessToken,
    );
    return response.blob();
  }

  async getFileMetadata(fileId: string): Promise<CloudFileMetadata> {
    const accessToken = await this.ensureAuthenticated();
    const safeFileId = assertDriveId(fileId, "file");
    const response = await authorizedFetch(
      `https://www.googleapis.com/drive/v3/files/${safeFileId}?fields=id,name,mimeType,size,webViewLink,webContentLink,thumbnailLink`,
      accessToken,
    );
    return extractMetadata((await response.json()) as Parameters<typeof extractMetadata>[0]);
  }

  async createPublicPreview(fileId: string): Promise<PublicAssetResult> {
    const accessToken = await this.ensureAuthenticated();
    const safeFileId = assertDriveId(fileId, "file");
    await authorizedFetch(
      `https://www.googleapis.com/drive/v3/files/${safeFileId}/permissions`,
      accessToken,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          role: "reader",
          type: "anyone",
        }),
      },
    );

    return {
      fileId: safeFileId,
      shareUrl: buildGoogleDrivePublicDownloadUrl(safeFileId),
      viewUrl: buildGoogleDriveFilePageUrl(safeFileId),
    };
  }

  async revokePublicPreview(fileId: string): Promise<void> {
    const accessToken = await this.ensureAuthenticated();
    const safeFileId = assertDriveId(fileId, "file");
    const permissionsResponse = await authorizedFetch(
      `https://www.googleapis.com/drive/v3/files/${safeFileId}/permissions?fields=permissions(id,type)`,
      accessToken,
    );

    const payload = (await permissionsResponse.json()) as {
      permissions?: Array<{ id: string; type: string }>;
    };

    const publicPermission = payload.permissions?.find((permission) => permission.type === "anyone");
    if (!publicPermission) {
      return;
    }

    await authorizedFetch(
      `https://www.googleapis.com/drive/v3/files/${safeFileId}/permissions/${publicPermission.id}`,
      accessToken,
      { method: "DELETE" },
    );
  }

  async getPublicPreviewUrl(fileId: string): Promise<string | null> {
    return buildGoogleDrivePublicDownloadUrl(assertDriveId(fileId, "file"));
  }

  async getViewUrl(fileId: string): Promise<string | null> {
    return buildGoogleDriveFilePageUrl(assertDriveId(fileId, "file"));
  }

  async deleteFile(fileId: string): Promise<void> {
    const accessToken = await this.ensureAuthenticated();
    const safeFileId = assertDriveId(fileId, "file");
    await authorizedFetch(`https://www.googleapis.com/drive/v3/files/${safeFileId}`, accessToken, {
      method: "DELETE",
    });
  }
}
