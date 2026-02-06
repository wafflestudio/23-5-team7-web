import { AxiosError } from 'axios';
import { useMemo, useState } from 'react';
import { signup } from '../api/auth';

interface Props {
  onSignupSuccess?: () => void;
  onNeedVerify?: () => void;
}

export default function SignupModal({ onSignupSuccess, onNeedVerify }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    if (loading) return false;
    if (!email.trim()) return false;
    if (!nickname.trim()) return false;
    if (!password) return false;
    // Mirror README constraints (keep it simple)
    if (nickname.trim().length < 2 || nickname.trim().length > 20) return false;
    if (password.length < 8 || password.length > 20) return false;
    // SNU mail only (basic check; backend validates)
    if (!/@snu\.ac\.kr\s*$/i.test(email.trim())) return false;
    return true;
  }, [email, password, nickname, loading]);

  const handleSignup = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    setInfo(null);
    try {
      const res = await signup({
        email,
        password,
        nickname,
        social_type: 'LOCAL',
        social_id: null,
      });
      // Store verification token to be used by EmailVerifyModal
      const token = (res.data as { verification_token?: string })
        ?.verification_token;
      if (token) localStorage.setItem('verification_token', token);
      setInfo(
        '회원가입 완료! 15분 안에 스누메일 인증을 완료해야 로그인할 수 있어요.'
      );
      onSignupSuccess?.();
      onNeedVerify?.();
    } catch (e) {
      const err = e as AxiosError<{ error_code?: string; error_msg?: string }>;
      const code = err.response?.data?.error_code;
      if (code === 'ERR_006') {
        setError('이미 가입된 이메일입니다.');
      } else if (code === 'ERR_007') {
        setError('이미 사용 중인 닉네임입니다.');
      } else if (code === 'ERR_010') {
        setError('@snu.ac.kr 이메일만 가입할 수 있어요.');
      } else if (err.response?.data?.error_msg) {
        setError(err.response.data.error_msg);
      } else {
        setError('회원가입에 실패했습니다. 입력값을 확인해주세요.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="modal-header">
        <h2 style={{ margin: 0 }}>회원가입</h2>
      </div>

      <div className="modal-body">
        <div className="form-row">
          <label htmlFor="signup-email">이메일</label>
          <input
            id="signup-email"
            className="input"
            placeholder="example@snu.ac.kr"
            autoComplete="email"
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="form-row">
          <label htmlFor="signup-password">비밀번호</label>
          <input
            id="signup-password"
            className="input"
            placeholder="비밀번호"
            type="password"
            autoComplete="new-password"
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <div className="form-row">
          <label htmlFor="signup-nickname">닉네임</label>
          <input
            id="signup-nickname"
            className="input"
            placeholder="닉네임"
            autoComplete="nickname"
            onChange={(e) => setNickname(e.target.value)}
          />
        </div>

        <div className="modal-footer">
          <button
            className="button primary"
            onClick={handleSignup}
            type="button"
            disabled={!canSubmit}
          >
            {loading ? '가입 중…' : '회원가입'}
          </button>
        </div>

        {error ? <p className="form-error">{error}</p> : null}
        {info ? <p className="form-info">{info}</p> : null}
      </div>
    </div>
  );
}
