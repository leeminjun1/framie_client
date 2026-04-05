import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import h1 from "../../assets/frame_photo.svg";
import { useLocation, useNavigate } from "react-router-dom";
import { api } from "../../lib/api";

const PRIMARY = "#3047d9";

type ResultPayload = {
  frameId: string;
  shotCount: number;
  frameTitle: string;
  photos: string[];
  originals: string[];
  sourceType?: string;
  frameOwnerId?: string;
  overlayPhotos?: string[];
};

function loadImageFromUrl(src: string, crossOrigin = true) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    if (crossOrigin) img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("오버레이 이미지를 불러오지 못했어요."));
    img.src = src;
  });
}

async function compositeOverlay(
  userTransparentBlob: Blob,
  overlayUrl: string,
  side: "left" | "right" = "left"
): Promise<Blob> {
  const userUrl = URL.createObjectURL(userTransparentBlob);
  try {
    const [userImg, overlayImg] = await Promise.all([
      loadImageFromUrl(userUrl, false),
      loadImageFromUrl(overlayUrl, true),
    ]);
    const canvas = document.createElement("canvas");
    canvas.width = userImg.naturalWidth;
    canvas.height = userImg.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("캔버스를 만들 수 없어요.");
    // 오버레이(프레임 주인)를 좌/우 끝으로 붙여서 인생네컷 느낌.
    // 높이를 캔버스에 맞추고(=세로 꽉), 가로는 그에 비례해 스케일.
    const scale = canvas.height / overlayImg.naturalHeight;
    const ow = overlayImg.naturalWidth * scale;
    const oh = canvas.height;
    const ox = side === "left" ? 0 : canvas.width - ow;
    const oy = 0;
    ctx.drawImage(overlayImg, ox, oy, ow, oh);
    ctx.drawImage(userImg, 0, 0);
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("합성 결과를 만들 수 없어요."))),
        "image/png"
      );
    });
  } finally {
    URL.revokeObjectURL(userUrl);
  }
}

