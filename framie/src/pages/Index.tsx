import { useNavigate } from "react-router-dom";
import "./Index.css";
import LogoUrl from "../assets/Framie_blue.svg";

export default function Index() {
  const navigate = useNavigate();

  const go = (path: string) => () =>  navigate(path);

  return (
    <div className="page">
      <main className="card">
        <p className="tagline">언제 어디서든 같이 있는것 처럼</p>
        <img className="logoImg" src={LogoUrl} alt="Framie" />


        <div className="actions" role="group" aria-label="main actions">
          <button className="btn primary" type="button" onClick={go("/photo1 ")}
            aria-label="프레임 커스텀 하기">
            프레임 커스텀 하기
          </button>
          <button className="btn outline" type="button" onClick={go("/custom1")}
            aria-label="커스텀 프레임 촬영">
            커스텀 프레임 촬영
          </button>
        </div>
      </main>
    </div>
  );
}