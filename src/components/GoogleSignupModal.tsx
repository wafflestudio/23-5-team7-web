import { type AxiosError } from 'axios';
import { useState } from 'react';
import { signup } from '../api/auth';
import type { User } from '../types';

interface Props {
  email: string;
  socialId: string;
  socialType: string;
  // onSignupSuccess will be used in the future for better UX
  onSignupSuccess?: (user: User) => void;
}

export default function GoogleSignupModal({
  email,
  socialId,
  socialType,
}: Props) {
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignup = async () => {
    if (!nickname.trim()) {
      setError('닉네임을 입력해주세요.');
      return;
    }

    if (password.length < 8 || password.length > 20) {
      setError('비밀번호는 8자 이상 20자 이하여야 합니다.');
      return;
    }
    if (password !== password2) {
      setError('비밀번호 확인이 일치하지 않습니다.');
      return;
    }

    if (nickname.trim().length < 2 || nickname.trim().length > 20) {
      setError('닉네임은 2자 이상 20자 이하여야 합니다.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await signup({
        email,
        nickname: nickname.trim(),
        password,
        social_type: socialType as 'LOCAL' | 'GOOGLE' | 'KAKAO',
        social_id: socialId,
      });

      alert('회원가입 완료!');
      window.location.reload();
    } catch (err) {
      const error = err as AxiosError<{
        error_code?: string;
        error_msg?: string;
      }>;
      if (error.response?.data?.error_code === 'ERR_007') {
        setError('이미 사용 중인 닉네임입니다.');
      } else if (error.response?.data?.error_msg) {
        setError(error.response.data.error_msg);
      } else {
        setError('회원가입에 실패했습니다. 다시 시도해주세요.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="modal-header">
        <h2 style={{ margin: 0 }}>구글 회원가입</h2>
      </div>

      <div className="modal-body">
        <p className="page-sub" style={{ marginTop: 0 }}>
          구글 계정으로 가입하시려면 닉네임과 비밀번호를 설정해주세요.
        </p>

        <div className="form-row" style={{ marginTop: 16 }}>
          <label htmlFor="google-signup-email">이메일</label>
          <input
            id="google-signup-email"
            className="input"
            value={email}
            disabled
            style={{ backgroundColor: '#f3f4f6', cursor: 'not-allowed' }}
          />
        </div>

        <div className="form-row">
          <label htmlFor="google-signup-nickname">닉네임</label>
          <input
            id="google-signup-nickname"
            className="input"
            placeholder="닉네임 (2-20자)"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            autoFocus
          />
        </div>

        <div className="form-row">
          <label htmlFor="google-signup-password">비밀번호</label>
          <input
            id="google-signup-password"
            className="input"
            placeholder="비밀번호 (8-20자)"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <div className="form-row">
          <label htmlFor="google-signup-password2">비밀번호 확인</label>
          <input
            id="google-signup-password2"
            className="input"
            placeholder="비밀번호 재입력"
            type="password"
            autoComplete="new-password"
            value={password2}
            onChange={(e) => setPassword2(e.target.value)}
          />
        </div>

        {error && <p className="form-error">{error}</p>}

        <div className="modal-footer">
          <button
            className="button primary"
            onClick={handleSignup}
            disabled={loading}
            type="button"
          >
            {loading ? '가입 중...' : '회원가입 완료'}
          </button>
        </div>
      </div>
    </div>
  );
}
