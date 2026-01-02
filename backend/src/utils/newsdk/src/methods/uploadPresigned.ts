export interface UploadPresignedOptions {
  file: Buffer | Blob | File | NodeJS.ReadableStream;
  filename: string;
  mimeType?: string;
  folderId?: string;
  token: string;
}

export interface UploadPresignedResponse {
  success: true;
  file: {
    id: string;
    name: string;
    originalName: string;
    mimeType: string;
    size: number;
    folderId: string;
    uploadedBy: string;
    createdAt: string;
  };
}

export async function uploadPresigned(
  options: UploadPresignedOptions,
  baseUrl: string
): Promise<UploadPresignedResponse> {
  const { file, filename, mimeType, folderId, token } = options;

  const formData = new FormData();
  
  // Handle different file input types
  if (file instanceof Buffer) {
    const blob = new Blob([file], { type: mimeType || 'application/octet-stream' });
    formData.append('file', blob, filename);
  } else if (typeof file === 'object' && 'pipe' in file) {
    // NodeJS.ReadableStream - not directly supported in FormData in browser
    throw new Error('ReadableStream not supported in browser environment. Use Buffer or Blob.');
  } else {
    // Blob or File
    formData.append('file', file, filename);
  }

  const url = new URL(`/api/files/upload-presigned/${folderId || ''}`, baseUrl);
  url.searchParams.append('token', token);

  const response = await fetch(url.toString(), {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorData;
    try {
      errorData = JSON.parse(errorText);
    } catch {
      errorData = { error: errorText };
    }
    throw new Error(errorData.error || errorData.message || `Upload presigned failed with status ${response.status}`);
  }

  return await response.json() as UploadPresignedResponse;
}
