export interface GammaFilesClientConfig {
  baseUrl: string;
  apiKey: string;
}

export interface FileMetadata {
  id: string;
  name: string;
  originalName: string;
  mimeType: string;
  size: number;
  folderId: string;
  uploadedBy: string;
  createdAt: string;
}

export interface UploadFileOptions {
  file: Buffer | Blob | File | string | NodeJS.ReadableStream; // string for base64, stream for large files
  filename: string;
  mimeType?: string;
  folderId?: string;
}

export interface UploadFileResponse {
  success: true;
  file: FileMetadata;
}

export interface ListFilesResponse {
  success: true;
  files: FileMetadata[];
}

export interface FileMetadataResponse {
  success: true;
  file: FileMetadata;
}

export interface DeleteFileResponse {
  success: true;
  message: string;
}

export interface PresignedUrlOptions {
  fileId: string;
  expiresIn?: number; // seconds, min: 60, max: 86400
  maxUsageCount?: number; // default: 1
}

export interface PresignedUrlResponse {
  success: true;
  token: string;
  url: string;
  expiresAt: string;
}

export interface DownloadFileResult {
  file: FileMetadata;
  data: ArrayBuffer;
}

export interface ViewFileByTokenResult {
  data: ArrayBuffer;
  headers: {
    contentType: string;
    contentLength: number;
    contentDisposition: string;
    etag?: string;
    cacheControl?: string;
    cfCacheTag?: string;
  };
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  details?: any;
}
