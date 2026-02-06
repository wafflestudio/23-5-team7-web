import type { LoginRequest, SignupRequest } from '../types';
import client from './client';

/* 일반 회원가입 */
export const signup = (data: SignupRequest) => client.post('/api/users', data);

/* 일반 로그인 */
export const login = (data: LoginRequest) =>
  client.post('/api/auth/login', data);

/* 인증메일 발송 */
export const sendVerificationMail = () =>
  client.post(
    '/api/auth/verify-email/send',
    {},
    {
      headers: {
        // Backend expects a short-lived verification token (not access_token).
        // Prefer a dedicated header; keep Authorization fallback for compatibility.
        'x-verification-token':
          localStorage.getItem('verification_token') || '',
        ...(localStorage.getItem('verification_token')
          ? {
              Authorization: `Bearer ${localStorage.getItem('verification_token')}`,
            }
          : {}),
      },
    }
  );

/* 인증코드 확인 */
export const confirmVerificationCode = (code: string) =>
  client.post(
    '/api/auth/verify-email/confirm',
    { code },
    {
      headers: {
        'x-verification-token':
          localStorage.getItem('verification_token') || '',
        ...(localStorage.getItem('verification_token')
          ? {
              Authorization: `Bearer ${localStorage.getItem('verification_token')}`,
            }
          : {}),
      },
    }
  );

/* 토큰 갱신 (쿠키 refresh_token 사용) */
export const refresh = () => client.post('/api/auth/refresh');
