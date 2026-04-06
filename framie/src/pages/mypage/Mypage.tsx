import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import h1 from "../../assets/Mypage.svg";
import { api, isLoggedIn } from "../../lib/api";

const PRIMARY = "#4050d6";
const MUTED = "#8b8b95";
const TEXT_MAIN = "#1f2552";
const BORDER = "rgba(64, 80, 214, 0.08)";
const SOFT_PANEL = "#eef0fb";
const SOFT_CARD = "#f8f9ff";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const BUCKET = "photo-results";

function getStorageUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}

async function downloadImage(url: string, filename: string) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
  } catch (e) {
    console.error("이미지 다운로드 실패", e);
    alert("이미지 저장에 실패했어요. 잠시 후 다시 시도해주세요.");
  }
}

const DownloadIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

type SessionPhoto = {
  id: string;
  shot_order: number;
  original_path: string | null;
  processed_path: string | null;
};

type Session = {
  id: string;
  created_at: string;
  source_type: string | null;
  photographer_id: string | null;
  frame_owner_id: string | null;
  result_thumbnail_path: string | null;
  result_image_path: string | null;
  frame: { title: string; shot_count: number } | null;
  photos: SessionPhoto[];
  share_code: { code: string } | null;
};

export default function Mypage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"myframe" | "photos">("myframe");
  const [userId, setUserId] = useState("로그인 정보 없음");
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [stats, setStats] = useState({ saved_sessions_count: 0, total_photos_count: 0 });
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);

  useEffect(() => {
    let isMounted = true;
    if (!isLoggedIn()) { setIsLoadingUser(false); return; }

    const load = async () => {
      try {
        const me = await api.auth.me();
        if (!isMounted) return;
        setUserId(`@${me.username || me.email || me.id}`);
        const s = await api.users.stats();
        if (!isMounted) return;
        setStats(s);
      } catch {
        if (isMounted) setUserId("로그인 정보 없음");
      } finally {
        if (isMounted) setIsLoadingUser(false);
      }
    };

    load();
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    if (!isLoggedIn()) return;
    let isMounted = true;
    setIsLoadingSessions(true);

    api.users.recentSessions(50)
      .then((res) => {
        if (isMounted) setSessions((res as { sessions: Session[] }).sessions ?? []);
      })
      .catch(console.error)
      .finally(() => { if (isMounted) setIsLoadingSessions(false); });

    return () => { isMounted = false; };
  }, []);

  const myFrameSessions = sessions.filter((s) => s.source_type !== "other_frame");
  const customPhotoSessions = sessions.filter((s) => s.source_type === "other_frame");
  const visibleSessions = activeTab === "myframe" ? myFrameSessions : customPhotoSessions;

  return (
    <div style={{ minHeight: "100vh", background: "radial-gradient(circle at top, #ffffff 0%, #f7f8ff 32%, #f5f4ee 72%, #efeff8 100%)", padding: "clamp(20px, 4vw, 40px) clamp(16px, 3vw, 32px) 56px", boxSizing: "border-box", position: "relative" }}>
      <button
        type="button"
        className="framie-mypage-home-btn"
        onClick={() => navigate("/index")}
        style={{
          position: "fixed",
          zIndex: 120,
          height: "48px",
          padding: "0 18px",
          border: "none",
          borderRadius: "999px",
          background: "linear-gradient(135deg, #4050d6 0%, #6573ea 100%)",
          color: "#fff",
          fontSize: "14px",
          fontWeight: 800,
          cursor: "pointer",
          boxShadow: "0 14px 30px rgba(64,80,214,0.22)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}
      >
        홈으로
      </button>

      {/* 사진 모달 */}
      {selectedSession && (
        <div
          onClick={() => setSelectedSession(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(10,14,40,0.72)", backdropFilter: "blur(6px)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: "#fff", borderRadius: "32px", padding: "28px 24px", width: "100%", maxWidth: "640px", maxHeight: "85vh", overflowY: "auto", boxShadow: "0 32px 80px rgba(10,14,40,0.24)" }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
              <div>
                <p style={{ margin: 0, fontSize: "18px", fontWeight: 800, color: TEXT_MAIN }}>{formatDate(selectedSession.created_at)}</p>
                <p style={{ margin: "4px 0 0", fontSize: "13px", color: MUTED }}>
                  {selectedSession.frame?.title ?? "프레임"} · {selectedSession.share_code?.code ?? ""}
                </p>
              </div>
              <button type="button" onClick={() => setSelectedSession(null)}
                style={{ width: "36px", height: "36px", borderRadius: "999px", border: "none", background: SOFT_PANEL, color: PRIMARY, fontSize: "18px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800 }}>
                ✕
              </button>
            </div>

            {/* 결과 이미지 */}
            {(selectedSession.result_image_path ?? selectedSession.result_thumbnail_path) && (
              <div style={{ marginBottom: "20px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                  <p style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: MUTED }}>결과 이미지</p>
                  <button
                    type="button"
                    onClick={() => {
                      const url = getStorageUrl(selectedSession.result_image_path ?? selectedSession.result_thumbnail_path);
                      if (url) downloadImage(url, `framie-${selectedSession.share_code?.code ?? selectedSession.id}.png`);
                    }}
                    aria-label="저장"
                    style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "34px", height: "34px", border: "none", borderRadius: "999px", background: "linear-gradient(135deg, #4050d6 0%, #6573ea 100%)", color: "#fff", cursor: "pointer", boxShadow: "0 8px 18px rgba(64,80,214,0.22)" }}
                  >
                    <DownloadIcon size={16} />
                  </button>
                </div>
                <img
                  src={getStorageUrl(selectedSession.result_image_path ?? selectedSession.result_thumbnail_path)!}
                  alt="결과"
                  style={{ width: "100%", borderRadius: "18px", objectFit: "contain", background: "#f0f3ff" }}
                />
              </div>
            )}

            {/* 개별 사진 */}
            {selectedSession.photos?.length > 0 && (
              <div>
                <p style={{ margin: "0 0 10px", fontSize: "13px", fontWeight: 700, color: MUTED }}>개별 사진 ({selectedSession.photos.length}장)</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "12px" }}>
                  {[...selectedSession.photos]
                    .sort((a, b) => a.shot_order - b.shot_order)
                    .map((photo) => {
                      const url = getStorageUrl(photo.processed_path ?? photo.original_path);
                      return (
                        <div key={photo.id} style={{ position: "relative", aspectRatio: "1 / 1", borderRadius: "16px", overflow: "hidden", background: "#eef0fb" }}>
                          {url ? (
                            <>
                              <img src={url} alt={`${photo.shot_order}번째 컷`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                              <button
                                type="button"
                                onClick={() => downloadImage(url, `framie-${selectedSession.share_code?.code ?? selectedSession.id}-${photo.shot_order}.png`)}
                                aria-label="저장"
                                style={{ position: "absolute", bottom: "8px", right: "8px", display: "inline-flex", alignItems: "center", justifyContent: "center", width: "30px", height: "30px", border: "none", borderRadius: "999px", background: "rgba(64,80,214,0.92)", color: "#fff", cursor: "pointer", boxShadow: "0 6px 14px rgba(10,14,40,0.28)", backdropFilter: "blur(6px)" }}
                              >
                                <DownloadIcon size={14} />
                              </button>
                            </>
                          ) : (
                            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: MUTED, fontSize: "12px" }}>없음</div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      <div style={{ width: "100%", maxWidth: "1200px", margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "20px", alignItems: "start" }}>

        {/* 프로필 카드 */}
        <header style={{ background: "rgba(255,255,255,0.9)", backdropFilter: "blur(12px)", borderRadius: "32px", padding: "30px 26px 24px", boxShadow: "0 18px 40px rgba(24,36,84,0.08)", border: `1px solid ${BORDER}` }}>
          <img src={h1} alt="Mypage" style={{ width: "min(220px, 70%)", display: "block", margin: "0 0 24px" }} />
          <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            <div>
              <p style={{ margin: 0, fontSize: "13px", color: MUTED, letterSpacing: "0.08em", textTransform: "uppercase" }}>계정</p>
              <p style={{ margin: "10px 0 0", fontSize: "26px", fontWeight: 800, color: PRIMARY, wordBreak: "break-all", lineHeight: 1.25 }}>
                {isLoadingUser ? "불러오는 중..." : userId}
              </p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "12px" }}>
              <div style={{ background: SOFT_CARD, borderRadius: "22px", padding: "16px 18px", boxShadow: "inset 0 0 0 1px rgba(64,80,214,0.06)" }}>
                <p style={{ margin: 0, fontSize: "12px", color: MUTED }}>상태</p>
                <p style={{ margin: "8px 0 0", fontSize: "16px", fontWeight: 700, color: TEXT_MAIN }}>
                  {isLoadingUser ? "확인 중" : userId === "로그인 정보 없음" ? "게스트" : "로그인됨"}
                </p>
              </div>
              <div style={{ background: "linear-gradient(135deg, #4050d6 0%, #6573ea 100%)", borderRadius: "22px", padding: "16px 18px", color: "#fff", boxShadow: "0 12px 24px rgba(64,80,214,0.18)" }}>
                <p style={{ margin: 0, fontSize: "12px", color: "rgba(255,255,255,0.78)" }}>보관함</p>
                <p style={{ margin: "8px 0 0", fontSize: "16px", fontWeight: 700 }}>{stats.saved_sessions_count}개</p>
              </div>
            </div>
          </div>
        </header>

        {/* 탭 */}
        <section style={{ background: "rgba(255,255,255,0.9)", backdropFilter: "blur(12px)", borderRadius: "28px", padding: "14px", boxShadow: "0 18px 40px rgba(24,36,84,0.08)", border: `1px solid ${BORDER}` }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", background: SOFT_PANEL, borderRadius: "22px", padding: "6px" }}>
            {(["myframe", "photos"] as const).map((tab) => (
              <button key={tab} type="button" onClick={() => setActiveTab(tab)}
                style={{ height: "54px", border: "none", borderRadius: "18px", background: activeTab === tab ? "linear-gradient(135deg, #4050d6 0%, #6573ea 100%)" : "transparent", color: activeTab === tab ? "#fff" : PRIMARY, fontSize: "16px", fontWeight: 800, cursor: "pointer", transition: "all 0.2s ease", boxShadow: activeTab === tab ? "0 10px 20px rgba(64,80,214,0.18)" : "none" }}>
                {tab === "myframe" ? "내 프레임" : "사진"}
              </button>
            ))}
          </div>
        </section>

        {/* 콘텐츠 */}
        <section style={{ background: "rgba(255,255,255,0.92)", backdropFilter: "blur(14px)", borderRadius: "32px", padding: "24px 20px 20px", boxShadow: "0 18px 40px rgba(24,36,84,0.08)", border: `1px solid ${BORDER}`, gridColumn: "1 / -1" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap", marginBottom: "22px" }}>
            <div>
              <h2 style={{ margin: 0, fontSize: "22px", color: TEXT_MAIN }}>
                {activeTab === "myframe" ? "저장한 프레임" : "커스텀 프레임으로 찍은 사진"}
              </h2>
              <p style={{ margin: "6px 0 0", fontSize: "13px", color: MUTED }}>
                {activeTab === "myframe" ? "프래미에서 저장한 순간들을 확인해보세요" : "다른 사람 프레임으로 찍은 사진이 모여요"}
              </p>
            </div>
            <div style={{ minWidth: "56px", height: "56px", padding: "0 14px", borderRadius: "18px", background: "linear-gradient(135deg, #edf0ff 0%, #f8f9ff 100%)", color: PRIMARY, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", fontWeight: 800, boxShadow: "inset 0 0 0 1px rgba(64,80,214,0.08)" }}>
              {visibleSessions.length}
            </div>
          </div>

          {isLoadingSessions ? (
            <div style={{ textAlign: "center", padding: "48px 0", color: MUTED, fontSize: "15px" }}>불러오는 중...</div>
          ) : visibleSessions.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 0", color: MUTED, fontSize: "15px" }}>
              {activeTab === "myframe" ? "저장된 프레임이 없어요" : "커스텀 프레임으로 찍은 사진이 없어요"}
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "16px" }}>
              {visibleSessions.map((session) => {
                const thumbUrl = getStorageUrl(session.result_thumbnail_path ?? session.result_image_path);
                const frameTitle = session.frame?.title ?? `${session.frame?.shot_count ?? ""}컷`;
                const photoCount = session.photos?.length ?? 0;
                const fullUrl = getStorageUrl(session.result_image_path ?? session.result_thumbnail_path);
                return (
                  <div key={session.id} role="button" tabIndex={0}
                    onClick={() => setSelectedSession(session)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelectedSession(session); } }}
                    style={{ background: "linear-gradient(180deg, #fff 0%, #f8f9ff 100%)", borderRadius: "26px", padding: "16px", boxShadow: "0 10px 26px rgba(31,37,82,0.06)", display: "flex", flexDirection: "column", gap: "12px", border: "none", cursor: "pointer", textAlign: "left", width: "100%", boxSizing: "border-box" }}>
                    <div style={{ width: "100%", aspectRatio: "1 / 1", borderRadius: "20px", background: "linear-gradient(135deg, #d8defd 0%, #f0f3ff 100%)", overflow: "hidden", position: "relative" }}>
                      {thumbUrl ? (
                        <img src={thumbUrl} alt="썸네일" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: PRIMARY, fontSize: "13px", fontWeight: 800 }}>사진</div>
                      )}
                      {session.share_code?.code && (
                        <span style={{ position: "absolute", top: "10px", left: "10px", padding: "5px 10px", borderRadius: "999px", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(6px)", fontSize: "11px", fontWeight: 800, color: PRIMARY }}>
                          {session.share_code.code}
                        </span>
                      )}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" }}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <p style={{ margin: 0, fontSize: "15px", fontWeight: 800, color: TEXT_MAIN }}>{formatDate(session.created_at)}</p>
                        <p style={{ margin: "5px 0 0", fontSize: "13px", color: MUTED }}>{frameTitle} · 사진 {photoCount}장</p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (fullUrl) downloadImage(fullUrl, `framie-${session.share_code?.code ?? session.id}.png`);
                        }}
                        disabled={!fullUrl}
                        aria-label="저장"
                        style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "38px", height: "38px", border: "none", borderRadius: "999px", background: fullUrl ? "linear-gradient(135deg, #4050d6 0%, #6573ea 100%)" : "#d0d3e6", color: "#fff", cursor: fullUrl ? "pointer" : "not-allowed", boxShadow: fullUrl ? "0 8px 18px rgba(64,80,214,0.22)" : "none", flexShrink: 0 }}
                      >
                        <DownloadIcon size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
