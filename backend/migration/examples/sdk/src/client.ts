import {
  GammaFilesClientConfig,
  UploadFileOptions,
  UploadFileResponse,
  ListFilesResponse,
  FileMetadataResponse,
  DeleteFileResponse,
  PresignedUrlOptions,
  PresignedUrlResponse,
  ViewFileByTokenResult,
} from './types';

import { uploadFile } from './methods/uploadFile';
import { downloadFile } from './methods/downloadFile';
import { listFiles } from './methods/listFiles';
import { deleteFile } from './methods/deleteFile';
import { getFileMetadata } from './methods/getFileMetadata';
import { generatePresignedUrl } from './methods/generatePresignedUrl';
import { viewFileByToken } from './methods/viewFileByToken';
import { makeRequest } from './methods/request';

export class GammaFilesClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(config: GammaFilesClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.apiKey = config.apiKey;
  }

  async uploadFile(options: UploadFileOptions): Promise<UploadFileResponse> {
    return uploadFile(this.baseUrl, this.apiKey, options, this.request.bind(this));
  }

  async downloadFile(fileId: string): Promise<ArrayBuffer> {
    return downloadFile(fileId, this.request.bind(this));
  }

  async listFiles(folderId: string): Promise<ListFilesResponse> {
    return listFiles(folderId, this.request.bind(this));
  }

  async deleteFile(fileId: string): Promise<DeleteFileResponse> {
    return deleteFile(fileId, this.request.bind(this));
  }

  async getFileMetadata(fileId: string): Promise<FileMetadataResponse> {
    return getFileMetadata(fileId, this.request.bind(this));
  }

  async generatePresignedUrl(options: PresignedUrlOptions): Promise<PresignedUrlResponse> {
    return generatePresignedUrl(options, this.request.bind(this));
  }

  async viewFileByToken(token: string): Promise<ViewFileByTokenResult> {
    return viewFileByToken(token, this.request.bind(this));
  }

  private async request<T>(method: string, path: string, options?: any): Promise<T> {
    return makeRequest<T>(method, path, this.baseUrl, this.apiKey, options);
  }
}
