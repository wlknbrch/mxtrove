import type {
  ProtectedAsset,
  ProtectedMediaStorage,
  ProtectedUploadInput,
} from "./storage.js";

// The storage contract is intentionally provider-neutral. Activating S3 later only
// requires replacing this adapter, not the authorization or database model.
export class S3ProtectedMediaStorage implements ProtectedMediaStorage {
  private unavailable(): never {
    throw new Error("S3 protected media storage is not configured in this deployment.");
  }

  put(_input: ProtectedUploadInput): Promise<ProtectedAsset> {
    return Promise.reject(this.unavailable());
  }

  createSignedReadUrl(_assetId: string, _expiresInSeconds: number): Promise<string> {
    return Promise.reject(this.unavailable());
  }

  delete(_assetId: string): Promise<void> {
    return Promise.reject(this.unavailable());
  }

  exists(_assetId: string): Promise<boolean> {
    return Promise.reject(this.unavailable());
  }

  getReadPath(_assetId: string): Promise<string> {
    return Promise.reject(this.unavailable());
  }
}
