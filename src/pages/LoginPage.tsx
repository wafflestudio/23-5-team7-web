import { useState } from 'react';
import LoginModal from '../components/LoginModal';
import type { User } from '../types';

export default function LoginPage() {
  const [isVerificationSent, setIsVerificationSent] = useState(false);

  const handleLoginSuccess = (user: User) => {
    localStorage.setItem('user', JSON.stringify(user));
    alert('로그인 성공!');
    window.location.href = '/'; // Redirect to the main page
  };

  return (
    <div>
      <h1>로그인</h1>
      <LoginModal
        onClose={() => (window.location.href = '/')}
        onNeedVerify={() => setIsVerificationSent(true)}
        onLoginSuccess={handleLoginSuccess}
      />
      {isVerificationSent && <p>이메일 인증이 필요합니다. 이메일을 확인해주세요.</p>}
    </div>
  );
}