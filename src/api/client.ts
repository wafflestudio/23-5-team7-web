import axios, { type InternalAxiosRequestConfig } from 'axios';
// In dev, use the Vite proxy (see vite.config.ts) by sending requests to /api on the same origin.
// In production, you can set VITE_API_BASE_URL to an absolute backend origin.
export const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
});

client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default client;

// Fetch-based API helper used by some newer modules.
export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('access_token');
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;

  // If BASE_URL is empty, default to Vite proxy path so requests reliably hit /api.
  // This avoids accidentally fetching relative URLs like "api/events" from the wrong base.
  const url = `${BASE_URL || ''}${path.startsWith('/') ? path : `/${path}`}`;

  const headers: Record<string, string> = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  // Merge caller headers (only stringable values)
  if (options.headers) {
    if (options.headers instanceof Headers) {
      options.headers.forEach((v, k) => {
        headers[k] = v;
      });
    } else if (Array.isArray(options.headers)) {
      for (const [k, v] of options.headers) headers[k] = String(v);
    } else {
      for (const [k, v] of Object.entries(options.headers)) {
        if (v === undefined) continue;
        headers[k] = String(v);
      }
    }
  }

  if ((import.meta as any).env?.DEV) {
    // Helpful when debugging request routing / payload issues.
    const method = options.method || 'GET';
    const extra = isFormData
      ? {
          form_keys: Array.from((options.body as FormData).keys()),
          has_data: (options.body as FormData).has('data'),
        }
      : undefined;
    console.debug('[request]', method, url, extra);
  }

  const res = await fetch(url, {
    headers,
    ...options,
  });

  const isJson = (res.headers.get('content-type') ?? '').includes('application/json');
  const body = isJson ? await res.json() : await res.text();
  if (!res.ok) {
    const message = mapErrorMessage(res.status, body);
    throw new ApiError(message, res.status, body);
  }
  return body as T;
}

function mapErrorMessage(status: number, body: unknown): string {
  const { code, msg } = extractCodeAndMessage(body);

  // Step 2 failure mappings from README
  if (status === 400 && code === 'ERR_001') return '필수 요청 필드가 누락되었습니다.';
  if (status === 400 && code === 'ERR_003') return 'Authorization 헤더 형식이 잘못되었습니다.';
  // Auth/login: ERR_014 is used for invalid credentials (401)
  if (status === 401 && code === 'ERR_014') return '이메일 또는 비밀번호가 올바르지 않습니다.';
  if (status === 401 && code === 'ERR_004') return '로그인이 필요합니다.';
  if (status === 401 && code === 'ERR_005') return '로그인이 만료되었습니다. 다시 로그인해주세요.';
  if (status === 403 && code === 'ERR_015') {
    return '이메일 인증이 필요합니다. SNU 메일 인증을 완료한 뒤 다시 로그인하세요.';
  }

  // Step 3 failure mappings
  if (status === 400 && code === 'ERR_002') return '입력 형식이 올바르지 않습니다.';
  if (status === 409 && code === 'ERR_008') return '옵션 이름이 중복되었습니다. 각각 고유해야 합니다.';
  if (status === 404 && code === 'ERR_010') return '이벤트를 찾을 수 없습니다.';

  // Bets (3-1)
  if (status === 400 && code === 'ERR_011') return '잔액이 부족합니다.';
  if (status === 404 && code === 'ERR_009') return '이벤트를 찾을 수 없습니다.';
  if (status === 404 && code === 'ERR_012') return '선택한 옵션을 찾을 수 없습니다.';
  if (status === 409 && code === 'ERR_013') return '이벤트가 OPEN 상태가 아닙니다. (베팅 불가)';
  if (status === 409 && code === 'ERR_014') return '이미 해당 이벤트에 베팅했습니다.';

  if (typeof msg === 'string' && msg.trim().length > 0) return msg;
  if (typeof body === 'string' && body.trim().length > 0) return body;
  return `요청이 실패했습니다 (HTTP ${status})`;
}

function extractCodeAndMessage(body: unknown): { code?: string; msg?: string } {
  if (typeof body === 'string') return { msg: body };
  if (body && typeof body === 'object') {
    const obj = body as Record<string, unknown>;
    const code =
      (obj.ERROR_CODE as string | undefined) ??
      (obj.error_code as string | undefined) ??
      (obj.code as string | undefined);
    const msg =
      (obj.ERROR_MSG as string | undefined) ??
      (obj.error_msg as string | undefined) ??
      (obj.message as string | undefined);
    return { code, msg };
  }
  return {};
}
