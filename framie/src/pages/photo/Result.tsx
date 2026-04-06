import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import h1 from "../../assets/photo_result.svg";
import { api, isLoggedIn } from "../../lib/api";
import PhotoEditor from "./PhotoEditor";

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
  originals?: string[];
  message?: string;
  sourceType?: string;
  frameOwnerId?: string;
  overlayPhotos?: string[];
};

type Slot = { left: number; top: number; width: number; height: number };

function getViewportAspectRatio() {
  if (typeof window === "undefined") return 16 / 9;
  const ratio = window.innerWidth / window.innerHeight;
  return Number.isFinite(ratio) && ratio > 0 ? ratio : 16 / 9;
}

function getFrameAspectRatio(shotCount: number) {
  return shotCount === 3 ? 2.55 : 0.62;
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
      { left: 0, top: 0, width: 33.34, height: 100 },
      { left: 33.33, top: 0, width: 33.34, height: 100 },
      { left: 66.66, top: 0, width: 33.34, height: 100 },
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

function getThreeCutBand() {
  return {
    top: 35, //슬롯의 위치 
    height: 32,
  };
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
  canvas.height = shotCount === 3 ? 900 : 1600;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("결과 이미지를 만들 수 없어요.");

  const outerX = shotCount === 3 ? 120 : 180, outerY = shotCount === 3 ? 130 : 110;
  const outerW = shotCount === 3 ? 1560 : 840, outerH = shotCount === 3 ? 640 : 1380;
  const innerX = shotCount === 3 ? 220 : 300, innerY = shotCount === 3 ? 185 : 225;
  const innerW = shotCount === 3 ? 1360 : 600, innerH = shotCount === 3 ? 530 : 1030;
  const slots = getSlots(shotCount).map((s) => applySlotGap(fitSlotToAspect(s, getViewportAspectRatio(), shotCount), shotCount));
  const threeCutBand = shotCount === 3 ? getThreeCutBand() : null;

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
    const bandX = innerX;
    const bandY = shotCount === 3 && threeCutBand ? innerY + (threeCutBand.top / 100) * innerH : innerY;
    const bandW = innerW;
    const bandH = shotCount === 3 && threeCutBand ? (threeCutBand.height / 100) * innerH : innerH;
    const x = bandX + (slot.left / 100) * bandW;
    const y = bandY + (slot.top / 100) * bandH;
    const w = (slot.width / 100) * bandW;
    const h = (slot.height / 100) * bandH;
    const radius = 0;
    ctx.save();
    roundedRect(ctx, x, y, w, h, radius); ctx.clip();
    ctx.fillStyle = frameColor.preview;
    ctx.fillRect(x, y, w, h);
    const baseRatio = Math.max(w / img.width, h / img.height);
    const ratio = shotCount === 3 ? baseRatio * 1.18 : baseRatio * 1.06;
    ctx.drawImage(img, x + (w - img.width * ratio) / 2, y + (h - img.height * ratio) / 2, img.width * ratio, img.height * ratio);
    ctx.restore();
  }
  return canvas.toDataURL("image/png");
}

function EditCutButton({ index, onEditCut }: { index: number; onEditCut: (index: number) => void }) {
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onEditCut(index); }}
      aria-label={`${index + 1}번째 컷 수정`}
      style={{
        position: "absolute",
        top: "8px",
        right: "8px",
        width: "32px",
        height: "32px",
        borderRadius: "999px",
        border: "none",
        background: "rgba(255,255,255,0.94)",
        color: "#1f2552",
        boxShadow: "0 4px 12px rgba(0,0,0,0.22)",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 0,
        zIndex: 5,
      }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
      </svg>
    </button>
  );
}

