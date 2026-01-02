export async function makeRequest<T>(
  method: string,
  path: string,
  baseUrl: string,
  apiKey: string,
  options?: {
    body?: any;
    headers?: Record<string, string>;
    query?: Record<string, string>;
  }
): Promise<T> {
  const url = new URL(path, baseUrl);
  
  if (options?.query) {
    Object.entries(options.query).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, value);
      }
    });
  }

  const headers: Record<string, string> = {
    'X-API-Key': apiKey,
    ...options?.headers,
  };

  if (options?.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const fetchOptions: RequestInit = {
    method,
    headers,
  };

  if (options?.body) {
    fetchOptions.body = options.body instanceof FormData || typeof options.body === 'string'
      ? options.body
      : JSON.stringify(options.body);
  }

  const response = await fetch(url.toString(), fetchOptions);

  if (!response.ok) {
    const errorText = await response.text();
    let errorData;
    try {
      errorData = JSON.parse(errorText);
    } catch {
      errorData = { error: errorText };
    }
    throw new Error(errorData.error || errorData.message || `Request failed with status ${response.status}`);
  }

  const contentType = response.headers.get('content-type');
  if (contentType?.includes('application/json')) {
    return await response.json() as T;
  }

  return response as any;
}
