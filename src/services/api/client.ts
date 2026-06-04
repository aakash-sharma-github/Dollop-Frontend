import { tokenStorage } from '@services/auth/tokenStorage';

const API_BASE_URL = process.env['EXPO_PUBLIC_API_BASE_URL'] ?? 'http://localhost:4000/api/v1';

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
  authenticated?: boolean;
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, headers: extra = {}, authenticated = true } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...extra,
  };

  if (authenticated) {
    const token = await tokenStorage.getAccessToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const json = await response.json() as { success: boolean; data?: T; error?: { code: string; message: string; details?: unknown } };

  if (!response.ok || !json.success) {
    throw new ApiError(
      json.error?.code ?? 'UNKNOWN_ERROR',
      json.error?.message ?? 'An unknown error occurred',
      response.status,
      json.error?.details,
    );
  }

  return json.data as T;
}

export const apiClient = {
  get: <T>(endpoint: string, opts?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(endpoint, { ...opts, method: 'GET' }),
  post: <T>(endpoint: string, body?: unknown, opts?: Omit<RequestOptions, 'method'>) =>
    request<T>(endpoint, { ...opts, method: 'POST', body }),
  patch: <T>(endpoint: string, body?: unknown, opts?: Omit<RequestOptions, 'method'>) =>
    request<T>(endpoint, { ...opts, method: 'PATCH', body }),
  delete: <T>(endpoint: string, opts?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(endpoint, { ...opts, method: 'DELETE' }),
};
