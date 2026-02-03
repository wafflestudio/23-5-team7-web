import { useState } from 'react';
import { confirmVerificationCode, sendVerificationMail } from '../api/auth';

export default function EmailVerifyModal() {
  const [code, setCode] = useState('');

  return (
    <div>
      <div className="modal-header">
        <h2 style={{ margin: 0 }}>스누메일 인증</h2>
      </div>

      <div className="modal-body">
        <p className="page-sub" style={{ marginTop: 0 }}>
          가입한 이메일로 받은 6자리 코드를 입력하세요.
        </p>

        <div className="modal-footer" style={{ justifyContent: 'flex-start' }}>
          <button
            className="button"
            onClick={sendVerificationMail}
            type="button"
          >
            인증번호 발송 / 재전송
          </button>
        </div>

        <div className="form-row" style={{ marginTop: 12 }}>
          <label htmlFor="verify-code">6자리 코드</label>
          <input
            id="verify-code"
            className="input"
            placeholder="123456"
            inputMode="numeric"
            onChange={(e) => setCode(e.target.value)}
          />
        </div>

        <div className="modal-footer">
          <button
            className="button primary"
            type="button"
            onClick={async () => {
              await confirmVerificationCode(code);
              alert('인증 완료. 다시 로그인하세요.');
            }}
          >
            인증 확인
          </button>
        </div>
      </div>
    </div>
  );
}
