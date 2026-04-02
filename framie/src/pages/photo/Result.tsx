import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import h1 from "../../assets/photo_result.svg";
import { api, isLoggedIn } from "../../lib/api";

const PAGE_BG = "#f5f4ee";
const PRIMARY = "#4050d6";
const WHITE = "#ffffff";
const RESULT_STORAGE_BUCKET = "photo-results";

const FRAME_COLOR_OPTIONS = [
  { key: "classic", label: "클래식 블루", border: "#4050d6", inner: "#3140bf", preview: "#f1f2fb" },
  { key: "pink", label: "소프트 핑크", border: "#e66aa3", inner: "#cf4d8d", preview: "#fff1f7" },
  { key: "orange", label: "코랄 오렌지", border: "#f28a3f", inner: "#dd7428", preview: "#fff4ea" },
  { key: "mint", label: "민트", border: "#47bfa9", inner: "#2fa58f", preview: "#eefcf8" },
  { key: "lavender", label: "라벤더", border: "#8b74f2", inner: "#7258e2", preview: "#f4f1ff" },
  { key: "mono", label: "모노", border: "#111111", inner: "#000000", preview: "#f3f4f6" },
] as const;

type FrameColorOption = (typeof FRAME_COLOR_OPTIONS)[number];

type ResultState = {
  frameId?: string;
  shotCount?: number;
  frameTitle?: string;
  photos?: string[];
  message?: string;
};

type Slot = { left: number; top: number; width: number; height: number };

function getViewportAspectRatio() {
  if (typeof window === "undefined") return 16 / 9;
  const ratio = window.innerWidth / window.innerHeight;
  return Number.isFinite(ratio) && ratio > 0 ? ratio : 16 / 9;
}

function getFrameAspectRatio(shotCount: number) {
  return shotCount === 3 ? 1.72 : 0.62;
}

function generateRandomCode() {
  const letters = Array.from({ length: 3 }, () =>
    String.fromCharCode(65 + Math.floor(Math.random() * 26))
  ).join("");
  const numbers = Array.from({ length: 3 }, () =>
    Math.floor(Math.random() * 10).toString()
  ).join("");
  return `${letters}${numbers}`;
}

function getDisplayUserId(email?: string | null, fallback = "게스트") {
  if (!email) return fallback;
  const [localPart] = email.split("@");
  return localPart?.trim() || fallback;
}

function getSafeFilePart(value: string, fallback: string) {
  const normalized = value.trim().replace(/\s+/g, "-").replace(/[^a-zA-Z0-9-_]/g, "");
  return normalized || fallback;
}

function downloadDataUrl(dataUrl: string, fileName: string) {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = fileName;
  link.click();
}

async function dataUrlToBlob(dataUrl: string) {
  const response = await fetch(dataUrl);
  if (!response.ok) throw new Error("이미지 데이터를 읽지 못했어요.");
  return response.blob();
}

async function uploadDataUrlToStorage(path: string, dataUrl: string) {
  const blob = await dataUrlToBlob(dataUrl);
  const file = new File([blob], "image.png", { type: blob.type || "image/png" });
  await api.images.upload(file, RESULT_STORAGE_BUCKET, path);
  return path;
}

function isValidUUID(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

async function resolveFrameId(options: { frameId?: string; frameTitle?: string; shotCount: number }) {
  if (options.frameId && isValidUUID(options.frameId)) return options.frameId;

  const normalizedTitle = options.frameTitle?.trim();
  if (normalizedTitle) {
    const res = await api.frames.list({ title: normalizedTitle });
    if (res.frames?.[0]?.id) return res.frames[0].id;
  }

  const res = await api.frames.list({ shot_count: options.shotCount });
  if (res.frames?.[0]?.id) return res.frames[0].id;

  throw new Error("프레임 정보를 찾지 못했어요. 프레임 선택 화면에서 다시 들어와 주세요.");
}

function getSlots(shotCount: number): Slot[] {
  if (shotCount === 3) {
    return [
      { left: 0, top: 31, width: 33.34, height: 30 },
      { left: 33.33, top: 31, width: 33.34, height: 30 },
      { left: 66.66, top: 31, width: 33.34, height: 30 },
    ];
  }
  if (shotCount === 4) {
    return [
      { left: 16, top: 10, width: 68, height: 14 },
      { left: 16, top: 33, width: 68, height: 14 },
      { left: 16, top: 56, width: 68, height: 14 },
      { left: 16, top: 79, width: 68, height: 14 },
    ];
  }
  return [
    { left: 13, top: 6, width: 74, height: 38 },
    { left: 13, top: 56, width: 74, height: 38 },
  ];
}

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}


