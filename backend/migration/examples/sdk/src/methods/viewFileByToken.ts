import { ViewFileByTokenResult } from '../types';

export async function viewFileByToken(
  token: string,
  request: <T>(method: string, path: string, options?: any) => Promise<T>
): Promise<ViewFileByTokenResult> {
  const url = `/api/files/view/${token}`;
  return request<ViewFileByTokenResult>('GET', url, { 
    binary: true,
    skipAuth: true,
    includeHeaders: true
  });
}
