import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Custom1.css";
import h1 from "../../assets/customlogo.svg";

export default function Custom1() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");

  const handleSubmit = () => {
    // TODO: connect to your share-code validation / fetch logic
    // For now, just keep it as a UI stub.
    navigate("/custom2");
    console.log("share code:", code);
  };

  return (
    <div className="custom1-page">
      <button
        type="button"
        className="custom1-back"
        onClick={() => navigate(-1)}
        aria-label="뒤로가기"
      >
        <span className="custom1-back-arrow">‹</span>
      </button>

      <main className="custom1-container">
        <img src={h1} alt="Custom1" className="custom1-logo" />

        <label className="custom1-inputWrap">
          <span className="sr-only">코드 입력</span>
          <input
            className="custom1-input"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="코드 입력"
            inputMode="text"
            autoComplete="off"
          />
        </label>

        <button
          type="button"
          className="custom1-submit"
          onClick={handleSubmit}
          disabled={!code.trim()}
        >
          입력 완료
        </button>
      </main>
    </div>
  );
}