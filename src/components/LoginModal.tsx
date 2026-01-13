import { useState } from "react";
import { login, googleLogin } from "../api/auth";
import { AxiosError } from "axios";
import type { User } from "../types";

interface Props {
  onNeedVerify: () => void;
  onLoginSuccess: (user: User) => void;
}

export default function LoginModal({ onNeedVerify, onLoginSuccess }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    try {
      const res = await login({ email, password });
      localStorage.setItem("access_token", res.data.access_token);
      onLoginSuccess(res.data.user);
      alert("로그인 성공");
    } catch (e) {
      const err = e as AxiosError<{ error_code?: string; verification_token?: string }>;

      if (err.response?.data?.error_code === "ERR_015") {
        localStorage.setItem(
          "verification_token",
          err.response.data.verification_token!
        );
        onNeedVerify();
      } else {
        alert("로그인 실패");
      }
    }
  };

  return (
    <div>
      <h2>로그인</h2>
      <input placeholder="이메일" onChange={(e) => setEmail(e.target.value)} />
      <input
        placeholder="비밀번호"
        type="password"
        onChange={(e) => setPassword(e.target.value)}
      />
      <button onClick={handleLogin}>로그인</button>
      <button onClick={googleLogin}>Google 로그인</button>
    </div>
  );
}