function fitSlotToAspect(slot: Slot, targetAspect: number, shotCount: number): Slot {
  if (shotCount === 3) return slot;
  if (shotCount === 4) {
    const enlargedHeight = slot.height * 1.62;
    return { ...slot, top: slot.top + (slot.height - enlargedHeight) / 2, height: enlargedHeight };
  }
  const enlargedHeight = slot.height * 1.25;
  const nextWidth = enlargedHeight * targetAspect;
  return {
    ...slot,
    left: slot.left + (slot.width - nextWidth) / 2,
    top: slot.top + (slot.height - enlargedHeight) / 2,
    width: nextWidth,
    height: enlargedHeight,
  };
}

function applySlotGap(slot: Slot, shotCount: number): Slot {
  if (shotCount === 3) {
    return {
      ...slot,
      left: slot.left + 1.2,
      width: slot.width - 2.4,
    };
  }

  if (shotCount === 4) {
    return {
      ...slot,
      top: slot.top + 1.1,
      height: slot.height - 2.2,
    };
  }

  return {
    ...slot,
    top: slot.top + 0.5,
    height: slot.height - 1,
  };
}

async function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("이미지를 불러오지 못했어요."));
    img.src = src;
  });
}

async function buildTransparentResultImage(photos: string[], shotCount: number, frameColor: FrameColorOption) {
  const canvas = document.createElement("canvas");
  canvas.width = shotCount === 3 ? 1800 : 1200;
  canvas.height = shotCount === 3 ? 1100 : 1600;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("결과 이미지를 만들 수 없어요.");

  const outerX = shotCount === 3 ? 120 : 180, outerY = shotCount === 3 ? 150 : 110;
  const outerW = shotCount === 3 ? 1560 : 840, outerH = shotCount === 3 ? 800 : 1380;
  const innerX = shotCount === 3 ? 220 : 300, innerY = shotCount === 3 ? 225 : 225;
  const innerW = shotCount === 3 ? 1360 : 600, innerH = shotCount === 3 ? 610 : 1030;
  const slots = getSlots(shotCount).map((s) => applySlotGap(fitSlotToAspect(s, getViewportAspectRatio(), shotCount), shotCount));

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.fillStyle = frameColor.border;
  roundedRect(ctx, outerX, outerY, outerW, outerH, 0);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.fillStyle = frameColor.border;
  roundedRect(ctx, innerX, innerY, innerW, innerH, 0);
  ctx.fill();
  ctx.restore();

  for (let i = 0; i < slots.length; i++) {
    const photo = photos[i];
    if (!photo) continue;
    const slot = slots[i];
    const img = await loadImage(photo);
    const x = innerX + (slot.left / 100) * innerW;
    const y = innerY + (slot.top / 100) * innerH;
    const w = (slot.width / 100) * innerW;
    const h = (slot.height / 100) * innerH;
    const radius = 0;
    ctx.save();
    roundedRect(ctx, x, y, w, h, radius); ctx.clip();
    const baseRatio = Math.max(w / img.width, h / img.height);
    const ratio = shotCount === 3 ? baseRatio * 1.18 : baseRatio * 1.06;
    ctx.drawImage(img, x + (w - img.width * ratio) / 2, y + (h - img.height * ratio) / 2, img.width * ratio, img.height * ratio);
    ctx.restore();
  }
  return canvas.toDataURL("image/png");
}

