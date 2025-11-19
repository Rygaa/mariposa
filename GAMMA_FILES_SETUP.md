# Environment Variables for Image Upload

Add these environment variables to your backend `.env` file:

```bash
# Gamma Files SDK Configuration
GAMMA_BASE_URL=http://localhost:3000  # Your Gamma Files server URL
GAMMA_API_KEY=your-api-key-here       # Your Gamma Files API key
GAMMA_FOLDER_ID=optional-folder-id    # Optional: Default folder ID for uploads
```

## Getting Started

1. Make sure you have the Gamma Files server running
2. Get your API key from the Gamma Files dashboard
3. Add the environment variables to `backend/.env`
4. Restart the backend server

## Usage

The image upload functionality is now integrated into:
- Create Menu Item Modal
- Update Menu Item Modal

Users can upload up to 5 images per menu item. Images are stored as file IDs in the database and fetched via presigned URLs from Gamma Files.
