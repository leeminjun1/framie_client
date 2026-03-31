import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import h1 from "../../assets/photo_result.svg";
import { supabase } from "../../lib/supabase";

const PAGE_BG = "#f5f4ee";
const PRIMARY = "#4050d6";
const WHITE = "#ffffff";
const PREVIEW_BG = "#f1f2fb";
const RESULT_STORAGE_BUCKET = "photo-results";

const FRAME_COLOR_OPTIONS = [
  {
    key: "classic",
    label: "클래식 블루",
    border: "#4050d6",
    inner: "rgba(64,80,214,0.22)",
    preview: "#f1f2fb",
  },
  {
    key: "pink",
    label: "소프트 핑크",
    border: "#e66aa3",
    inner: "rgba(230,106,163,0.24)",
    preview: "#fff1f7",
  },
  {
    key: "orange",
    label: "코랄 오렌지",
    border: "#f28a3f",
    inner: "rgba(242,138,63,0.24)",
    preview: "#fff4ea",
  },
  {
    key: "mint",
    label: "민트",
    border: "#47bfa9",
    inner: "rgba(71,191,169,0.24)",
    preview: "#eefcf8",
  },
  {
    key: "lavender",
    label: "라벤더",
    border: "#8b74f2",
    inner: "rgba(139,116,242,0.24)",
    preview: "#f4f1ff",
  },
  {
    key: "mono",
    label: "모노",
    border: "#4b5563",
    inner: "rgba(75,85,99,0.22)",
    preview: "#f3f4f6",
  },
] as const;

type FrameColorOption = (typeof FRAME_COLOR_OPTIONS)[number];

type ResultState = {
  frameId?: string;
  shotCount?: number;
  frameTitle?: string;
  photos?: string[];
  message?: string;
};

type Slot = {
  left: number;
  top: number;
  width: number;
  height: number;
};

function getViewportAspectRatio() {
  if (typeof window === "undefined") {
    return 16 / 9;
  }

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
  const normalized = value
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9-_가-힣]/g, "");
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
  if (!response.ok) {
    throw new Error("이미지 데이터를 읽지 못했어요.");
  }

  return response.blob();
}

async function uploadDataUrlToStorage(path: string, dataUrl: string) {
  const blob = await dataUrlToBlob(dataUrl);

  const { error } = await supabase.storage
    .from(RESULT_STORAGE_BUCKET)
    .upload(path, blob, {
      contentType: blob.type || "image/png",
      upsert: true,
    });

  if (error) {
    throw new Error(`스토리지 업로드 실패: ${error.message}`);
  }

  return path;
}

async function resolveFrameId(options: {
  frameId?: string;
  frameTitle?: string;
  shotCount: number;
}) {
  if (options.frameId) {
    return options.frameId;
  }

  const normalizedTitle = options.frameTitle?.trim();

  if (normalizedTitle) {
    const { data: exactMatch, error: exactError } = await supabase
      .from("frames")
      .select("id")
      .eq("title", normalizedTitle)
      .limit(1)
      .maybeSingle();

    if (exactError) {
      throw new Error(`프레임 조회 실패: ${exactError.message}`);
    }

    if (exactMatch?.id) {
      return exactMatch.id;
    }
  }

  const { data: shotCountMatch, error: shotCountError } = await supabase
    .from("frames")
    .select("id")
    .eq("shot_count", options.shotCount)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (shotCountError) {
    throw new Error(`프레임 조회 실패: ${shotCountError.message}`);
  }

  if (shotCountMatch?.id) {
    return shotCountMatch.id;
  }

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
    { left: 22, top: 8.5, width: 56, height: 37 },
    { left: 22, top: 54.5, width: 56, height: 37 },
  ];
}

function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + width, y, x + width, y + height, r);
  context.arcTo(x + width, y + height, x, y + height, r);
  context.arcTo(x, y + height, x, y, r);
  context.arcTo(x, y, x + width, y, r);
  context.closePath();
}

