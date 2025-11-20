import { FileMetadataResponse } from '../types';

export async function getFileMetadata(
  fileId: string,
  request: <T>(method: string, path: string, options?: any) => Promise<T>
): Promise<FileMetadataResponse> {
  const url = `/api/files/${fileId}/metadata`;
  return request<FileMetadataResponse>('GET', url);
}
