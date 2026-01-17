import { useState } from 'react';
import { googleLogin, signup } from '../api/auth';

interface Props {
  data: {
    email: string;
    social_id: string;
    social_type: 'GOOGLE';
  };
}

export default function GoogleSignupModal({ data }: Props) {
  const [nickname, setNickname] = useState('');

  const handleSignup = async () => {
    try {
      await signup({
        email: data.email,
        social_id: data.social_id,
        social_type: data.social_type,
        nickname,
      });

      // 가입 후에는 토큰이 없으므로, 다시 소셜 로그인을 통해 쿠키를 발급받아야 합니다.
      googleLogin();
    } catch {
      alert('회원가입 실패');
    }
  };

  return (
    <div>
      <h2>닉네임 설정</h2>
      <p>{data.email}</p>
      <input
        placeholder="닉네임"
        value={nickname}
        onChange={(e) => setNickname(e.target.value)}
      />
      <button onClick={handleSignup}>가입 완료</button>
    </div>
  );
}
