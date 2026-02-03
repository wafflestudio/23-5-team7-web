import { AxiosError } from 'axios';
import { useState } from 'react';
import { login } from '../api/auth';
import type { User } from '../types';

interface Props {
  onNeedVerify: () => void;
  onLoginSuccess: (user: User) => void;
}

export default function LoginModal({ onNeedVerify, onLoginSuccess }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    try {
      const res = await login({ email, password });
      localStorage.setItem('access_token', res.data.access_token);
      onLoginSuccess(res.data.user);
      alert('로그인 성공');
    } catch (e) {
      const err = e as AxiosError<{
        error_code?: string;
        verification_token?: string;
      }>;

      if (err.response?.data?.error_code === 'ERR_015') {
        localStorage.setItem(
          'verification_token',
          err.response.data.verification_token!
        );
        onNeedVerify();
      } else {
        alert('로그인 실패');
      }
    }
  };

  return (
    <div>
      <div className="modal-header">
        <h2 style={{ margin: 0 }}>로그인</h2>
      </div>

      <div className="modal-body">
        <div className="form-row">
          <label htmlFor="login-email">이메일</label>
          <input
            id="login-email"
            className="input"
            placeholder="example@snu.ac.kr"
            autoComplete="email"
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="form-row">
          <label htmlFor="login-password">비밀번호</label>
          <input
            id="login-password"
            className="input"
            placeholder="비밀번호"
            type="password"
            autoComplete="current-password"
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <div className="modal-footer">
          <button
            className="button google"
            type="button"
            onClick={() => {
              // Redirect to Google OAuth login
              // Use full backend URL to bypass Vite proxy for OAuth flow
              const backendUrl =
                import.meta.env.VITE_API_BASE_URL ||
                'https://server.snutoto.o-r.kr';
              window.location.href = `${backendUrl}/api/auth/google/login`;
            }}
          >
            Google 로그인
          </button>
          <button
            className="button primary"
            onClick={handleLogin}
            type="button"
          >
            로그인
          </button>
        </div>
      </div>
    </div>
  );
}
