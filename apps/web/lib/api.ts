export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface ClerkSession {
  getToken: () => Promise<string | null>;
}

declare global {
  interface Window {
    Clerk?: {
      session?: ClerkSession;
    };
  }
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface ErrorResponse {
  error?: string | {
    code?: string;
    message?: string;
    details?: unknown;
  };
  message?: string;
  details?: string;
}

function isErrorResponse(value: unknown): value is ErrorResponse {
  return typeof value === 'object' && value !== null;
}

export async function fetchApi<T = unknown>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');

  if (typeof window !== 'undefined') {
    const clerk = window.Clerk;
    if (clerk && clerk.session) {
      try {
        const token = await clerk.session.getToken();
        if (token) headers.set('Authorization', `Bearer ${token}`);
      } catch {
        console.warn('Failed to get Clerk token', e);
      }
    }
  }

  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    const errorBody = isErrorResponse(data) ? data : null;
    let errorMsg: string;
    // Backend now prefers the unified shape: { error: { message, code } }
    // but still supports the old flat shape: { error: string }
    const nested =
      errorBody && typeof errorBody.error === 'object' && errorBody.error !== null && typeof errorBody.error.message === 'string'
        ? errorBody.error.message
        : undefined;
    const code =
      errorBody && typeof errorBody.error === 'object' && errorBody.error !== null && typeof errorBody.error.code === 'string'
        ? errorBody.error.code
        : undefined;
    const flat = errorBody && typeof errorBody.error === 'string' ? errorBody.error : undefined;
    const fallback =
      errorBody && typeof errorBody.details === 'string' ? errorBody.details : errorBody && typeof errorBody.message === 'string' ? errorBody.message : undefined;
    errorMsg = nested || flat || fallback || 'An unexpected error occurred';
    throw new ApiError(typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg), res.status, code);
  }

  return data as T;
}
