import { DeleteFileResponse } from '../types';

export async function deleteFile(
  fileId: string,
  request: <T>(method: string, path: string, options?: any) => Promise<T>
): Promise<DeleteFileResponse> {
  const url = `/api/files/${fileId}`;
  return request<DeleteFileResponse>('DELETE', url);
}
