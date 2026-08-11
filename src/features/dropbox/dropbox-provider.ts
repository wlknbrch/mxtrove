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

const SESSION_KEY = "mxshare:dropbox:session";
const DROPBOX_API = "https://api.dropboxapi.com/2";
const DROPBOX_CONTENT = "https://content.dropboxapi.com/2";
const UPLOAD_CHUNK_BYTES = 8 * 1024 * 1024;
const ROOT_FOLDER_PATH = "/MxTrove";
const LEGACY_ROOT_FOLDER_PATH = "/MxShare";

interface DropboxSession {
  accessToken: string;
  expiresAt: number | null;
  accountId: string;
  email: string | null;
}

interface DropboxMetadata {
  id: string;
  name: string;
  path_display: string;
  path_lower?: string;
  size?: number;
}

function directDropboxUrl(url: string) {
  const parsed = new URL(url);
  parsed.searchParams.delete("dl");
  parsed.searchParams.set("raw", "1");
  return parsed.toString();
}

export class DropboxProvider implements CloudStorageProvider {
  readonly provider = "dropbox" as const;
  private session: DropboxSession | null = null;
  private folders: CloudFolderStructure | null = null;
  private folderScope: string | null = null;

  private async api<T>(path: string, body?: unknown): Promise<T> {
    const token = await this.getToken();
    const response = await fetch(`${DROPBOX_API}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body ?? null),
    });
    if (!response.ok) throw new Error(await response.text() || `Dropbox request failed (${response.status}).`);
    return response.json() as Promise<T>;
  }

  private async getToken() {
    if (!this.session) await this.restoreSession();
    if (!this.session || (this.session.expiresAt && this.session.expiresAt <= Date.now() + 60_000)) {
      throw new Error("The Dropbox session expired. Reconnect Dropbox in Settings.");
    }
    return this.session.accessToken;
  }

  async connect(profileId?: string): Promise<CloudConnectionResult> {
    if (!env.dropboxClientId) throw new Error("VITE_DROPBOX_CLIENT_ID is missing.");
    const pkce = await createPkcePair();
    const state = crypto.randomUUID();
    const redirectUri = getProviderRedirectUri("dropbox");
    const authorize = new URL("https://www.dropbox.com/oauth2/authorize");
    authorize.searchParams.set("client_id", env.dropboxClientId);
    authorize.searchParams.set("response_type", "code");
    authorize.searchParams.set("redirect_uri", redirectUri);
    authorize.searchParams.set("code_challenge", pkce.challenge);
    authorize.searchParams.set("code_challenge_method", "S256");
    authorize.searchParams.set("token_access_type", "online");
    authorize.searchParams.set("state", state);
    const code = await openProviderOAuthPopup({
      provider: "dropbox",
      authorizationUrl: authorize.toString(),
      state,
    });
    const tokenResponse = await fetch("https://api.dropboxapi.com/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        grant_type: "authorization_code",
        client_id: env.dropboxClientId,
        redirect_uri: redirectUri,
        code_verifier: pkce.verifier,
      }),
    });
    if (!tokenResponse.ok) throw new Error(await tokenResponse.text() || "Dropbox token exchange failed.");
    const token = await tokenResponse.json() as {
      access_token: string;
      expires_in?: number;
      account_id: string;
    };
    this.session = {
      accessToken: token.access_token,
      expiresAt: token.expires_in ? Date.now() + token.expires_in * 1000 : null,
      accountId: token.account_id,
      email: null,
    };
    const account = await this.api<{ email?: string }>("/users/get_current_account");
    this.session.email = account.email ?? null;
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(this.session));
    const folders = await this.ensureRootStructure(profileId);
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
    if (this.session) {
      await this.api("/auth/token/revoke").catch(() => undefined);
    }
    this.session = null;
    this.folders = null;
    this.folderScope = null;
    sessionStorage.removeItem(SESSION_KEY);
  }

  async restoreSession() {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return false;
    try {
      const session = JSON.parse(raw) as DropboxSession;
      if (session.expiresAt && session.expiresAt <= Date.now() + 60_000) {
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

  private async ensureFolder(path: string) {
    try {
      await this.api("/files/get_metadata", { path });
    } catch {
      await this.api("/files/create_folder_v2", { path, autorename: false });
    }
    return path;
  }

  private async findFolder(path: string) {
    try {
      return await this.api<DropboxMetadata>("/files/get_metadata", { path });
    } catch (error) {
      if (error instanceof Error && error.message.includes("path/not_found")) {
        return null;
      }
      throw error;
    }
  }

  private async ensureRootFolder() {
    const [currentRoot, legacyRoot] = await Promise.all([
      this.findFolder(ROOT_FOLDER_PATH),
      this.findFolder(LEGACY_ROOT_FOLDER_PATH),
    ]);

    if (currentRoot && legacyRoot && currentRoot.id !== legacyRoot.id) {
      throw new Error(
        `Dropbox contains both “${LEGACY_ROOT_FOLDER_PATH}” and “${ROOT_FOLDER_PATH}”. MxTrove will not merge them automatically because that could overwrite existing files. Rename or move the extra folder, then reconnect.`,
      );
    }

    if (currentRoot) {
      return ROOT_FOLDER_PATH;
    }

    if (legacyRoot) {
      await this.api("/files/move_v2", {
        from_path: LEGACY_ROOT_FOLDER_PATH,
        to_path: ROOT_FOLDER_PATH,
        autorename: false,
        allow_shared_folder: true,
      });
      return ROOT_FOLDER_PATH;
    }

    return this.ensureFolder(ROOT_FOLDER_PATH);
  }

  private normalizeFolderPath(path: string) {
    return path.replace(/^\/MxShare(?=\/|$)/i, ROOT_FOLDER_PATH);
  }

  async ensureRootStructure(profileId?: string) {
    const scope = profileId ?? null;
    if (this.folders && this.folderScope === scope) return this.folders;
    const root = await this.ensureRootFolder();
    const profileRoot = profileId
      ? await this.ensureFolder(`${await this.ensureFolder(`${root}/Profiles`)}/${profileId}`)
      : root;
    const audio = await this.ensureFolder(`${profileRoot}/Audio`);
    const originals = await this.ensureFolder(`${audio}/Originals`);
    const previews = await this.ensureFolder(`${audio}/Previews`);
    const artworkRoot = await this.ensureFolder(`${profileRoot}/Artwork`);
    const artwork = await this.ensureFolder(`${artworkRoot}/Covers`);
    const avatars = await this.ensureFolder(`${artworkRoot}/Avatars`);
    const exportsFolder = await this.ensureFolder(`${profileRoot}/Exports`);
    this.folders = {
      rootFolderId: profileRoot,
      audioFolderId: audio,
      audioOriginalsFolderId: originals,
      audioPreviewsFolderId: previews,
      artworkFolderId: artwork,
      avatarsFolderId: avatars,
      exportsFolderId: exportsFolder,
    };
    this.folderScope = scope;
    return this.folders;
  }

  async uploadFile(input: UploadFileInput): Promise<CloudAssetResult> {
    const token = await this.getToken();
    const filename = input.filename ?? input.file.name;
    const parentFolderId = this.normalizeFolderPath(input.parentFolderId);
    const path = `${parentFolderId.replace(/\/$/, "")}/${filename}`;
    const response = await fetch(`${DROPBOX_CONTENT}/files/upload`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/octet-stream",
        "Dropbox-API-Arg": JSON.stringify({ path, mode: "add", autorename: true, mute: true }),
      },
      body: input.file,
      signal: input.signal,
    });
    if (!response.ok) throw new Error(await response.text() || "Dropbox upload failed.");
    input.onProgress?.(100);
    return this.toAsset(await response.json() as DropboxMetadata, input.file.type, parentFolderId);
  }

  async uploadResumable(input: UploadFileInput): Promise<CloudAssetResult> {
    if (input.file.size <= UPLOAD_CHUNK_BYTES) {
      return this.uploadFile(input);
    }

    const token = await this.getToken();
    const start = await fetch(`${DROPBOX_CONTENT}/files/upload_session/start`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/octet-stream",
        "Dropbox-API-Arg": JSON.stringify({ close: false }),
      },
      body: input.file.slice(0, Math.min(UPLOAD_CHUNK_BYTES, input.file.size)),
      signal: input.signal,
    });
    if (!start.ok) throw new Error(await start.text() || "Dropbox upload session failed.");
    const { session_id: sessionId } = await start.json() as { session_id: string };
    let offset = Math.min(UPLOAD_CHUNK_BYTES, input.file.size);
    while (offset < input.file.size) {
      const end = Math.min(offset + UPLOAD_CHUNK_BYTES, input.file.size);
      const isLast = end === input.file.size;
      const endpoint = isLast ? "/files/upload_session/finish" : "/files/upload_session/append_v2";
      const filename = input.filename ?? input.file.name;
      const parentFolderId = this.normalizeFolderPath(input.parentFolderId);
      const response = await fetch(`${DROPBOX_CONTENT}${endpoint}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/octet-stream",
          "Dropbox-API-Arg": JSON.stringify(
            isLast
              ? {
                  cursor: { session_id: sessionId, offset },
                  commit: {
                    path: `${parentFolderId.replace(/\/$/, "")}/${filename}`,
                    mode: "add",
                    autorename: true,
                    mute: true,
                  },
                }
              : {
                  cursor: { session_id: sessionId, offset },
                  close: false,
                },
          ),
        },
        body: input.file.slice(offset, end),
        signal: input.signal,
      });
      if (!response.ok) throw new Error(await response.text() || "Dropbox resumable upload failed.");
      offset = end;
      input.onProgress?.(Math.round((offset / input.file.size) * 100));
      if (isLast) {
        return this.toAsset(await response.json() as DropboxMetadata, input.file.type, parentFolderId);
      }
    }
    return this.uploadFile(input);
  }

  private toAsset(file: DropboxMetadata, mimeType: string, parentFolderId: string): CloudAssetResult {
    return {
      provider: this.provider,
      fileId: file.id,
      filename: file.name,
      mimeType: mimeType || "application/octet-stream",
      bytes: file.size ?? 0,
      parentFolderId,
      viewUrl: `https://www.dropbox.com/home${file.path_display}`,
      shareUrl: null,
      thumbnailUrl: null,
    };
  }

  async getPrivateFileBlob(fileId: string) {
    const token = await this.getToken();
    const response = await fetch(`${DROPBOX_CONTENT}/files/download`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Dropbox-API-Arg": JSON.stringify({ path: fileId }),
      },
    });
    if (!response.ok) throw new Error(await response.text() || "Dropbox download failed.");
    return response.blob();
  }

  async getFileMetadata(fileId: string): Promise<CloudFileMetadata> {
    const metadata = await this.api<DropboxMetadata>("/files/get_metadata", { path: fileId });
    return {
      id: metadata.id,
      name: metadata.name,
      mimeType: "application/octet-stream",
      size: metadata.size ?? null,
      webViewLink: `https://www.dropbox.com/home${metadata.path_display}`,
      webContentLink: null,
      thumbnailLink: null,
    };
  }

  private async listPublicLinks(fileId: string) {
    return this.api<{ links: Array<{ url: string }> }>("/sharing/list_shared_links", {
      path: fileId,
      direct_only: true,
    });
  }

  async createPublicPreview(fileId: string): Promise<PublicAssetResult> {
    let link: string | null = null;
    try {
      const result = await this.api<{ url: string }>("/sharing/create_shared_link_with_settings", {
        path: fileId,
        settings: { requested_visibility: "public" },
      });
      link = result.url;
    } catch {
      link = (await this.listPublicLinks(fileId)).links[0]?.url ?? null;
    }
    return {
      fileId,
      shareUrl: link ? directDropboxUrl(link) : null,
      viewUrl: link,
    };
  }

  async revokePublicPreview(fileId: string) {
    const links = await this.listPublicLinks(fileId);
    await Promise.all(links.links.map((link) => this.api("/sharing/revoke_shared_link", { url: link.url })));
  }

  async getPublicPreviewUrl(fileId: string) {
    const link = (await this.listPublicLinks(fileId)).links[0]?.url ?? null;
    return link ? directDropboxUrl(link) : null;
  }

  async getViewUrl(fileId: string) {
    return (await this.listPublicLinks(fileId)).links[0]?.url ?? null;
  }

  async deleteFile(fileId: string) {
    await this.api("/files/delete_v2", { path: fileId });
  }
}
