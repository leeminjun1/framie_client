import { useEffect, useState } from "react";
import h1 from "../../assets/Mypage.svg";

import { supabase } from "../../lib/supabase";

const PAGE_BG = "#f5f4ee";
const PRIMARY = "#4050d6";
const CARD_BG = "#ffffff";
const MUTED = "#8b8b95";
const TEXT_MAIN = "#1f2552";
const BORDER = "rgba(64, 80, 214, 0.08)";
const SOFT_PANEL = "#eef0fb";
const SOFT_CARD = "#f8f9ff";

export default function Mypage() {
  const [activeTab, setActiveTab] = useState<"myframe" | "photos">("myframe");
  const [userId, setUserId] = useState("로그인 정보 없음");
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadUser = async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (!isMounted) return;

      if (error || !user) {
        setUserId("로그인 정보 없음");
        setIsLoadingUser(false);
        return;
      }

      const displayId =
        user.user_metadata?.nickname ||
        user.user_metadata?.name ||
        user.email ||
        user.id;

      setUserId(`@${displayId}`);
      setIsLoadingUser(false);
    };

    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user;

      if (!currentUser) {
        setUserId("로그인 정보 없음");
        setIsLoadingUser(false);
        return;
      }

      const displayId =
        currentUser.user_metadata?.nickname ||
        currentUser.user_metadata?.name ||
        currentUser.email ||
        currentUser.id;

      setUserId(`@${displayId}`);
      setIsLoadingUser(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const cards =
    activeTab === "myframe"
      ? [
          {
            title: "여름 무드",
            subtitle: "최근 수정한 프레임",
            badge: "커스텀",
          },
          {
            title: "블루 리본",
            subtitle: "저장된 프레임",
            badge: "인기",
          },
          {
            title: "소프트 클라우드",
            subtitle: "즐겨찾는 프리셋",
            badge: "즐겨찾기",
          },
          {
            title: "클래식 필름",
            subtitle: "마지막 사용 프레임",
            badge: "최근",
          },
        ]
      : [
          {
            title: "2026년 3월 4일",
            subtitle: "사진 3장 저장됨",
            badge: "최신",
          },
          {
            title: "2026년 2월 28일",
            subtitle: "사진 2장 저장됨",
            badge: "저장",
          },
          {
            title: "2026년 2월 21일",
            subtitle: "사진 4장 저장됨",
            badge: "보관",
          },
          {
            title: "2026년 2월 14일",
            subtitle: "사진 1장 저장됨",
            badge: "추억",
          },
        ];

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top, #ffffff 0%, #f7f8ff 32%, #f5f4ee 72%, #efeff8 100%)",
        padding: "clamp(20px, 4vw, 40px) clamp(16px, 3vw, 32px) 56px",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "1200px",
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "20px",
          alignItems: "start",
        }}
      >
        <header
          style={{
            background: "rgba(255, 255, 255, 0.9)",
            backdropFilter: "blur(12px)",
            borderRadius: "32px",
            padding: "30px 26px 24px",
            boxShadow: "0 18px 40px rgba(24, 36, 84, 0.08)",
            border: `1px solid ${BORDER}`,
            gridColumn: "span 1",
          }}
        >
          <img
            src={h1}
            alt="Mypage"
            className="mypage-title"
            style={{
              width: "min(220px, 70%)",
              display: "block",
              margin: "0 0 24px",
            }}
          />

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "18px",
            }}
          >
            <div>
              <p
                style={{
                  margin: 0,
                  fontSize: "13px",
                  color: MUTED,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                계정
              </p>
              <p
                style={{
                  margin: "10px 0 0",
                  fontSize: "26px",
                  fontWeight: 800,
                  color: PRIMARY,
                  wordBreak: "break-all",
                  lineHeight: 1.25,
                }}
              >
                {isLoadingUser ? "불러오는 중..." : userId}
              </p>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: "12px",
              }}
            >
              <div
                style={{
                  background: SOFT_CARD,
                  borderRadius: "22px",
                  padding: "16px 18px",
                  boxShadow: "inset 0 0 0 1px rgba(64, 80, 214, 0.06)",
                }}
              >
                <p
                  style={{
                    margin: 0,
                    fontSize: "12px",
                    color: MUTED,
                  }}
                >
                  상태
                </p>
                <p
                  style={{
                    margin: "8px 0 0",
                    fontSize: "16px",
                    fontWeight: 700,
                    color: TEXT_MAIN,
                  }}
                >
                  {isLoadingUser ? "확인 중" : userId === "로그인 정보 없음" ? "게스트" : "로그인됨"}
                </p>
              </div>

              <div
                style={{
                  background: "linear-gradient(135deg, #4050d6 0%, #6573ea 100%)",
                  borderRadius: "22px",
                  padding: "16px 18px",
                  color: "#ffffff",
                  boxShadow: "0 12px 24px rgba(64, 80, 214, 0.18)",
                }}
              >
                <p
                  style={{
                    margin: 0,
                    fontSize: "12px",
                    color: "rgba(255,255,255,0.78)",
                  }}
                >
                  보관함
                </p>
                <p
                  style={{
                    margin: "8px 0 0",
                    fontSize: "16px",
                    fontWeight: 700,
                  }}
                >
                  {cards.length}개
                </p>
              </div>
            </div>
          </div>
        </header>

        <section
          style={{
            background: "rgba(255, 255, 255, 0.9)",
            backdropFilter: "blur(12px)",
            borderRadius: "28px",
            padding: "14px",
            boxShadow: "0 18px 40px rgba(24, 36, 84, 0.08)",
            border: `1px solid ${BORDER}`,
            gridColumn: "span 1",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "10px",
              background: SOFT_PANEL,
              borderRadius: "22px",
              padding: "6px",
            }}
          >
            <button
              type="button"
              onClick={() => setActiveTab("myframe")}
              style={{
                height: "54px",
                border: "none",
                borderRadius: "18px",
                background:
                  activeTab === "myframe"
                    ? "linear-gradient(135deg, #4050d6 0%, #6573ea 100%)"
                    : "transparent",
                color: activeTab === "myframe" ? "#ffffff" : PRIMARY,
                fontSize: "16px",
                fontWeight: 800,
                cursor: "pointer",
                transition: "all 0.2s ease",
                boxShadow:
                  activeTab === "myframe"
                    ? "0 10px 20px rgba(64, 80, 214, 0.18)"
                    : "none",
              }}
            >
              내 프레임
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("photos")}
              style={{
                height: "54px",
                border: "none",
                borderRadius: "18px",
                background:
                  activeTab === "photos"
                    ? "linear-gradient(135deg, #4050d6 0%, #6573ea 100%)"
                    : "transparent",
                color: activeTab === "photos" ? "#ffffff" : PRIMARY,
                fontSize: "16px",
                fontWeight: 800,
                cursor: "pointer",
                transition: "all 0.2s ease",
                boxShadow:
                  activeTab === "photos"
                    ? "0 10px 20px rgba(64, 80, 214, 0.18)"
                    : "none",
              }}
            >
              사진
            </button>
          </div>
        </section>

        <section
          style={{
            background: "rgba(255, 255, 255, 0.92)",
            backdropFilter: "blur(14px)",
            borderRadius: "32px",
            padding: "24px 20px 20px",
            boxShadow: "0 18px 40px rgba(24, 36, 84, 0.08)",
            border: `1px solid ${BORDER}`,
            gridColumn: "1 / -1",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
              flexWrap: "wrap",
              marginBottom: "22px",
            }}
          >
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: "22px",
                  color: TEXT_MAIN,
                }}
              >
                {activeTab === "myframe" ? "저장한 프레임" : "최근 사진"}
              </h2>
              <p
                style={{
                  margin: "6px 0 0",
                  fontSize: "13px",
                  color: MUTED,
                }}
              >
                {activeTab === "myframe"
                  ? "좋아하는 프레임을 한곳에서 모아보세요"
                  : "프래미에서 저장한 순간들을 확인해보세요"}
              </p>
            </div>

            <div
              style={{
                minWidth: "56px",
                height: "56px",
                padding: "0 14px",
                borderRadius: "18px",
                background: "linear-gradient(135deg, #edf0ff 0%, #f8f9ff 100%)",
                color: PRIMARY,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "18px",
                fontWeight: 800,
                boxShadow: "inset 0 0 0 1px rgba(64, 80, 214, 0.08)",
              }}
            >
              {cards.length}
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "16px",
            }}
          >
            {cards.map((item) => (
              <button
                key={item.title}
                type="button"
                style={{
                  border: "none",
                  background: "linear-gradient(180deg, #ffffff 0%, #f8f9ff 100%)",
                  borderRadius: "26px",
                  padding: "16px",
                  textAlign: "left",
                  cursor: "pointer",
                  boxShadow: "0 10px 26px rgba(31, 37, 82, 0.06)",
                  width: "100%",
                }}
              >
                <div
                  style={{
                    width: "100%",
                    aspectRatio: "1 / 1",
                    borderRadius: "20px",
                    background:
                      activeTab === "myframe"
                        ? "linear-gradient(135deg, #cfd6ff 0%, #e8ebff 100%)"
                        : "linear-gradient(135deg, #d8defd 0%, #f0f3ff 100%)",
                    marginBottom: "14px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: PRIMARY,
                    fontSize: "13px",
                    fontWeight: 800,
                    letterSpacing: "0.06em",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  <span
                    style={{
                      position: "absolute",
                      top: "12px",
                      left: "12px",
                      padding: "6px 10px",
                      borderRadius: "999px",
                      background: "rgba(255,255,255,0.72)",
                      backdropFilter: "blur(6px)",
                      fontSize: "11px",
                      fontWeight: 800,
                      color: PRIMARY,
                      letterSpacing: "0.03em",
                    }}
                  >
                    {item.badge}
                  </span>
                  {activeTab === "myframe" ? "프레임" : "사진"}
                </div>

                <p
                  style={{
                    margin: 0,
                    fontSize: "16px",
                    fontWeight: 800,
                    color: TEXT_MAIN,
                  }}
                >
                  {item.title}
                </p>
                <p
                  style={{
                    margin: "6px 0 0",
                    fontSize: "13px",
                    color: MUTED,
                  }}
                >
                  {item.subtitle}
                </p>
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}