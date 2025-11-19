import { GammaFilesClient } from '@oasis-path/gamma-sdk';

// Initialize the Gamma Files SDK client
const gammaClient = new GammaFilesClient({
  baseUrl: process.env.GAMMA_URL || 'http://localhost:3000',
  apiKey: process.env.GAMMA_API_KEY || '',
});

/**
 * Upload a file to Gamma Files storage
 * @param file - Buffer, Blob, File, base64 string, or ReadableStream
 * @param filename - Name for the file
 * @param mimeType - MIME type of the file
 * @param folderId - Optional folder ID to upload to
 * @returns Upload response with file metadata including file ID
 */
export async function uploadFile(
  file: Buffer | Blob | File | string | NodeJS.ReadableStream,
  filename: string,
  mimeType?: string,
  folderId?: string
) {
  try {
    console.log("----")
    console.log(file)
    console.log(filename)
    console.log(mimeType)
    console.log(folderId)

    const result = await gammaClient.uploadFile({
      file: file as any,
      filename,
      mimeType,
      folderId: folderId || process.env.GAMMA_FOLDER_ID,
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
 * Get file metadata by file ID
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
 * Delete a file from Gamma Files storage
 * @param fileId - ID of the file to delete
 * @returns Delete response
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
 * Generate a presigned URL for a file
 * @param fileId - ID of the file
 * @param expiresIn - Expiration time in seconds (min: 60, max: 86400)
 * @param maxUsageCount - Maximum number of times the URL can be used
 * @returns Presigned URL response with token and URL
 */
export async function generatePresignedUrl(
  fileId: string,
  expiresIn: number = 3600,
  maxUsageCount: number = 1
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

/**
 * Get a public URL for viewing a file using a token
 * @param fileId - ID of the file
 * @returns Public URL for viewing the file
 */
export async function getFileViewUrl(fileId: string): Promise<string> {
  try {
    // Generate a long-lived presigned URL (24 hours, unlimited usage)
    const result = await gammaClient.generatePresignedUrl({
      fileId,
      expiresIn: 86400, // 24 hours
      maxUsageCount: 999999, // Effectively unlimited
    });
    return result.url;
  } catch (error) {
    console.error('Error generating file view URL:', error);
    throw error;
  }
}

/**
 * List all files in a folder
 * @param folderId - ID of the folder
 * @returns List of files
 */
export async function listFiles(folderId?: string) {
  try {
    const result = await gammaClient.listFiles(folderId || process.env.GAMMA_FOLDER_ID || '');
    return result.files;
  } catch (error) {
    console.error('Error listing files:', error);
    throw error;
  }
}

/**
 * Download a file as ArrayBuffer
 * @param fileId - ID of the file to download
 * @returns File data as ArrayBuffer
 */
export async function downloadFile(fileId: string) {
  try {
    const result = await gammaClient.downloadFile(fileId);
    return result;
  } catch (error) {
    console.error('Error downloading file:', error);
    throw error;
  }
}
