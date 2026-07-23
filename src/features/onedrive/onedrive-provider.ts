import { env } from "@/lib/env";
import {
  createPkcePair,
  getProviderRedirectUri,
  openProviderOAuthPopup,
} from "@/features/cloud-providers/oauth";
import type {
  CloudAssetResult,
  CloudConnectionResult,
  CloudFileMetadata,
  CloudFolderStructure,
  CloudStorageProvider,
  PublicAssetResult,
  UploadFileInput,
} from "@/features/drive/providers/cloud-storage";

const SESSION_KEY = "mxshare:onedrive:session";
const GRAPH = "https://graph.microsoft.com/v1.0";
const UPLOAD_CHUNK_BYTES = 5 * 1024 * 1024;

interface OneDriveSession {
  accessToken: string;
  expiresAt: number;
  accountId: string;
  email: string | null;
}

interface DriveItem {
  id: string;
  name: string;
  size?: number;
  webUrl?: string;
  file?: { mimeType?: string };
  "@microsoft.graph.downloadUrl"?: string;
}

export class OneDriveProvider implements CloudStorageProvider {
  readonly provider = "onedrive" as const;
  private session: OneDriveSession | null = null;
  private folders: CloudFolderStructure | null = null;

  private async getToken() {
    if (!this.session) await this.restoreSession();
    if (!this.session || this.session.expiresAt <= Date.now() + 60_000) {
      throw new Error("The OneDrive session expired. Reconnect OneDrive in Settings.");
    }
    return this.session.accessToken;
  }

