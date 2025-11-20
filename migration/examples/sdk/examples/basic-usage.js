const { GammaFilesClient } = require('../dist/index');
const fs = require('fs');
const path = require('path');

// Configuration
const API_KEY = process.env.API_KEY || 'your-api-key-here';
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const FOLDER_ID = process.env.FOLDER_ID;

async function main() {
  // Initialize client
  console.log('Initializing Gamma Files SDK client...');
  const client = new GammaFilesClient({
    baseUrl: BASE_URL,
    apiKey: API_KEY
  });

  try {
    // Example 1: Upload a file
    console.log('\n=== Example 1: Upload File ===');
    const testFile = Buffer.from('Hello from Gamma Files SDK!', 'utf-8');
    const uploadResult = await client.uploadFile({
      file: testFile,
      filename: 'test-from-sdk.txt',
      mimeType: 'text/plain',
      folderId: FOLDER_ID
    });
    console.log('✓ File uploaded:', uploadResult.file.id);
    console.log('  Name:', uploadResult.file.originalName);
    console.log('  Size:', uploadResult.file.size, 'bytes');
    
    const fileId = uploadResult.file.id;
    const folderId = uploadResult.file.folderId;

    // Example 2: Get file metadata
    console.log('\n=== Example 2: Get File Metadata ===');
    const metadataResult = await client.getFileMetadata(fileId);
    console.log('✓ File metadata retrieved:');
    console.log('  ID:', metadataResult.file.id);
    console.log('  Name:', metadataResult.file.originalName);
    console.log('  Type:', metadataResult.file.mimeType);
    console.log('  Size:', metadataResult.file.size, 'bytes');
    console.log('  Created:', metadataResult.file.createdAt);

    // Example 3: List files in folder
    console.log('\n=== Example 3: List Files in Folder ===');
    const listResult = await client.listFiles(folderId);
    console.log(`✓ Found ${listResult.files.length} file(s) in folder:`);
    listResult.files.forEach((file, index) => {
      console.log(`  ${index + 1}. ${file.originalName} (${file.size} bytes)`);
    });

    // Example 4: Download file
    console.log('\n=== Example 4: Download File ===');
    const fileData = await client.downloadFile(fileId);
    const buffer = Buffer.from(fileData);
    console.log('✓ File downloaded, size:', buffer.length, 'bytes');
    console.log('  Content:', buffer.toString('utf-8'));

    // Example 5: Generate presigned URL
    console.log('\n=== Example 5: Generate Presigned URL ===');
    const presignedResult = await client.generatePresignedUrl({
      fileId: fileId,
      expiresIn: 3600 // 1 hour
    });
    console.log('✓ Presigned URL generated:');
    console.log('  URL:', presignedResult.url);
    console.log('  Token:', presignedResult.token);
    console.log('  Expires:', presignedResult.expiresAt);

    // Example 6: View file by token
    console.log('\n=== Example 6: View File by Token ===');
    const tokenResult = await client.viewFileByToken(presignedResult.token);
    const tokenBuffer = Buffer.from(tokenResult.data);
    console.log('✓ File accessed via token:');
    console.log('  Content:', tokenBuffer.toString('utf-8'));
    console.log('  Content-Type:', tokenResult.headers.contentType);
    console.log('  ETag:', tokenResult.headers.etag);
    console.log('  Cache-Control:', tokenResult.headers.cacheControl);
    console.log('  CF-Cache-Tag:', tokenResult.headers.cfCacheTag);

    // Example 7: Delete file
    console.log('\n=== Example 7: Delete File ===');
    const deleteResult = await client.deleteFile(fileId);
    console.log('✓', deleteResult.message);

    console.log('\n✅ All examples completed successfully!');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the examples
main();
