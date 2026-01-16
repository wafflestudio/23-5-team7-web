import { AxiosError } from 'axios';
import { useEffect, useState } from 'react';
import client from '../api/client';
import type { User } from '../types';

interface GoogleCallbackHandlerProps {
  onLoginSuccess: (user: User) => void;
  onNeedSignup: (signupData: {
    email: string;
    social_id: string;
    social_type: string;
  }) => void;
  onError?: (error: string) => void;
}

interface GoogleCallbackResponse {
  message: string;
  needs_signup: boolean;
  access_token?: string;
  refresh_token?: string;
  user?: User;
  email?: string;
  social_id?: string;
  social_type?: string;
}

export default function GoogleCallbackHandler({
  onLoginSuccess,
  onNeedSignup,
  onError,
}: GoogleCallbackHandlerProps) {
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
      onError?.(error);
      setIsProcessing(false);
      return;
    }

    if (!code) {
      onError?.('No authorization code received');
      setIsProcessing(false);
      return;
    }

    handleGoogleCallback(code);
  }, [onError]);

  const handleGoogleCallback = async (authCode: string) => {
    try {
      const response = await client.get<GoogleCallbackResponse>(
        '/api/auth/google/callback',
        {
          params: { code: authCode },
        }
      );

      const data = response.data;

      if (data.needs_signup) {
        // New user - need to set up nickname
        onNeedSignup({
          email: data.email!,
          social_id: data.social_id!,
          social_type: data.social_type!,
        });
      } else {
        // Existing user - login successful
        localStorage.setItem('access_token', data.access_token!);
        if (data.refresh_token) {
          localStorage.setItem('refresh_token', data.refresh_token);
        }
        localStorage.setItem('user', JSON.stringify(data.user));
        onLoginSuccess(data.user!);
        // Clean URL history and redirect to home page
        window.history.replaceState({}, '', '/');
        window.location.href = '/';
      }
    } catch (err: unknown) {
      console.error('Google callback error:', err);
      let errorMessage = 'Google login failed';

      if (err instanceof Error) {
        // Handle axios error
        const axiosErr = err as AxiosError<{
          error_code?: string;
          error_msg?: string;
        }>;
        if (axiosErr.response?.data?.error_code) {
          const errorCode = axiosErr.response.data.error_code;
          const errorMsg = axiosErr.response.data.error_msg;

          if (errorCode === 'ERR_010') {
            errorMessage = '서울대학교 이메일(@snu.ac.kr)로만 가입 가능합니다.';
          } else if (errorCode === 'ERR_006') {
            errorMessage = '이미 존재하는 이메일입니다.';
          } else if (errorCode === 'ERR_019') {
            errorMessage = 'Google 인증에 실패했습니다. 다시 시도해주세요.';
          } else if (errorCode === 'ERR_020') {
            errorMessage = '잘못된 요청입니다. 다시 시도해주세요.';
          } else {
            errorMessage = errorMsg || errorMessage;
          }
        } else {
          errorMessage = err.message;
        }
      }

      onError?.(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isProcessing) {
    return null;
  }

  return (
    <div style={{ padding: '40px', textAlign: 'center' }}>
      <h2>Google 로그인 처리 중...</h2>
      <p>잠시만 기다려주세요.</p>
    </div>
  );
}
