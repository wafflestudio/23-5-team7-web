import { LoginRequest, SignupRequest } from '../types';
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
  window.location.href =
    import.meta.env.VITE_API_BASE_URL + '/api/auth/google/login';
};
