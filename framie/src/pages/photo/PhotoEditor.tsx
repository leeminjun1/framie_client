import { useCallback, useEffect, useRef, useState } from "react";

type Mode = "erase" | "restore";

type Props = {
  transparentSrc: string;
  originalSrc: string | null;
  hasTransparentBg?: boolean;
  onCancel: () => void;
  onApply: (dataUrl: string) => void;
};

const PRIMARY = "#4050d6";
const ERASE_COLOR = "rgba(255,80,80,0.95)";
const RESTORE_COLOR = "rgba(46,204,113,0.95)";
const MAX_HISTORY = 30;

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("이미지를 불러오지 못했어요."));
    img.src = src;
  });
}

export default function PhotoEditor({ transparentSrc, originalSrc, hasTransparentBg = true, onCancel, onApply }: Props) {
  const displayRef = useRef<HTMLCanvasElement | null>(null);
  const workingRef = useRef<HTMLCanvasElement | null>(null);
  const originalRef = useRef<HTMLCanvasElement | null>(null);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);
  const cursorRef = useRef<{ x: number; y: number } | null>(null);
  const drawingRef = useRef(false);

  const historyRef = useRef<ImageData[]>([]);
  const historyIndexRef = useRef(-1);

  const [mode, setMode] = useState<Mode>("erase");
  const [brushSize, setBrushSize] = useState(40);
  const [hasOriginal, setHasOriginal] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const pushHistory = useCallback(() => {
    const working = workingRef.current;
    if (!working) return;
    const ctx = working.getContext("2d");
    if (!ctx) return;
    const data = ctx.getImageData(0, 0, working.width, working.height);
    const idx = historyIndexRef.current;
    historyRef.current = historyRef.current.slice(0, idx + 1);
    historyRef.current.push(data);
    if (historyRef.current.length > MAX_HISTORY) historyRef.current.shift();
    historyIndexRef.current = historyRef.current.length - 1;
    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(false);
  }, []);

  const applyHistoryState = useCallback((index: number) => {
    const working = workingRef.current;
    if (!working) return;
    const ctx = working.getContext("2d");
    if (!ctx) return;
    const data = historyRef.current[index];
    if (!data) return;
    ctx.putImageData(data, 0, 0);
    historyIndexRef.current = index;
    setCanUndo(index > 0);
    setCanRedo(index < historyRef.current.length - 1);
  }, []);

  const handleUndo = useCallback(() => {
    if (historyIndexRef.current <= 0) return;
    applyHistoryState(historyIndexRef.current - 1);
  }, [applyHistoryState]);

  const handleRedo = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    applyHistoryState(historyIndexRef.current + 1);
  }, [applyHistoryState]);

  const redraw = useCallback(() => {
    const display = displayRef.current;
    const working = workingRef.current;
    if (!display || !working) return;
    const ctx = display.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, display.width, display.height);

    // 복원 모드 + 투명 배경일 때 원본을 30%로 미리보기
    if (mode === "restore" && hasTransparentBg && originalRef.current) {
      ctx.save();
      ctx.globalAlpha = 0.3;
      ctx.drawImage(originalRef.current, 0, 0);
      ctx.restore();
    }

    ctx.drawImage(working, 0, 0);
    const pos = cursorRef.current;
    if (pos) {
      ctx.save();
      ctx.strokeStyle = mode === "erase" ? ERASE_COLOR : RESTORE_COLOR;
      ctx.lineWidth = Math.max(2, display.width / 500);
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, brushSize / 2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }, [mode, brushSize, hasTransparentBg]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const tImg = await loadImage(transparentSrc);
        if (cancelled) return;
        const w = tImg.naturalWidth;
        const h = tImg.naturalHeight;

        const working = document.createElement("canvas");
        working.width = w;
        working.height = h;
        const wctx = working.getContext("2d");
        if (!wctx) return;
        wctx.drawImage(tImg, 0, 0);
        workingRef.current = working;

        let originalLoaded = false;
        if (originalSrc) {
          try {
            const oImg = await loadImage(originalSrc);
            if (cancelled) return;
            const orig = document.createElement("canvas");
            orig.width = w;
            orig.height = h;
            const octx = orig.getContext("2d");
            if (octx) {
              octx.drawImage(oImg, 0, 0, w, h);
              originalRef.current = orig;
              originalLoaded = true;
            }
          } catch {
            /* fallback below */
          }
        }
        if (!originalLoaded) {
          const fallback = document.createElement("canvas");
          fallback.width = w;
          fallback.height = h;
          const fctx = fallback.getContext("2d");
          if (fctx) {
            fctx.drawImage(tImg, 0, 0);
            originalRef.current = fallback;
          }
        }
        setHasOriginal(true);

        const display = displayRef.current;
        if (display) {
          display.width = w;
          display.height = h;
        }

        // 초기 히스토리 저장
        historyRef.current = [];
        historyIndexRef.current = -1;
        const initData = wctx.getImageData(0, 0, w, h);
        historyRef.current.push(initData);
        historyIndexRef.current = 0;

        redraw();
        setIsReady(true);
      } catch (e) {
        console.error(e);
      }
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transparentSrc, originalSrc]);

  useEffect(() => { redraw(); }, [redraw]);

  // 키보드 단축키 (Ctrl+Z, Ctrl+Shift+Z)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleUndo, handleRedo]);

  const applyDot = (x: number, y: number) => {
    const working = workingRef.current;
    if (!working) return;
    const ctx = working.getContext("2d");
    if (!ctx) return;
    ctx.save();
    if (mode === "erase") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = "rgba(0,0,0,1)";
      ctx.beginPath();
      ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      const orig = originalRef.current;
      if (orig) {
        ctx.beginPath();
        ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(orig, 0, 0);
      }
    }
    ctx.restore();
  };

  const applyLine = (from: { x: number; y: number }, to: { x: number; y: number }) => {
    const working = workingRef.current;
    if (!working) return;
    const ctx = working.getContext("2d");
    if (!ctx) return;
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = brushSize;
    if (mode === "erase") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.strokeStyle = "rgba(0,0,0,1)";
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
    } else {
      const orig = originalRef.current;
      if (orig) {
        const pattern = ctx.createPattern(orig, "no-repeat");
        if (pattern) {
          ctx.strokeStyle = pattern;
          ctx.beginPath();
          ctx.moveTo(from.x, from.y);
          ctx.lineTo(to.x, to.y);
          ctx.stroke();
        }
      }
    }
    ctx.restore();
  };

  const getPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = e.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isReady) return;
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    drawingRef.current = true;
    const pos = getPos(e);
    lastPosRef.current = pos;
    cursorRef.current = pos;
    applyDot(pos.x, pos.y);
    redraw();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const pos = getPos(e);
    cursorRef.current = pos;
    if (drawingRef.current && lastPosRef.current) {
      applyLine(lastPosRef.current, pos);
      lastPosRef.current = pos;
    }
    redraw();
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (drawingRef.current) {
      pushHistory();
    }
    drawingRef.current = false;
    lastPosRef.current = null;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
  };

  const handlePointerLeave = () => {
    cursorRef.current = null;
    redraw();
  };

  const handleReset = async () => {
    const working = workingRef.current;
    if (!working) return;
    try {
      const img = await loadImage(transparentSrc);
      const ctx = working.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, working.width, working.height);
      ctx.drawImage(img, 0, 0);
      pushHistory();
      redraw();
    } catch (e) {
      console.error(e);
    }
  };

  const handleApply = () => {
    const working = workingRef.current;
    if (!working) return;
    const dataUrl = working.toDataURL("image/png");
    onApply(dataUrl);
  };

  const UndoIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="1 4 1 10 7 10" />
      <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
    </svg>
  );

  const RedoIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10" />
      <path d="M20.49 15a9 9 0 1 1-2.13-9.36L23 10" />
    </svg>
  );

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(6,10,30,0.84)",
        zIndex: 300,
        display: "flex",
        flexDirection: "column",
        padding: "20px",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          color: "#fff",
          marginBottom: 16,
        }}
      >
        <div>
          <p style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>직접 수정</p>
          <p style={{ margin: "4px 0 0", fontSize: 13, opacity: 0.82 }}>
            {mode === "erase"
              ? "지울 영역을 브러시로 칠해주세요"
              : "복원할 영역을 브러시로 칠해주세요"}
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          aria-label="닫기"
          style={{
            background: "rgba(255,255,255,0.12)",
            border: "none",
            color: "#fff",
            width: 40,
            height: 40,
            borderRadius: 999,
            fontSize: 18,
            cursor: "pointer",
          }}
        >
          ✕
        </button>
      </div>

      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          minHeight: 0,
        }}
      >
        <div
          style={{
            position: "relative",
            maxWidth: "100%",
            maxHeight: "100%",
            background:
              "repeating-conic-gradient(#2a2f4a 0% 25%, #1f2336 0% 50%) 50% / 24px 24px",
            borderRadius: 16,
            overflow: "hidden",
            boxShadow: "0 24px 60px rgba(0,0,0,0.35)",
          }}
        >
          <canvas
            ref={displayRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onPointerLeave={handlePointerLeave}
            style={{
              display: "block",
              maxWidth: "min(86vw, 900px)",
              maxHeight: "64vh",
              width: "auto",
              height: "auto",
              cursor: "crosshair",
              touchAction: "none",
            }}
          />
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 16 }}>
        {/* Mode + Undo/Redo row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            justifyContent: "center",
          }}
        >
          <button
            type="button"
            onClick={handleUndo}
            disabled={!canUndo}
            aria-label="되돌리기 (Ctrl+Z)"
            title="되돌리기 (Ctrl+Z)"
            style={{
              width: 40,
              height: 40,
              borderRadius: 999,
              border: "none",
              background: canUndo ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.06)",
              color: canUndo ? "#fff" : "rgba(255,255,255,0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: canUndo ? "pointer" : "not-allowed",
            }}
          >
            <UndoIcon />
          </button>
          <button
            type="button"
            onClick={handleRedo}
            disabled={!canRedo}
            aria-label="앞으로 (Ctrl+Shift+Z)"
            title="앞으로 (Ctrl+Shift+Z)"
            style={{
              width: 40,
              height: 40,
              borderRadius: 999,
              border: "none",
              background: canRedo ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.06)",
              color: canRedo ? "#fff" : "rgba(255,255,255,0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: canRedo ? "pointer" : "not-allowed",
            }}
          >
            <RedoIcon />
          </button>

          <div style={{ width: 1, height: 28, background: "rgba(255,255,255,0.18)" }} />

          <button
            type="button"
            onClick={() => setMode("erase")}
            style={{
              padding: "10px 18px",
              borderRadius: 999,
              border: "none",
              background: mode === "erase" ? "#ff5f5f" : "rgba(255,255,255,0.14)",
              color: "#fff",
              fontSize: 14,
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            지우개
          </button>
          <button
            type="button"
            onClick={() => hasOriginal && setMode("restore")}
            disabled={!hasOriginal}
            title={!hasOriginal ? "원본 이미지가 없어 복원할 수 없어요" : ""}
            style={{
              padding: "10px 18px",
              borderRadius: 999,
              border: "none",
              background: mode === "restore" ? "#2ecc71" : "rgba(255,255,255,0.14)",
              color: "#fff",
              fontSize: 14,
              fontWeight: 800,
              cursor: hasOriginal ? "pointer" : "not-allowed",
              opacity: hasOriginal ? 1 : 0.45,
            }}
          >
            복원
          </button>

        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            justifyContent: "center",
            color: "#fff",
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 600, opacity: 0.85 }}>브러시 굵기</span>
          <input
            type="range"
            min={8}
            max={140}
            value={brushSize}
            onChange={(e) => setBrushSize(Number(e.target.value))}
            style={{ width: 180 }}
          />
          <span style={{ fontSize: 13, fontWeight: 700, minWidth: 32, textAlign: "right" }}>
            {brushSize}
          </span>
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={handleReset}
            style={{
              padding: "12px 20px",
              borderRadius: 14,
              border: "1.5px solid rgba(255,255,255,0.35)",
              background: "transparent",
              color: "#fff",
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            초기화
          </button>
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: "12px 20px",
              borderRadius: 14,
              border: "none",
              background: "rgba(255,255,255,0.16)",
              color: "#fff",
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={!isReady}
            style={{
              padding: "12px 24px",
              borderRadius: 14,
              border: "none",
              background: PRIMARY,
              color: "#fff",
              fontSize: 14,
              fontWeight: 800,
              cursor: isReady ? "pointer" : "not-allowed",
              opacity: isReady ? 1 : 0.6,
            }}
          >
            적용
          </button>
        </div>
      </div>
    </div>
  );
}
