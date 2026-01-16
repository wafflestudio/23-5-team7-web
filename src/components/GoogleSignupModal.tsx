import { useState } from 'react';
import { signup } from '../api/auth';
import type { User } from '../types';

interface GoogleSignupModalProps {
  email: string;
  social_id: string;
  social_type: string;
  onSignupSuccess: (user: User) => void;
  onError?: (error: string) => void;
}

export default function GoogleSignupModal({
  email,
  social_id,
  social_type,
  onSignupSuccess,
  onError,
}: GoogleSignupModalProps) {
  const [nickname, setNickname] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSignup = async () => {
    if (!nickname.trim()) {
      onError?.('닉네임을 입력해주세요');
      return;
    }

    setIsLoading(true);
    try {
      const response = await signup({
        email,
        nickname: nickname.trim(),
        social_type: social_type as 'GOOGLE' | 'KAKAO',
        social_id,
      });

      localStorage.setItem('access_token', response.data.access_token);
      if (response.data.refresh_token) {
        localStorage.setItem('refresh_token', response.data.refresh_token);
      }
      localStorage.setItem('user', JSON.stringify(response.data.user));
      onSignupSuccess(response.data.user);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Sign up failed';
      onError?.(errorMessage);
      console.error('Google signup error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <h2>스누토토 회원가입</h2>
      <p style={{ color: '#666', marginBottom: '20px' }}>
        Google 계정으로 가입하시겠습니다.
      </p>

      <div style={{ marginBottom: '12px' }}>
        <label
          style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}
        >
          이메일
        </label>
        <input
          type="email"
          value={email}
          disabled
          placeholder="이메일"
          style={{
            width: '100%',
            padding: '10px',
            borderRadius: '4px',
            border: '1px solid #ddd',
            backgroundColor: '#f5f5f5',
            boxSizing: 'border-box',
          }}
        />
        <p style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
          @snu.ac.kr 이메일로만 가입 가능합니다.
        </p>
      </div>

      <div style={{ marginBottom: '12px' }}>
        <label
          style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}
        >
          닉네임
        </label>
        <input
          type="text"
          placeholder="닉네임 입력"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          disabled={isLoading}
          style={{
            width: '100%',
            padding: '10px',
            borderRadius: '4px',
            border: '1px solid #ddd',
            boxSizing: 'border-box',
          }}
        />
      </div>

      <button
        onClick={handleSignup}
        disabled={isLoading || !nickname.trim()}
        style={{
          width: '100%',
          padding: '10px',
          backgroundColor: isLoading ? '#ccc' : '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: isLoading ? 'not-allowed' : 'pointer',
          marginTop: '20px',
        }}
      >
        {isLoading ? '가입 중...' : '회원가입 완료'}
      </button>
    </div>
  );
}
