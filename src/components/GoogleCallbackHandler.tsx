import { useEffect, useState } from 'react';
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

export default function GoogleCallbackHandler({
  onLoginSuccess,
  onNeedSignup,
  onError,
}: GoogleCallbackHandlerProps) {
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const error = searchParams.get('error');
    const message = searchParams.get('message');
    const email = searchParams.get('email');
    const socialId = searchParams.get('social_id');
    const socialType = searchParams.get('social_type');

    // Handle errors
    if (error) {
      onError?.(`${error}: ${message || ''}`);
      setIsProcessing(false);
      return;
    }

    // Check if the user already exists in localStorage
    const existingUser = JSON.parse(localStorage.getItem('user') || 'null');
    const needsSignup =
      searchParams.get('needs_signup') === 'true' &&
      !(existingUser && existingUser.email === email);

    if (needsSignup) {
      // Check if the user already exists in localStorage
      const existingUser = JSON.parse(localStorage.getItem('user') || 'null');
      if (existingUser && existingUser.email === email) {
        // Existing user - redirect to MyPage
        onLoginSuccess(existingUser);
        window.location.href = '/mypage';
        return;
      }

      // New user - needs to set nickname
      if (email && socialId && socialType) {
        onNeedSignup({
          email,
          social_id: socialId,
          social_type: socialType,
        });
      } else {
        onError?.('Missing signup information');
      }
    } else {
      // Existing user - login success
      const user: User = {
        email: email || '',
        nickname: JSON.parse(localStorage.getItem('user') || '{}').nickname || '',
        id: 0,
      };

      localStorage.setItem('user', JSON.stringify(user));
      onLoginSuccess(user);

      // Redirect to MyPage
      window.location.href = '/mypage';
    }

    setIsProcessing(false);
  }, [onLoginSuccess, onNeedSignup, onError]);

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
