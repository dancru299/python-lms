"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import LessonContentRenderer from "@/components/lessons/LessonContentRenderer";
import { sanitizeLessonHtml } from "@/lib/sanitize-html";
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
    if (canvasIndex < safeCanvases.length) return;
    setCanvasIndex(Math.max(safeCanvases.length - 1, 0));
    setVisibleSteps(0);
  }, [canvasIndex, safeCanvases.length]);

  const goForward = () => {
    if (visibleSteps < canvas.steps.length) {
      setVisibleSteps((c) => c + 1);
      return;
    }
    if (canvasIndex < safeCanvases.length - 1) {
      setCanvasIndex((c) => c + 1);
      setVisibleSteps(0);
    }
  };

  const goBack = () => {
    if (visibleSteps > 0) {
      setVisibleSteps((c) => c - 1);
      return;
    }
    if (canvasIndex > 0) {
      const previous = safeCanvases[canvasIndex - 1];
      setCanvasIndex((c) => c - 1);
      setVisibleSteps(previous?.steps.length || 0);
    }
  };

  const showAllSteps = () => setVisibleSteps(canvas.steps.length);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, button, [contenteditable='true']")) return;
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
          <button type="button" onClick={goBack} disabled={!canGoBack} aria-label="Lùi">
            <i className="fa-solid fa-arrow-left"></i>
          </button>
          <button type="button" onClick={goForward} disabled={!canGoForward} aria-label="Tiếp">
            <i className="fa-solid fa-arrow-right"></i>
          </button>
        </div>
      </div>

      <div ref={frameRef} className="teaching-canvas-frame">
        <div className="teaching-canvas-inner" style={{ transform: `scale(${slideScale})` }}>
          <CanvasSlide canvas={canvas} media={media} visibleSteps={visibleSteps} hasSteps={hasSteps} />
        </div>
      </div>

      <div className="teaching-canvas-strip">
        {safeCanvases.map((item, index) => (
          <button
            key={item.id}
            type="button"
            onClick={() => { setCanvasIndex(index); setVisibleSteps(0); }}
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

        /* ── Base slide ── */
        .teaching-canvas {
          width: 960px;
          height: 540px;
          overflow: hidden;
          background: #f8fbff;
          padding: 2.25rem 2.75rem;
          display: flex;
          flex-direction: column;
          box-sizing: border-box;
        }

        .canvas-kicker {
          display: inline-flex;
          margin-bottom: 0.65rem;
          border-radius: 999px;
          background: #e0f2fe;
          padding: 0.25rem 0.65rem;
          color: #0369a1;
          font-size: 0.72rem;
          font-weight: 850;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          width: fit-content;
        }

        .canvas-kicker.kicker-purple { background: #ede9fe; color: #6d28d9; }
        .canvas-kicker.kicker-teal   { background: #ccfbf1; color: #0d9488; }
        .canvas-kicker.kicker-amber  { background: #fef3c7; color: #92400e; }

        .canvas-title {
          margin: 0 0 0.9rem;
          color: #0f172a;
          font-size: 2.1rem;
          font-weight: 850;
          line-height: 1.15;
        }

        /* ── Concept / text ── */
        .teaching-canvas-concept .canvas-body {
          overflow: hidden;
          font-size: 1.05rem;
          color: #1e293b;
          line-height: 1.65;
        }

        /* ── Hero ── */
        .teaching-canvas-hero {
          background: linear-gradient(135deg, #0c2340 0%, #1a3a6b 60%, #0c2340 100%);
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 2.5rem 4rem;
        }

        .canvas-hero-kicker {
          display: inline-flex;
          margin-bottom: 1.2rem;
          border-radius: 999px;
          border: 1px solid rgba(99,179,237,0.35);
          background: rgba(99,179,237,0.12);
          padding: 0.3rem 0.9rem;
          color: #63b3ed;
          font-size: 0.72rem;
          font-weight: 850;
          letter-spacing: 0.18em;
          text-transform: uppercase;
        }

        .canvas-hero-title {
          margin: 0 0 1.1rem;
          color: #fff;
          font-size: 3.4rem;
          font-weight: 900;
          line-height: 1.1;
          letter-spacing: -0.01em;
          text-wrap: balance;
        }

        .canvas-hero-sub {
          color: #63b3ed;
          font-size: 1.3rem;
          font-weight: 600;
          line-height: 1.5;
        }

        .canvas-hero-sub p { margin: 0; }

        /* ── Cards ── */
        .teaching-canvas-cards {
          padding: 1.75rem 2.25rem;
        }

        .teaching-canvas-cards .canvas-title {
          font-size: 1.85rem;
          margin-bottom: 1.4rem;
        }

        .canvas-cards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
          flex: 1;
        }

        .canvas-card {
          background: #0c2340;
          border-radius: 1rem;
          padding: 1.4rem 1.25rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 0.6rem;
        }

        .canvas-card-icon {
          display: flex;
          height: 3rem;
          width: 3rem;
          align-items: center;
          justify-content: center;
          border-radius: 0.75rem;
          background: rgba(45, 212, 191, 0.18);
          color: #2dd4bf;
          font-size: 1.35rem;
        }

        .canvas-card-title {
          margin: 0;
          color: #fff;
          font-size: 1.05rem;
          font-weight: 800;
          line-height: 1.2;
        }

        .canvas-card-desc {
          margin: 0;
          color: #94a3b8;
          font-size: 0.88rem;
          line-height: 1.5;
        }

        /* ── Highlight ── */
        .teaching-canvas-highlight {
          justify-content: center;
        }

        .canvas-highlight-box {
          border-left: 5px solid #4f46e5;
          background: white;
          border-radius: 0.75rem;
          padding: 1.75rem 2rem;
          box-shadow: 0 4px 24px rgba(79,70,229,0.1);
          margin-bottom: 1.25rem;
        }

        .canvas-highlight-label {
          color: #4f46e5;
          font-size: 0.75rem;
          font-weight: 900;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          margin-bottom: 0.65rem;
        }

        .canvas-highlight-box .lesson-content {
          font-size: 1.35rem;
          font-weight: 600;
          color: #0f172a;
          line-height: 1.5;
        }

        .canvas-highlight-box .lesson-content p { margin: 0.35rem 0; }

        /* ── Split ── */
        .teaching-canvas-split {
          display: grid !important;
          grid-template-columns: 1fr 1fr;
          gap: 0;
          padding: 0;
          flex-direction: unset;
        }

        .canvas-split-left {
          padding: 2rem 1.75rem 2rem 2.75rem;
          display: flex;
          flex-direction: column;
          justify-content: flex-start;
          overflow: hidden;
        }

        .canvas-split-right {
          background: #0f172a;
          border-radius: 0 1.1rem 1.1rem 0;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          padding: 1.5rem;
        }

        .canvas-split-right img {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
          border-radius: 0.5rem;
        }

        .canvas-split-right pre {
          width: 100%;
          margin: 0;
          overflow: auto;
          background: #1e293b;
          border-radius: 0.65rem;
          padding: 1.25rem;
          color: #e2e8f0;
          font-size: 0.92rem;
          line-height: 1.6;
          font-family: ui-monospace, SFMono-Regular, monospace;
          white-space: pre-wrap;
          word-break: break-all;
        }

        /* ── Code ── */
        .teaching-canvas-code {
          display: grid !important;
          grid-template-columns: 1fr 1fr;
          gap: 0;
          padding: 0;
          flex-direction: unset;
        }

        .canvas-code-left {
          padding: 2rem 1.75rem 2rem 2.75rem;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .canvas-code-right {
          background: #0f172a;
          border-radius: 0 1.1rem 1.1rem 0;
          padding: 1.5rem;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .canvas-code-right pre {
          flex: 1;
          margin: 0;
          overflow: auto;
          color: #e2e8f0;
          font-size: 0.92rem;
          line-height: 1.6;
          font-family: ui-monospace, SFMono-Regular, monospace;
          white-space: pre-wrap;
          word-break: break-all;
        }

        .canvas-code-label {
          color: #64748b;
          font-size: 0.7rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          margin-bottom: 0.6rem;
        }

        /* ── Auto-fit (shrink content so nothing is clipped) ── */
        .canvas-autofit {
          position: relative;
          flex: 1 1 auto;
          min-height: 0;
          width: 100%;
          overflow: hidden;
        }

        .canvas-autofit-inner {
          width: 100%;
          transform-origin: top left;
        }

        /* ── Terminal-style code panel ── */
        .canvas-code-right {
          gap: 0;
          justify-content: flex-start;
        }

        .canvas-terminal-bar {
          display: flex;
          align-items: center;
          gap: 0.45rem;
          margin-bottom: 1rem;
          flex-shrink: 0;
        }

        .canvas-terminal-dot {
          height: 0.72rem;
          width: 0.72rem;
          border-radius: 999px;
        }

        .canvas-terminal-name {
          margin-left: 0.55rem;
          color: #64748b;
          font-size: 0.74rem;
          font-weight: 700;
          font-family: ui-monospace, SFMono-Regular, monospace;
        }

        .canvas-code-right pre {
          flex: 0 1 auto;
          min-height: 0;
        }

        /* ── Tri-zone: text left, image (top) + code (bottom) right ── */
        .canvas-duo-right {
          display: flex;
          flex-direction: column;
          overflow: hidden;
          border-radius: 0 1.1rem 1.1rem 0;
          background: #0f172a;
        }

        .canvas-duo-media {
          flex: 1 1 0;
          min-height: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 1.1rem 1.25rem;
          background: #0b1220;
          overflow: hidden;
        }

        /* Side-split image column must stack vertically for the fit chain. */
        .canvas-split-right {
          flex-direction: column;
        }

        /* Keep any image (plain <img> or one wrapped in .lesson-content)
           contained within its zone instead of overflowing onto the code. */
        .canvas-duo-media > img,
        .canvas-split-right > img {
          max-width: 100%;
          max-height: 100%;
          width: auto;
          height: auto;
          object-fit: contain;
          border-radius: 0.5rem;
          margin: auto;
        }

        .canvas-duo-media .lesson-content,
        .canvas-split-right .lesson-content {
          flex: 1;
          min-height: 0;
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }

        .canvas-duo-media .lesson-content .lesson-media,
        .canvas-split-right .lesson-content .lesson-media {
          flex: 1;
          min-height: 0;
          max-width: 100%;
          margin: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }

        .canvas-duo-media .lesson-content .lesson-media-zoom,
        .canvas-split-right .lesson-content .lesson-media-zoom {
          flex: 1;
          min-height: 0;
          width: auto;
          max-width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          border: none;
          background: transparent;
          box-shadow: none;
        }

        .canvas-duo-media .lesson-content .lesson-media img,
        .canvas-split-right .lesson-content .lesson-media img {
          width: auto;
          height: auto;
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
          border-radius: 0.5rem;
        }

        .canvas-duo-media .lesson-content .lesson-media figcaption,
        .canvas-split-right .lesson-content .lesson-media figcaption {
          flex: 0 0 auto;
          margin-top: 0.35rem;
          font-size: 0.72rem;
          line-height: 1.3;
        }

        .canvas-duo-code {
          flex: 1 1 0;
          min-height: 0;
          display: flex;
          flex-direction: column;
          padding: 1.1rem 1.4rem;
          border-top: 1px solid rgba(148, 163, 184, 0.16);
        }

        /* Shared terminal text styling for the tri-zone code area */
        .canvas-duo-code pre {
          flex: 0 1 auto;
          min-height: 0;
          margin: 0;
          overflow: auto;
          color: #e2e8f0;
          font-size: 0.92rem;
          line-height: 1.6;
          font-family: ui-monospace, SFMono-Regular, monospace;
          white-space: pre-wrap;
          word-break: break-all;
        }

        /* ── Interactive terminal (reveal code line-by-line) ── */
        .canvas-terminal-actions {
          margin-left: auto;
          display: flex;
          gap: 0.4rem;
        }

        .canvas-terminal-actions button {
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
          border: 1px solid rgba(148, 163, 184, 0.28);
          background: rgba(148, 163, 184, 0.08);
          color: #cbd5e1;
          border-radius: 0.4rem;
          padding: 0.12rem 0.5rem;
          font-size: 0.7rem;
          font-weight: 700;
          cursor: pointer;
          transition: background 0.15s ease;
        }

        .canvas-terminal-actions button:hover {
          background: rgba(148, 163, 184, 0.2);
        }

        .canvas-terminal-body {
          flex: 1 1 auto;
          min-height: 0;
          width: 100%;
          overflow: auto;
          cursor: pointer;
        }

        .canvas-terminal-body:focus-visible {
          outline: 2px solid rgba(99, 179, 237, 0.55);
          outline-offset: 2px;
          border-radius: 0.4rem;
        }

        .canvas-terminal-code {
          margin: 0;
          color: #e2e8f0;
          font-size: 0.92rem;
          line-height: 1.6;
          font-family: ui-monospace, SFMono-Regular, monospace;
          white-space: pre-wrap;
          word-break: break-word;
        }

        .canvas-code-line {
          min-height: 1.6em;
        }

        .canvas-code-line.is-new {
          animation: code-type 200ms ease both;
        }

        @keyframes code-type {
          from { opacity: 0; transform: translateY(2px); }
          to   { opacity: 1; transform: none; }
        }

        .canvas-caret {
          display: inline-block;
          width: 0.55ch;
          height: 1.05em;
          margin-left: 2px;
          background: #e2e8f0;
          vertical-align: -0.18em;
          animation: caret-blink 1s steps(1) infinite;
        }

        @keyframes caret-blink {
          50% { opacity: 0; }
        }

        .canvas-terminal-hint {
          display: flex;
          height: 100%;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0.65rem;
          color: #64748b;
          font-size: 0.85rem;
          font-weight: 600;
        }

        .canvas-terminal-hint i {
          font-size: 1.7rem;
          color: #475569;
        }

        .canvas-split-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.55rem;
          color: #64748b;
          font-size: 0.9rem;
          font-weight: 600;
        }

        .canvas-split-empty i {
          font-size: 1.9rem;
          opacity: 0.45;
        }

        /* ── Reveal steps (shared) ── */
        .teaching-reveal-list {
          display: grid;
          gap: 0.55rem;
          margin-top: 0.85rem;
        }

        .teaching-reveal-step {
          display: grid;
          grid-template-columns: 1.8rem minmax(0, 1fr);
          align-items: start;
          gap: 0.65rem;
          border-radius: 0.65rem;
          border: 1px solid #dbeafe;
          background: white;
          padding: 0.55rem 0.75rem;
        }

        .teaching-reveal-index {
          display: inline-flex;
          height: 1.8rem;
          width: 1.8rem;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          background: #2563eb;
          color: white;
          font-size: 0.8rem;
          font-weight: 900;
          flex-shrink: 0;
        }

        .teaching-reveal-text {
          margin: 0;
          color: #0f172a;
          font-size: 1rem;
          font-weight: 700;
          line-height: 1.5;
        }

        .teaching-reveal-text p { margin: 0; }

        .teaching-reveal-text code {
          background: #e0f2fe;
          border-radius: 0.25rem;
          padding: 0.05em 0.35em;
          font-size: 0.92em;
          font-family: ui-monospace, SFMono-Regular, monospace;
          color: #0369a1;
          font-weight: 600;
        }

        .teaching-reveal-step.step-new {
          animation: step-reveal 320ms cubic-bezier(0.22, 0.8, 0.2, 1) both;
        }

        .teaching-reveal-empty {
          display: flex;
          height: 3.5rem;
          align-items: center;
          justify-content: center;
          gap: 0.55rem;
          border-radius: 0.65rem;
          border: 1px dashed #bfdbfe;
          background: #eff6ff;
          color: #2563eb;
          font-size: 0.88rem;
          font-weight: 800;
        }

        /* ── Dot strip ── */
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

        @keyframes step-reveal {
          from { opacity: 0; transform: translateY(0.4rem); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

/* ─────────────────────────────────────────── */
/* Canvas slide dispatcher                     */
/* ─────────────────────────────────────────── */

interface SlideProps {
  canvas: TeachingCanvas;
  media: LessonMediaView[];
  visibleSteps: number;
  hasSteps: boolean;
}

/* Shrinks its content to fit the available box so nothing is ever clipped. */
function AutoFit({ children }: { children: ReactNode }) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;

    const measure = () => {
      const availH = outer.clientHeight;
      const availW = outer.clientWidth;
      const needH = inner.offsetHeight;
      const needW = inner.offsetWidth;
      if (availH <= 0 || availW <= 0 || needH <= 0 || needW <= 0) return;
      const next = Math.min(1, availH / needH, availW / needW);
      setScale((prev) => (Math.abs(prev - next) > 0.004 ? next : prev));
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(outer);
    observer.observe(inner);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={outerRef} className="canvas-autofit">
      <div
        ref={innerRef}
        className="canvas-autofit-inner"
        style={{ transform: scale < 1 ? `scale(${scale})` : undefined }}
      >
        {children}
      </div>
    </div>
  );
}

function CanvasSlide(props: SlideProps) {
  switch (props.canvas.kind) {
    case "hero":      return <HeroSlide       {...props} />;
    case "cards":     return <CardsSlide      {...props} />;
    case "highlight": return <HighlightSlide  {...props} />;
    default:          return <AutoLayoutSlide {...props} />;
  }
}

/* ─── Hero ─── */
function HeroSlide({ canvas }: SlideProps) {
  return (
    <article className="teaching-canvas teaching-canvas-hero">
      <span className="canvas-hero-kicker">Bài giảng</span>
      <h2 className="canvas-hero-title">{canvas.title}</h2>
      {canvas.html.trim() && (
        <div className="canvas-hero-sub" dangerouslySetInnerHTML={{ __html: canvas.html }} />
      )}
    </article>
  );
}

/* ─── Cards ─── */
function CardsSlide({ canvas }: SlideProps) {
  const cards = canvas.cards ?? [];
  return (
    <article className="teaching-canvas teaching-canvas-cards">
      <h3 className="canvas-title">{canvas.title}</h3>
      <AutoFit>
        {cards.length > 0 ? (
          <div className="canvas-cards-grid">
            {cards.map((card, i) => (
              <div key={i} className="canvas-card">
                {card.icon && (
                  <span className="canvas-card-icon">
                    <i className={`fa-solid ${card.icon}`}></i>
                  </span>
                )}
                <h4 className="canvas-card-title">{card.title}</h4>
                <p className="canvas-card-desc">{card.description}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="canvas-body">
            <LessonContentRenderer html={canvas.html} media={[]} />
          </div>
        )}
      </AutoFit>
    </article>
  );
}

/* ─── Highlight ─── */
function HighlightSlide({ canvas, media, visibleSteps, hasSteps }: SlideProps) {
  const kindLabel = "Điểm nhấn";
  return (
    <article className="teaching-canvas teaching-canvas-highlight">
      <AutoFit>
        <div className="canvas-highlight-box">
          <div className="canvas-highlight-label">
            <i className="fa-solid fa-lightbulb mr-1.5"></i>
            {canvas.title}
          </div>
          <LessonContentRenderer html={canvas.html} media={media} />
        </div>
        <RevealList steps={canvas.steps} visibleSteps={visibleSteps} hasSteps={hasSteps} />
      </AutoFit>
    </article>
  );
}

/* Picks how much width the text column gets vs. the side panel. */
function splitColumns(weight: "light" | "even" | "heavy") {
  if (weight === "light") return "minmax(0, 1.25fr) minmax(0, 0.95fr)";
  if (weight === "heavy") return "minmax(0, 0.95fr) minmax(0, 1.15fr)";
  return "minmax(0, 1fr) minmax(0, 1fr)";
}

function codeWeight(code: string): "light" | "even" | "heavy" {
  const lines = code.split("\n");
  const longest = lines.reduce((max, line) => Math.max(max, line.length), 0);
  if (lines.length <= 10 && longest <= 46) return "light";
  if (lines.length >= 18 || longest >= 72) return "heavy";
  return "even";
}

/* Splits raw canvas HTML into prose text and the media (figures/images) it
   contains, so each can be placed in its own zone instead of stacking
   everything into one cramped column. */
function extractMediaFromHtml(html: string): { textHtml: string; mediaHtml: string } {
  if (!html?.trim()) return { textHtml: "", mediaHtml: "" };

  const media: string[] = [];
  const textHtml = html
    .replace(/<figure\b[\s\S]*?<\/figure>/gi, (match) => {
      media.push(match);
      return "";
    })
    .replace(
      /<div\b[^>]*class="[^"]*lesson-media-placeholder[^"]*"[^>]*>[\s\S]*?<\/div>/gi,
      (match) => {
        media.push(match);
        return "";
      }
    )
    .replace(/<img\b[^>]*>/gi, (match) => {
      media.push(`<figure class="lesson-media">${match}</figure>`);
      return "";
    })
    .trim();

  return { textHtml, mediaHtml: media.join("\n") };
}

function stripTags(html: string) {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function kickerLabel(kind: TeachingCanvas["kind"]): string {
  if (kind === "code") return "Code";
  if (kind === "media") return "Hình ảnh";
  if (kind === "note") return "Ghi chú";
  return "Ý chính";
}

/* ─── Reusable zones ─── */
function TextZone({
  kicker,
  title,
  textHtml,
  media,
  steps,
  visibleSteps,
  hasSteps,
}: {
  kicker: string;
  title: string;
  textHtml: string;
  media: LessonMediaView[];
  steps: TeachingCanvas["steps"];
  visibleSteps: number;
  hasSteps: boolean;
}) {
  return (
    <>
      <span className="canvas-kicker">{kicker}</span>
      <h3 className="canvas-title">{title}</h3>
      <AutoFit>
        {textHtml.trim() && (
          <div className="canvas-body">
            <LessonContentRenderer html={textHtml} media={media} />
          </div>
        )}
        <RevealList steps={steps} visibleSteps={visibleSteps} hasSteps={hasSteps} />
      </AutoFit>
    </>
  );
}

function MediaZone({
  mediaView,
  mediaHtml,
  media,
}: {
  mediaView: LessonMediaView | null;
  mediaHtml: string;
  media: LessonMediaView[];
}) {
  if (mediaView) {
    return <img src={mediaView.publicUrl} alt={mediaView.altText || mediaView.caption || ""} />;
  }
  if (mediaHtml.trim()) {
    return <LessonContentRenderer html={mediaHtml} media={media} />;
  }
  return (
    <div className="canvas-split-empty">
      <i className="fa-solid fa-image"></i>
      <span>Chưa có ảnh</span>
    </div>
  );
}

/* Terminal that reveals code one line at a time on click — lets a teacher
   "type out" the code live while explaining, instead of showing it all up front. */
function TerminalZone({ code }: { code: string }) {
  const lines = useMemo(() => code.replace(/\s+$/, "").split("\n"), [code]);
  const [revealed, setRevealed] = useState(0);

  useEffect(() => {
    setRevealed(0);
  }, [code]);

  const total = lines.length;
  const allShown = revealed >= total;

  const revealNext = () => setRevealed((n) => Math.min(total, n + 1));

  return (
    <>
      <div className="canvas-terminal-bar">
        <span className="canvas-terminal-dot" style={{ background: "#ff5f56" }}></span>
        <span className="canvas-terminal-dot" style={{ background: "#ffbd2e" }}></span>
        <span className="canvas-terminal-dot" style={{ background: "#27c93f" }}></span>
        <span className="canvas-terminal-name">main.py</span>
        <div className="canvas-terminal-actions">
          {revealed > 0 && (
            <button type="button" onClick={() => setRevealed(0)} title="Ẩn lại từ đầu">
              <i className="fa-solid fa-rotate-left"></i>
            </button>
          )}
          {!allShown && (
            <button type="button" onClick={() => setRevealed(total)} title="Hiện tất cả">
              <i className="fa-solid fa-angles-down"></i>
              <span>Tất cả</span>
            </button>
          )}
        </div>
      </div>

      <div
        className="canvas-terminal-body"
        role="button"
        tabIndex={0}
        onClick={revealNext}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            revealNext();
          }
        }}
      >
        {revealed === 0 ? (
          <div className="canvas-terminal-hint">
            <i className="fa-solid fa-circle-play"></i>
            <span>Bấm để hiện code từng dòng</span>
          </div>
        ) : (
          <pre className="canvas-terminal-code">
            {lines.slice(0, revealed).map((line, index) => {
              const isLast = index === revealed - 1;
              return (
                <div key={index} className={`canvas-code-line${isLast ? " is-new" : ""}`}>
                  {line || " "}
                  {isLast && !allShown && <span className="canvas-caret"></span>}
                </div>
              );
            })}
          </pre>
        )}
      </div>
    </>
  );
}

/* Chooses the best arrangement for a canvas based on which blocks it has
   (text / image / code / steps), instead of forcing a single 50-50 split. */
function AutoLayoutSlide({ canvas, media, visibleSteps, hasSteps }: SlideProps) {
  const mediaView = canvas.mediaId
    ? media.find((m) => m.id === canvas.mediaId) || null
    : null;
  const { textHtml, mediaHtml } = extractMediaFromHtml(canvas.html);
  const hasText = stripTags(textHtml).length > 0;
  const hasImage = Boolean(mediaView) || mediaHtml.trim().length > 0;
  const code = canvas.code?.trim() || "";
  const hasCode = code.length > 0;
  const kicker = kickerLabel(canvas.kind);

  const textZone = (
    <TextZone
      kicker={kicker}
      title={canvas.title}
      textHtml={textHtml}
      media={media}
      steps={canvas.steps}
      visibleSteps={visibleSteps}
      hasSteps={hasSteps}
    />
  );

  // 1) text + image + code → text left, image (top) + terminal (bottom) right
  if (hasImage && hasCode) {
    return (
      <article
        className="teaching-canvas teaching-canvas-split"
        style={{ gridTemplateColumns: splitColumns("even") }}
      >
        <div className="canvas-split-left">{textZone}</div>
        <div className="canvas-duo-right">
          <div className="canvas-duo-media">
            <MediaZone mediaView={mediaView} mediaHtml={mediaHtml} media={media} />
          </div>
          <div className="canvas-duo-code">
            <TerminalZone code={code} />
          </div>
        </div>
      </article>
    );
  }

  // 2) text + image → side by side (image gets more room when text is light)
  if (hasImage) {
    return (
      <article
        className="teaching-canvas teaching-canvas-split"
        style={{ gridTemplateColumns: splitColumns(hasText ? "even" : "heavy") }}
      >
        <div className="canvas-split-left">{textZone}</div>
        <div className="canvas-split-right">
          <MediaZone mediaView={mediaView} mediaHtml={mediaHtml} media={media} />
        </div>
      </article>
    );
  }

  // 3) code present (no image) → text left, terminal right (two columns)
  if (hasCode) {
    return (
      <article
        className="teaching-canvas teaching-canvas-code"
        style={{ gridTemplateColumns: splitColumns(codeWeight(code)) }}
      >
        <div className="canvas-code-left">{textZone}</div>
        <div className="canvas-code-right">
          <TerminalZone code={code} />
        </div>
      </article>
    );
  }

  // 4) text only → comfortable full-width slide
  return <article className="teaching-canvas teaching-canvas-concept">{textZone}</article>;
}

/* ─── Shared reveal list ─── */
function RevealList({
  steps,
  visibleSteps,
  hasSteps,
}: {
  steps: TeachingCanvas["steps"];
  visibleSteps: number;
  hasSteps: boolean;
}) {
  if (!hasSteps) return null;
  return (
    <div className="teaching-reveal-list">
      {steps.slice(0, visibleSteps).map((step, index) => {
        const isNew = index === visibleSteps - 1;
        const html = sanitizeLessonHtml(step.html || step.text || "");
        return (
          <div key={step.id} className={`teaching-reveal-step${isNew ? " step-new" : ""}`}>
            <span className="teaching-reveal-index">{index + 1}</span>
            <div
              className="teaching-reveal-text"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          </div>
        );
      })}
    </div>
  );
}
