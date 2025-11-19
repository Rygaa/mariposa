import { PresignedUrlOptions, PresignedUrlResponse } from '../types';

export async function generatePresignedUrl(
  options: PresignedUrlOptions,
  request: <T>(method: string, path: string, options?: any) => Promise<T>
): Promise<PresignedUrlResponse> {
  const url = '/api/files/presigned-url';
  const payload = {
    ...options,
    maxUsageCount: options.maxUsageCount ?? 1
  };
  return request<PresignedUrlResponse>('POST', url, {
    body: JSON.stringify(payload),
    headers: {
      'Content-Type': 'application/json',
    },
  });
}
