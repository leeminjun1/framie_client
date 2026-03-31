import { useEffect, useRef, useState } from "react";
import h1 from "../../assets/frame_photo.svg";

export default function Photo1() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    let cancelled = false;

    const startCamera = async () => {
      try {
        // Prefer rear camera on mobile; browsers will pick the best available.
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
          // iOS Safari sometimes needs an explicit play call.
          await videoRef.current.play().catch(() => {
            /* ignore - user gesture may be required */
          });
        }
      } catch (e) {
        setError(
          "카메라 권한을 허용해 주세요. (브라우저/기기에서 카메라 접근이 차단되어 있을 수 있어요.)"
        );
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
          src: url('https://cdn.jsdelivr.net/gh/projectnoonnu/2408-3@1.0/Paperlogy-4Regular.woff2') format('woff2');
          font-weight: 400;
          font-display: swap;
        }
      `}</style>
      <header style={{ textAlign: "center", marginBottom: 28 }}>
         <img src={h1} alt="Frame preview" className="custom2-previewImg" style={{ display: "block", margin: "0 auto" }} />

        <p
          style={{
            margin: "14px 0 0",
            fontSize: 20,
            color: "#3047d9",
            fontFamily: "Paperozi",
            fontWeight: 400,
          }}
        >
          프레임과 사진 찍어보아요!!
        </p>
      </header>

      <main
        style={{
          maxWidth: 980,
          margin: "0 auto",
        }}
      >
        <section
          aria-label="카메라 미리보기"
          style={{
            width: "100%",
            aspectRatio: "16 / 9",
            background: "#d9d9d9",
            borderRadius: 2,
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
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
        </section>

        {error ? (
          <p
            role="alert"
            style={{
              margin: "14px 0 0",
              textAlign: "center",
              color: "#5b5b5b",
              fontSize: 14,
            }}
          >
            {error}
          </p>
        ) : null}
      </main>
    </div>
  );
}