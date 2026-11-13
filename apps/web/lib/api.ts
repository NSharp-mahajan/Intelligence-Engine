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

async function resolveClerkToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null;

  const clerk = window.Clerk;
  if (!clerk) return null;

  // Fast path: session is already available
  if (clerk.session) {
    try {
      const token = await clerk.session.getToken();
      if (token) return token;
    } catch {
      // Fall through to bounded retry
    }
  }

  // Bounded poll for session hydration (up to 4 checks x 100ms = 400ms max)
  // Avoids firing unauthenticated requests during immediate post-login hydration
  for (let i = 0; i < 4; i++) {
    await new Promise((resolve) => setTimeout(resolve, 100));
    const activeClerk = window.Clerk;
    if (activeClerk?.session) {
      try {
        const token = await activeClerk.session.getToken();
        if (token) return token;
      } catch {
        return null;
      }
    }
  }

  return null;
}

export async function fetchApi<T = unknown>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (typeof window !== 'undefined' && !headers.has('Authorization')) {
    const token = await resolveClerkToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  const res = await fetch(`${API_URL}${endpoint}`, {
    cache: 'no-store',
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
    const errorMsg = nested || flat || fallback || 'An unexpected error occurred';
    throw new ApiError(typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg), res.status, code);
  }

  return data as T;
}
