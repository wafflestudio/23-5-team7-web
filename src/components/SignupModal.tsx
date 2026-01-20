import { useState } from 'react';
import { signup } from '../api/auth';
import { AxiosError } from 'axios'; // Import AxiosError
import './ModalStyles.css'; // Import shared modal styles

interface Props {
  onClose: () => void; // Added onClose prop
}

export default function SignupModal({ onClose }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const validateFields = () => {
    if (!email.endsWith('@snu.ac.kr')) {
      alert('이메일은 @snu.ac.kr 도메인만 허용됩니다.');
      return false;
    }
    if (password.length < 8 || password.length > 20) {
      alert('비밀번호는 8자 이상 20자 이하로 입력해주세요.');
      return false;
    }
    if (nickname.length < 2 || nickname.length > 20) {
      alert('닉네임은 2자 이상 20자 이하로 입력해주세요.');
      return false;
    }
    return true;
  };

  const handleSignup = async () => {
    if (!validateFields()) return;

    setIsLoading(true);
    try {
      await signup({
        email,
        password,
        nickname,
        social_type: 'LOCAL',
        social_id: null,
      });
      alert('회원가입 성공. 로그인하세요.');
    } catch (err) {
      const error = err as AxiosError<{ error_msg?: string }>; // Cast to AxiosError
      alert('회원가입 실패: ' + (error.response?.data?.error_msg || '알 수 없는 오류'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal-container">
      <div className="modal">
        <h2>회원가입</h2>
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
        <input
          className="modal-input"
          placeholder="닉네임"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
        />
        <button className="modal-button" onClick={handleSignup} disabled={isLoading}>
          {isLoading ? '가입 중...' : '회원가입'}
        </button>
        <button className="modal-close" onClick={onClose}>닫기</button>
      </div>
    </div>
  );
}
