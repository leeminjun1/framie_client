import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import h1 from "../../assets/frame_result.svg";

const PAGE_BG = "#f5f4ee";
const PRIMARY = "#4050d6";
const WHITE = "#ffffff";

function generateRandomCode() {
  const letters = Array.from({ length: 3 }, () =>
    String.fromCharCode(65 + Math.floor(Math.random() * 26))
  ).join("");

  const numbers = Array.from({ length: 3 }, () =>
    Math.floor(Math.random() * 10).toString()
  ).join("");

  return `${letters}${numbers}`;
}

export default function CustomResult() {
  const navigate = useNavigate();
  const [message, setMessage] = useState("");
  const [shareCode, setShareCode] = useState("");
  const [isCopied, setIsCopied] = useState(false);

  const userId = "userID";

  useEffect(() => {
    setShareCode(generateRandomCode());
  }, []);

  useEffect(() => {
    if (!isCopied) return;

    const timer = window.setTimeout(() => {
      setIsCopied(false);
    }, 1800);

    return () => window.clearTimeout(timer);
  }, [isCopied]);

  const savePayload = useMemo(
    () => ({
      userId,
      message,
      shareCode,
    }),
    [userId, message, shareCode]
  );

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(shareCode);
      setIsCopied(true);
    } catch (error) {
      console.error("코드 복사 실패:", error);
      window.alert("코드 복사에 실패했어요. 다시 시도해주세요.");
    }
  };

  const handleSave = () => {
    console.log("추후 DB 저장 payload", savePayload);
    window.alert("나중에 DB 저장이 연결될 자리예요.");
  };

  const handleRetake = () => {
    navigate("/photo1");
  };

  return (
    <div
      className="framie-result-grid"
      style={{
        minHeight: "100vh",
        background: PAGE_BG,
      }}
    >
      <section
        style={{
          background: PAGE_BG,
          minHeight: "100vh",
        }}
      />

      <section
        style={{
          background: PRIMARY,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "clamp(28px, 5vw, 56px)",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "380px",
            display: "flex",
            flexDirection: "column",
            gap: "24px",
          }}
        >
          <img
            src={h1}
            alt="프레임 확인"
            style={{
              width: "min(330px, 100%)",
              display: "block",
            }}
          />

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "18px",
              color: WHITE,
            }}
          >
            <div>
              <p
                style={{
                  margin: 0,
                  fontSize: "16px",
                  fontWeight: 400,
                  opacity: 0.95,
                }}
              >
                제작 : {userId}
              </p>
            </div>

            <div>
              <label
                htmlFor="result-message"
                style={{
                  display: "block",
                  marginBottom: "10px",
                  fontSize: "16px",
                  fontWeight: 400,
                  opacity: 0.95,
                }}
              >
                메시지 :
              </label>
              <input
                id="result-message"
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="메시지를 입력해주세요"
                style={{
                  width: "100%",
                  height: "52px",
                  borderRadius: "14px",
                  border: "1.5px solid rgba(255,255,255,0.6)",
                  background: "rgba(255,255,255,0.1)",
                  color: WHITE,
                  padding: "0 16px",
                  boxSizing: "border-box",
                  fontSize: "16px",
                  outline: "none",
                }}
              />
            </div>

            <div>
              <p
                style={{
                  margin: 0,
                  fontSize: "16px",
                  fontWeight: 400,
                  opacity: 0.95,
                }}
              >
                코드 : {shareCode}
              </p>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              marginTop: "10px",
            }}
          >
            <button
              type="button"
              onClick={handleCopyCode}
              style={{
                width: "100%",
                height: "72px",
                borderRadius: "12px",
                border: "none",
                background: WHITE,
                color: PRIMARY,
                fontSize: "18px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {isCopied ? "코드 복사 완료" : "공유하기"}
            </button>

            <button
              type="button"
              onClick={handleSave}
              style={{
                width: "100%",
                height: "72px",
                borderRadius: "12px",
                border: "2px solid rgba(255,255,255,0.85)",
                background: "transparent",
                color: WHITE,
                fontSize: "18px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              저장하기
            </button>

            <button
              type="button"
              onClick={handleRetake}
              style={{
                width: "100%",
                height: "72px",
                borderRadius: "12px",
                border: "2px solid rgba(255,255,255,0.85)",
                background: "transparent",
                color: WHITE,
                fontSize: "18px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              다시 찍기
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}