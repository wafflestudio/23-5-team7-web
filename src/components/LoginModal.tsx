import { AxiosError } from 'axios';
import { useState } from 'react';
import {
  googleLogin,
  login,
  sendVerificationMail,
  confirmVerificationCode,
} from '../api/auth';
import type { User } from '../types';
import './ModalStyles.css'; // Import shared modal styles

interface Props {
  onNeedVerify: () => void;
  onLoginSuccess: (user: User) => void;
  onClose: () => void; // Added onClose prop
}

export default function LoginModal({
  onNeedVerify,
  onLoginSuccess,
  onClose,
}: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerificationSent, setIsVerificationSent] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      alert('이메일과 비밀번호를 모두 입력해주세요');
      return;
    }

    try {
      const res = await login({ email, password });
      localStorage.setItem('access_token', res.data.access_token);
      onLoginSuccess(res.data.user);
    } catch (e) {
      const err = e as AxiosError<{
        error_code?: string;
        verification_token?: string;
        error_msg?: string; // Added this property
      }>;

      if (err.response?.data?.error_code === 'ERR_015') {
        localStorage.setItem(
          'verification_token',
          err.response.data.verification_token!
        );
        setIsVerificationSent(true);
        onNeedVerify();
      } else {
        alert(
          '로그인 실패: ' + (err.response?.data?.error_msg || '알 수 없는 오류')
        );
      }
    }
  };

  const handleSendVerification = async () => {
    try {
      await sendVerificationMail();
      alert('인증 메일이 발송되었습니다. 이메일을 확인해주세요.');
    } catch {
      alert('인증 메일 발송 실패');
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode) {
      alert('인증 코드를 입력해주세요.');
      return;
    }

    setIsVerifying(true);
    try {
      const res = await confirmVerificationCode(verificationCode);
      alert(res.data.message);
      setIsVerificationSent(false);
    } catch {
      alert('인증 코드 확인 실패');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="modal-container">
      <div className="modal">
        <h2>로그인</h2>
        <input
          className="modal-input"
          placeholder="이메일"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="modal-input"
          placeholder="비밀번호"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button className="modal-button" onClick={handleLogin}>로그인</button>
        <button className="modal-button google-login" onClick={googleLogin}>Google 로그인</button>
        {isVerificationSent && (
          <div className="verification-section">
            <h3>이메일 인증</h3>
            <button className="modal-button" onClick={handleSendVerification}>인증 메일 재발송</button>
            <input
              className="modal-input"
              placeholder="인증 코드"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
            />
            <button className="modal-button" onClick={handleVerifyCode} disabled={isVerifying}>
              {isVerifying ? '확인 중...' : '인증 코드 확인'}
            </button>
          </div>
        )}
        <button className="modal-close" onClick={onClose}>닫기</button>
      </div>
    </div>
  );
}
