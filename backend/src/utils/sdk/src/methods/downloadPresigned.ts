export async function downloadPresigned(
  fileId: string,
  token: string,
  baseUrl: string
): Promise<ArrayBuffer> {
  const url = new URL(`/api/files/download-presigned/${fileId}`, baseUrl);
  url.searchParams.append('token', token);

  const response = await fetch(url.toString());

  if (!response.ok) {
    const errorText = await response.text();
    let errorData;
    try {
      errorData = JSON.parse(errorText);
    } catch {
      errorData = { error: errorText };
    }
    throw new Error(errorData.error || errorData.message || `Download presigned failed with status ${response.status}`);
  }

  return await response.arrayBuffer();
}
