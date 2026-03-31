import { useEffect, useMemo, useRef, useState } from "react";
import h1 from "../../assets/frame_photo.svg";
import { useLocation, useNavigate } from "react-router-dom";

const PRIMARY = "#3047d9";
const REMOVEBG_API_URL = "https://api.remove.bg/v1.0/removebg";

type RemoveBgErrorResponse = {
  errors?: Array<{ title?: string }>;
};

type ResultPayload = {
  frameId: string;
  shotCount: number;
  frameTitle: string;
  photos: string[];
};

async function removeBackground(imageBlob: Blob) {
  const apiKey = import.meta.env.VITE_REMOVEBG_API_KEY;

  if (!apiKey) {
    throw new Error("remove.bg API 키가 없어요. .env 설정을 확인해 주세요.");
  }

  const formData = new FormData();
  formData.append("image_file", imageBlob, "capture.png");
  formData.append("size", "auto");
  formData.append("format", "png");

  const response = await fetch(REMOVEBG_API_URL, {
    method: "POST",
    headers: {
      "X-Api-Key": apiKey,
    },
    body: formData,
  });

  if (!response.ok) {
    let message = "배경 제거에 실패했어요.";

    try {
      const errorData = (await response.json()) as RemoveBgErrorResponse;
      if (errorData.errors?.[0]?.title) {
        message = errorData.errors[0].title;
      }
    } catch {
      // ignore
    }

    throw new Error(message);
  }

  return response.blob();
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("이미지 변환에 실패했어요."));
      }
    };
    reader.onerror = () => reject(new Error("이미지 변환에 실패했어요."));
    reader.readAsDataURL(blob);
  });
}

function captureVideoFrame(video: HTMLVideoElement) {
  const canvas = document.createElement("canvas");
  const width = video.videoWidth || 1280;
  const height = video.videoHeight || 720;

  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("카메라 캡처를 처리할 수 없어요.");
  }

  context.save();
  context.translate(width, 0);
  context.scale(-1, 1);
  context.drawImage(video, 0, 0, width, height);
  context.restore();

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("사진 캡처에 실패했어요."));
        return;
      }
      resolve(blob);
    }, "image/png");
  });
}

