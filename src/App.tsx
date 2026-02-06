import { useEffect, useState } from 'react';
import logoPng from './assets/logo.png';
import { notifySessionChanged } from './auth/session';
import { startTokenManager } from './auth/tokenManager';
import EmailVerifyModal from './components/EmailVerifyModal';
import EventCreateModal from './components/EventCreateModal';
import EventDetailPage from './components/EventDetailPage';
import EventList from './components/EventList';
import GoogleCallbackHandler from './components/GoogleCallbackHandler';
import GoogleSignupModal from './components/GoogleSignupModal';
import LoginModal from './components/LoginModal';
import Modal from './components/Modal';
import MyPage from './components/MyPage';
import RankingPage from './components/RankingPage';
import SignupModal from './components/SignupModal';
import type { User } from './types';

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

  // Google OAuth states
  const [showGoogleCallback, setShowGoogleCallback] = useState(false);
  const [showGoogleSignup, setShowGoogleSignup] = useState(false);
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
      setShowMypage(location.hash === '#/mypage');
      // Any hash-route navigation should close the MyPage overlay.
      if (location.hash && location.hash !== '#/mypage') setShowMypage(false);
    };
    apply();
    window.addEventListener('hashchange', apply);
    return () => window.removeEventListener('hashchange', apply);
  }, []);

  // Check for Google OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const needsSignup = params.get('needs_signup');
    const error = params.get('error');

    if (needsSignup || error) {
      setShowGoogleCallback(true);
    }
  }, []);

  useEffect(() => {
    // Keep session alive while the user is active, and auto-logout after 15 minutes inactivity.
    startTokenManager();

    // Check for existing login session
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('access_token');
        const userStr = localStorage.getItem('user');
        const authMethod = localStorage.getItem('auth_method');

        // If we have a localStorage token, use it
        if (token && token.trim().length > 0) {
          setIsLoggedIn(true);
          if (userStr) {
            setUser(JSON.parse(userStr));
          }
          return;
        }

        // If we had Google auth before, try to fetch user info from cookies
        if (authMethod === 'google') {
          try {
            const response = await fetch('/api/users/me/profile', {
              credentials: 'include',
            });
            if (response.ok) {
              const data = await response.json();
              const user: User = {
                id: data.user_id,
                email: data.email,
                nickname: data.nickname,
              };
              setIsLoggedIn(true);
              setUser(user);
              localStorage.setItem('user', JSON.stringify(user));
              return;
            }
          } catch (error) {
            // Cookie session might have expired
            console.error('Failed to restore Google session:', error);
            localStorage.removeItem('auth_method');
          }
        }
      } catch (error) {
        // Clear corrupted data from localStorage
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
        localStorage.removeItem('auth_method');
        console.error('Failed to parse stored user data:', error);
      }
    };

    checkAuth();
  }, []);

  const handleLoginSuccess = (loggedInUser: User) => {
    setIsLoggedIn(true);
    setUser(loggedInUser);
    localStorage.setItem('user', JSON.stringify(loggedInUser));
    notifySessionChanged();
    setShowLogin(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    localStorage.removeItem('auth_method');
    notifySessionChanged();
    setIsLoggedIn(false);
    setUser(null);
    setShowMypage(false);
  };

  return (
    <>
      <header className="app-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            className="app-logo"
            type="button"
            onClick={() => {
              setShowMypage(false);
              setShowRanking(false);
              // Go back to event list when clicking the logo
              if (location.hash) location.hash = '';
            }}
          >
            <img
              src={logoPng}
              alt="스누토토"
              style={{ height: 28, width: 'auto', display: 'block' }}
            />
          </button>
          <button
            className="button ghost"
            type="button"
            onClick={() => {
              setShowMypage(false);
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
                onClick={() => {
                  location.hash = '#/mypage';
                }}
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
            <MyPage
              onBack={() => {
                if (location.hash) location.hash = '';
                setShowMypage(false);
              }}
            />
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
                    // Permit event creation when a token exists or Google auth is active
                    const token = localStorage.getItem('access_token');
                    const authMethod = localStorage.getItem('auth_method');
                    if (
                      (!token || token.trim().length === 0) &&
                      authMethod !== 'google'
                    ) {
                      alert('이벤트 생성은 로그인 후 가능합니다.');
                      setShowLogin(true);
                      return;
                    }
                    if (import.meta.env.DEV) {
                      // biome-ignore lint/suspicious/noConsole: dev-only trace
                      console.debug('[EventCreate] open modal');
                    }
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
          <SignupModal
            onSignupSuccess={() => setShowSignup(false)}
            onNeedVerify={() => {
              setShowSignup(false);
              setNeedVerify(true);
            }}
          />
        </Modal>
      )}

      {needVerify && (
        <Modal onClose={() => setNeedVerify(false)}>
          <EmailVerifyModal
            onSuccess={() => {
              setNeedVerify(false);
              // Users are blocked from logging in until verified, so bring them back to login.
              setShowLogin(true);
            }}
          />
        </Modal>
      )}

      {showGoogleCallback && (
        <GoogleCallbackHandler
          onLoginSuccess={handleLoginSuccess}
          onNeedVerify={() => {
            setShowGoogleCallback(false);
            setNeedVerify(true);
          }}
          onNeedSignup={(data) => {
            setGoogleSignupData(data);
            setShowGoogleCallback(false);
            setShowGoogleSignup(true);
          }}
          onError={(message) => {
            alert(message);
            setShowGoogleCallback(false);
          }}
        />
      )}

      {showGoogleSignup && googleSignupData && (
        <Modal
          onClose={() => {
            setShowGoogleSignup(false);
            setGoogleSignupData(null);
          }}
        >
          <GoogleSignupModal
            email={googleSignupData.email}
            socialId={googleSignupData.social_id}
            socialType={googleSignupData.social_type}
            onNeedVerify={() => {
              setShowGoogleSignup(false);
              setNeedVerify(true);
            }}
          />
        </Modal>
      )}
    </>
  );
}
