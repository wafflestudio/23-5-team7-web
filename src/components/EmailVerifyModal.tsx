import { useState } from 'react';
import { confirmVerificationCode, sendVerificationMail } from '../api/auth';

export default function EmailVerifyModal() {
  const [code, setCode] = useState('');

  return (
    <div>
      <h2>스누메일 인증</h2>

      <button onClick={sendVerificationMail}>인증번호 발송</button>

      <input
        placeholder="6자리 코드"
        onChange={(e) => setCode(e.target.value)}
      />

      <button
        onClick={async () => {
          await confirmVerificationCode(code);
          alert('인증 완료. 다시 로그인하세요.');
        }}
      >
        인증 확인
      </button>
    </div>
  );
}
