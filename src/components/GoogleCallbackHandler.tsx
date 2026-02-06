import { useEffect } from 'react';
import type { User } from '../types';

interface Props {
  onLoginSuccess: (user: User) => void;
  onNeedSignup: (data: {
    email: string;
    social_id: string;
    social_type: string;
  }) => void;
  onNeedVerify?: () => void;
  onError: (message: string) => void;
}

export default function GoogleCallbackHandler({
  onLoginSuccess,
  onNeedSignup,
  onNeedVerify,
  onError,
}: Props) {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const needsSignup = params.get('needs_signup');
    const message = params.get('message');
    const error = params.get('error');
    const errorMsg = params.get('message');

    // Handle error case
    if (error) {
      // If backend returns a verification token, users need to verify before logging in.
      const code = params.get('error_code');
      const verificationToken = params.get('verification_token');
      if (code === 'ERR_015' || verificationToken) {
        if (verificationToken) {
          localStorage.setItem('verification_token', verificationToken);
        }
        onNeedVerify?.();
      } else {
        onError(errorMsg || '구글 로그인에 실패했습니다.');
      }
      // Clear query params
      window.history.replaceState({}, '', window.location.pathname);
      return;
    }

    // Handle signup needed case
    if (needsSignup === 'true') {
      const email = params.get('email');
      const socialId = params.get('social_id');
      const socialType = params.get('social_type');

      if (email && socialId && socialType) {
        onNeedSignup({ email, social_id: socialId, social_type: socialType });
        // Clear query params
        window.history.replaceState({}, '', window.location.pathname);
      } else {
        onError('구글 로그인 정보가 불완전합니다.');
        window.history.replaceState({}, '', window.location.pathname);
      }
      return;
    }

    // Handle login success case
    if (needsSignup === 'false' && message) {
      // User is logged in via cookie (access_token is in HttpOnly cookie)
      // We need to fetch user info using the cookie
      fetchUserInfo()
        .then((user) => {
          if (user) {
            // For Google login, we don't have access_token in localStorage
            // but it's in HttpOnly cookie, so we set a flag to indicate we're logged in
            localStorage.setItem('auth_method', 'google');
            onLoginSuccess(user);
            alert('구글 로그인 성공!');
          } else {
            onError('사용자 정보를 불러오는데 실패했습니다.');
          }
        })
        .catch(() => {
          onError('사용자 정보를 불러오는데 실패했습니다.');
        })
        .finally(() => {
          // Clear query params
          window.history.replaceState({}, '', window.location.pathname);
        });
    }
  }, [onLoginSuccess, onNeedSignup, onNeedVerify, onError]);

  return (
    <div style={{ padding: '40px', textAlign: 'center' }}>
      <p>구글 로그인 처리 중...</p>
    </div>
  );
}

async function fetchUserInfo(): Promise<User | null> {
  try {
    // Try to get user info from /api/users/me/profile endpoint
    const response = await fetch('/api/users/me/profile', {
      credentials: 'include', // Include cookies
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    // Store access token in localStorage if it's in cookies
    // The backend sets HttpOnly cookies, but we might need to extract it for axios
    // For now, we'll rely on the cookie-based authentication

    return {
      id: data.user_id,
      email: data.email,
      nickname: data.nickname,
    };
  } catch (error) {
    console.error('Failed to fetch user info:', error);
    return null;
  }
}
