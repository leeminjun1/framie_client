import "./Custom2.css";
import h1 from "../../assets/frame_select.svg";
import { useLocation, useNavigate } from "react-router-dom";

type Custom2State = {
  frameId: string;
  shotCount: number;
  frameTitle: string;
  overlayPhotos: string[];
  sourceType: string;
  frameOwnerId?: string;
  displayUserId?: string | null;
  userMessage?: string | null;
  resultImageUrl?: string | null;
};

export default function Custom2() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state ?? {}) as Partial<Custom2State>;

  const frameTitle = state.frameTitle || "프레임";
  const displayUserId = state.displayUserId || "알 수 없음";
  const userMessage = state.userMessage || "";
  const resultImageUrl = state.resultImageUrl || null;

  const handleBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate("/", { replace: true });
  };

  const handleGoShoot = () => {
    navigate("/takephoto", {
      state: {
        frameId: state.frameId,
        shotCount: state.shotCount,
        frameTitle: state.frameTitle,
        overlayPhotos: state.overlayPhotos,
        sourceType: state.sourceType,
        frameOwnerId: state.frameOwnerId,
      },
    });
  };

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
        <section className="custom2-left" aria-label="Preview">
          <div className="custom2-previewCard">
            <p className="custom2-hint">
              프레임을 확인하고
              <br />
              사진을 찍어보세요
            </p>
            {resultImageUrl ? (
              <img
                src={resultImageUrl}
                alt="프레임 결과 미리보기"
                crossOrigin="anonymous"
                style={{
                  width: "100%",
                  maxWidth: 360,
                  height: "auto",
                  borderRadius: 12,
                  border: "1px solid rgba(0,0,0,0.08)",
                }}
              />
            ) : state.overlayPhotos && state.overlayPhotos.length > 0 ? (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
                {state.overlayPhotos.map((url, i) => (
                  <img
                    key={i}
                    src={url}
                    alt={`프레임 사진 ${i + 1}`}
                    crossOrigin="anonymous"
                    style={{
                      width: state.overlayPhotos!.length <= 2 ? 120 : 80,
                      height: state.overlayPhotos!.length <= 2 ? 120 : 80,
                      objectFit: "cover",
                      borderRadius: 12,
                      border: "1px solid rgba(0,0,0,0.08)",
                    }}
                  />
                ))}
              </div>
            ) : null}
          </div>
          <div className="custom2-blob" aria-hidden="true" />
        </section>

        <section className="custom2-right" aria-label="Frame Confirmation">
          <header className="custom2-header">
            <img src={h1} alt="Frame preview" className="custom2-previewImg" />
            <p className="custom2-subtitle">촬영 전에 내용을 한 번 더 확인해요</p>
          </header>

          <div className="custom2-metaCard">
            <div className="custom2-metaRow">
              <span className="custom2-label">제작</span>
              <span className="custom2-value">{displayUserId}</span>
            </div>
            <div className="custom2-divider" />
            <div className="custom2-metaRow">
              <span className="custom2-label">프레임</span>
              <span className="custom2-value">{frameTitle}</span>
            </div>
            {userMessage && (
              <>
                <div className="custom2-divider" />
                <div className="custom2-metaRow">
                  <span className="custom2-label">메시지</span>
                  <span className="custom2-value custom2-valueMessage">{userMessage}</span>
                </div>
              </>
            )}
          </div>

          <button className="custom2-button" type="button" onClick={handleGoShoot}>
            사진 찍기
          </button>

          <p className="custom2-footnote">버튼을 누르면 카메라 화면으로 이동합니다.</p>
        </section>
      </div>
    </div>
  );
}
