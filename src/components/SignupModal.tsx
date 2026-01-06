import { useCallback, useEffect, useState } from 'react';
import { sendVerificationCode, signup, verifyCode } from '../api/auth';
import type { SignupResponse, VerifyCodeResponse } from '../types';

interface Props {
  open: boolean;
  onClose: () => void;
  onSignedUp: (user: SignupResponse) => void;
}

const SignupModal = ({ open, onClose, onSignedUp }: Props) => {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [verification, setVerification] = useState<VerifyCodeResponse | null>(
    null
  );
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const sendCode = async () => {
    setError(null);
    setMessage(null);
    try {
      const res = await sendVerificationCode({ email });
      setMessage(res.message);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '코드 발송 실패';
      setError(msg);
    }
  };

  const verify = async () => {
    setError(null);
    setMessage(null);
    try {
      const res = await verifyCode({ email, code });
      setVerification(res);
      setMessage('인증 완료되었습니다.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : '인증 실패';
      setError(msg);
    }
  };

  const submitSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verification?.verification_token) {
      setError('이메일 인증을 먼저 완료해주세요');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const user = await signup({
        email,
        password,
        nickname,
        verification_token: verification.verification_token,
      });
      onSignedUp(user);
      handleClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : '회원가입 실패';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const reset = useCallback(() => {
    setEmail('');
    setCode('');
    setVerification(null);
    setNickname('');
    setPassword('');
    setLoading(false);
    setError(null);
    setMessage(null);
  }, []);

  useEffect(() => {
    if (!open) {
      reset();
    }
  }, [open, reset]);

  const handleClose = () => {
    reset();
    onClose();
  };

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <h3>회원가입</h3>
        </header>
        <form className="modal-body" onSubmit={submitSignup}>
          <div className="form-row">
            <label htmlFor="signup-email">이메일</label>
            <div className="inline-row">
              <input
                id="signup-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="input"
                placeholder="waffle@snu.ac.kr"
              />
              <button type="button" className="button ghost" onClick={sendCode}>
                인증 코드 발송
              </button>
            </div>
          </div>

          <div className="form-row">
            <label htmlFor="signup-code">인증 코드</label>
            <div className="inline-row">
              <input
                id="signup-code"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="input"
                placeholder="123456"
              />
              <button type="button" className="button" onClick={verify}>
                코드 확인
              </button>
            </div>
          </div>

          <div className="form-row">
            <label htmlFor="signup-nickname">닉네임</label>
            <input
              id="signup-nickname"
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              required
              className="input"
              placeholder="토토왕"
            />
          </div>

          <div className="form-row">
            <label htmlFor="signup-password">패스워드</label>
            <input
              id="signup-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="input"
              placeholder="••••••••"
            />
          </div>

          {message && <p className="form-info">{message}</p>}
          {error && <p className="form-error">{error}</p>}

          <footer className="modal-footer">
            <button type="button" className="button" onClick={handleClose}>
              취소
            </button>
            <button type="submit" className="button primary" disabled={loading}>
              {loading ? '가입 중…' : '회원가입'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
};

export default SignupModal;
