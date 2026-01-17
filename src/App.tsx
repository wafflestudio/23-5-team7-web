import { useEffect, useState } from 'react';
import EmailVerifyModal from './components/EmailVerifyModal';
import GoogleCallbackHandler from './components/GoogleCallbackHandler';
import GoogleSignupModal from './components/GoogleSignupModal';
import LoginModal from './components/LoginModal';
import Modal from './components/Modal';
import SignupModal from './components/SignupModal';
import type { User } from './types';

export default function App() {
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

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const needsSignup = searchParams.get('needs_signup');
    const error = searchParams.get('error');

    if (needsSignup !== null || error) {
      setIsGoogleCallback(true);
      return;
    }

    try {
      const token = localStorage.getItem('access_token');
      const userStr = localStorage.getItem('user');
      if (token && userStr) {
        setIsLoggedIn(true);
        setUser(JSON.parse(userStr));
      }
    } catch (err) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      console.error(err);
    }
  }, []);

  const handleLoginSuccess = (loggedInUser: User) => {
    setIsLoggedIn(true);
    setUser(loggedInUser);
    localStorage.setItem('user', JSON.stringify(loggedInUser));
    setShowLogin(false);
    setIsGoogleCallback(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
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
      <header style={styles.header}>
        <div style={styles.logo} onClick={() => setShowMypage(false)}>
          스누토토
        </div>
        <div style={styles.authButtons}>
          {isLoggedIn && user ? (
            <>
              <span>{user.nickname}님</span>
              <span style={styles.mypage} onClick={() => setShowMypage(true)}>
                마이페이지
              </span>
              <button onClick={handleLogout}>로그아웃</button>
            </>
          ) : (
            <>
              <button onClick={() => setShowLogin(true)}>로그인</button>
              <button onClick={() => setShowSignup(true)}>회원가입</button>
            </>
          )}
        </div>
      </header>

      <main style={styles.main}>
        {showMypage ? (
          <div>
            <h1>마이페이지</h1>
            <p>여기에 사용자 정보를 표시합니다.</p>
          </div>
        ) : (
          <h1>스누토토에 오신 것을 환영합니다</h1>
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

const styles = {
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 24px',
    borderBottom: '1px solid #ddd',
  },
  logo: {
    fontSize: '20px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  authButtons: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
  },
  mypage: {
    cursor: 'pointer',
    color: 'blue',
    textDecoration: 'underline',
  },
  main: {
    padding: '40px',
  },
};
