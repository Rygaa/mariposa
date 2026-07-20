import { downloadFolder as downloadFolderWithToken } from '@oasis-path/gamma-sdk/dist/methods/downloadFolder';
import { downloadWithToken } from '@oasis-path/gamma-sdk/dist/methods/downloadWithToken';
import { uploadWithToken } from '@oasis-path/gamma-sdk/dist/methods/uploadWithToken';
import { viewFile as viewFileWithToken } from '@oasis-path/gamma-sdk/dist/methods/viewFile';
import { makeTrpcRequest } from '@oasis-path/gamma-sdk/dist/utils/makeTrpcRequest';

const gammaBaseUrl = process.env.GAMMA_URL || 'http://localhost:3000';
const gammaApiKey = process.env.GAMMA_API_KEY || '';

interface GammaFileMetadata {
  id: string;
  name: string;
  originalName: string;
  mimeType: string;
  size: number;
  folderId: string;
  uploadedBy: string;
  createdAt: string;
  updatedAt?: string | null;
}

interface PresignedUploadResponse {
  success: true;
  url?: string;
  token?: string;
}

interface PresignedDownloadResponse {
  success: true;
  token: string;
  url: string;
  expiresAt: string;
}

function requireGammaApiKey() {
  if (!gammaApiKey) {
    throw new Error('GAMMA_API_KEY is required for this Gamma operation.');
  }

  return gammaApiKey;
}

/**
 * Upload a file to Gamma Files storage using presigned upload
 * @param file - Buffer, Blob, File, or ReadableStream
 * @param filename - Name for the file
 * @param mimeType - MIME type of the file
 * @param folderId - Optional folder ID to upload to
 * @returns Upload response with file metadata including file ID
 */
export async function uploadFile(
  file: Buffer | Blob | File | NodeJS.ReadableStream,
  filename: string,
  mimeType?: string,
  folderId?: string
) {
  try {
    const targetFolderId = folderId || process.env.GAMMA_FOLDER_ID;

    if (!targetFolderId) {
      throw new Error(
        'A Gamma folder ID is required. Pass folderId or set GAMMA_FOLDER_ID.'
      );
    }

    console.log('[Gamma upload] generating token', {
      baseUrl: gammaBaseUrl,
      folderId: targetFolderId,
      filename,
      mimeType,
    });

    const presignedUrl = await makeTrpcRequest<PresignedUploadResponse>(
      'POST',
      '/trpc/generatePresignedFileUploadUrl',
      gammaBaseUrl,
      requireGammaApiKey(),
      {
        body: { folderId: targetFolderId },
      }
    );

    const uploadUrl = presignedUrl.url
      ? new URL(presignedUrl.url)
      : new URL('/api/files/upload-presigned', gammaBaseUrl);
    const token =
      presignedUrl.token || uploadUrl.searchParams.get('token');

    if (!token) {
      throw new Error('Gamma did not return a presigned upload token.');
    }

    console.log('[Gamma upload] presigned response', {
      ...presignedUrl,
      url: `${uploadUrl.origin}${uploadUrl.pathname}?token=[redacted]`,
      token: `[present, length=${token.length}]`,
    });

    console.log('[Gamma upload] uploading with token', {
      baseUrl: uploadUrl.origin,
      filename,
      mimeType,
      tokenPresent: true,
      tokenLength: token.length,
    });

    const result = await uploadWithToken(
      {
        file,
        filename,
        mimeType,
        token,
      },
      uploadUrl.origin
    );

    console.log('[Gamma upload] upload result', result);

    return result;
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
}

/**
 * Download a file using presigned token
 * @param fileId - ID of the file to download
 * @param token - Presigned download token
 * @returns File data as ArrayBuffer
 */
export async function downloadFile(fileId: string, token: string) {
  try {
    const result = await downloadWithToken(fileId, token, gammaBaseUrl);
    return result;
  } catch (error) {
    console.error('Error downloading file:', error);
    throw error;
  }
}

/**
 * Download an entire folder as a zip file using presigned token
 * @param folderId - ID of the folder to download
 * @param token - Presigned download token
 * @returns Zip file data as ArrayBuffer
 */
export async function downloadFolder(folderId: string, token: string) {
  try {
    const result = await downloadFolderWithToken(
      folderId,
      token,
      gammaBaseUrl
    );
    return result;
  } catch (error) {
    console.error('Error downloading folder:', error);
    throw error;
  }
}

/**
 * View a file using presigned token with optional compression
 * @param fileId - ID of the file to view
 * @param token - Presigned view token
 * @param compressionValue - Optional compression value (0-100)
 * @returns File data with headers
 */
export async function viewFile(fileId: string, token: string, compressionValue?: number) {
  try {
    const result = await viewFileWithToken(
      fileId,
      token,
      gammaBaseUrl,
      compressionValue
    );
    return result;
  } catch (error) {
    console.error('Error viewing file:', error);
    throw error;
  }
}

/**
 * List all files in a folder
 * @param folderId - ID of the folder (defaults to GAMMA_FOLDER_ID from env)
 * @returns List of files with metadata
 */
export async function listFiles(folderId?: string) {
  try {
    const targetFolderId = folderId || process.env.GAMMA_FOLDER_ID;

    if (!targetFolderId) {
      throw new Error(
        'A Gamma folder ID is required. Pass folderId or set GAMMA_FOLDER_ID.'
      );
    }

    const input = encodeURIComponent(
      JSON.stringify({ folderId: targetFolderId, sortBy: 'createdAt' })
    );
    const result = await makeTrpcRequest<{
      success: true;
      files: GammaFileMetadata[];
    }>(
      'GET',
      `/trpc/listFolderFiles?input=${input}`,
      gammaBaseUrl,
      requireGammaApiKey()
    );
    return result.files;
  } catch (error) {
    console.error('Error listing files:', error);
    throw error;
  }
}

/**
 * Delete a file from Gamma Files storage
 * @param fileId - ID of the file to delete
 * @returns Success message
 */
export async function deleteFile(fileId: string) {
  try {
    const result = await makeTrpcRequest<{
      success: true;
      message: string;
    }>(
      'POST',
      '/trpc/deleteFile',
      gammaBaseUrl,
      requireGammaApiKey(),
      { body: { fileId } }
    );
    return result;
  } catch (error) {
    console.error('Error deleting file:', error);
    throw error;
  }
}

/**
 * Get metadata for a specific file
 * @param fileId - ID of the file
 * @returns File metadata
 */
export async function getFileMetadata(fileId: string) {
  try {
    const input = encodeURIComponent(JSON.stringify({ fileId }));
    const result = await makeTrpcRequest<{
      success: true;
      file: GammaFileMetadata;
    }>(
      'GET',
      `/trpc/getFileMetadata?input=${input}`,
      gammaBaseUrl,
      requireGammaApiKey()
    );
    return result.file;
  } catch (error) {
    console.error('Error getting file metadata:', error);
    throw error;
  }
}

/**
 * Generate a presigned URL for file access
 * @param fileId - ID of the file
 * @param expiresIn - Optional expiration time in seconds
 * @param maxUsageCount - Optional maximum usage count
 * @returns Presigned URL with token and expiration
 */
export async function generatePresignedUrl(
  fileId: string,
  expiresIn?: number,
  maxUsageCount?: number
) {
  try {
    const result = await makeTrpcRequest<PresignedDownloadResponse>(
      'POST',
      '/trpc/generatePresignedFileDownloadUrl',
      gammaBaseUrl,
      requireGammaApiKey(),
      {
        body: {
          fileId,
          expiresIn,
          maxUsageCount,
        },
      }
    );
    return result;
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    throw error;
  }
}
