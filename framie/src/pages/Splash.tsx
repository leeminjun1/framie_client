
import LogoUrl from "../assets/Framie_white.svg";
import "./Splash.css";
import { useNavigate } from "react-router-dom";
import { isLoggedIn } from "../lib/api";

export default function Splash() {
  const navigate = useNavigate();

  const handleStart = () => {
    navigate(isLoggedIn() ? "/index" : "/login");
  };

  return (
    
    <div className="splash">
      <h6 className="splashTagline">언제 어디서든 같이 있는것 처럼</h6>
      <img className="splashLogo" src={LogoUrl} alt="Framie" />
      <button className="splashCta" onClick={handleStart}>
        <span className="splashCtaText">시작하기</span>
        <span className="splashCtaArrow">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M4 10H16M16 10L10.5 4.5M16 10L10.5 15.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </span>
      </button>
    </div>
  );
}