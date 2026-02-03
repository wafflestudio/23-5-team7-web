import { useEffect, useState } from 'react';
import EmailVerifyModal from './components/EmailVerifyModal';
import GoogleCallbackHandler from './components/GoogleCallbackHandler';
import GoogleSignupModal from './components/GoogleSignupModal';
import EventCreateModal from './components/EventCreateModal';
import EventDetailPage from './components/EventDetailPage';
import EventList from './components/EventList';
import LoginModal from './components/LoginModal';
import Modal from './components/Modal';
import MyPage from './components/MyPage';
import RankingPage from './components/RankingPage';
import SignupModal from './components/SignupModal';
import type { User } from './types';
import { notifySessionChanged } from './auth/session';

export default function App() {
  // --- Events UI state ---
  const [createOpen, setCreateOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [eventsRefreshKey, setEventsRefreshKey] = useState(0);
  const [showRanking, setShowRanking] = useState(false);

  // --- Auth UI state ---
  const [showLogin, setShowLogin] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  const [needVerify, setNeedVerify] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [showMypage, setShowMypage] = useState(false);
  const [isGoogleCallback, setIsGoogleCallback] = useState(false);
  const [googleSignupData, setGoogleSignupData] = useState<{
    email: string;
    social_id: string;
    social_type: string;
  } | null>(null);

  // Hash-based navigation: #/events/{id}
  useEffect(() => {
    const apply = () => {
      const m = location.hash.match(/^#\/events\/(.+)$/);
      setDetailId(m ? m[1] : null);
      setShowRanking(location.hash === '#/ranking');
      // Any hash-route navigation should close the MyPage overlay.
      if (location.hash) setShowMypage(false);
    };
    apply();
    window.addEventListener('hashchange', apply);
    return () => window.removeEventListener('hashchange', apply);
  }, []);

  useEffect(() => {
    // Check if this is a Google OAuth callback
    const searchParams = new URLSearchParams(window.location.search);
    const code = searchParams.get('code');
    if (code) {
      setIsGoogleCallback(true);
      return;
    }

    // Check for existing login session
    try {
      const token = localStorage.getItem('access_token');
      const userStr = localStorage.getItem('user');
      // Consider token presence as the source of truth for login.
      // user can be missing (e.g. after refresh, social login flows, or storage cleanup).
      if (token && token.trim().length > 0) {
        setIsLoggedIn(true);
        if (userStr) {
          setUser(JSON.parse(userStr));
        } else {
          setUser(null);
        }
      }
    } catch (error) {
      // Clear corrupted data from localStorage
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      console.error('Failed to parse stored user data:', error);
    }
  }, []);

  const handleLoginSuccess = (loggedInUser: User) => {
    setIsLoggedIn(true);
    setUser(loggedInUser);
    localStorage.setItem('user', JSON.stringify(loggedInUser));
    notifySessionChanged();
    setShowLogin(false);
    setIsGoogleCallback(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    notifySessionChanged();
    setIsLoggedIn(false);
    setUser(null);
    setShowMypage(false);
  };

  const handleGoogleCallbackError = (error: string) => {
    console.error('Google login error:', error);
    setIsGoogleCallback(false);
    alert('Google 로그인에 실패했습니다: ' + error);
  };

  const handleGoogleSignupNeeded = (signupData: {
    email: string;
    social_id: string;
    social_type: string;
  }) => {
    setGoogleSignupData(signupData);
    setIsGoogleCallback(false);
  };

  const handleGoogleSignupSuccess = (newUser: User) => {
    setIsLoggedIn(true);
    setUser(newUser);
    setGoogleSignupData(null);
    alert('회원가입 성공!');
  };

  if (isGoogleCallback) {
    return (
      <GoogleCallbackHandler
        onLoginSuccess={handleLoginSuccess}
        onNeedSignup={handleGoogleSignupNeeded}
        onError={handleGoogleCallbackError}
      />
    );
  }

  if (googleSignupData) {
    return (
      <Modal onClose={() => setGoogleSignupData(null)}>
        <GoogleSignupModal
          email={googleSignupData.email}
          social_id={googleSignupData.social_id}
          social_type={googleSignupData.social_type}
          onSignupSuccess={handleGoogleSignupSuccess}
          onError={(error) => {
            alert(error);
            setGoogleSignupData(null);
          }}
        />
      </Modal>
    );
  }

  return (
    <>
      <header className="app-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            className="app-logo"
            type="button"
            onClick={() => setShowMypage(false)}
          >
            스누토토
          </button>
          <button
            className="button ghost"
            type="button"
            onClick={() => {
              location.hash = '#/ranking';
            }}
          >
            랭킹
          </button>
        </div>
        <div className="app-auth">
          {isLoggedIn && user ? (
            <>
              <button
                className="button ghost"
                type="button"
                onClick={() => setShowMypage(true)}
              >
                {user.nickname}님 mypage
              </button>
              <button className="button" type="button" onClick={handleLogout}>
                로그아웃
              </button>
            </>
          ) : (
            <>
              <button
                className="button primary"
                type="button"
                onClick={() => setShowLogin(true)}
              >
                로그인
              </button>
              <button
                className="button"
                type="button"
                onClick={() => setShowSignup(true)}
              >
                회원가입
              </button>
            </>
          )}
        </div>
      </header>

      <main className="app-main">
        {showRanking ? (
          <div className="container">
            <RankingPage
              onBack={() => {
                if (location.hash) location.hash = '';
              }}
            />
          </div>
        ) : showMypage ? (
          <div className="container">
            <MyPage onBack={() => setShowMypage(false)} />
          </div>
        ) : (
          <div className="container">
            {!detailId && (
              <div
                style={{
                  marginTop: 12,
                  display: 'flex',
                  justifyContent: 'flex-end',
                }}
              >
                <button
                  className="button primary"
                  onClick={() => {
                    // Permit event creation when a token exists, even if user info isn't loaded.
                    const token = localStorage.getItem('access_token');
                    if (!token || token.trim().length === 0) {
                      alert('이벤트 생성은 로그인 후 가능합니다.');
                      setShowLogin(true);
                      return;
                    }
                    console.debug('[EventCreate] open modal');
                    setCreateOpen(true);
                  }}
                >
                  이벤트 생성
                </button>
              </div>
            )}

            <section style={{ marginTop: 24 }}>
              {detailId ? (
                <EventDetailPage
                  eventId={detailId}
                  onBack={() => {
                    if (location.hash) location.hash = '';
                  }}
                />
              ) : (
                <EventList refreshKey={eventsRefreshKey} />
              )}
            </section>

            <EventCreateModal
              open={createOpen}
              onClose={() => setCreateOpen(false)}
              onCreated={(ev) => {
                // Trigger list refresh on next render (useful when backend is eventually consistent)
                setEventsRefreshKey((k) => k + 1);
                // Navigate to the newly created event detail
                if (ev?.event_id) {
                  location.hash = `#/events/${ev.event_id}`;
                }
                setCreateOpen(false);
              }}
            />
          </div>
        )}
      </main>

      {showLogin && (
        <Modal onClose={() => setShowLogin(false)}>
          <LoginModal
            onNeedVerify={() => {
              setShowLogin(false);
              setNeedVerify(true);
            }}
            onLoginSuccess={handleLoginSuccess}
          />
        </Modal>
      )}

      {showSignup && (
        <Modal onClose={() => setShowSignup(false)}>
          <SignupModal />
        </Modal>
      )}

      {needVerify && (
        <Modal onClose={() => setNeedVerify(false)}>
          <EmailVerifyModal />
        </Modal>
      )}
    </>
  );
}
