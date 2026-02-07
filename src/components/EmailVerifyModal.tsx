import { AxiosError } from 'axios';
import { useMemo, useState } from 'react';
import { confirmVerificationCode, sendVerificationMail } from '../api/auth';

export default function EmailVerifyModal({
  onSuccess,
}: {
  onSuccess?: () => void;
}) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    if (loading) return false;
    const c = code.trim();
    if (!/^\d{6}$/.test(c)) return false;
    return true;
  }, [code, loading]);

  return (
    <div>
      <div className="modal-header">
        <h2 style={{ margin: 0 }}>스누메일 인증</h2>
      </div>

      <div className="modal-body">
        <p className="page-sub" style={{ marginTop: 0 }}>
          가입한 이메일로 받은 6자리 코드를 입력하세요.
        </p>
        <p className="page-sub" style={{ marginTop: 0 }}>
          인증 토큰은 15분 후 만료돼요. 만료됐다면 다시 로그인 시도 후 인증을
          진행해주세요.
        </p>

        <div className="modal-footer" style={{ justifyContent: 'flex-start' }}>
          <button
            className="button"
            onClick={async () => {
              setError(null);
              setInfo(null);
              try {
                await sendVerificationMail();
                setInfo('인증번호를 전송했어요. 메일함을 확인해주세요.');
              } catch {
                setError(
                  '인증번호 전송에 실패했어요. 잠시 후 다시 시도해주세요.'
                );
              }
            }}
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
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
        </div>

        <div className="modal-footer">
          <button
            className="button primary"
            type="button"
            disabled={!canSubmit}
            onClick={async () => {
              if (!canSubmit) return;
              setLoading(true);
              setError(null);
              setInfo(null);
              try {
                await confirmVerificationCode(code.trim());
                localStorage.removeItem('verification_token');
                setInfo('인증 완료! 잠시 후 로그인 화면으로 이동합니다.');
                // Give the user a moment to see the success message.
                window.setTimeout(() => {
                  onSuccess?.();
                }, 650);
              } catch (e) {
                const err = e as AxiosError<{ error_code?: string }>;
                if (err.response?.data?.error_code === 'ERR_012') {
                  setError('인증번호가 올바르지 않아요. 다시 확인해주세요.');
                } else if (err.response?.data?.error_code === 'ERR_016') {
                  setError('인증 토큰이 만료되었어요. 다시 로그인해 주세요.');
                } else {
                  setError('인증에 실패했어요. 잠시 후 다시 시도해주세요.');
                }
              } finally {
                setLoading(false);
              }
            }}
          >
            {loading ? '확인 중…' : '인증 확인'}
          </button>
        </div>

        {error ? <p className="form-error">{error}</p> : null}
        {info ? <p className="form-info">{info}</p> : null}
      </div>
    </div>
  );
}
