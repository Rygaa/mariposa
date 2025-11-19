export async function downloadFile(
  fileId: string,
  request: <T>(method: string, path: string, options?: any) => Promise<T>
): Promise<ArrayBuffer> {
  const url = `/api/files/download/${fileId}`;
  return request<ArrayBuffer>('GET', url, { binary: true });
}
