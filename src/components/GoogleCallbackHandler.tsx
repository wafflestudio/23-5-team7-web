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
    const needsSignup = searchParams.get('needs_signup') === 'true';
    const email = searchParams.get('email');
    const socialId = searchParams.get('social_id');
    const socialType = searchParams.get('social_type');

    // 에러 처리
    if (error) {
      onError?.(`${error}: ${message || ''}`);
      setIsProcessing(false);
      return;
    }


    if (needsSignup) {
      // 새 사용자 - 닉네임 설정 필요
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
      // 기존 사용자 - 로그인 성공
      // 토큰은 백엔드에서 쿠키로 설정됨
      // 클라이언트에서 할 일: 로컬스토리지에 기본 사용자 정보 저장
      const user: User = {
        email: email || '',
        nickname: '',
        id: 0,
      };

      localStorage.setItem('user', JSON.stringify(user));
      onLoginSuccess(user);
      // URL 히스토리 정리 후 홈으로 리다이렉트
      window.history.replaceState({}, '', '/');
      window.location.href = '/';
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