function fitSlotToAspect(
  slot: Slot,
  targetAspect: number,
  shotCount: number
): Slot {
  if (shotCount === 3) {
    return slot;
  }

  if (shotCount === 4) {
    const enlargedHeight = slot.height * 1.62;
    const offsetTop = (slot.height - enlargedHeight) / 2;

    return {
      ...slot,
      top: slot.top + offsetTop,
      height: enlargedHeight,
    };
  }

  const enlargedHeight = slot.height * 1.25;
  const nextWidth = enlargedHeight * targetAspect;
  const offsetLeft = (slot.width - nextWidth) / 2;
  const offsetTop = (slot.height - enlargedHeight) / 2;

  return {
    ...slot,
    left: slot.left + offsetLeft,
    top: slot.top + offsetTop,
    width: nextWidth,
    height: enlargedHeight,
  };
}

async function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("이미지를 불러오지 못했어요."));
    image.src = src;
  });
}

async function buildTransparentResultImage(
  photos: string[],
  shotCount: number,
  frameColor: FrameColorOption
) {
  const canvas = document.createElement("canvas");
  canvas.width = shotCount === 3 ? 1800 : 1200;
  canvas.height = shotCount === 3 ? 1100 : 1600;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("결과 이미지를 만들 수 없어요.");
  }

  const outerX = shotCount === 3 ? 120 : 180;
  const outerY = shotCount === 3 ? 150 : 110;
  const outerWidth = shotCount === 3 ? 1560 : 840;
  const outerHeight = shotCount === 3 ? 800 : 1380;
  const innerX = shotCount === 3 ? 220 : 300;
  const innerY = shotCount === 3 ? 245 : 200;
  const innerWidth = shotCount === 3 ? 1360 : 600;
  const innerHeight = shotCount === 3 ? 610 : 1080;
  const viewportAspect = getViewportAspectRatio();
  const slots = getSlots(shotCount).map((slot) =>
    fitSlotToAspect(slot, viewportAspect, shotCount)
  );

  context.clearRect(0, 0, canvas.width, canvas.height);

  context.save();
  context.strokeStyle = frameColor.border;
  context.lineWidth = 7;
  roundedRect(context, outerX, outerY, outerWidth, outerHeight, 54);
  context.stroke();

  context.strokeStyle = frameColor.inner;
  context.lineWidth = 5;
  roundedRect(context, innerX, innerY, innerWidth, innerHeight, 42);
  context.stroke();
  context.restore();

  for (let index = 0; index < slots.length; index += 1) {
    const photo = photos[index];
    if (!photo) continue;

    const slot = slots[index];
    const image = await loadImage(photo);

    const x = innerX + (slot.left / 100) * innerWidth;
    const y = innerY + (slot.top / 100) * innerHeight;
    const w = (slot.width / 100) * innerWidth;
    const h = (slot.height / 100) * innerHeight;
    const radius = shotCount === 3 ? 0 : shotCount === 4 ? 32 : 44;

    context.save();
    roundedRect(context, x, y, w, h, radius);
    context.clip();

    const baseRatio = Math.max(w / image.width, h / image.height);
    const ratio = shotCount === 3 ? baseRatio * 1.18 : baseRatio * 1.06;
    const drawWidth = image.width * ratio;
    const drawHeight = image.height * ratio;
    const drawX = x + (w - drawWidth) / 2;
    const drawY = y + (h - drawHeight) / 2;

    context.drawImage(image, drawX, drawY, drawWidth, drawHeight);
    context.restore();
  }

  return canvas.toDataURL("image/png");
}

async function buildPerShotImages(photos: string[]) {
  const validPhotos = photos.filter(Boolean);
  return Promise.all(
    validPhotos.map(async (photo, index) => ({
      shotOrder: index + 1,
      imageUrl: photo,
    }))
  );
}

