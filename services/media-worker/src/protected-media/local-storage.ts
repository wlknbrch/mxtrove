import fs from "node:fs/promises";
import path from "node:path";

import { config } from "../config.js";
import { supabaseAdmin } from "../supabase/service.js";
import { signProtectedAsset } from "./signing.js";
import type {
  ProtectedAsset,
  ProtectedMediaStorage,
  ProtectedUploadInput,
} from "./storage.js";

interface ProtectedAssetLocator {
  id: string;
  storage_key: string;
  mime_type: string;
  bytes: number | null;
  status: string;
  deleted_at: string | null;
}

function assertStorageKey(storageKey: string) {
  if (!/^[a-z0-9][a-z0-9/_-]{8,220}$/.test(storageKey)) {
    throw new Error("Protected media storage key is invalid.");
  }
}

async function getAssetLocator(assetId: string) {
  const { data, error } = await supabaseAdmin
    .from("protected_media_assets")
    .select("id, storage_key, mime_type, bytes, status, deleted_at")
    .eq("id", assetId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as ProtectedAssetLocator | null;
}

export class LocalProtectedMediaStorage implements ProtectedMediaStorage {
  constructor(private readonly rootDir = config.protectedMediaDir) {}

  private resolveStoragePath(storageKey: string) {
    assertStorageKey(storageKey);
    const resolvedRoot = path.resolve(this.rootDir);
    const resolvedPath = path.resolve(resolvedRoot, storageKey);
    if (!resolvedPath.startsWith(`${resolvedRoot}${path.sep}`)) {
      throw new Error("Protected media path escaped its storage root.");
    }
    return resolvedPath;
  }

  async put(input: ProtectedUploadInput): Promise<ProtectedAsset> {
    const outputPath = this.resolveStoragePath(input.storageKey);
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.copyFile(input.sourcePath, outputPath);
    await fs.chmod(outputPath, 0o600);
    return {
      id: input.assetId,
      storageKey: input.storageKey,
      bytes: input.bytes,
      mimeType: input.mimeType,
    };
  }

  async createSignedReadUrl(assetId: string, expiresInSeconds: number) {
    const boundedTtl = Math.max(1, Math.min(expiresInSeconds, config.protectedUrlTtlSeconds));
    const expiresAt = Math.floor(Date.now() / 1000) + boundedTtl;
    const signature = signProtectedAsset(assetId, expiresAt);
    return `${config.workerPublicUrl.replace(/\/$/, "")}/v1/protected-media/${encodeURIComponent(assetId)}?expires=${expiresAt}&signature=${encodeURIComponent(signature)}`;
  }

  async delete(assetId: string) {
    const asset = await getAssetLocator(assetId);
    if (!asset) {
      return;
    }
    await fs.rm(this.resolveStoragePath(asset.storage_key), { force: true });
  }

  async exists(assetId: string) {
    const asset = await getAssetLocator(assetId);
    if (!asset || asset.deleted_at || asset.status !== "ready") {
      return false;
    }
    const stats = await fs.stat(this.resolveStoragePath(asset.storage_key)).catch(() => null);
    return Boolean(stats?.isFile());
  }

  async getReadPath(assetId: string) {
    const asset = await getAssetLocator(assetId);
    if (!asset || asset.deleted_at || asset.status !== "ready") {
      throw new Error("Protected media asset is unavailable.");
    }
    const readPath = this.resolveStoragePath(asset.storage_key);
    const stats = await fs.stat(readPath).catch(() => null);
    if (!stats?.isFile()) {
      throw new Error("Protected media file is unavailable.");
    }
    return readPath;
  }
}
