const BASE_URL = ''; // Use relative paths; configure proxy in vite if needed

class ApiError extends Error {
  status: number;
  body?: unknown;
  constructor(message: string, status: number, body?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

export async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
    ...options,
  });

  const isJson = (res.headers.get('content-type') ?? '').includes(
    'application/json'
  );
  const body = isJson ? await res.json() : await res.text();
  if (!res.ok) {
    throw new ApiError(`Request failed: ${res.status}`, res.status, body);
  }
  return body as T;
}
