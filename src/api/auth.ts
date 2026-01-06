import type {
  LoginRequest,
  LoginResponse,
  SendVerificationCodeRequest,
  SendVerificationCodeResponse,
  SignupRequest,
  SignupResponse,
  VerifyCodeRequest,
  VerifyCodeResponse,
} from '../types';
import { request } from './client';

export function sendVerificationCode(payload: SendVerificationCodeRequest) {
  return request<SendVerificationCodeResponse>(
    '/api/users/send-verification-code',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    }
  );
}

export function verifyCode(payload: VerifyCodeRequest) {
  return request<VerifyCodeResponse>('/api/users/verify-code', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function signup(payload: SignupRequest) {
  return request<SignupResponse>('/api/users', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function login(payload: LoginRequest) {
  return request<LoginResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
