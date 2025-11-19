import FormData from 'form-data';
import { UploadFileOptions, UploadFileResponse } from '../types';
import { Readable } from 'stream';

export async function uploadFile(
  baseUrl: string,
  apiKey: string,
  options: UploadFileOptions,
  request: <T>(method: string, path: string, options?: any) => Promise<T>
): Promise<UploadFileResponse> {
  const { file, filename, mimeType, folderId } = options;
  
  const form = new FormData();
  
  let contentType = mimeType || 'application/octet-stream';
  
  // Handle different file input types
  if (file instanceof Readable || (file as any).pipe) {
    // Stream support for Node.js - efficient for large files
    form.append('file', file, {
      filename,
      contentType,
    });
  } else if (Buffer.isBuffer(file)) {
    // Direct buffer support
    form.append('file', file, {
      filename,
      contentType,
    });
  } else if (typeof file === 'string') {
    // Handle base64 string - convert to buffer
    const fileBuffer = Buffer.from(file, 'base64');
    form.append('file', fileBuffer, {
      filename,
      contentType,
    });
  } else if (typeof Blob !== 'undefined' && file instanceof Blob) {
    // Browser Blob support - must convert to buffer
    const arrayBuffer = await (file as any).arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);
    contentType = mimeType || (file as any).type || 'application/octet-stream';
    form.append('file', fileBuffer, {
      filename,
      contentType,
    });
  } else if (typeof File !== 'undefined' && file instanceof (File as any)) {
    // Browser File support - must convert to buffer
    const arrayBuffer = await (file as any).arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);
    contentType = mimeType || (file as any).type || 'application/octet-stream';
    form.append('file', fileBuffer, {
      filename,
      contentType,
    });
  } else {
    throw new Error('Unsupported file type. Supported types: Buffer, Stream, Blob, File, or base64 string');
  }

  const url = folderId 
    ? `/api/files/upload/${folderId}`
    : '/api/files/upload';

  return request<UploadFileResponse>('POST', url, {
    body: form,
    headers: form.getHeaders(),
  });
}
