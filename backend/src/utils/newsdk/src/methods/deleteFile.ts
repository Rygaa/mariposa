import { makeRequest } from './request';

export interface DeleteFileResponse {
  success: true;
  message: string;
}

export async function deleteFile(
  fileId: string,
  apiKey: string,
  baseUrl: string
): Promise<DeleteFileResponse> {
  return makeRequest<DeleteFileResponse>(
    'POST',
    `/trpc/deleteFile`,
    baseUrl,
    apiKey,
    {
      body: {
        fileId,
      },
    }
  );
}
