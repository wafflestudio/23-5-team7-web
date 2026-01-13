import { useEffect, useState } from 'react';
import EmailVerifyModal from './components/EmailVerifyModal';
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

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    const userStr = localStorage.getItem('user');
    if (token && userStr) {
      setIsLoggedIn(true);
      setUser(JSON.parse(userStr));
    }
  }, []);

  const handleLoginSuccess = (loggedInUser: User) => {
    setIsLoggedIn(true);
    setUser(loggedInUser);
    localStorage.setItem('user', JSON.stringify(loggedInUser));
    setShowLogin(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    setIsLoggedIn(false);
    setUser(null);
    setShowMypage(false);
  };

  return (
    <>
      {/* 헤더 */}
      <header style={styles.header}>
        <div style={styles.logo} onClick={() => setShowMypage(false)}>
          스누토토
        </div>
        <div style={styles.authButtons}>
          {isLoggedIn && user ? (
            <>
              <span style={styles.mypage} onClick={() => setShowMypage(true)}>
                {user.nickname}님 mypage
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

      {/* 메인 콘텐츠 */}
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

      {/* 모달 영역 */}
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
