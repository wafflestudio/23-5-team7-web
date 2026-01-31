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
        Authorization: `Bearer ${localStorage.getItem('verification_token')}`,
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
        Authorization: `Bearer ${localStorage.getItem('verification_token')}`,
      },
    }
  );

/* 구글 로그인 */
export const googleLogin = () => {
  // Match upstream behavior: redirect_uri must be the app root, not the current path.
  // IMPORTANT: Google Accounts UI should NOT be served through the Vite /api proxy.
  // If it's proxied, the login page can become non-functional (e.g., "Next" does nothing).
  // So we always navigate the browser directly to the backend origin.
  const backendOrigin =
    import.meta.env.VITE_API_BASE_URL || 'https://server.snutoto.o-r.kr';
  const redirectUri = `${window.location.origin}/`;
  window.location.href =
    backendOrigin +
    `/api/auth/google/login?redirect_uri=${encodeURIComponent(redirectUri)}`;
};