  private async graph<T>(path: string, init?: RequestInit): Promise<T> {
    const token = await this.getToken();
    const response = await fetch(`${GRAPH}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...(init?.headers ?? {}),
      },
    });
    if (!response.ok) throw new Error(await response.text() || `OneDrive request failed (${response.status}).`);
    return response.json() as Promise<T>;
  }

  async connect(): Promise<CloudConnectionResult> {
    if (!env.oneDriveClientId) throw new Error("VITE_ONEDRIVE_CLIENT_ID is missing.");
    const pkce = await createPkcePair();
    const state = crypto.randomUUID();
    const redirectUri = getProviderRedirectUri("onedrive");
    const authorize = new URL("https://login.microsoftonline.com/common/oauth2/v2.0/authorize");
    authorize.searchParams.set("client_id", env.oneDriveClientId);
    authorize.searchParams.set("response_type", "code");
    authorize.searchParams.set("redirect_uri", redirectUri);
    authorize.searchParams.set("response_mode", "query");
    authorize.searchParams.set("scope", "openid profile email User.Read Files.ReadWrite");
    authorize.searchParams.set("code_challenge", pkce.challenge);
    authorize.searchParams.set("code_challenge_method", "S256");
    authorize.searchParams.set("state", state);
    const code = await openProviderOAuthPopup({
      provider: "onedrive",
      authorizationUrl: authorize.toString(),
      state,
    });
    const tokenResponse = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: env.oneDriveClientId,
        code,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
        code_verifier: pkce.verifier,
        scope: "openid profile email User.Read Files.ReadWrite",
      }),
    });
    if (!tokenResponse.ok) throw new Error(await tokenResponse.text() || "OneDrive token exchange failed.");
    const token = await tokenResponse.json() as { access_token: string; expires_in: number };
    this.session = {
      accessToken: token.access_token,
      expiresAt: Date.now() + token.expires_in * 1000,
      accountId: "",
      email: null,
    };
    const account = await this.graph<{ id: string; mail?: string; userPrincipalName?: string }>("/me");
    this.session.accountId = account.id;
    this.session.email = account.mail ?? account.userPrincipalName ?? null;
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(this.session));
    const folders = await this.ensureRootStructure();
    return {
      provider: this.provider,
      accountId: this.session.accountId,
      email: this.session.email,
      accessToken: this.session.accessToken,
      expiresAt: this.session.expiresAt,
      folders,
    };
  }

  async disconnect() {
    this.session = null;
    this.folders = null;
    sessionStorage.removeItem(SESSION_KEY);
  }

  async restoreSession() {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return false;
    try {
      const session = JSON.parse(raw) as OneDriveSession;
      if (session.expiresAt <= Date.now() + 60_000) {
        sessionStorage.removeItem(SESSION_KEY);
        return false;
      }
      this.session = session;
      return true;
    } catch {
      sessionStorage.removeItem(SESSION_KEY);
      return false;
    }
  }

  private async findChild(parentId: string, name: string) {
    const result = await this.graph<{ value: DriveItem[] }>(
      `/me/drive/items/${encodeURIComponent(parentId)}/children?$select=id,name&$filter=name eq '${name.replace(/'/g, "''")}'`,
    );
    return result.value.find((item) => item.name === name) ?? null;
  }

  private async ensureFolder(parentId: string, name: string) {
    const existing = await this.findChild(parentId, name);
    if (existing) return existing.id;
    const created = await this.graph<DriveItem>(
      `/me/drive/items/${encodeURIComponent(parentId)}/children`,
      {
        method: "POST",
        body: JSON.stringify({
          name,
          folder: {},
          "@microsoft.graph.conflictBehavior": "rename",
        }),
      },
    );
    return created.id;
  }

  async ensureRootStructure() {
    if (this.folders) return this.folders;
    const driveRoot = await this.graph<DriveItem>("/me/drive/root?$select=id");
    const root = await this.ensureFolder(driveRoot.id, "MxShare");
    const audio = await this.ensureFolder(root, "Audio");
    const originals = await this.ensureFolder(audio, "Originals");
    const previews = await this.ensureFolder(audio, "Previews");
    const artworkRoot = await this.ensureFolder(root, "Artwork");
    const artwork = await this.ensureFolder(artworkRoot, "Covers");
    const avatars = await this.ensureFolder(artworkRoot, "Avatars");
    const exportsFolder = await this.ensureFolder(root, "Exports");
    this.folders = {
      rootFolderId: root,
      audioFolderId: audio,
      audioOriginalsFolderId: originals,
      audioPreviewsFolderId: previews,
      artworkFolderId: artwork,
      avatarsFolderId: avatars,
      exportsFolderId: exportsFolder,
    };
    return this.folders;
  }

  async uploadFile(input: UploadFileInput): Promise<CloudAssetResult> {
    const token = await this.getToken();
    const filename = encodeURIComponent(input.filename ?? input.file.name);
    const response = await fetch(
      `${GRAPH}/me/drive/items/${encodeURIComponent(input.parentFolderId)}:/${filename}:/content`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": input.file.type || "application/octet-stream",
        },
        body: input.file,
        signal: input.signal,
      },
    );
    if (!response.ok) throw new Error(await response.text() || "OneDrive upload failed.");
    input.onProgress?.(100);
    return this.toAsset(await response.json() as DriveItem, input.file.type, input.parentFolderId);
  }

  async uploadResumable(input: UploadFileInput): Promise<CloudAssetResult> {
    const filename = encodeURIComponent(input.filename ?? input.file.name);
    const session = await this.graph<{ uploadUrl: string }>(
      `/me/drive/items/${encodeURIComponent(input.parentFolderId)}:/${filename}:/createUploadSession`,
      {
        method: "POST",
        body: JSON.stringify({ item: { "@microsoft.graph.conflictBehavior": "rename" } }),
      },
    );
    let offset = 0;
    while (offset < input.file.size) {
      const end = Math.min(offset + UPLOAD_CHUNK_BYTES, input.file.size);
      const response = await fetch(session.uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Length": String(end - offset),
          "Content-Range": `bytes ${offset}-${end - 1}/${input.file.size}`,
        },
        body: input.file.slice(offset, end),
        signal: input.signal,
      });
      if (!response.ok) throw new Error(await response.text() || "OneDrive resumable upload failed.");
      offset = end;
      input.onProgress?.(Math.round((offset / input.file.size) * 100));
      if (offset === input.file.size) {
        return this.toAsset(await response.json() as DriveItem, input.file.type, input.parentFolderId);
      }
    }
    return this.uploadFile(input);
  }

  private toAsset(item: DriveItem, mimeType: string, parentFolderId: string): CloudAssetResult {
    return {
      provider: this.provider,
      fileId: item.id,
      filename: item.name,
      mimeType: item.file?.mimeType ?? mimeType ?? "application/octet-stream",
      bytes: item.size ?? 0,
      parentFolderId,
      viewUrl: item.webUrl ?? null,
      shareUrl: null,
      thumbnailUrl: null,
    };
  }

  async getFileMetadata(fileId: string): Promise<CloudFileMetadata> {
    const item = await this.graph<DriveItem>(`/me/drive/items/${encodeURIComponent(fileId)}`);
    return {
      id: item.id,
      name: item.name,
      mimeType: item.file?.mimeType ?? "application/octet-stream",
      size: item.size ?? null,
      webViewLink: item.webUrl ?? null,
      webContentLink: item["@microsoft.graph.downloadUrl"] ?? null,
      thumbnailLink: null,
    };
  }

  async getPrivateFileBlob(fileId: string) {
    const token = await this.getToken();
    const response = await fetch(`${GRAPH}/me/drive/items/${encodeURIComponent(fileId)}/content`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error(await response.text() || "OneDrive download failed.");
    return response.blob();
  }

  async createPublicPreview(fileId: string): Promise<PublicAssetResult> {
    const item = await this.graph<DriveItem>(`/me/drive/items/${encodeURIComponent(fileId)}`);
    const result = await this.graph<{ link?: { webUrl?: string } }>(
      `/me/drive/items/${encodeURIComponent(fileId)}/createLink`,
      {
        method: "POST",
        body: JSON.stringify({ type: "view", scope: "anonymous" }),
      },
    );
    return {
      fileId,
      shareUrl: result.link?.webUrl ?? null,
      viewUrl: item.webUrl ?? result.link?.webUrl ?? null,
    };
  }

  async revokePublicPreview() {
    throw new Error("OneDrive does not expose a safe single-link revoke shortcut here. Remove the anonymous link in OneDrive.");
  }

  async getPublicPreviewUrl(fileId: string) {
    return (await this.createPublicPreview(fileId)).shareUrl;
  }

  async getViewUrl(fileId: string) {
    return (await this.getFileMetadata(fileId)).webViewLink;
  }

  async deleteFile(fileId: string) {
    const token = await this.getToken();
    const response = await fetch(`${GRAPH}/me/drive/items/${encodeURIComponent(fileId)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok && response.status !== 404) {
      throw new Error(await response.text() || "OneDrive delete failed.");
    }
  }
}
