import { makeRequest } from './request';

export interface GeneratePresignedUrlOptions {
  fileId: string;
  expiresIn?: number;
  maxUsageCount?: number;
}

export interface GeneratePresignedUrlResponse {
  success: true;
  token: string;
  url: string;
  expiresAt: string;
}

export async function generatePresignedUrl(
  options: GeneratePresignedUrlOptions,
  apiKey: string,
  baseUrl: string
): Promise<GeneratePresignedUrlResponse> {
  return makeRequest<GeneratePresignedUrlResponse>(
    'POST',
    `/trpc/generatePresignedUrl`,
    baseUrl,
    apiKey,
    {
      body: {
        fileId: options.fileId,
        expiresIn: options.expiresIn,
        maxUsageCount: options.maxUsageCount,
      },
    }
  );
}