async function removeBackground(imageBlob: Blob) {
  return api.images.removeBg(imageBlob);
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
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("사진 캡처에 실패했어요."));
          return;
        }
        resolve(blob);
      },
      "image/jpeg",
      0.92
    );
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
  const rawRetakeIndex = location.state?.retakeIndex;
  const initialPhotos: string[] = Array.isArray(location.state?.photos) ? location.state.photos : [];
  const initialOriginals: string[] = Array.isArray(location.state?.originals) ? location.state.originals : [];
  const overlayPhotos: string[] = Array.isArray(location.state?.overlayPhotos) ? location.state.overlayPhotos : [];
  const sourceType: string | undefined = location.state?.sourceType;
  const frameOwnerId: string | undefined = location.state?.frameOwnerId;
  const isCustomShoot = sourceType === "other_frame";
  const isRetake =
    typeof rawRetakeIndex === "number" && rawRetakeIndex >= 0 && rawRetakeIndex < shotCount;
  const retakeIndex: number | null = isRetake ? rawRetakeIndex : null;
  const [error, setError] = useState<string>("");
  const [currentShotIndex, setCurrentShotIndex] = useState(isRetake ? (retakeIndex as number) : 0);
  const [capturedImages, setCapturedImages] = useState<string[]>(isRetake ? initialPhotos : []);
  const [capturedOriginals, setCapturedOriginals] = useState<string[]>(isRetake ? initialOriginals : []);
  const [isProcessing, setIsProcessing] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isCountingDown, setIsCountingDown] = useState(false);

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

  const handleCaptureShot = useCallback(async () => {
    if (isProcessing || isCountingDown) return;

    if (!frameId) {
      setError("프레임 ID 없이 촬영 중이에요. 저장하려면 프레임 선택 화면에서 다시 들어와 주세요.");
      return;
    }

    if (!videoRef.current) {
      setError("카메라가 아직 준비되지 않았어요.");
      return;
    }

    try {
      setError("");
      setIsCountingDown(true);
      setCountdown(5);

      await new Promise<void>((resolve) => {
        let remaining = 5;

        const interval = window.setInterval(() => {
          remaining -= 1;

          if (remaining > 0) {
            setCountdown(remaining);
            return;
          }

          window.clearInterval(interval);
          setCountdown(null);
          resolve();
        }, 1000);
      });

      if (!videoRef.current) {
        throw new Error("카메라가 아직 준비되지 않았어요.");
      }

      setIsProcessing(true);

      const capturedBlob = await captureVideoFrame(videoRef.current);
      const originalImageUrl = await blobToDataUrl(capturedBlob);
      const userTransparentBlob = await removeBackground(capturedBlob);

      // 커스텀 프레임 촬영이면 이 컷의 오버레이(프레임 주인 사진)를 합성
      const shotIndex = isRetake && retakeIndex !== null ? retakeIndex : currentShotIndex;
      const overlayForShot = isCustomShoot ? overlayPhotos[shotIndex] : undefined;
      const overlaySide: "left" | "right" = shotIndex % 2 === 0 ? "left" : "right";
      let finalBlob: Blob = userTransparentBlob;
      if (overlayForShot) {
        try {
          finalBlob = await compositeOverlay(userTransparentBlob, overlayForShot, overlaySide);
        } catch (e) {
          console.error("오버레이 합성 실패, 원본만 사용:", e);
        }
      }
      const transparentImageUrl = await blobToDataUrl(finalBlob);

      let nextImages: string[];
      let nextOriginals: string[];
      if (isRetake && retakeIndex !== null) {
        nextImages = [...capturedImages];
        nextImages[retakeIndex] = transparentImageUrl;
        nextOriginals = [...capturedOriginals];
        nextOriginals[retakeIndex] = originalImageUrl;
      } else {
        nextImages = [...capturedImages, transparentImageUrl];
        nextOriginals = [...capturedOriginals, originalImageUrl];
      }
      setCapturedImages(nextImages);
      setCapturedOriginals(nextOriginals);

      // 단일 컷 재촬영 모드: 바로 결과 화면으로 돌아가기
      if (isRetake) {
        const resultPayload: ResultPayload = {
          frameId,
          shotCount,
          frameTitle,
          photos: nextImages,
          originals: nextOriginals,
          sourceType,
          frameOwnerId,
          overlayPhotos: isCustomShoot ? overlayPhotos : undefined,
        };
        sessionStorage.setItem("photoResultData", JSON.stringify(resultPayload));
        navigate("/photo/result", { state: resultPayload });
        return;
      }

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
        originals: nextOriginals,
        sourceType,
        frameOwnerId,
        overlayPhotos: isCustomShoot ? overlayPhotos : undefined,
      };

      sessionStorage.setItem("photoResultData", JSON.stringify(resultPayload));

      navigate("/photo/result", {
        state: resultPayload,
      });
    } catch (captureError) {
      const message = captureError instanceof Error ? captureError.message : "사진 처리 중 오류가 발생했어요.";
      setError(message);
      setCountdown(null);
    } finally {
      setIsCountingDown(false);
      setIsProcessing(false);
    }
  }, [capturedImages, capturedOriginals, currentShotIndex, frameId, frameTitle, isCountingDown, isProcessing, isRetake, retakeIndex, navigate, shotCount, isCustomShoot, overlayPhotos, sourceType, frameOwnerId]);

  const handleResetShots = () => {
    setCurrentShotIndex(0);
    setCapturedImages([]);
    setCapturedOriginals([]);
    setError("");
    setCountdown(null);
    setIsCountingDown(false);
    sessionStorage.removeItem("photoResultData");
  };
  return (
    <div className="framie-takephoto-page">
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

        @keyframes countdownPulse {
          0% {
            transform: scale(0.78);
            opacity: 0.42;
          }
          45% {
            transform: scale(1);
            opacity: 1;
          }
          100% {
            transform: scale(1.12);
            opacity: 0.22;
          }
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
            {isRetake
              ? `${(retakeIndex as number) + 1}번째 컷을 다시 찍어요`
              : `${frameTitle} 촬영을 준비하고 있어요`}
          </p>
        </header>

        <main className="framie-takephoto-grid">
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

            {isCustomShoot && overlayPhotos[currentShotIndex] ? (
              <img
                src={overlayPhotos[currentShotIndex]}
                alt="프레임 오버레이"
                crossOrigin="anonymous"
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  objectPosition: currentShotIndex % 2 === 0 ? "left center" : "right center",
                  pointerEvents: "none",
                  opacity: 0.75,
                  zIndex: 1,
                }}
              />
            ) : null}

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
              {isRetake
                ? `${(retakeIndex as number) + 1} / ${shotCount} 컷 재촬영 중`
                : `${Math.min(currentShotIndex + 1, shotCount)} / ${shotCount} 컷 진행 중`}
            </div>

            {isCountingDown && countdown ? (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "rgba(15, 23, 42, 0.28)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 14,
                  zIndex: 2,
                  backdropFilter: "blur(2px)",
                }}
              >
                <div
                  style={{
                    width: 140,
                    height: 140,
                    borderRadius: "50%",
                    background: "rgba(255,255,255,0.2)",
                    border: "2px solid rgba(255,255,255,0.58)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    animation: "countdownPulse 1s ease-in-out infinite",
                    boxShadow: "0 18px 40px rgba(15, 23, 42, 0.22)",
                  }}
                >
                  <span
                    style={{
                      color: "#ffffff",
                      fontFamily: "Paperozi",
                      fontWeight: 600,
                      fontSize: 58,
                      lineHeight: 1,
                    }}
                  >
                    {countdown}
                  </span>
                </div>

                <p
                  style={{
                    margin: 0,
                    color: "#ffffff",
                    fontFamily: "Paperozi",
                    fontWeight: 400,
                    fontSize: 18,
                    textShadow: "0 6px 18px rgba(15, 23, 42, 0.3)",
                  }}
                >
                  잠시만요, 곧 촬영돼요
                </p>
              </div>
            ) : null}
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
                사진을 찍으면 배경 제거 후 투명 PNG 상태로 결과 화면에 넘겨져요.
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
                        {isActive
                          ? isRetake
                            ? "재촬영 차례"
                            : "현재 촬영 차례"
                          : isDone
                          ? "촬영 완료"
                          : "대기 중"}
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
                disabled={isProcessing || isCountingDown}
                style={{
                  border: "none",
                  borderRadius: 18,
                  background: PRIMARY,
                  color: "#ffffff",
                  fontFamily: "Paperozi",
                  fontWeight: 600,
                  fontSize: 16,
                  padding: "16px 18px",
                  cursor: isProcessing || isCountingDown ? "wait" : "pointer",
                  opacity: isProcessing || isCountingDown ? 0.72 : 1,
                }}
              >
                {isCountingDown
                  ? `${countdown ?? 5}초 후 촬영`
                  : isProcessing
                  ? "배경 제거 중..."
                  : isRetake
                  ? "다시 찍기"
                  : currentShotIndex === shotCount - 1
                  ? "마지막 사진 찍기"
                  : "사진 찍기"}
              </button>

              {!isRetake && (
                <button
                  type="button"
                  onClick={handleResetShots}
                  disabled={isProcessing || isCountingDown}
                  style={{
                    border: "1.5px solid rgba(48, 71, 217, 0.22)",
                    borderRadius: 18,
                    background: "#ffffff",
                    color: PRIMARY,
                    fontFamily: "Paperozi",
                    fontWeight: 400,
                    fontSize: 15,
                    padding: "14px 18px",
                    cursor: isProcessing || isCountingDown ? "not-allowed" : "pointer",
                    opacity: isProcessing || isCountingDown ? 0.68 : 1,
                  }}
                >
                  처음부터 다시 찍기
                </button>
              )}
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