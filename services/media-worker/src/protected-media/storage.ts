export interface ProtectedUploadInput {
  assetId: string;
  storageKey: string;
  sourcePath: string;
  mimeType: string;
  bytes: number;
}

export interface ProtectedAsset {
  id: string;
  storageKey: string;
  bytes: number;
  mimeType: string;
}

export interface ProtectedMediaStorage {
  put(input: ProtectedUploadInput): Promise<ProtectedAsset>;
  createSignedReadUrl(assetId: string, expiresInSeconds: number): Promise<string>;
  delete(assetId: string): Promise<void>;
  exists(assetId: string): Promise<boolean>;
  getReadPath(assetId: string): Promise<string>;
}
