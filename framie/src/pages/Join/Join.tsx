import "./Join.css";

import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import JoinLogo from "../../assets/Join_Logo.svg";
import Logo from "../../assets/Framie_blue.svg";
import { api } from "../../lib/api";

export default function Join() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleJoin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const trimmedEmail = email.trim();

    if (!trimmedEmail || !password || !confirmPassword) {
      setErrorMessage("이메일과 비밀번호를 모두 입력해주세요.");
      return;
    }

    if (password.length < 6) {
      setErrorMessage("비밀번호는 6자 이상 입력해주세요.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("비밀번호 확인이 일치하지 않습니다.");
      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      await api.auth.signup(trimmedEmail, password);
      alert("회원가입이 완료되었습니다.");
      navigate("/login");
    } catch (error) {
      console.error("회원가입 오류:", error);
      setErrorMessage("회원가입 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="join-page">
      <section className="join-left" aria-label="Framie branding">
        <div className="join-left-inner">
          <p className="join-left-subtitle">언제 어디서든 같이 있는것 처럼</p>
          <img src={Logo} alt="Framie" className="join-left-logo" />
        </div>
      </section>

      <section className="join-right" aria-label="join form">
        <div className="join-right-inner">
          <img src={JoinLogo} alt="join" className="join-title" />

          <form className="join-form" onSubmit={handleJoin}>
            <label className="sr-only" htmlFor="join-email">
              이메일
            </label>
            <input
              id="join-email"
              className="join-input"
              type="email"
              placeholder="이메일 입력"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />

            <label className="sr-only" htmlFor="join-password">
              비밀번호
            </label>
            <input
              id="join-password"
              className="join-input"
              type="password"
              placeholder="비밀번호 입력"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />

            <label className="sr-only" htmlFor="join-password-confirm">
              비밀번호 확인
            </label>
            <input
              id="join-password-confirm"
              className="join-input"
              type="password"
              placeholder="비밀번호 확인"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
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

            <div className="join-links">
              <button
                type="button"
                className="join-link"
                onClick={() => navigate("/login")}
                disabled={loading}
              >
                이미 계정이 있다면?
              </button>
              <button
                type="button"
                className="join-link"
                onClick={() => navigate("/login")}
                disabled={loading}
              >
                로그인
              </button>
            </div>

            <button type="submit" className="join-submit" disabled={loading}>
              {loading ? "가입 중..." : "회원가입"}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}