import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Custom1.css";
import h1 from "../../assets/customlogo.svg";
import { api } from "../../lib/api";

type Frame = {
  id: string;
  title: string;
  shot_count: number;
};

type SessionPhoto = {
  shot_order: number;
  original_path: string | null;
  processed_path: string | null;
};

type Session = {
  id: string;
  frame_id: string;
  frame_owner_id: string | null;
  frame: Frame | null;
  photos: SessionPhoto[] | null;
};

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const OVERLAY_BUCKET = "photo-results";

function getStorageUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  return `${SUPABASE_URL}/storage/v1/object/public/${OVERLAY_BUCKET}/${path}`;
}

export default function Custom1() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;

    setIsLoading(true);
    setError("");

    try {
      const res = await api.share.getByCode(trimmed);
      const session = res.session as Session | null;

      if (!session || !session.frame) {
        setError("프레임 정보를 찾을 수 없어요.");
        return;
      }

      const frame = session.frame;

      const sortedPhotos = [...(session.photos ?? [])].sort((a, b) => a.shot_order - b.shot_order);
      const overlayPhotos = sortedPhotos
        .map((p) => getStorageUrl(p.processed_path ?? p.original_path))
        .filter((u): u is string => !!u);

      navigate("/takephoto", {
        state: {
          frameId: frame.id,
          shotCount: frame.shot_count,
          frameTitle: frame.title || `${frame.shot_count}컷`,
          overlayPhotos,
          sourceType: "other_frame",
          frameOwnerId: session.frame_owner_id ?? undefined,
        },
      });
    } catch {
      setError("코드를 찾을 수 없어요. 다시 확인해주세요.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="custom1-page">
      <button
        type="button"
        className="custom1-back"
        onClick={() => navigate(-1)}
        aria-label="뒤로가기"
      >
        <span className="custom1-back-arrow">‹</span>
      </button>

      <main className="custom1-container">
        <img src={h1} alt="Custom1" className="custom1-logo" />

        <label className="custom1-inputWrap">
          <span className="sr-only">코드 입력</span>
          <input
            className="custom1-input"
            value={code}
            onChange={(e) => { setCode(e.target.value); setError(""); }}
            onKeyDown={(e) => { if (e.key === "Enter" && !isLoading) handleSubmit(); }}
            placeholder="코드 입력"
            inputMode="text"
            autoComplete="off"
            disabled={isLoading}
          />
        </label>

        {error && (
          <p style={{ margin: 0, fontSize: "0.9rem", color: "#ff4d4f", textAlign: "center" }}>
            {error}
          </p>
        )}

        <button
          type="button"
          className="custom1-submit"
          onClick={handleSubmit}
          disabled={!code.trim() || isLoading}
        >
          {isLoading ? "확인 중..." : "입력 완료"}
        </button>
      </main>
    </div>
  );
}