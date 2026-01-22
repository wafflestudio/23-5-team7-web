import { useEffect, useState } from 'react';
import { Route, Routes } from 'react-router-dom';
import GoogleCallbackHandler from './components/GoogleCallbackHandler';
import GoogleSignupModal from './components/GoogleSignupModal';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import type { User } from './types';
import './styles.css'; // Import styles for layout

export default function App() {
  const [isGoogleCallback, setIsGoogleCallback] = useState(false);
  const [googleSignupData, setGoogleSignupData] = useState<{
    email: string;
    social_id: string;
    social_type: string;
  } | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<User | null>(null);

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

  const handleLoginSuccess = (loggedInUser: User) => {
    setIsLoggedIn(true);
    setUser(loggedInUser);
    localStorage.setItem('user', JSON.stringify(loggedInUser));
    setIsGoogleCallback(false);
  };

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const needsSignup = searchParams.get('needs_signup');
    const error = searchParams.get('error');
    const message = searchParams.get('message');
    const email = searchParams.get('email');
    const socialId = searchParams.get('social_id');
    const socialType = searchParams.get('social_type');

    if (message) {
      alert(decodeURIComponent(message)); // 사용자에게 메시지 표시
    }

    if (error) {
      console.error('Login error:', error);
      alert('로그인 실패: ' + decodeURIComponent(message || '알 수 없는 오류'));
      window.location.href = '/login'; // 로그인 페이지로 리다이렉트
      return;
    }

    if (needsSignup === 'true' && email && socialId && socialType) {
      setGoogleSignupData({
        email,
        social_id: socialId,
        social_type: socialType,
      });
      setIsGoogleCallback(false);
    } else if (needsSignup === 'false') {
      // Ensure the user is marked as logged in for subsequent logins
      const user = JSON.parse(localStorage.getItem('user') || 'null');
      if (user) {
        setIsLoggedIn(true);
        setUser(user);
      }
      setIsGoogleCallback(false);
    }
  }, []);

  return (
    <Routes>
      <Route path="/" element={
        <div className="app-container">
          <header className="app-header">
            <div className="logo">스누토토</div>
            <div className="auth-buttons">
              {isLoggedIn && user ? (
                <>
                  <span>{user.nickname} 님</span>
                  <button>마이페이지</button>
                </>
              ) : (
                <>
                  <button onClick={() => (window.location.href = '/login')}>로그인</button>
                  <button onClick={() => (window.location.href = '/signup')}>회원가입</button>
                </>
              )}
            </div>
          </header>
          <main>
            {isGoogleCallback ? (
              <GoogleCallbackHandler
                onLoginSuccess={handleLoginSuccess}
                onNeedSignup={handleGoogleSignupNeeded}
                onError={handleGoogleCallbackError}
              />
            ) : googleSignupData ? (
              <GoogleSignupModal
                email={googleSignupData.email}
                social_id={googleSignupData.social_id}
                social_type={googleSignupData.social_type}
                onSignupSuccess={handleGoogleSignupSuccess}
                onError={handleGoogleCallbackError}
              />
            ) : (
              <div className="welcome-message">
                <h1>스누토토에 오신 것을 환영합니다!</h1>
              </div>
            )}
          </main>
        </div>
      } />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
    </Routes>
  );
}
