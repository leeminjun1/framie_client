import "./Login.css";

import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import LoginLogo from "../../assets/Login_Logo.svg";
import Logo from "../../assets/Framie_white.svg";
import { api } from "../../lib/api";



export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!email.trim() || !password.trim()) {
      setErrorMessage("이메일과 비밀번호를 모두 입력해주세요.");
      return;
    }

    setIsLoading(true);
    setErrorMessage("");

    try {
      await api.auth.login(email.trim(), password);
      navigate("/index");
    } catch {
      setErrorMessage("이메일 또는 비밀번호를 다시 확인해주세요.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page">
      <section className="login-left" aria-label="Framie branding">
        <div className="login-left-inner">
          <p className="login-left-subtitle">언제 어디서든 같이 있는것 처럼</p>
          <img src={Logo} alt="Framie" className="login-left-logo" />
        </div>
      </section>

      <section className="login-right" aria-label="Login form">
        <div className="login-right-inner">
          <img src={LoginLogo} alt="Login" className="login-title" />

          <form className="login-form" onSubmit={handleLogin}>
            <label className="sr-only" htmlFor="login-id">
              이메일
            </label>
            <input
              id="login-id"
              className="login-input"
              type="email"
              placeholder="이메일 입력"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
            />

            <label className="sr-only" htmlFor="login-password">
              비밀번호
            </label>
            <input
              id="login-password"
              className="login-input"
              type="password"
              placeholder="비밀번호 입력"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
            />

            {errorMessage ? (
              <p
                style={{
                  margin: 0,
                  fontSize: "0.9rem",
                  color: "#ff4d4f",
                  textAlign: "center",
                }}
              >
                {errorMessage}
              </p>
            ) : null}

            <div className="login-links">
              <button
                type="button"
                className="login-link"
                onClick={() => navigate("/join")}
                disabled={isLoading}
              >
                계정이 없다면?
              </button>
              <button
                type="button"
                className="login-link"
                onClick={() => navigate("/join")}
                disabled={isLoading}
              >
                회원가입
              </button>
            </div>

            <button type="submit" className="login-submit" disabled={isLoading}>
              {isLoading ? "로그인 중..." : "로그인"}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}