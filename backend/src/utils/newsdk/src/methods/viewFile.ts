export interface ViewFileResult {
  data: ArrayBuffer;
  headers: {
    contentType: string;
    contentLength: number;
    contentDisposition: string;
    cacheControl?: string;
    cdnCacheControl?: string;
    contentEncoding?: string;
    vary?: string;
  };
}

export async function viewFile(
  fileId: string,
  token: string,
  baseUrl: string,
  compressionValue?: number
): Promise<ViewFileResult> {
  const url = new URL(`/api/files/view/${fileId}`, baseUrl);
  url.searchParams.append('token', token);
  
  if (compressionValue !== undefined) {
    url.searchParams.append('compressionValue', compressionValue.toString());
  }

  const response = await fetch(url.toString());

  if (!response.ok) {
    const errorText = await response.text();
    let errorData;
    try {
      errorData = JSON.parse(errorText);
    } catch {
      errorData = { error: errorText };
    }
    throw new Error(errorData.error || errorData.message || `View file failed with status ${response.status}`);
  }

  const data = await response.arrayBuffer();
  
  return {
    data,
    headers: {
      contentType: response.headers.get('content-type') || 'application/octet-stream',
      contentLength: parseInt(response.headers.get('content-length') || '0', 10),
      contentDisposition: response.headers.get('content-disposition') || '',
      cacheControl: response.headers.get('cache-control') || undefined,
      cdnCacheControl: response.headers.get('cdn-cache-control') || undefined,
      contentEncoding: response.headers.get('content-encoding') || undefined,
      vary: response.headers.get('vary') || undefined,
    },
  };
}
