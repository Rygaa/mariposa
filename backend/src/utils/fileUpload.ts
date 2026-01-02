import { GammaFilesClient } from '@oasis-path/gamma-sdk';

// Initialize the Gamma Files SDK client
const gammaClient = new GammaFilesClient({
  baseUrl: process.env.GAMMA_URL || 'http://localhost:3000',
  apiKey: process.env.GAMMA_API_KEY || '',
});

/**
 * Upload a file to Gamma Files storage using presigned upload
 * @param file - Buffer, Blob, File, or ReadableStream
 * @param filename - Name for the file
 * @param token - Presigned upload token
 * @param mimeType - MIME type of the file
 * @param folderId - Optional folder ID to upload to
 * @returns Upload response with file metadata including file ID
 */
export async function uploadFile(
  file: Buffer | Blob | File | NodeJS.ReadableStream,
  filename: string,
  token: string,
  mimeType?: string,
  folderId?: string
) {
  try {
    console.log("----")
    console.log(file)
    console.log(filename)
    console.log(mimeType)
    console.log(folderId)

    const result = await gammaClient.uploadPresigned({
      file,
      filename,
      mimeType,
      folderId: folderId || process.env.GAMMA_FOLDER_ID,
      token,
    });

    console.log(result)
    console.log("----")
    
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
    const result = await gammaClient.downloadPresigned(fileId, token);
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
    const result = await gammaClient.downloadFolder(folderId, token);
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
    const result = await gammaClient.viewFile(fileId, token, compressionValue);
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
    const result = await gammaClient.listFolderFiles(folderId || process.env.GAMMA_FOLDER_ID || '');
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
    const result = await gammaClient.deleteFile(fileId);
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
    const result = await gammaClient.getFileMetadata(fileId);
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
    const result = await gammaClient.generatePresignedUrl({
      fileId,
      expiresIn,
      maxUsageCount,
    });
    return result;
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    throw error;
  }
}
