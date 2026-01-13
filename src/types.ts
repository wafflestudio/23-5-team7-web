export interface SignupRequest {
  email: string;
  password?: string;
  nickname: string;
  social_type: "LOCAL" | "GOOGLE" | "KAKAO";
  social_id?: string | null;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface User {
  id: number;
  email: string;
  nickname: string;
}

