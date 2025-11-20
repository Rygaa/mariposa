import { ListFilesResponse } from '../types';

export async function listFiles(
  folderId: string,
  request: <T>(method: string, path: string, options?: any) => Promise<T>
): Promise<ListFilesResponse> {
  const url = `/api/files/list/${folderId}`;
  return request<ListFilesResponse>('GET', url);
}
