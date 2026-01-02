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

export interface ListFolderFilesResponse {
  success: true;
  files: FileMetadata[];
}

export async function listFolderFiles(
  folderId: string,
  apiKey: string,
  baseUrl: string
): Promise<ListFolderFilesResponse> {
  return makeRequest<ListFolderFilesResponse>(
    'GET',
    `/trpc/listFolderFiles?input=${encodeURIComponent(JSON.stringify({ folderId }))}`,
    baseUrl,
    apiKey
  );
}
