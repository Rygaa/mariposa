interface TRPCResponse<T> {
  result: {
    data: T;
  };
}

function isTRPCResponse<T>(obj: unknown): obj is TRPCResponse<T> {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'result' in obj &&
    typeof obj.result === 'object' &&
    obj.result !== null &&
    'data' in obj.result
  );
}

export async function makeRequest<T>(
  method: string,
  path: string,
  baseUrl: string,
  apiKey: string,
  options?: {
    body?: unknown;
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
    const json: unknown = await response.json();
    // tRPC wraps responses in { result: { data: ... } }
    if (isTRPCResponse<T>(json)) {
      return json.result.data;
    }
    throw new Error('Invalid response format: expected tRPC response structure');
  }

  throw new Error('Invalid response: expected JSON content-type');
}
