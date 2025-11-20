import * as https from 'https';
import * as http from 'http';
import { URL } from 'url';
import FormData from 'form-data';

export async function makeRequest<T>(
  method: string,
  path: string,
  baseUrl: string,
  apiKey: string,
  options: {
    body?: any;
    headers?: Record<string, string>;
    binary?: boolean;
    skipAuth?: boolean;
    includeHeaders?: boolean;
  } = {}
): Promise<T> {
  const url = new URL(path, baseUrl);
  const isHttps = url.protocol === 'https:';
  const lib = isHttps ? https : http;

  return new Promise((resolve, reject) => {
    const headers: Record<string, string> = {
      ...options.headers,
    };

    if (!options.skipAuth) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    if (options.body && !(options.body instanceof FormData)) {
      if (typeof options.body === 'string') {
        headers['Content-Length'] = Buffer.byteLength(options.body).toString();
      }
    }

    const reqOptions: http.RequestOptions = {
      method,
      headers,
    };

    const req = lib.request(url, reqOptions, (res) => {
      const chunks: Buffer[] = [];

      res.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });

      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        const responseText = buffer.toString();

        if (res.statusCode && res.statusCode >= 400) {
          const errorBody = JSON.parse(responseText);
          const fullError = new Error(errorBody.error || errorBody.message || `HTTP ${res.statusCode}`);
          (fullError as any).statusCode = res.statusCode;
          (fullError as any).responseBody = errorBody;
          reject(fullError);
          return;
        }

        if (options.binary) {
          const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
          
          if (options.includeHeaders) {
            const result = {
              data: arrayBuffer,
              headers: {
                contentType: res.headers['content-type'] || '',
                contentLength: parseInt(res.headers['content-length'] || '0', 10),
                contentDisposition: res.headers['content-disposition'] || '',
                etag: res.headers['etag'],
                cacheControl: res.headers['cache-control'],
                cfCacheTag: res.headers['cf-cache-tag'],
              }
            };
            resolve(result as T);
          } else {
            resolve(arrayBuffer as T);
          }
        } else {
          const data = JSON.parse(responseText);
          resolve(data as T);
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (options.body) {
      if (options.body instanceof FormData) {
        options.body.pipe(req);
      } else {
        req.write(options.body);
        req.end();
      }
    } else {
      req.end();
    }
  });
}
