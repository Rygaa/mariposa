const { GammaFilesClient } = require('../dist/index');
const fs = require('fs');
const path = require('path');

const API_KEY = process.env.API_KEY || 'your-api-key-here';
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const FOLDER_ID = process.env.FOLDER_ID;

async function uploadMultipleFiles() {
  const client = new GammaFilesClient({
    baseUrl: BASE_URL,
    apiKey: API_KEY
  });

  const files = [
    { name: 'document1.txt', content: 'First document content' },
    { name: 'document2.txt', content: 'Second document content' },
    { name: 'document3.txt', content: 'Third document content' },
  ];

  console.log('Uploading multiple files...\n');

  const uploadPromises = files.map(async (fileInfo) => {
    try {
      const buffer = Buffer.from(fileInfo.content, 'utf-8');
      const result = await client.uploadFile({
        file: buffer,
        filename: fileInfo.name,
        mimeType: 'text/plain',
        folderId: FOLDER_ID
      });
      console.log(`✓ Uploaded: ${fileInfo.name} (ID: ${result.file.id})`);
      return result.file;
    } catch (error) {
      console.error(`✗ Failed to upload ${fileInfo.name}:`, error.message);
      return null;
    }
  });

  const results = await Promise.all(uploadPromises);
  const successful = results.filter(r => r !== null);
  
  console.log(`\n✅ Successfully uploaded ${successful.length} of ${files.length} files`);
  return successful;
}

async function downloadAndSaveFiles(fileIds, outputDir) {
  const client = new GammaFilesClient({
    baseUrl: BASE_URL,
    apiKey: API_KEY
  });

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log(`\nDownloading files to ${outputDir}...\n`);

  for (const fileId of fileIds) {
    try {
      // Get metadata first to know the filename
      const metadata = await client.getFileMetadata(fileId);
      const filename = metadata.file.originalName;

      // Download the file
      const fileData = await client.downloadFile(fileId);
      const buffer = Buffer.from(fileData);

      // Save to disk
      const filepath = path.join(outputDir, filename);
      fs.writeFileSync(filepath, buffer);

      console.log(`✓ Downloaded: ${filename} (${buffer.length} bytes)`);
    } catch (error) {
      console.error(`✗ Failed to download ${fileId}:`, error.message);
    }
  }

  console.log('\n✅ Download complete');
}

async function main() {
  try {
    // Upload multiple files
    const uploadedFiles = await uploadMultipleFiles();
    
    if (uploadedFiles.length === 0) {
      console.log('No files were uploaded successfully');
      return;
    }

    // Extract file IDs
    const fileIds = uploadedFiles.map(f => f.id);

    // Download them back
    const outputDir = path.join(__dirname, 'downloads');
    await downloadAndSaveFiles(fileIds, outputDir);

    // Cleanup: Delete uploaded files
    console.log('\nCleaning up uploaded files...\n');
    const client = new GammaFilesClient({
      baseUrl: BASE_URL,
      apiKey: API_KEY
    });

    for (const fileId of fileIds) {
      try {
        await client.deleteFile(fileId);
        console.log(`✓ Deleted: ${fileId}`);
      } catch (error) {
        console.error(`✗ Failed to delete ${fileId}:`, error.message);
      }
    }

    console.log('\n✅ All operations completed!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