function FramePreview({ shotCount, photos, frameColor }: { shotCount: number; photos: string[]; frameColor: FrameColorOption }) {
  const slots = getSlots(shotCount).map((s) => applySlotGap(fitSlotToAspect(s, getViewportAspectRatio(), shotCount), shotCount));
  return (
    <div style={{ width: shotCount === 3 ? "min(88vw, 980px)" : "min(78vw, 520px)", aspectRatio: `${getFrameAspectRatio(shotCount)}`, border: `3px solid ${frameColor.border}`, borderRadius: 0, padding: shotCount === 3 ? "0px" : "18px 0", boxSizing: "border-box", background: frameColor.border }}>
      <div style={{ width: "100%", height: "100%", border: "none", borderRadius: 0, position: "relative", background: frameColor.border }}>
        {slots.map((slot, i) => (
          <div key={i} style={{ position: "absolute", left: `${slot.left}%`, top: `${slot.top}%`, width: `${slot.width}%`, height: `${slot.height}%`, borderRadius: 0, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", background: photos[i] ? frameColor.preview : "rgba(255,255,255,0.12)", border: "none", boxSizing: "border-box" }}>
            {photos[i] ? <img src={photos[i]} alt={`${i + 1}번째 컷`} style={{ width: "100%", height: "100%", objectFit: shotCount === 3 ? "cover" : "contain", transform: shotCount === 3 ? "scale(1.18)" : "scale(1.06)", transformOrigin: "center" }} /> : null}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PhotoResult() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = (location.state ?? {}) as ResultState;
  const stored = sessionStorage.getItem("photoResultData");
  const storedState = stored ? (JSON.parse(stored) as ResultState) : null;

  const frameId = state.frameId ?? storedState?.frameId ?? "";
  const shotCount = state.shotCount ?? storedState?.shotCount ?? 2;
  const frameTitle = state.frameTitle ?? storedState?.frameTitle ?? `${shotCount}컷`;
  const photos = state.photos ?? storedState?.photos ?? [];
  const initialMessage = state.message ?? storedState?.message ?? "";

  const [shareCode, setShareCode] = useState("");
  const [isCopied, setIsCopied] = useState(false);
  const [finalImageUrl, setFinalImageUrl] = useState("");
  const [userId, setUserId] = useState("게스트");
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [message, setMessage] = useState(initialMessage);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");
  const [saveStatusMessage, setSaveStatusMessage] = useState("");
  const [selectedFrameColorKey, setSelectedFrameColorKey] = useState<FrameColorOption["key"]>("classic");

  useEffect(() => { setShareCode(generateRandomCode()); }, []);

  useEffect(() => {
    let mounted = true;
    if (!isLoggedIn()) return;
    api.auth.me().then((me) => {
      if (!mounted) return;
      setUserId(getDisplayUserId(me.email));
      setAuthUserId(me.id);
    }).catch(console.error);
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!isCopied) return;
    const t = window.setTimeout(() => setIsCopied(false), 1800);
    return () => window.clearTimeout(t);
  }, [isCopied]);

  useEffect(() => {
    if (saveStatus === "idle" || !saveStatusMessage) return;
    const t = window.setTimeout(() => { setSaveStatus("idle"); setSaveStatusMessage(""); }, 2500);
    return () => window.clearTimeout(t);
  }, [saveStatus, saveStatusMessage]);

  useEffect(() => {
    sessionStorage.setItem("photoResultData", JSON.stringify({ ...storedState, frameId, shotCount, frameTitle, photos, message }));
  }, [storedState, frameId, shotCount, frameTitle, photos, message]);

  const selectedFrameColor = useMemo(
    () => FRAME_COLOR_OPTIONS.find((o) => o.key === selectedFrameColorKey) ?? FRAME_COLOR_OPTIONS[0],
    [selectedFrameColorKey]
  );

  useEffect(() => {
    let cancelled = false;
    if (!photos.length) return;
    buildTransparentResultImage(photos, shotCount, selectedFrameColor)
      .then((result) => { if (!cancelled) setFinalImageUrl(result); })
      .catch(console.error);
    return () => { cancelled = true; };
  }, [photos, shotCount, selectedFrameColor]);

  const handleGenerateCode = () => { setShareCode(generateRandomCode()); setIsCopied(false); };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(shareCode);
      setIsCopied(true);
    } catch {
      window.alert("코드 복사에 실패했어요. 다시 시도해주세요.");
    }
  };

  const handleDownload = () => {
    if (!finalImageUrl) { window.alert("아직 결과 이미지가 준비되지 않았어요."); return; }
    downloadDataUrl(finalImageUrl, `${getSafeFilePart(frameTitle || `frame-${shotCount}`, `frame-${shotCount}`)}-${getSafeFilePart(shareCode || "photo", "photo")}.png`);
  };

  const handleSave = async () => {
    if (!photos.length) { window.alert("저장할 컷이 없어요."); return; }
    if (!authUserId) { window.alert("로그인한 사용자 정보가 필요해요."); return; }
    if (!shareCode) { window.alert("공유 코드가 없어요."); return; }

    setIsSaving(true);
    setSaveStatus("idle");
    setSaveStatusMessage("");

    try {
      const resolvedFrameId = await resolveFrameId({ frameId, frameTitle, shotCount });
      const sessionId = crypto.randomUUID();
      const safeCode = getSafeFilePart(shareCode, "photo");
      const safeUser = getSafeFilePart(userId, "guest");
      const safeTitle = getSafeFilePart(frameTitle || `frame-${shotCount}`, `frame-${shotCount}`);

      const uploadedCuts = await Promise.all(
        photos.filter(Boolean).map(async (photo, i) => {
          const path = `sessions/${sessionId}/shots/${i + 1}-${safeCode}-${safeUser}.png`;
          await uploadDataUrlToStorage(path, photo);
          return { shot_order: i + 1, original_path: path, processed_path: path, is_transparent_png: true };
        })
      );

      let previewPath: string | undefined;
      if (finalImageUrl) {
        previewPath = `sessions/${sessionId}/preview/${safeTitle}-${safeCode}-${safeUser}.png`;
        await uploadDataUrlToStorage(previewPath, finalImageUrl);
      }

      await api.sessions.create({
        frame_id: resolvedFrameId,
        frame_owner_id: authUserId,
        user_message: message || undefined,
        result_image_path: previewPath,
        result_thumbnail_path: previewPath,
        is_saved: true,
        display_user_id: userId,
        photos: uploadedCuts,
      });

      setSaveStatus("success");
      setSaveStatusMessage("저장이 완료됐어요.");
    } catch (error) {
      setSaveStatus("error");
      const msg = error instanceof Error ? error.message : "저장 중 문제가 발생했어요.";
      setSaveStatusMessage(msg);
      window.alert(msg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: PAGE_BG, display: "grid", gridTemplateColumns: shotCount === 3 ? "minmax(760px, 1fr) minmax(320px, 570px)" : "minmax(0, 1fr) minmax(320px, 570px)" }}>
      <section style={{ background: PAGE_BG, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 24px", boxSizing: "border-box" }}>
        {photos.length > 0 ? (
          <FramePreview shotCount={shotCount} photos={photos} frameColor={selectedFrameColor} />
        ) : (
          <div style={{ width: shotCount === 3 ? "min(88vw, 980px)" : "min(78vw, 520px)", aspectRatio: `${getFrameAspectRatio(shotCount)}`, border: "2px dashed rgba(64,80,214,0.28)", borderRadius: 34, display: "flex", alignItems: "center", justifyContent: "center", color: PRIMARY, fontSize: 18, fontWeight: 600 }}>
            아직 촬영된 사진이 없어요
          </div>
        )}
      </section>

      <section style={{ background: PRIMARY, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "clamp(28px, 5vw, 56px)", boxSizing: "border-box" }}>
        <div style={{ width: "100%", maxWidth: "380px", display: "flex", flexDirection: "column", gap: "24px" }}>
          <img src={h1} alt="결과물 확인" style={{ width: "min(290px, 100%)", display: "block" }} />

          <div style={{ display: "flex", flexDirection: "column", gap: "16px", color: WHITE }}>
            <p style={{ margin: 0, fontSize: "16px", fontWeight: 400, opacity: 0.95 }}>제작 : {userId}</p>

            <label style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "16px", fontWeight: 400, opacity: 0.95 }}>
              <span>메시지</span>
              <input type="text" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="메시지를 입력해주세요" maxLength={40}
                style={{ width: "100%", height: "44px", borderRadius: "10px", border: "1.5px solid rgba(255,255,255,0.45)", background: "rgba(255,255,255,0.12)", color: WHITE, padding: "0 14px", fontSize: "15px", fontWeight: 500, boxSizing: "border-box", outline: "none" }} />
            </label>

            <p style={{ margin: 0, fontSize: "16px", fontWeight: 400, opacity: 0.95 }}>프레임 : {frameTitle}</p>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
              <p style={{ margin: 0, fontSize: "16px", fontWeight: 400, opacity: 0.95 }}>코드 : {shareCode}</p>
              <button type="button" onClick={handleGenerateCode} style={{ border: "1.5px solid rgba(255,255,255,0.85)", borderRadius: "999px", background: "transparent", color: WHITE, padding: "8px 14px", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}>
                새 코드 생성
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <p style={{ margin: 0, fontSize: "16px", fontWeight: 400, opacity: 0.95 }}>프레임 색상</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "10px" }}>
                {FRAME_COLOR_OPTIONS.map((option) => {
                  const isSelected = selectedFrameColorKey === option.key;
                  return (
                    <button key={option.key} type="button" onClick={() => setSelectedFrameColorKey(option.key)}
                      style={{ border: isSelected ? "2px solid rgba(255,255,255,0.96)" : "1px solid rgba(255,255,255,0.32)", borderRadius: "16px", background: "rgba(255,255,255,0.12)", padding: "10px 8px", color: WHITE, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", boxShadow: isSelected ? "0 0 0 2px rgba(255,255,255,0.16)" : "none" }}>
                      <span style={{ width: "28px", height: "28px", borderRadius: "999px", background: option.border, border: "2px solid rgba(255,255,255,0.82)", boxSizing: "border-box" }} />
                      <span style={{ fontSize: "12px", fontWeight: 700, lineHeight: 1.2, textAlign: "center", wordBreak: "keep-all" }}>{option.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "18px", marginTop: "24px" }}>
            <button type="button" onClick={handleCopyCode} style={{ width: "100%", height: "72px", borderRadius: "10px", border: "none", background: WHITE, color: PRIMARY, fontSize: "18px", fontWeight: 700, cursor: "pointer" }}>
              {isCopied ? "코드 복사 완료" : "공유하기"}
            </button>
            <button type="button" onClick={handleDownload} style={{ width: "100%", height: "72px", borderRadius: "10px", border: "none", background: "rgba(255,255,255,0.16)", color: WHITE, fontSize: "18px", fontWeight: 700, cursor: "pointer" }}>
              결과 이미지 다운로드
            </button>
            <button type="button" onClick={handleSave} disabled={isSaving}
              style={{ width: "100%", height: "72px", borderRadius: "10px", border: "2px solid rgba(255,255,255,0.9)", background: "transparent", color: WHITE, fontSize: "18px", fontWeight: 700, cursor: isSaving ? "not-allowed" : "pointer", opacity: isSaving ? 0.7 : 1 }}>
              {isSaving ? "저장 중..." : "저장하기"}
            </button>

            {saveStatusMessage && (
              <p style={{ margin: 0, textAlign: "center", fontSize: "14px", fontWeight: 600, color: saveStatus === "success" ? "rgba(255,255,255,0.96)" : "rgba(255,235,235,0.96)" }}>
                {saveStatusMessage}
              </p>
            )}

            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "18px", marginTop: "4px" }}>
              <button type="button" onClick={() => navigate("/mypage")} style={{ background: "none", border: "none", padding: 0, color: "rgba(255,255,255,0.92)", fontSize: "15px", fontWeight: 500, textDecoration: "underline", cursor: "pointer" }}>
                마이페이지로 가기
              </button>
              <button type="button" onClick={() => navigate("/")} style={{ background: "none", border: "none", padding: 0, color: "rgba(255,255,255,0.92)", fontSize: "15px", fontWeight: 500, textDecoration: "underline", cursor: "pointer" }}>
                홈으로
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
