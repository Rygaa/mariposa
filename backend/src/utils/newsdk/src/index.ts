import { uploadPresigned } from './methods/uploadPresigned';
import { downloadPresigned } from './methods/downloadPresigned';
import { downloadFolder } from './methods/downloadFolder';
import { viewFile } from './methods/viewFile';
import { listFolderFiles } from './methods/listFolderFiles';
import { deleteFile } from './methods/deleteFile';
import { getFileMetadata } from './methods/getFileMetadata';
import { generatePresignedUrl } from './methods/generatePresignedUrl';

// Types
export interface GammaFilesClientConfig {
  baseUrl: string;
  apiKey?: string;
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
  updatedAt: string | null;
}

export interface ListFolderFilesResponse {
  success: true;
  files: FileMetadata[];
}

export interface UploadPresignedOptions {
  file: Buffer | Blob | File | NodeJS.ReadableStream;
  filename: string;
  mimeType?: string;
  folderId?: string;
  token: string;
}

export interface UploadPresignedResponse {
  success: true;
  file: {
    id: string;
    name: string;
    originalName: string;
    mimeType: string;
    size: number;
    folderId: string;
    uploadedBy: string;
    createdAt: string;
  };
}

export interface ViewFileResult {
  data: ArrayBuffer;
  headers: {
    contentType: string;
    contentLength: number;
    contentDisposition: string;
    cacheControl?: string;
    cdnCacheControl?: string;
    contentEncoding?: string;
    vary?: string;
  };
}

// Client
export class GammaFilesClient {
  private baseUrl: string;
  private apiKey?: string;

  constructor(config: GammaFilesClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.apiKey = config.apiKey;
  }

  async uploadPresigned(options: UploadPresignedOptions): Promise<UploadPresignedResponse> {
    return uploadPresigned(options, this.baseUrl);
  }

  async downloadPresigned(fileId: string, token: string): Promise<ArrayBuffer> {
    return downloadPresigned(fileId, token, this.baseUrl);
  }

  async downloadFolder(folderId: string, token: string): Promise<ArrayBuffer> {
    return downloadFolder(folderId, token, this.baseUrl);
  }

  async viewFile(fileId: string, token: string, compressionValue?: number): Promise<ViewFileResult> {
    return viewFile(fileId, token, this.baseUrl, compressionValue);
  }

  async listFolderFiles(folderId: string): Promise<ListFolderFilesResponse> {
    if (!this.apiKey) {
      throw new Error('API key is required for listFolderFiles method. Please provide apiKey in the constructor config.');
    }
    return listFolderFiles(folderId, this.apiKey, this.baseUrl);
  }

  async deleteFile(fileId: string): Promise<{ success: true; message: string }> {
    if (!this.apiKey) {
      throw new Error('API key is required for deleteFile method. Please provide apiKey in the constructor config.');
    }
    return deleteFile(fileId, this.apiKey, this.baseUrl);
  }

  async getFileMetadata(fileId: string): Promise<{ success: true; file: FileMetadata }> {
    if (!this.apiKey) {
      throw new Error('API key is required for getFileMetadata method. Please provide apiKey in the constructor config.');
    }
    return getFileMetadata(fileId, this.apiKey, this.baseUrl);
  }

  async generatePresignedUrl(options: { fileId: string; expiresIn?: number; maxUsageCount?: number }): Promise<{ success: true; token: string; url: string; expiresAt: string }> {
    if (!this.apiKey) {
      throw new Error('API key is required for generatePresignedUrl method. Please provide apiKey in the constructor config.');
    }
    return generatePresignedUrl(options, this.apiKey, this.baseUrl);
  }
}