export default function TakePhoto() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const frameId = location.state?.frameId || "";
  const shotCount = Number(location.state?.shotCount) || 2;
  const frameTitle = location.state?.frameTitle || `${shotCount}컷`;
  const [error, setError] = useState<string>("");
  const [currentShotIndex, setCurrentShotIndex] = useState(0);
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const shotSlots = useMemo(() => Array.from({ length: shotCount }, (_, index) => index), [shotCount]);

  useEffect(() => {
    let cancelled = false;

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {
            /* ignore */
          });
        }
      } catch {
        setError("카메라 권한을 허용해 주세요. 브라우저에서 카메라 접근이 차단되었을 수 있어요.");
      }
    };

    startCamera();

    return () => {
      cancelled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, []);

  const handleCaptureShot = async () => {
    if (isProcessing) return;

    if (!frameId) {
      setError("프레임 ID 없이 촬영 중이에요. 저장하려면 프레임 선택 화면에서 다시 들어와 주세요.");
    }

    if (!videoRef.current) {
      setError("카메라가 아직 준비되지 않았어요.");
      return;
    }

    try {
      setError("");
      setIsProcessing(true);

      const capturedBlob = await captureVideoFrame(videoRef.current);
      const transparentBlob = await removeBackground(capturedBlob);
      const transparentImageUrl = await blobToDataUrl(transparentBlob);

      const nextImages = [...capturedImages, transparentImageUrl];
      setCapturedImages(nextImages);

      const isLastShot = currentShotIndex >= shotCount - 1;

      if (!isLastShot) {
        setCurrentShotIndex((prev) => prev + 1);
        return;
      }

      const resultPayload: ResultPayload = {
        frameId,
        shotCount,
        frameTitle,
        photos: nextImages,
      };

      sessionStorage.setItem("photoResultData", JSON.stringify(resultPayload));

      navigate("/photo/result", {
        state: resultPayload,
      });
    } catch (captureError) {
      const message = captureError instanceof Error ? captureError.message : "사진 처리 중 오류가 발생했어요.";
      setError(message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResetShots = () => {
    setCurrentShotIndex(0);
    setCapturedImages([]);
    setError("");
    sessionStorage.removeItem("photoResultData");
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#fbf9f3",
        padding: "56px 24px 64px",
        boxSizing: "border-box",
      }}
    >
      <style>{`
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
      `}</style>

      <div style={{ maxWidth: 1080, margin: "0 auto" }}>
        <button
          type="button"
          onClick={() => navigate(-1)}
          style={{
            border: "none",
            background: "transparent",
            color: PRIMARY,
            fontFamily: "Paperozi",
            fontWeight: 600,
            fontSize: 16,
            cursor: "pointer",
            padding: 0,
            marginBottom: 20,
          }}
        >
          ← 돌아가기
        </button>

        <header style={{ textAlign: "center", marginBottom: 28 }}>
          <img
            src={h1}
            alt="Frame preview"
            className="custom2-previewImg"
            style={{ display: "block", margin: "0 auto" }}
          />

          <p
            style={{
              margin: "14px 0 0",
              fontSize: 20,
              color: PRIMARY,
              fontFamily: "Paperozi",
              fontWeight: 400,
            }}
          >
            {frameTitle} 촬영을 준비하고 있어요
          </p>
        </header>

        <main
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) 320px",
            gap: 24,
            alignItems: "start",
          }}
        >
          <section
            aria-label="카메라 미리보기"
            style={{
              width: "100%",
              aspectRatio: "16 / 9",
              background: "#d9d9d9",
              borderRadius: 24,
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
              boxShadow: "0 16px 40px rgba(48, 71, 217, 0.08)",
            }}
          >
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
                transform: "scaleX(-1)",
              }}
            />

            <div
              style={{
                position: "absolute",
                top: 18,
                left: 18,
                padding: "10px 14px",
                borderRadius: 999,
                background: "rgba(255,255,255,0.88)",
                color: PRIMARY,
                fontFamily: "Paperozi",
                fontWeight: 600,
                fontSize: 15,
              }}
            >
              {Math.min(currentShotIndex + 1, shotCount)} / {shotCount} 컷 진행 중
            </div>
          </section>

          <aside
            style={{
              background: "rgba(255,255,255,0.95)",
              border: "1.5px solid rgba(48, 71, 217, 0.14)",
              borderRadius: 28,
              padding: 24,
              boxShadow: "0 12px 30px rgba(48, 71, 217, 0.06)",
              display: "flex",
              flexDirection: "column",
              gap: 20,
            }}
          >
            <div>
              <p
                style={{
                  margin: 0,
                  fontFamily: "Paperozi",
                  fontWeight: 600,
                  fontSize: 22,
                  color: PRIMARY,
                }}
              >
                컷 진행 상태
              </p>
              <p
                style={{
                  margin: "8px 0 0",
                  fontFamily: "Paperozi",
                  fontWeight: 400,
                  fontSize: 14,
                  color: "#5b67b8",
                  lineHeight: 1.5,
                }}
              >
                사진을 찍으면 remove.bg로 배경 제거 후 투명 PNG 상태로 결과 화면에 넘겨져요.
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {shotSlots.map((slotIndex) => {
                const isActive = slotIndex === currentShotIndex;
                const isDone = slotIndex < capturedImages.length;

                return (
                  <div
                    key={slotIndex}
                    style={{
                      borderRadius: 18,
                      padding: "14px 16px",
                      border: isActive
                        ? `2px solid ${PRIMARY}`
                        : "1.5px solid rgba(48, 71, 217, 0.16)",
                      background: isDone
                        ? "rgba(48, 71, 217, 0.08)"
                        : isActive
                        ? "rgba(48, 71, 217, 0.05)"
                        : "#ffffff",
                      fontFamily: "Paperozi",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 12,
                      }}
                    >
                      <span
                        style={{
                          fontWeight: 600,
                          color: PRIMARY,
                          fontSize: 16,
                        }}
                      >
                        {slotIndex + 1}번째 컷
                      </span>
                      <span
                        style={{
                          fontWeight: 400,
                          color: "#6874c8",
                          fontSize: 13,
                        }}
                      >
                        {isDone ? "촬영 완료" : isActive ? "현재 촬영 차례" : "대기 중"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button
                type="button"
                onClick={handleCaptureShot}
                disabled={isProcessing}
                style={{
                  border: "none",
                  borderRadius: 18,
                  background: PRIMARY,
                  color: "#ffffff",
                  fontFamily: "Paperozi",
                  fontWeight: 600,
                  fontSize: 16,
                  padding: "16px 18px",
                  cursor: isProcessing ? "wait" : "pointer",
                  opacity: isProcessing ? 0.72 : 1,
                }}
              >
                {isProcessing
                  ? "배경 제거 중..."
                  : currentShotIndex === shotCount - 1
                  ? "마지막 사진 찍기"
                  : "사진 찍기"}
              </button>

              <button
                type="button"
                onClick={handleResetShots}
                style={{
                  border: "1.5px solid rgba(48, 71, 217, 0.22)",
                  borderRadius: 18,
                  background: "#ffffff",
                  color: PRIMARY,
                  fontFamily: "Paperozi",
                  fontWeight: 400,
                  fontSize: 15,
                  padding: "14px 18px",
                  cursor: "pointer",
                }}
              >
                처음부터 다시 찍기
              </button>
            </div>

            {capturedImages.length > 0 ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
                {capturedImages.map((image, index) => (
                  <div
                    key={`${image}-${index}`}
                    style={{
                      borderRadius: 14,
                      background: "rgba(48, 71, 217, 0.05)",
                      minHeight: 92,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      overflow: "hidden",
                      border: "1px solid rgba(48, 71, 217, 0.1)",
                    }}
                  >
                    <img
                      src={image}
                      alt={`${index + 1}번째 컷 미리보기`}
                      style={{ width: "100%", height: "100%", objectFit: "contain" }}
                    />
                  </div>
                ))}
              </div>
            ) : null}

            {error ? (
              <p
                role="alert"
                style={{
                  margin: 0,
                  color: "#5b5b5b",
                  fontSize: 14,
                  fontFamily: "Paperozi",
                  lineHeight: 1.5,
                }}
              >
                {error}
              </p>
            ) : null}
          </aside>
        </main>
      </div>
    </div>
  );
}