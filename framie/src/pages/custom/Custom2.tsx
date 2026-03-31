import "./Custom2.css";
import h1 from "../../assets/frame_select.svg";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Custom2() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const handleBack = () => {
    // If the user landed here via refresh/direct URL, there may be no history to go back to.
    if (window.history.length > 1) navigate(-1);
    else navigate("/", { replace: true });
  };
  const handleGoNext = () =>{
    navigate("/customphoto1");
  }
  return (
    <div className="custom2-page">
        <button
        type="button"
        className="custom1-back"
        onClick={handleBack}
        aria-label="뒤로가기"
      >
        <span className="custom1-back-arrow">‹</span>
      </button>
      <div className="custom2-split">
        {/* Left: preview / whitespace */}
        <section className="custom2-left" aria-label="Preview">
          <div className="custom2-previewCard">
            <p className="custom2-hint">
              프레임을 확인하고
              <br />
              사진을 찍어보세요
            </p>
          </div>
          <div className="custom2-blob" aria-hidden="true" />
        </section>

        {/* Right: details */}
        <section className="custom2-right" aria-label="Frame Confirmation">
          <header className="custom2-header">
            <img src={h1} alt="Frame preview" className="custom2-previewImg" />
            <p className="custom2-subtitle">촬영 전에 내용을 한 번 더 확인해요</p>
          </header>

          <div className="custom2-metaCard">
            <div className="custom2-metaRow">
              <span className="custom2-label">제작</span>
              <span className="custom2-value">ID</span>
            </div>
            <div className="custom2-divider" />
            <div className="custom2-metaRow">
              <span className="custom2-label">메시지</span>
              <span className="custom2-value custom2-valueMessage">하이루~~ 보고 싶어~~</span>
            </div>
          </div>

          <button className="custom2-button" type="button" onClick={handleGoNext}>
            사진 찍기
          </button>

          <p className="custom2-footnote">버튼을 누르면 카메라 화면으로 이동합니다.</p>
        </section>
      </div>
    </div>
  );
}