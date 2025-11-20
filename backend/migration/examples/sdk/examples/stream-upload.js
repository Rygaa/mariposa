/**
 * Example: Upload a large file using streaming
 * 
 * This example shows how to upload large files efficiently using streams
 * instead of loading the entire file into memory.
 */

const { GammaFilesClient } = require('../dist');
const fs = require('fs');
const path = require('path');

async function uploadLargeFileWithStream() {
  // Initialize the client
  const client = new GammaFilesClient({
    baseUrl: 'http://localhost:6100',
    apiKey: 'your-api-key-here',
  });

  // Path to a large file you want to upload
  const filePath = '/path/to/large-file.mp4'; // e.g., a video file
  const filename = path.basename(filePath);

  try {
    console.log(`Starting upload of ${filename}...`);
    
    // Create a read stream - this doesn't load the entire file into memory
    const fileStream = fs.createReadStream(filePath);

    // Upload using the stream
    const result = await client.uploadFile({
      file: fileStream,
      filename: filename,
      mimeType: 'video/mp4', // adjust based on your file type
      folderId: 'optional-folder-id', // optional
    });

    console.log('Upload successful!');
    console.log('File ID:', result.file.id);
    console.log('File size:', result.file.size, 'bytes');
    console.log('Uploaded at:', result.file.createdAt);
  } catch (error) {
    console.error('Upload failed:', error.message);
  }
}

// Example: Upload with progress tracking (requires custom implementation)
async function uploadWithProgressTracking() {
  const client = new GammaFilesClient({
    baseUrl: 'http://localhost:6100',
    apiKey: 'your-api-key-here',
  });

  const filePath = '/path/to/large-file.mp4';
  const filename = path.basename(filePath);
  const stats = fs.statSync(filePath);
  const totalSize = stats.size;
  
  let uploadedBytes = 0;

  const fileStream = fs.createReadStream(filePath);
  
  // Track progress
  fileStream.on('data', (chunk) => {
    uploadedBytes += chunk.length;
    const percentComplete = Math.round((uploadedBytes / totalSize) * 100);
    console.log(`Upload progress: ${percentComplete}% (${uploadedBytes}/${totalSize} bytes)`);
  });

  try {
    const result = await client.uploadFile({
      file: fileStream,
      filename: filename,
    });

    console.log('Upload completed successfully!');
    console.log('File ID:', result.file.id);
  } catch (error) {
    console.error('Upload failed:', error.message);
  }
}

// Run the example
uploadLargeFileWithStream();
