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
          <button className="button primary" onClick={handleSignup} type="button">
            회원가입
          </button>
        </div>
      </div>
    </div>
  );
}
