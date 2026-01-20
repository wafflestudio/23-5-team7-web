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

    if (needsSignup !== null || error) {
      setIsGoogleCallback(true);
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
