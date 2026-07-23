import type { CloudProvider } from "@/types/domain";

export interface CloudConnectionResult {
  provider: CloudProvider;
  accountId: string | null;
  email: string | null;
  accessToken: string;
  expiresAt: number | null;
  folders: CloudFolderStructure;
}

export interface CloudFolderStructure {
  rootFolderId: string;
  audioFolderId: string;
  audioOriginalsFolderId: string;
  audioPreviewsFolderId: string;
  artworkFolderId: string;
  avatarsFolderId: string;
  exportsFolderId: string;
}

export interface UploadFileInput {
  file: File;
  filename?: string;
  parentFolderId: string;
  signal?: AbortSignal;
  onProgress?: (progress: number) => void;
}

export interface CloudFileMetadata {
  id: string;
  name: string;
  mimeType: string;
  size: number | null;
  webViewLink: string | null;
  webContentLink: string | null;
  thumbnailLink: string | null;
}

export interface CloudAssetResult {
  provider?: CloudProvider;
  fileId: string;
  filename: string;
  mimeType: string;
  bytes: number;
  parentFolderId: string;
  viewUrl: string | null;
  shareUrl: string | null;
  thumbnailUrl: string | null;
}

export interface PublicAssetResult {
  fileId: string;
  shareUrl: string | null;
  viewUrl: string | null;
}

export interface CloudStorageProvider {
  provider: CloudProvider;
  connect(): Promise<CloudConnectionResult>;
  disconnect(): Promise<void>;
  restoreSession(): Promise<boolean>;
  ensureRootStructure(): Promise<CloudFolderStructure>;
  uploadFile(input: UploadFileInput): Promise<CloudAssetResult>;
  uploadResumable(input: UploadFileInput): Promise<CloudAssetResult>;
  getPrivateFileBlob(fileId: string): Promise<Blob>;
  getFileMetadata(fileId: string): Promise<CloudFileMetadata>;
  createPublicPreview(fileId: string): Promise<PublicAssetResult>;
  revokePublicPreview(fileId: string): Promise<void>;
  getPublicPreviewUrl(fileId: string): Promise<string | null>;
  getViewUrl(fileId: string): Promise<string | null>;
  deleteFile(fileId: string): Promise<void>;
}
