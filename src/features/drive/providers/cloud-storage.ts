export interface CloudConnectionResult {
  provider: "google_drive";
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
  connect(): Promise<CloudConnectionResult>;
  disconnect(): Promise<void>;
  ensureRootStructure(): Promise<CloudFolderStructure>;
  uploadFile(input: UploadFileInput): Promise<CloudAssetResult>;
  uploadResumable(input: UploadFileInput): Promise<CloudAssetResult>;
  getPrivateFileBlob(fileId: string): Promise<Blob>;
  getFileMetadata(fileId: string): Promise<CloudFileMetadata>;
  makePublicPreview(fileId: string): Promise<PublicAssetResult>;
  revokePublicPreview(fileId: string): Promise<void>;
  getPublicPreviewUrl(fileId: string): Promise<string | null>;
  getViewUrl(fileId: string): Promise<string | null>;
  deleteFile(fileId: string): Promise<void>;
}
