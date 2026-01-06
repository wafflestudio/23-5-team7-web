export type UUID = string;

export type EventStatus = 'READY' | 'OPEN' | 'CLOSED' | 'SETTLED' | 'CANCELLED';

export interface TotoEvent {
  event_id: UUID;
  creator_id: UUID;
  title: string;
  description: string;
  status: EventStatus;
  close_time: string; // ISO datetime string
  created_at: string; // ISO datetime string
}

// Auth & User types for step 2
type UserRole = 'USER' | 'ADMIN';

export interface User {
  user_id: UUID;
  email: string;
  points: number; // default 10000
  role: UserRole;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  user: Pick<User, 'user_id' | 'points'>;
}

export interface SendVerificationCodeRequest {
  email: string;
}

export interface SendVerificationCodeResponse {
  message: string; // "인증 코드가 전송되었습니다."
}

export interface VerifyCodeRequest {
  email: string;
  code: string;
}

export interface VerifyCodeResponse {
  verification_token: string;
}

export interface SignupRequest {
  email: string;
  password: string;
  nickname: string;
  verification_token: string;
}

export interface SignupResponse extends User {}
