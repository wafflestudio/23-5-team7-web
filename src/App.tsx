import { useMemo, useState } from 'react';
import EventCard from './components/EventCard';
import LoginModal from './components/LoginModal';
import SignupModal from './components/SignupModal';
import type { TotoEvent } from './types';
import type { LoginResponse, SignupResponse } from './types';

const App = () => {
  const mockEvent: TotoEvent = useMemo(
    () => ({
      event_id: '11111111-1111-1111-1111-111111111111',
      creator_id: '22222222-2222-2222-2222-222222222222',
      title: '2025 프로 축구 결승전: 블루 vs 레드',
      description:
        '올해 최고의 빅매치! 승자는 누구? 다양한 특집 이벤트와 함께 즐겨보세요.',
      status: 'OPEN',
      // close_time: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(), // +24h
      // created_at: new Date().toISOString(),
      close_time: '2026-01-17T23:59:59Z',
      created_at: '2026-01-01T00:00:00Z',
    }),
    []
  );

  return (
    <div className="container">
      <header style={{ display: 'flex', alignItems: 'baseline', gap: 16 }}>
        <div style={{ flex: 1 }}>
          <h1 className="page-title">토토 메인</h1>
          <p className="page-sub">
            현재는 임의로 하나의 토토만 표시 (API 연동 전 단계)
          </p>
        </div>
        <AuthButtons />
      </header>

      <section className="grid" style={{ marginTop: 16 }}>
        <EventCard event={mockEvent} />
      </section>
    </div>
  );
};

export default App;

// --- Auth state and buttons ---
const AuthButtons = () => {
  const [loginOpen, setLoginOpen] = useState(false);
  const [signupOpen, setSignupOpen] = useState(false);
  const [userSummary, setUserSummary] = useState<
    LoginResponse['user'] | SignupResponse | null
  >(null);

  const loggedIn = Boolean(localStorage.getItem('access_token'));

  const onLoggedIn = (res: LoginResponse) => {
    setUserSummary(res.user);
  };
  const onSignedUp = (user: SignupResponse) => {
    setUserSummary(user);
  };
  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUserSummary(null);
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {loggedIn || userSummary ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className="page-sub">
            사용자: {userSummary?.user_id ?? '—'} • 포인트:{' '}
            {userSummary?.points ?? '—'}
          </span>
          <button className="button" onClick={logout}>
            로그아웃
          </button>
        </div>
      ) : (
        <>
          <button className="button" onClick={() => setSignupOpen(true)}>
            회원가입
          </button>
          <button className="button primary" onClick={() => setLoginOpen(true)}>
            로그인
          </button>
        </>
      )}

      <LoginModal
        open={loginOpen}
        onClose={() => setLoginOpen(false)}
        onLoggedIn={onLoggedIn}
      />
      <SignupModal
        open={signupOpen}
        onClose={() => setSignupOpen(false)}
        onSignedUp={onSignedUp}
      />
    </div>
  );
};