function FramePreview({
  shotCount,
  photos,
  frameColor,
}: {
  shotCount: number;
  photos: string[];
  frameColor: FrameColorOption;
}) {
  const viewportAspect = getViewportAspectRatio();
  const frameAspectRatio = getFrameAspectRatio(shotCount);
  const slots = getSlots(shotCount).map((slot) =>
    fitSlotToAspect(slot, viewportAspect, shotCount)
  );

  return (
    <div
      style={{
        width: shotCount === 3 ? "min(88vw, 980px)" : "min(78vw, 520px)",
        aspectRatio: `${frameAspectRatio}`,
        border: `3px solid ${frameColor.border}`,
        borderRadius: 34,
        padding: "22px",
        boxSizing: "border-box",
        background: "rgba(255,255,255,0.22)",
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          border: `2px solid ${frameColor.inner}`,
          borderRadius: 28,
          position: "relative",
          background: "transparent",
        }}
      >
        {slots.map((slot, index) => (
          <div
            key={`${slot.left}-${slot.top}-${index}`}
            style={{
              position: "absolute",
              left: `${slot.left}%`,
              top: `${slot.top}%`,
              width: `${slot.width}%`,
              height: `${slot.height}%`,
              borderRadius: shotCount === 3 ? 0 : shotCount === 4 ? 18 : 24,
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: frameColor.preview,
              border:
                shotCount === 3 ? "none" : `2px dashed ${frameColor.inner}`,
              boxSizing: "border-box",
            }}
          >
            {photos[index] ? (
              <img
                src={photos[index]}
                alt={`${index + 1}번째 컷 결과`}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: shotCount === 3 ? "cover" : "contain",
                  objectPosition:
                    shotCount === 3 ? "center center" : "center",
                  transform: shotCount === 3 ? "scale(1.18)" : "scale(1.06)",
                  transformOrigin: "center center",
                }}
              />
            ) : null}
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
  const frameTitle =
    state.frameTitle ?? storedState?.frameTitle ?? `${shotCount}컷`;
  const photos = state.photos ?? storedState?.photos ?? [];
  const initialMessage = state.message ?? storedState?.message ?? "";

  const [shareCode, setShareCode] = useState("");
  const [isCopied, setIsCopied] = useState(false);
  const [finalImageUrl, setFinalImageUrl] = useState("");
  const [userId, setUserId] = useState("게스트");
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [message, setMessage] = useState(initialMessage);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">(
    "idle"
  );
  const [saveStatusMessage, setSaveStatusMessage] = useState("");
  const [selectedFrameColorKey, setSelectedFrameColorKey] =
    useState<FrameColorOption["key"]>("classic");

  useEffect(() => {
    setShareCode(generateRandomCode());
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadUser = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.error("세션 조회 실패:", error);
          return;
        }

        if (!mounted) return;

        const email = session?.user?.email ?? null;
        setUserId(getDisplayUserId(email));
        setAuthUserId(session?.user?.id ?? null);
      } catch (error) {
        console.error("로그인 사용자 정보 조회 실패:", error);
      }
    };

    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const email = session?.user?.email ?? null;
      setUserId(getDisplayUserId(email));
      setAuthUserId(session?.user?.id ?? null);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!isCopied) return;

    const timer = window.setTimeout(() => {
      setIsCopied(false);
    }, 1800);

    return () => window.clearTimeout(timer);
  }, [isCopied]);

  useEffect(() => {
    if (saveStatus === "idle" || !saveStatusMessage) return;

    const timer = window.setTimeout(() => {
      setSaveStatus("idle");
      setSaveStatusMessage("");
    }, 2500);

    return () => window.clearTimeout(timer);
  }, [saveStatus, saveStatusMessage]);


  useEffect(() => {
    const nextStoredState: ResultState = {
      ...storedState,
      frameId,
      shotCount,
      frameTitle,
      photos,
      message,
    };

    sessionStorage.setItem("photoResultData", JSON.stringify(nextStoredState));
  }, [storedState, frameId, shotCount, frameTitle, photos, message]);

  const selectedFrameColor = useMemo(
    () =>
      FRAME_COLOR_OPTIONS.find((option) => option.key === selectedFrameColorKey) ??
      FRAME_COLOR_OPTIONS[0],
    [selectedFrameColorKey]
  );

  useEffect(() => {
    let cancelled = false;

    const buildResult = async () => {
      if (!photos.length) return;

      try {
        const result = await buildTransparentResultImage(
          photos,
          shotCount,
          selectedFrameColor
        );
        if (!cancelled) {
          setFinalImageUrl(result);
        }
      } catch (error) {
        console.error("결과 이미지 생성 실패:", error);
      }
    };

    buildResult();

    return () => {
      cancelled = true;
    };
  }, [photos, shotCount, selectedFrameColor]);

  const savePayload = useMemo(
    () => ({
      frameId,
      frameTitle,
      shotCount,
      message,
      shareCode,
      userId,
      authUserId,
      resultImageUrl: finalImageUrl,
      frameColorKey: selectedFrameColor.key,
      cuts: photos.filter(Boolean).map((photo, index) => ({
        shotOrder: index + 1,
        imageUrl: photo,
      })),
    }),
    [
      frameId,
      frameTitle,
      shotCount,
      message,
      shareCode,
      userId,
      authUserId,
      finalImageUrl,
      selectedFrameColor,
      photos,
    ]
  );

  const handleGenerateCode = () => {
    setShareCode(generateRandomCode());
    setIsCopied(false);
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(shareCode);
      setIsCopied(true);
    } catch (error) {
      console.error("코드 복사 실패:", error);
      window.alert("코드 복사에 실패했어요. 다시 시도해주세요.");
    }
  };

  const handleDownload = () => {
    if (!finalImageUrl) {
      window.alert("아직 결과 이미지가 준비되지 않았어요.");
      return;
    }

    const safeFrameTitle = getSafeFilePart(
      frameTitle || `${shotCount}컷`,
      `${shotCount}컷`
    );
    const safeCode = getSafeFilePart(shareCode || "photo", "photo");
    downloadDataUrl(finalImageUrl, `${safeFrameTitle}-${safeCode}.png`);
  };

  const handleSave = async () => {
    if (!photos.length) {
      setSaveStatus("error");
      setSaveStatusMessage("저장할 컷이 없어요.");
      window.alert("저장할 컷이 없어요.");
      return;
    }

    if (!authUserId) {
      setSaveStatus("error");
      setSaveStatusMessage("로그인한 사용자 정보가 필요해요.");
      window.alert("로그인한 사용자 정보가 필요해요.");
      return;
    }

    if (!shareCode) {
      setSaveStatus("error");
      setSaveStatusMessage(
        "공유 코드가 없어요. 새 코드 생성 후 다시 시도해주세요."
      );
      window.alert("공유 코드가 없어요. 새 코드 생성 후 다시 시도해주세요.");
      return;
    }

    setIsSaving(true);
    setSaveStatus("idle");
    setSaveStatusMessage("");

    try {
      const resolvedFrameId = await resolveFrameId({
        frameId,
        frameTitle,
        shotCount,
      });
      const safeCode = getSafeFilePart(shareCode || "photo", "photo");
      const safeUserId = getSafeFilePart(userId || "guest", "guest");
      const safeFrameTitle = getSafeFilePart(
        frameTitle || `${shotCount}컷`,
        `${shotCount}컷`
      );
      const sessionId = crypto.randomUUID();
      const perShotImages = await buildPerShotImages(photos);

      if (!perShotImages.length) {
        throw new Error("저장 가능한 컷 이미지가 없어요.");
      }

      const uploadedCuts = await Promise.all(
        perShotImages.map(async (shot) => {
          const shotPath = `sessions/${sessionId}/shots/${shot.shotOrder}-${safeCode}-${safeUserId}.png`;
          await uploadDataUrlToStorage(shotPath, shot.imageUrl);

          return {
            shotOrder: shot.shotOrder,
            originalPath: shotPath,
            processedPath: shotPath,
          };
        })
      );

      let uploadedPreviewPath: string | null = null;
      if (finalImageUrl) {
        uploadedPreviewPath = `sessions/${sessionId}/preview/${safeFrameTitle}-${safeCode}-${safeUserId}.png`;
        await uploadDataUrlToStorage(uploadedPreviewPath, finalImageUrl);
      }

      // frame color 값도 DB에 저장하려면 photo_sessions 테이블에 컬럼을 추가한 뒤 함께 넣어주세요.
      const { data: insertedSession, error: sessionError } = await supabase
        .from("photo_sessions")
        .insert({
          id: sessionId,
          frame_id: resolvedFrameId,
          photographer_id: authUserId,
          frame_owner_id: authUserId,
          user_message: message || null,
          result_image_path: uploadedPreviewPath,
          result_thumbnail_path: uploadedPreviewPath,
          is_saved: true,
        })
        .select("id")
        .single();

      if (sessionError || !insertedSession) {
        throw new Error(
          sessionError?.message || "photo_sessions 저장에 실패했어요."
        );
      }

      const { error: photosError } = await supabase
        .from("session_photos")
        .insert(
          uploadedCuts.map((shot) => ({
            session_id: insertedSession.id,
            shot_order: shot.shotOrder,
            original_path: shot.originalPath,
            processed_path: shot.processedPath,
          }))
        );

      if (photosError) {
        throw new Error(`session_photos 저장 실패: ${photosError.message}`);
      }

      const { error: shareCodeError } = await supabase
        .from("share_codes")
        .insert({
          session_id: insertedSession.id,
          code: shareCode,
          created_by: authUserId,
        });

      if (shareCodeError) {
        throw new Error(`share_codes 저장 실패: ${shareCodeError.message}`);
      }

      console.log("Supabase 저장 완료 payload", {
        ...savePayload,
        frameId: resolvedFrameId,
        sessionId: insertedSession.id,
        uploadedPreviewPath,
        frameColorKey: selectedFrameColor.key,
        cuts: uploadedCuts,
      });

      setSaveStatus("success");
      setSaveStatusMessage("스토리지 업로드와 DB 저장이 모두 완료됐어요.");
    } catch (error) {
      console.error("Supabase 저장 실패:", error);
      setSaveStatus("error");
      setSaveStatusMessage(
        error instanceof Error ? error.message : "저장 중 문제가 발생했어요."
      );
      window.alert(
        error instanceof Error ? error.message : "저장 중 문제가 발생했어요."
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: PAGE_BG,
        display: "grid",
        gridTemplateColumns:
          shotCount === 3
            ? "minmax(760px, 1fr) minmax(320px, 570px)"
            : "minmax(0, 1fr) minmax(320px, 570px)",
      }}
    >
      <section
        style={{
          background: PAGE_BG,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px 24px",
          boxSizing: "border-box",
        }}
      >
        {photos.length > 0 ? (
          <FramePreview
            shotCount={shotCount}
            photos={photos}
            frameColor={selectedFrameColor}
          />
        ) : (
          <div
            style={{
              width:
                shotCount === 3 ? "min(88vw, 980px)" : "min(78vw, 520px)",
              aspectRatio: `${getFrameAspectRatio(shotCount)}`,
              border: "2px dashed rgba(64,80,214,0.28)",
              borderRadius: 34,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: PRIMARY,
              fontSize: 18,
              fontWeight: 600,
            }}
          >
            아직 촬영된 사진이 없어요
          </div>
        )}
      </section>

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
            alt="결과물 확인"
            style={{
              width: "min(290px, 100%)",
              display: "block",
            }}
          />

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              color: WHITE,
            }}
          >
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

            <label
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                fontSize: "16px",
                fontWeight: 400,
                opacity: 0.95,
              }}
            >
              <span>메시지</span>
              <input
                type="text"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="메시지를 입력해주세요"
                maxLength={40}
                style={{
                  width: "100%",
                  height: "44px",
                  borderRadius: "10px",
                  border: "1.5px solid rgba(255,255,255,0.45)",
                  background: "rgba(255,255,255,0.12)",
                  color: WHITE,
                  padding: "0 14px",
                  fontSize: "15px",
                  fontWeight: 500,
                  boxSizing: "border-box",
                  outline: "none",
                }}
              />
            </label>

            <p
              style={{
                margin: 0,
                fontSize: "16px",
                fontWeight: 400,
                opacity: 0.95,
              }}
            >
              프레임 : {frameTitle}
            </p>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "12px",
                flexWrap: "wrap",
              }}
            >
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

              <button
                type="button"
                onClick={handleGenerateCode}
                style={{
                  border: "1.5px solid rgba(255,255,255,0.85)",
                  borderRadius: "999px",
                  background: "transparent",
                  color: WHITE,
                  padding: "8px 14px",
                  fontSize: "13px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                새 코드 생성
              </button>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "10px",
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: "16px",
                  fontWeight: 400,
                  opacity: 0.95,
                }}
              >
                프레임 색상
              </p>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                  gap: "10px",
                }}
              >
                {FRAME_COLOR_OPTIONS.map((option) => {
                  const isSelected = selectedFrameColorKey === option.key;

                  return (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => setSelectedFrameColorKey(option.key)}
                      style={{
                        border: isSelected
                          ? "2px solid rgba(255,255,255,0.96)"
                          : "1px solid rgba(255,255,255,0.32)",
                        borderRadius: "16px",
                        background: "rgba(255,255,255,0.12)",
                        padding: "10px 8px",
                        color: WHITE,
                        cursor: "pointer",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "8px",
                        boxShadow: isSelected
                          ? "0 0 0 2px rgba(255,255,255,0.16)"
                          : "none",
                      }}
                    >
                      <span
                        style={{
                          width: "28px",
                          height: "28px",
                          borderRadius: "999px",
                          background: option.border,
                          border: "2px solid rgba(255,255,255,0.82)",
                          boxSizing: "border-box",
                        }}
                      />
                      <span
                        style={{
                          fontSize: "12px",
                          fontWeight: 700,
                          lineHeight: 1.2,
                          textAlign: "center",
                          wordBreak: "keep-all",
                        }}
                      >
                        {option.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "18px",
              marginTop: "24px",
            }}
          >
            <button
              type="button"
              onClick={handleCopyCode}
              style={{
                width: "100%",
                height: "72px",
                borderRadius: "10px",
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
              onClick={handleDownload}
              style={{
                width: "100%",
                height: "72px",
                borderRadius: "10px",
                border: "none",
                background: "rgba(255,255,255,0.16)",
                color: WHITE,
                fontSize: "18px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              결과 이미지 다운로드
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              style={{
                width: "100%",
                height: "72px",
                borderRadius: "10px",
                border: "2px solid rgba(255,255,255,0.9)",
                background: "transparent",
                color: WHITE,
                fontSize: "18px",
                fontWeight: 700,
                cursor: isSaving ? "not-allowed" : "pointer",
                opacity: isSaving ? 0.7 : 1,
              }}
            >
              {isSaving ? "저장 중..." : "Supabase에 저장하기"}
            </button>

            {saveStatusMessage ? (
              <p
                style={{
                  margin: 0,
                  textAlign: "center",
                  fontSize: "14px",
                  fontWeight: 600,
                  color:
                    saveStatus === "success"
                      ? "rgba(255,255,255,0.96)"
                      : "rgba(255,235,235,0.96)",
                }}
              >
                {saveStatusMessage}
              </p>
            ) : null}

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "18px",
                marginTop: "4px",
              }}
            >
              <button
                type="button"
                onClick={() => navigate("/mypage")}
                style={{
                  background: "none",
                  border: "none",
                  padding: 0,
                  color: "rgba(255,255,255,0.92)",
                  fontSize: "15px",
                  fontWeight: 500,
                  textDecoration: "underline",
                  cursor: "pointer",
                }}
              >
                마이페이지로 가기
              </button>

              <button
                type="button"
                onClick={() => navigate("/")}
                style={{
                  background: "none",
                  border: "none",
                  padding: 0,
                  color: "rgba(255,255,255,0.92)",
                  fontSize: "15px",
                  fontWeight: 500,
                  textDecoration: "underline",
                  cursor: "pointer",
                }}
              >
                홈으로
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}