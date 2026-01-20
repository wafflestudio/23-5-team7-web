import SignupModal from '../components/SignupModal';

export default function SignupPage() {
  return (
    <div>
      <h1>회원가입</h1>
      <SignupModal onClose={() => (window.location.href = '/')} />
    </div>
  );
}