import { useState } from 'react';
import { signup } from '../api/auth';

export default function SignupModal() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');

  const handleSignup = async () => {
    try {
      await signup({
        email,
        password,
        nickname,
        social_type: 'LOCAL',
        social_id: null,
      });
      alert('회원가입 성공. 로그인하세요.');
    } catch {
      alert('회원가입 실패');
    }
  };

  return (
    <div>
      <h2>회원가입</h2>
      <input placeholder="이메일" onChange={(e) => setEmail(e.target.value)} />
      <input
        placeholder="비밀번호"
        type="password"
        onChange={(e) => setPassword(e.target.value)}
      />
      <input
        placeholder="닉네임"
        onChange={(e) => setNickname(e.target.value)}
      />
      <button onClick={handleSignup}>회원가입</button>
    </div>
  );
}
