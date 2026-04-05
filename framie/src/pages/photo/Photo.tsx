import h1 from "../../assets/frame_select_blue.svg";
import { useNavigate } from "react-router-dom";

const fontFaceStyles = `
  @font-face {
    font-family: 'Paperozi';
    src: url('https://cdn.jsdelivr.net/gh/projectnoonnu/2408-3@1.0/Paperlogy-6SemiBold.woff2') format('woff2');
    font-weight: 600;
    font-display: swap;
  }

  @font-face {
    font-family: 'Paperozi';
    src: url('https://cdn.jsdelivr.net/gh/projectnoonnu/2408-3@1.0/Paperlogy-4Regular.woff2') format('woff2');
    font-weight: 400;
    font-display: swap;
  }
`;

const frameOptions = [
  {
    id: 2,
    frameId: "frame-2-cut",
    title: "2컷",
    description: "위아래 배치",
    previewClassName: "two-cut",
  },
  {
    id: 3,
    frameId: "frame-3-cut",
    title: "3컷",
    description: "가로로 길게 3분할",
    previewClassName: "three-cut",
  },
  {
    id: 4,
    frameId: "frame-4-cut",
    title: "4컷",
    description: "세로 4분할",
    previewClassName: "four-cut",
  },
];

export default function Photo() {
  const navigate = useNavigate();
  return (
    <>
      <style>{fontFaceStyles}</style>
      <div style={styles.page}>
      <button
        type="button"
        onClick={() => navigate(-1)}
        aria-label="뒤로가기"
        style={styles.backButton}
      >
        <span style={{ marginTop: -3 }}>‹</span>
      </button>
      <main style={styles.container}>
        <header style={styles.header}>
          <img src={h1} alt="프레임 선택" style={styles.titleImage} />
          <p style={styles.subtitle}>사진 컷수를 선택 해주세요</p>
        </header>

        <section style={styles.optionGrid}>
          {frameOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              style={styles.optionButton}
              onClick={() => {
                navigate("/takephoto", {
                  state: {
                    frameId: option.frameId,
                    shotCount: option.id,
                    frameTitle: option.title,
                  },
                });
              }}
              onMouseEnter={(event) => {
                event.currentTarget.style.transform = "translateY(-8px)";
                event.currentTarget.style.boxShadow =
                  "0 18px 40px rgba(61, 86, 221, 0.16)";
                event.currentTarget.style.borderColor = "#3d56dd";
              }}
              onMouseLeave={(event) => {
                event.currentTarget.style.transform = "translateY(0)";
                event.currentTarget.style.boxShadow = "0 10px 24px rgba(61, 86, 221, 0.08)";
                event.currentTarget.style.borderColor = "rgba(61, 86, 221, 0.65)";
              }}
            >
              <div style={styles.previewWrap}>
                <div style={styles.previewFrame}>
                  {option.previewClassName === "two-cut" && (
                    <>
                      <div style={{ ...styles.previewSlot, ...styles.twoCutSlot }} />
                      <div style={{ ...styles.previewSlot, ...styles.twoCutSlot }} />
                    </>
                  )}

                  {option.previewClassName === "three-cut" && (
                    <div style={styles.threeCutRow}>
                      <div style={{ ...styles.previewSlot, ...styles.threeCutSlot }} />
                      <div style={{ ...styles.previewSlot, ...styles.threeCutSlot }} />
                      <div style={{ ...styles.previewSlot, ...styles.threeCutSlot }} />
                    </div>
                  )}

                  {option.previewClassName === "four-cut" && (
                    <>
                      <div style={{ ...styles.previewSlot, ...styles.fourCutSlot }} />
                      <div style={{ ...styles.previewSlot, ...styles.fourCutSlot }} />
                      <div style={{ ...styles.previewSlot, ...styles.fourCutSlot }} />
                      <div style={{ ...styles.previewSlot, ...styles.fourCutSlot }} />
                    </>
                  )}
                </div>
              </div>

              <div style={styles.textArea}>
                <strong style={styles.optionTitle}>{option.title}</strong>
                <span style={styles.optionDescription}>{option.description}</span>
              </div>
            </button>
          ))}
        </section>
      </main>
    </div>
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#f6f4ef",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "40px 24px",
    boxSizing: "border-box",
    position: "relative",
  },
  backButton: {
    position: "absolute",
    top: "max(20px, env(safe-area-inset-top, 20px))",
    left: "max(20px, env(safe-area-inset-left, 20px))",
    width: 44,
    height: 44,
    borderRadius: "50%",
    border: "none",
    background: "#ffffff",
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
    color: "#3d56dd",
    fontSize: 28,
    lineHeight: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    padding: 0,
    zIndex: 10,
  },
  container: {
    width: "100%",
    maxWidth: "1120px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "56px",
  },
  header: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "12px",
  },
  titleImage: {
    width: "min(420px, 72vw)",
    display: "block",
  },
  subtitle: {
    margin: 0,
    fontFamily: 'Paperozi, system-ui, -apple-system, Segoe UI, Roboto, "Noto Sans KR", Arial, sans-serif',
    fontSize: "clamp(20px, 2vw, 34px)",
    fontWeight: 400,
    color: "#3d56dd",
    letterSpacing: "-0.03em",
  },
  optionGrid: {
    width: "100%",
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: "28px",
  },
  optionButton: {
    border: "2px solid rgba(61, 86, 221, 0.65)",
    borderRadius: "28px",
    background: "rgba(255, 255, 255, 0.9)",
    padding: "24px 22px 26px",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "22px",
    boxShadow: "0 10px 24px rgba(61, 86, 221, 0.08)",
    transition: "all 0.2s ease",
  },
  previewWrap: {
    width: "100%",
    display: "flex",
    justifyContent: "center",
  },
  previewFrame: {
    width: "100%",
    maxWidth: "220px",
    height: "300px",
    borderRadius: "22px",
    background: "linear-gradient(180deg, #eef1ff 0%, #ffffff 100%)",
    border: "1.5px solid rgba(61, 86, 221, 0.22)",
    padding: "18px",
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    justifyContent: "center",
    alignItems: "center",
  },
  previewSlot: {
    width: "100%",
    borderRadius: "16px",
    border: "1.5px dashed rgba(61, 86, 221, 0.45)",
    background: "rgba(61, 86, 221, 0.08)",
    boxSizing: "border-box",
  },
  twoCutSlot: {
    width: "60%",
    height: "112px",
  },
  threeCutRow: {
    width: "100%",
    height: "100%",
    display: "flex",
    gap: "10px",
    alignItems: "center",
    justifyContent: "center",
  },
  threeCutSlot: {
    width: "100%",
    maxWidth: "44px",
    height: "180px",
  },
  fourCutSlot: {
    height: "44px",
  },
  textArea: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "8px",
  },
  optionTitle: {
    fontSize: "36px",
    fontFamily: 'Paperozi, system-ui, -apple-system, Segoe UI, Roboto, "Noto Sans KR", Arial, sans-serif',
    fontWeight: 600,
    color: "#3d56dd",
    lineHeight: 1.1,
  },
  optionDescription: {
    fontSize: "17px",
    fontFamily: 'Paperozi, system-ui, -apple-system, Segoe UI, Roboto, "Noto Sans KR", Arial, sans-serif',
    color: "rgba(61, 86, 221, 0.8)",
    fontWeight: 400,
  },
};