function FramePreview({ shotCount, photos, frameColor, onEditCut }: { shotCount: number; photos: string[]; frameColor: FrameColorOption; onEditCut?: (index: number) => void }) {
  const slots = getSlots(shotCount).map((s) => applySlotGap(fitSlotToAspect(s, getViewportAspectRatio(), shotCount), shotCount));
  return (
    <div className={`framie-frame-preview ${shotCount === 3 ? "is-3cut" : "is-vertical"}`} style={{ aspectRatio: `${getFrameAspectRatio(shotCount)}`, border: `3px solid ${frameColor.border}`, borderRadius: 0, padding: shotCount === 3 ? "0px" : "18px 0", boxSizing: "border-box", background: frameColor.border }}>
      <div style={{ width: "100%", height: "100%", border: "none", borderRadius: 0, position: "relative", background: frameColor.border }}>
        {shotCount === 3 ? (
          (() => {
            const band = getThreeCutBand();
            return (
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: `${band.top}%`,
                  width: "100%",
                  height: `${band.height}%`,
                }}
              >
                {slots.map((slot, i) => (
                  <div key={i} style={{ position: "absolute", left: `${slot.left}%`, top: `${slot.top}%`, width: `${slot.width}%`, height: `${slot.height}%`, borderRadius: 0, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", background: photos[i] ? frameColor.preview : "rgba(255,255,255,0.12)", border: "none", boxSizing: "border-box" }}>
                    {photos[i] ? <img src={photos[i]} alt={`${i + 1}번째 컷`} style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scale(1.18)", transformOrigin: "center" }} /> : null}
                    {photos[i] && onEditCut ? <EditCutButton index={i} onEditCut={onEditCut} /> : null}
                  </div>
                ))}
              </div>
            );
          })()
        ) : (
          slots.map((slot, i) => (
            <div key={i} style={{ position: "absolute", left: `${slot.left}%`, top: `${slot.top}%`, width: `${slot.width}%`, height: `${slot.height}%`, borderRadius: 0, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", background: photos[i] ? frameColor.preview : "rgba(255,255,255,0.12)", border: "none", boxSizing: "border-box" }}>
              {photos[i] ? <img src={photos[i]} alt={`${i + 1}번째 컷`} style={{ width: "100%", height: "100%", objectFit: "contain", transform: "scale(1.06)", transformOrigin: "center" }} /> : null}
              {photos[i] && onEditCut ? <EditCutButton index={i} onEditCut={onEditCut} /> : null}
            </div>
          ))
        )}
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
  const [photos, setPhotos] = useState<string[]>(() => state.photos ?? storedState?.photos ?? []);
  const [originals] = useState<string[]>(() => state.originals ?? storedState?.originals ?? []);
  const sourceType = state.sourceType ?? storedState?.sourceType;
  const frameOwnerIdFromState = state.frameOwnerId ?? storedState?.frameOwnerId;
  const overlayPhotos = state.overlayPhotos ?? storedState?.overlayPhotos;
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
  const [editingCutIndex, setEditingCutIndex] = useState<number | null>(null);
  const [editorCutIndex, setEditorCutIndex] = useState<number | null>(null);

  // 코드는 저장(handleSave) 후 백엔드가 생성한 값으로 세팅됨

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
    sessionStorage.setItem("photoResultData", JSON.stringify({ ...storedState, frameId, shotCount, frameTitle, photos, originals, message, sourceType, frameOwnerId: frameOwnerIdFromState, overlayPhotos }));
  }, [storedState, frameId, shotCount, frameTitle, photos, originals, message, sourceType, frameOwnerIdFromState, overlayPhotos]);

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

    setIsSaving(true);
    setSaveStatus("idle");
    setSaveStatusMessage("");

    try {
      const resolvedFrameId = await resolveFrameId({ frameId, frameTitle, shotCount });
      const sessionId = crypto.randomUUID();
      const safeCode = getSafeFilePart(sessionId.slice(0, 8), "photo");
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

      const createdSession = await api.sessions.create({
        frame_id: resolvedFrameId,
        frame_owner_id: frameOwnerIdFromState || authUserId,
        source_type: sourceType === "other_frame" ? "other_frame" : "own_frame",
        user_message: message || undefined,
        result_image_path: previewPath,
        result_thumbnail_path: previewPath,
        is_saved: true,
        display_user_id: userId,
        photos: uploadedCuts,
      });

      // 백엔드에서 생성된 실제 공유 코드로 업데이트
      if (createdSession?.share_code) {
        setShareCode(createdSession.share_code);
      }

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
    <div className="framie-result-grid" style={{ minHeight: "100vh", background: PAGE_BG }}>
      <section style={{ background: PAGE_BG, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 24px", boxSizing: "border-box" }}>
        {photos.length > 0 ? (
          <FramePreview shotCount={shotCount} photos={photos} frameColor={selectedFrameColor} onEditCut={setEditingCutIndex} />
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

            <p style={{ margin: 0, fontSize: "16px", fontWeight: 400, opacity: 0.95 }}>
              코드 : {shareCode || "저장 후 생성돼요"}
            </p>

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

      {editingCutIndex !== null && (
        <div
          onClick={() => setEditingCutIndex(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(10,14,40,0.64)", backdropFilter: "blur(4px)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: "#ffffff", borderRadius: "24px", padding: "28px 24px 22px", width: "100%", maxWidth: "340px", boxShadow: "0 24px 60px rgba(10,14,40,0.28)", display: "flex", flexDirection: "column", gap: "18px" }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <p style={{ margin: 0, fontSize: "18px", fontWeight: 800, color: "#1f2552" }}>{editingCutIndex + 1}번째 컷 수정</p>
              <p style={{ margin: 0, fontSize: "13px", color: "#8b8b95" }}>어떻게 수정할지 선택해주세요</p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <button
                type="button"
                onClick={() => {
                  const targetIndex = editingCutIndex;
                  setEditingCutIndex(null);
                  navigate("/takephoto", {
                    state: { frameId, shotCount, frameTitle, retakeIndex: targetIndex, photos, originals, sourceType, frameOwnerId: frameOwnerIdFromState, overlayPhotos },
                  });
                }}
                style={{ width: "100%", height: "52px", borderRadius: "14px", border: "none", background: PRIMARY, color: WHITE, fontSize: "15px", fontWeight: 800, cursor: "pointer" }}
              >
                다시 찍기
              </button>
              <button
                type="button"
                onClick={() => {
                  const idx = editingCutIndex;
                  setEditingCutIndex(null);
                  setEditorCutIndex(idx);
                }}
                style={{ width: "100%", height: "52px", borderRadius: "14px", border: `2px solid ${PRIMARY}`, background: "transparent", color: PRIMARY, fontSize: "15px", fontWeight: 800, cursor: "pointer" }}
              >
                직접 수정
              </button>
            </div>

            <button
              type="button"
              onClick={() => setEditingCutIndex(null)}
              style={{ background: "none", border: "none", padding: "4px", color: "#8b8b95", fontSize: "14px", fontWeight: 600, cursor: "pointer" }}
            >
              취소
            </button>
          </div>
        </div>
      )}

      {editorCutIndex !== null && photos[editorCutIndex] && (
        <PhotoEditor
          transparentSrc={photos[editorCutIndex]}
          originalSrc={originals[editorCutIndex] ?? null}
          hasTransparentBg={sourceType !== "other_frame"}
          onCancel={() => setEditorCutIndex(null)}
          onApply={(newDataUrl) => {
            const idx = editorCutIndex;
            setPhotos((prev) => {
              const next = [...prev];
              next[idx] = newDataUrl;
              return next;
            });
            setEditorCutIndex(null);
          }}
        />
      )}
    </div>
  );
}
