import { makeRequest } from './request';

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

export interface GetFileMetadataResponse {
  success: true;
  file: FileMetadata;
}

export async function getFileMetadata(
  fileId: string,
  apiKey: string,
  baseUrl: string
): Promise<GetFileMetadataResponse> {
  return makeRequest<GetFileMetadataResponse>(
    'GET',
    `/trpc/getFileMetadata?input=${encodeURIComponent(JSON.stringify({ fileId }))}`,
    baseUrl,
    apiKey
  );
}
