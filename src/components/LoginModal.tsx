import { useCallback, useEffect, useState } from 'react';
import { login } from '../api/auth';
import type { LoginResponse } from '../types';

interface Props {
  open: boolean;
  onClose: () => void;
  onLoggedIn: (res: LoginResponse) => void;
}

const LoginModal = ({ open, onClose, onLoggedIn }: Props) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setEmail('');
    setPassword('');
    setError(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!open) {
      reset();
    }
  }, [open, reset]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await login({ email, password });
      // Persist tokens for later usage; in real app, secure storage and refresh flow
      localStorage.setItem('access_token', res.access_token);
      localStorage.setItem('refresh_token', res.refresh_token);
      onLoggedIn(res);
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : '로그인 실패';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <h3>로그인</h3>
        </header>
        <form className="modal-body" onSubmit={submit}>
          <div className="form-row">
            <label htmlFor="login-email">이메일</label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="input"
              placeholder="waffle@snu.ac.kr"
            />
          </div>
          <div className="form-row">
            <label htmlFor="login-password">패스워드</label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="input"
              placeholder="••••••••"
            />
          </div>

          {error && <p className="form-error">{error}</p>}

          <footer className="modal-footer">
            <button type="button" className="button" onClick={handleClose}>
              취소
            </button>
            <button type="submit" className="button primary" disabled={loading}>
              {loading ? '로그인 중…' : '로그인'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
};

export default LoginModal;
