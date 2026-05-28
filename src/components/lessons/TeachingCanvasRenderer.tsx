"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import LessonContentRenderer from "@/components/lessons/LessonContentRenderer";
import type { LessonMediaView } from "@/lib/lessons/lesson-media";
import type { TeachingCanvas } from "@/lib/lessons/teaching-canvas";

interface TeachingCanvasRendererProps {
  sectionId: string;
  sectionTitle: string;
  canvases: TeachingCanvas[];
  media: LessonMediaView[];
}

export default function TeachingCanvasRenderer({
  sectionId,
  sectionTitle,
  canvases,
  media,
}: TeachingCanvasRendererProps) {
  const [canvasIndex, setCanvasIndex] = useState(0);
  const [visibleSteps, setVisibleSteps] = useState(0);
  const frameRef = useRef<HTMLDivElement>(null);
  const [slideScale, setSlideScale] = useState(1);
  const safeCanvases = useMemo(
    () =>
      canvases.length > 0
        ? canvases
        : [
            {
              id: `${sectionId}-fallback`,
              kind: "concept" as const,
              title: sectionTitle,
              html: "",
              notesHtml: "",
              steps: [],
              sourceBlockIds: [],
            },
          ],
    [canvases, sectionId, sectionTitle]
  );
  const canvas = safeCanvases[Math.min(canvasIndex, safeCanvases.length - 1)];
  const hasSteps = canvas.steps.length > 0;
  const canGoBack = canvasIndex > 0 || visibleSteps > 0;
  const canGoForward =
    visibleSteps < canvas.steps.length || canvasIndex < safeCanvases.length - 1;

  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      setSlideScale(entry.contentRect.width / 960);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setCanvasIndex(0);
    setVisibleSteps(0);
  }, [sectionId, safeCanvases.length]);

  useEffect(() => {
    if (canvasIndex < safeCanvases.length) {
      return;
    }

    setCanvasIndex(Math.max(safeCanvases.length - 1, 0));
    setVisibleSteps(0);
  }, [canvasIndex, safeCanvases.length]);

  const goForward = () => {
    if (visibleSteps < canvas.steps.length) {
      setVisibleSteps((current) => current + 1);
      return;
    }

    if (canvasIndex < safeCanvases.length - 1) {
      setCanvasIndex((current) => current + 1);
      setVisibleSteps(0);
    }
  };

  const goBack = () => {
    if (visibleSteps > 0) {
      setVisibleSteps((current) => current - 1);
      return;
    }

    if (canvasIndex > 0) {
      const previous = safeCanvases[canvasIndex - 1];
      setCanvasIndex((current) => current - 1);
      setVisibleSteps(previous?.steps.length || 0);
    }
  };

  const showAllSteps = () => {
    setVisibleSteps(canvas.steps.length);
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target?.closest("input, textarea, select, button, [contenteditable='true']")
      ) {
        return;
      }

      if (event.key === "ArrowRight" || event.key === "PageDown") {
        event.preventDefault();
        goForward();
      }

      if (event.key === "ArrowLeft" || event.key === "PageUp") {
        event.preventDefault();
        goBack();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [canvasIndex, visibleSteps, safeCanvases]);

  return (
    <div className="teaching-canvas-stack">
      <div className="teaching-canvas-toolbar">
        <div>
          <div className="teaching-canvas-kicker">
            Canvas {canvasIndex + 1} / {safeCanvases.length}
          </div>
          <h2>{sectionTitle}</h2>
        </div>
        <div className="teaching-canvas-controls">
          {hasSteps && visibleSteps < canvas.steps.length && (
            <button type="button" onClick={showAllSteps} title="Hiện tất cả">
              <i className="fa-solid fa-eye"></i>
            </button>
          )}
          <button
            type="button"
            onClick={goBack}
            disabled={!canGoBack}
            title="Lùi"
            aria-label="Lùi"
          >
            <i className="fa-solid fa-arrow-left"></i>
          </button>
          <button
            type="button"
            onClick={goForward}
            disabled={!canGoForward}
            title="Tiếp"
            aria-label="Tiếp"
          >
            <i className="fa-solid fa-arrow-right"></i>
          </button>
        </div>
      </div>

      <div ref={frameRef} className="teaching-canvas-frame">
        <div
          className="teaching-canvas-inner"
          style={{ transform: `scale(${slideScale})` }}
        >
          <article className={`teaching-canvas teaching-canvas-${canvas.kind}`}>
            <div className="teaching-canvas-main">
              <div className="teaching-canvas-count">
                {canvas.kind === "code" ? "Code" : canvas.kind === "media" ? "Hình ảnh" : "Ý chính"}
              </div>
              <h3>{canvas.title}</h3>

              {canvas.html.trim() ? (
                <LessonContentRenderer html={canvas.html} media={media} />
              ) : null}

              {hasSteps && (
                <div className="teaching-reveal-list">
                  {canvas.steps.slice(0, visibleSteps).map((step, index) => (
                    <div key={step.id} className="teaching-reveal-step">
                      <span className="teaching-reveal-index">{index + 1}</span>
                      <AnimatedWords
                        text={step.text}
                        animate={index === visibleSteps - 1}
                      />
                    </div>
                  ))}
                  {visibleSteps === 0 && (
                    <div className="teaching-reveal-empty">
                      <i className="fa-solid fa-hand-pointer"></i>
                      Bấm tiếp để mở từng ý
                    </div>
                  )}
                </div>
              )}
            </div>

            <aside className="teaching-canvas-notes">
              <div className="teaching-notes-label">
                <i className="fa-solid fa-pen-nib"></i>
                Ghi chú nhanh
              </div>
              {canvas.notesHtml.trim() ? (
                <LessonContentRenderer html={canvas.notesHtml} media={media} />
              ) : hasSteps ? (
                <p>
                  {visibleSteps}/{canvas.steps.length} ý đã hiện. Dừng ở từng ý để học sinh
                  kịp ghi và hỏi lại.
                </p>
              ) : (
                <p>Giữ phần này làm điểm neo khi giảng, sau đó chuyển canvas kế tiếp.</p>
              )}
            </aside>
          </article>
        </div>
      </div>

      <div className="teaching-canvas-strip">
        {safeCanvases.map((item, index) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              setCanvasIndex(index);
              setVisibleSteps(0);
            }}
            className={index === canvasIndex ? "active" : ""}
            aria-label={`Canvas ${index + 1}: ${item.title}`}
          >
            <span>{index + 1}</span>
          </button>
        ))}
      </div>

      <style jsx global>{`
        .teaching-canvas-stack {
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
        }

        /* ── Toolbar (outside the 16:9 frame) ── */
        .teaching-canvas-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          border: 1px solid #dbeafe;
          border-radius: 1rem;
          background: white;
          padding: 0.85rem 1.15rem;
          box-shadow: 0 4px 16px rgba(15, 23, 42, 0.06);
        }

        .teaching-canvas-kicker {
          color: #2563eb;
          font-size: 0.78rem;
          font-weight: 800;
          letter-spacing: 0.16em;
          text-transform: uppercase;
        }

        .teaching-canvas-toolbar h2 {
          margin-top: 0.2rem;
          color: #0f172a;
          font-size: 1.35rem;
          font-weight: 850;
          line-height: 1.2;
        }

        .teaching-canvas-controls {
          display: flex;
          align-items: center;
          gap: 0.45rem;
        }

        .teaching-canvas-controls button {
          display: inline-flex;
          height: 2.65rem;
          width: 2.65rem;
          align-items: center;
          justify-content: center;
          border-radius: 0.75rem;
          border: 1px solid #cbd5e1;
          background: white;
          color: #334155;
        }

        .teaching-canvas-controls button:disabled {
          cursor: not-allowed;
          opacity: 0.35;
        }

        /* ── 16:9 scale container ── */
        .teaching-canvas-frame {
          position: relative;
          width: 100%;
          aspect-ratio: 16 / 9;
          overflow: hidden;
          border-radius: 1.1rem;
          background: #f1f5fb;
          box-shadow: 0 8px 40px rgba(15, 23, 42, 0.13), 0 0 0 1px rgba(99, 102, 241, 0.1);
        }

        .teaching-canvas-inner {
          position: absolute;
          top: 0;
          left: 0;
          width: 960px;
          height: 540px;
          transform-origin: top left;
        }

        /* ── Slide content (fixed 960×540) ── */
        .teaching-canvas {
          display: grid;
          width: 960px;
          height: 540px;
          grid-template-columns: minmax(0, 1fr) 252px;
          gap: 0.75rem;
          background: #f8fbff;
          padding: 0.75rem;
          overflow: hidden;
        }

        .teaching-canvas-main,
        .teaching-canvas-notes {
          min-width: 0;
          border-radius: 0.85rem;
          border: 1px solid #e2e8f0;
          background: white;
          padding: 1.4rem 1.6rem;
          overflow: hidden;
        }

        .teaching-canvas-count {
          display: inline-flex;
          margin-bottom: 0.7rem;
          border-radius: 999px;
          background: #e0f2fe;
          padding: 0.3rem 0.7rem;
          color: #0369a1;
          font-size: 0.72rem;
          font-weight: 850;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }

        .teaching-canvas-main > h3 {
          margin-bottom: 1rem;
          color: #0f172a;
          font-size: 2.25rem;
          font-weight: 850;
          line-height: 1.1;
        }

        .teaching-reveal-list {
          display: grid;
          gap: 0.6rem;
          margin-top: 0.85rem;
        }

        .teaching-reveal-step {
          display: grid;
          grid-template-columns: 1.9rem minmax(0, 1fr);
          align-items: start;
          gap: 0.7rem;
          border-radius: 0.75rem;
          border: 1px solid #dbeafe;
          background: #f8fafc;
          padding: 0.65rem 0.85rem;
        }

        .teaching-reveal-index {
          display: inline-flex;
          height: 1.9rem;
          width: 1.9rem;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          background: #2563eb;
          color: white;
          font-size: 0.85rem;
          font-weight: 900;
        }

        .teaching-reveal-text {
          margin: 0;
          color: #0f172a;
          font-size: 1.15rem;
          font-weight: 700;
          line-height: 1.5;
        }

        .teaching-reveal-text .word {
          display: inline-block;
        }

        .teaching-reveal-text .word-animate {
          animation: teaching-word-in 420ms both cubic-bezier(0.2, 0.8, 0.2, 1);
        }

        .teaching-reveal-empty {
          display: flex;
          height: 4rem;
          align-items: center;
          justify-content: center;
          gap: 0.55rem;
          border-radius: 0.75rem;
          border: 1px dashed #bfdbfe;
          background: #eff6ff;
          color: #2563eb;
          font-size: 0.9rem;
          font-weight: 800;
        }

        .teaching-canvas-notes {
          background: #fefce8;
          color: #713f12;
          font-size: 0.95rem;
          line-height: 1.6;
        }

        .teaching-notes-label {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          margin-bottom: 0.6rem;
          color: #92400e;
          font-size: 0.72rem;
          font-weight: 900;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        /* ── Dot strip (outside the 16:9 frame) ── */
        .teaching-canvas-strip {
          display: flex;
          flex-wrap: wrap;
          gap: 0.45rem;
          justify-content: center;
        }

        .teaching-canvas-strip button {
          display: inline-flex;
          height: 2rem;
          min-width: 2rem;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          border: 1px solid #cbd5e1;
          background: white;
          color: #475569;
          font-size: 0.78rem;
          font-weight: 850;
        }

        .teaching-canvas-strip button.active {
          border-color: #4f46e5;
          background: #4f46e5;
          color: white;
        }

        @keyframes teaching-word-in {
          from {
            opacity: 0;
            transform: translateY(0.35rem);
            filter: blur(3px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
            filter: blur(0);
          }
        }
      `}</style>
    </div>
  );
}

function AnimatedWords({
  text,
  animate,
}: {
  text: string;
  animate: boolean;
}) {
  const words = text.split(/\s+/).filter(Boolean);

  return (
    <p className="teaching-reveal-text">
      {words.map((word, index) => (
        <span key={`${word}-${index}`}>
          <span
            className={animate ? "word word-animate" : "word"}
            style={{ animationDelay: animate ? `${Math.min(index * 38, 950)}ms` : "0ms" }}
          >
            {word}
          </span>
          {index < words.length - 1 ? " " : ""}
        </span>
      ))}
    </p>
  );
}
