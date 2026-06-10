"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import LessonContentRenderer from "@/components/lessons/LessonContentRenderer";
import { sanitizeLessonHtml } from "@/lib/sanitize-html";
import { runPython } from "@/lib/python/pyodide-client";
import type { LessonMediaView } from "@/lib/lessons/lesson-media";
import type { TeachingCanvas } from "@/lib/lessons/teaching-canvas";

interface TeachingCanvasRendererProps {
  sectionId: string;
  sectionTitle: string;
  canvases: TeachingCanvas[];
  media: LessonMediaView[];
  /** Lesson-level visual theme/skin (default/ocean/sunset/forest/grape). */
  theme?: string | null;
}

// Canvases whose entire body is a list of items revealed one-by-one (no separate
// base content), so the first item should already be visible on arrival.
const ITEM_ONLY_KINDS = new Set<string>([
  "cards",
  "compare",
  "chat",
  "timeline",
  "checklist",
  "flow",
  "mindmap",
  "code_explain",
]);

/** How many "click to reveal" units a canvas has (drives the next/back buttons). */
function revealUnitCount(canvas: TeachingCanvas): number {
  switch (canvas.kind) {
    case "cards":
    case "chat":
      return canvas.cards?.length ?? 0;
    case "compare":
      return (canvas.cards?.length ?? 0) >= 2 ? 3 : 0; // left → VS → right
    case "quiz":
    case "playground":
    case "hero":
    case "statement":
    case "cover":
    case "banner":
    case "two_col_text":
      return 0;
    default:
      return canvas.steps.length;
  }
}

/** Lowest visibleSteps while on a canvas — item-only canvases keep ≥1 shown. */
function minVisibleSteps(canvas: TeachingCanvas): number {
  return ITEM_ONLY_KINDS.has(canvas.kind) && revealUnitCount(canvas) > 0 ? 1 : 0;
}

export default function TeachingCanvasRenderer({
  sectionId,
  sectionTitle,
  canvases,
  media,
  theme,
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
  const revealCount = revealUnitCount(canvas);
  const floorSteps = minVisibleSteps(canvas);
  const hasReveal = revealCount > 0;
  const hasSteps = canvas.steps.length > 0;
  const canGoBack = canvasIndex > 0 || visibleSteps > floorSteps;
  const canGoForward =
    visibleSteps < revealCount || canvasIndex < safeCanvases.length - 1;

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
    setVisibleSteps(minVisibleSteps(safeCanvases[0]));
  }, [sectionId, safeCanvases]);

  useEffect(() => {
    if (canvasIndex < safeCanvases.length) return;
    const lastIndex = Math.max(safeCanvases.length - 1, 0);
    setCanvasIndex(lastIndex);
    setVisibleSteps(minVisibleSteps(safeCanvases[lastIndex]));
  }, [canvasIndex, safeCanvases]);

  const goForward = () => {
    if (visibleSteps < revealCount) {
      setVisibleSteps((c) => c + 1);
      return;
    }
    if (canvasIndex < safeCanvases.length - 1) {
      const next = safeCanvases[canvasIndex + 1];
      setCanvasIndex((c) => c + 1);
      setVisibleSteps(minVisibleSteps(next));
    }
  };

  const goBack = () => {
    if (visibleSteps > floorSteps) {
      setVisibleSteps((c) => c - 1);
      return;
    }
    if (canvasIndex > 0) {
      const previous = safeCanvases[canvasIndex - 1];
      setCanvasIndex((c) => c - 1);
      setVisibleSteps(revealUnitCount(previous));
    }
  };

  const showAllSteps = () => setVisibleSteps(revealCount);

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
          {hasReveal && visibleSteps < revealCount && (
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

      <div
        ref={frameRef}
        className={`teaching-canvas-frame${theme && theme !== "default" ? ` canvas-theme-${theme}` : ""}`}
      >
        <div
          className={`teaching-canvas-inner${canvas.accent ? ` canvas-accent-${canvas.accent}` : ""}`}
          style={{ transform: `scale(${slideScale})` }}
        >
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
          background: var(--canvas-frame-bg, #f1f5fb);
          box-shadow: 0 8px 40px rgba(15, 23, 42, 0.13), 0 0 0 1px rgba(99, 102, 241, 0.1);
        }

        /* ── Lesson themes (skin: tints light slides + default accent for the whole lesson) ── */
        .canvas-theme-ocean   { --canvas-frame-bg: #cfe8f5; --canvas-bg: #f0f9ff; --canvas-accent: #0891b2; --canvas-accent-soft: #cffafe; }
        .canvas-theme-sunset  { --canvas-frame-bg: #fbe2cf; --canvas-bg: #fff7ed; --canvas-accent: #ea580c; --canvas-accent-soft: #ffedd5; }
        .canvas-theme-forest  { --canvas-frame-bg: #d4ecd8; --canvas-bg: #f0fdf4; --canvas-accent: #059669; --canvas-accent-soft: #d1fae5; }
        .canvas-theme-grape   { --canvas-frame-bg: #e6ddf7; --canvas-bg: #faf5ff; --canvas-accent: #7c3aed; --canvas-accent-soft: #ede9fe; }
        /* Theme accent feeds the same accent surfaces as per-canvas accent (which still overrides). */
        [class*="canvas-theme-"] .canvas-kicker { background: var(--canvas-accent-soft); color: var(--canvas-accent); }
        [class*="canvas-theme-"] .canvas-timeline-node,
        [class*="canvas-theme-"] .canvas-mindmap-center { background: var(--canvas-accent); }
        [class*="canvas-theme-"] .canvas-flow-arrow { color: var(--canvas-accent); }
        [class*="canvas-theme-"] .canvas-highlight-box,
        [class*="canvas-theme-"] .canvas-codeexplain-note,
        [class*="canvas-theme-"] .canvas-mindmap-branch { border-left-color: var(--canvas-accent); }

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
          background: var(--canvas-bg, #f8fbff);
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

        /* ── Timeline ── */
        .teaching-canvas-timeline .canvas-title { margin-bottom: 1.1rem; }

        .canvas-timeline {
          list-style: none;
          margin: 0;
          padding: 0.15rem 0;
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
        }

        .canvas-timeline-item {
          display: grid;
          grid-template-columns: 2.6rem 1fr;
          gap: 1rem;
          align-items: start;
          position: relative;
        }

        .canvas-timeline-item:not(:last-child)::before {
          content: "";
          position: absolute;
          left: 1.3rem;
          top: 2.6rem;
          bottom: -0.85rem;
          width: 2px;
          background: #c7d2fe;
        }

        .canvas-timeline-node {
          height: 2.6rem;
          width: 2.6rem;
          border-radius: 999px;
          background: #4f46e5;
          color: #fff;
          font-weight: 800;
          font-size: 1.05rem;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
          z-index: 1;
        }

        .canvas-timeline-text {
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 0.85rem;
          padding: 0.8rem 1rem;
          color: #1e293b;
          font-size: 1.02rem;
          line-height: 1.5;
          box-shadow: 0 2px 10px rgba(15, 23, 42, 0.05);
        }

        .canvas-timeline-text p { margin: 0; }

        /* ── Compare ── */
        .teaching-canvas-compare .canvas-title { margin-bottom: 1.2rem; }

        .canvas-compare-grid {
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          gap: 1rem;
          align-items: stretch;
          flex: 1;
        }

        .canvas-compare-side {
          border-radius: 1rem;
          padding: 1.5rem 1.4rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 0.6rem;
          border: 2px solid transparent;
        }

        .canvas-compare-left { background: #fef2f2; border-color: #fecaca; }
        .canvas-compare-right { background: #ecfdf5; border-color: #a7f3d0; }

        .canvas-compare-icon {
          height: 2.8rem;
          width: 2.8rem;
          border-radius: 0.8rem;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.3rem;
        }

        .canvas-compare-left .canvas-compare-icon { background: rgba(239, 68, 68, 0.14); color: #dc2626; }
        .canvas-compare-right .canvas-compare-icon { background: rgba(16, 185, 129, 0.16); color: #059669; }

        .canvas-compare-title {
          margin: 0;
          font-size: 1.2rem;
          font-weight: 800;
          color: #0f172a;
          line-height: 1.2;
        }

        .canvas-compare-desc {
          margin: 0;
          font-size: 0.98rem;
          line-height: 1.55;
          color: #334155;
        }

        .canvas-compare-vs {
          align-self: center;
          height: 2.6rem;
          width: 2.6rem;
          border-radius: 999px;
          background: #0f172a;
          color: #fff;
          font-weight: 900;
          font-size: 0.9rem;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.25);
        }

        /* ── Checklist ── */
        .teaching-canvas-checklist .canvas-title { margin-bottom: 1rem; }

        .canvas-checklist-intro {
          font-size: 1.02rem;
          color: #475569;
          margin-bottom: 1rem;
        }

        .canvas-checklist-intro p { margin: 0 0 0.4rem; }

        .canvas-checklist {
          list-style: none;
          margin: 0;
          padding: 0.7rem 0.4rem 0.4rem;
          display: flex;
          flex-wrap: wrap;
          gap: 1.15rem;
          justify-content: center;
          align-content: flex-start;
        }

        /* Sticky-note cards instead of a plain list. */
        .canvas-checklist-note {
          position: relative;
          flex: 0 1 14.5rem;
          min-height: 4.5rem;
          display: flex;
          align-items: center;
          padding: 1.5rem 1.15rem 1.1rem;
          border-radius: 0.3rem 0.3rem 0.6rem 0.6rem;
          box-shadow: 0 10px 22px rgba(15, 23, 42, 0.12);
        }

        .canvas-checklist-note:nth-child(4n + 1) { background: #fef9c3; transform: rotate(-2deg); }
        .canvas-checklist-note:nth-child(4n + 2) { background: #dcfce7; transform: rotate(1.6deg); }
        .canvas-checklist-note:nth-child(4n + 3) { background: #dbeafe; transform: rotate(-1deg); }
        .canvas-checklist-note:nth-child(4n)     { background: #fce7f3; transform: rotate(2deg); }

        .canvas-checklist-pin {
          position: absolute;
          top: -0.55rem;
          left: 50%;
          transform: translateX(-50%);
          height: 1.1rem;
          width: 1.1rem;
          border-radius: 999px;
          background: radial-gradient(circle at 35% 30%, #fca5a5, #dc2626);
          box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
        }

        .canvas-checklist-text {
          color: #1e293b;
          font-size: 1.05rem;
          line-height: 1.45;
          font-weight: 500;
        }

        .canvas-checklist-text p { margin: 0; }

        /* ── Chat ── */
        .canvas-chat {
          display: flex;
          flex-direction: column;
          gap: 0.8rem;
        }

        .canvas-chat-row {
          display: flex;
          align-items: flex-end;
          gap: 0.7rem;
          max-width: 80%;
        }

        .canvas-chat-row.is-left { align-self: flex-start; }
        .canvas-chat-row.is-right { align-self: flex-end; flex-direction: row-reverse; }

        .canvas-chat-avatar {
          height: 2.5rem;
          width: 2.5rem;
          flex: none;
          border-radius: 999px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 1rem;
        }

        .canvas-chat-row.is-left .canvas-chat-avatar { background: #e0e7ff; color: #4338ca; }
        .canvas-chat-row.is-right .canvas-chat-avatar { background: #d1fae5; color: #047857; }

        .canvas-chat-bubble {
          border-radius: 1.1rem;
          padding: 0.7rem 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.15rem;
        }

        .canvas-chat-row.is-left .canvas-chat-bubble { background: #eef2ff; border-bottom-left-radius: 0.3rem; }
        .canvas-chat-row.is-right .canvas-chat-bubble { background: #ecfdf5; border-bottom-right-radius: 0.3rem; text-align: right; }

        .canvas-chat-name {
          font-size: 0.72rem;
          font-weight: 800;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .canvas-chat-text { margin: 0; font-size: 1.02rem; line-height: 1.45; color: #1e293b; }

        /* ── Flow (horizontal) ── */
        .canvas-flow {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 0.5rem;
          justify-content: center;
          flex: 1;
        }

        .canvas-flow-cell { display: inline-flex; align-items: center; gap: 0.5rem; }

        .canvas-flow-node {
          background: #fff;
          border: 2px solid #c7d2fe;
          border-radius: 0.9rem;
          padding: 0.85rem 1.15rem;
          font-size: 1.05rem;
          font-weight: 700;
          color: #1e293b;
          box-shadow: 0 2px 10px rgba(15, 23, 42, 0.06);
          max-width: 16rem;
          text-align: center;
        }

        .canvas-flow-node p { margin: 0; }
        .canvas-flow-arrow { color: #6366f1; font-size: 1.2rem; }

        /* ── Code + explanation ── */
        .canvas-codeexplain {
          display: grid;
          grid-template-columns: 1.05fr 0.95fr;
          gap: 1.1rem;
          flex: 1;
          min-height: 0;
        }

        .canvas-codeexplain-panel {
          display: flex;
          flex-direction: column;
          min-height: 0;
          border-radius: 0.9rem;
          overflow: hidden;
          background: #0f172a;
          box-shadow: 0 10px 28px rgba(15, 23, 42, 0.25);
        }

        .canvas-codeexplain-bar {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.6rem 0.9rem;
          background: #1e293b;
          border-bottom: 1px solid rgba(148, 163, 184, 0.18);
        }

        .canvas-codeexplain-dot { height: 0.7rem; width: 0.7rem; border-radius: 999px; }

        .canvas-codeexplain-file {
          margin-left: 0.5rem;
          color: #94a3b8;
          font-size: 0.8rem;
          font-family: ui-monospace, SFMono-Regular, monospace;
        }

        .canvas-codeexplain-code {
          margin: 0;
          padding: 0.9rem 1.1rem;
          overflow: auto;
          font-family: ui-monospace, SFMono-Regular, monospace;
          font-size: 0.92rem;
          line-height: 1.7;
        }

        .canvas-codeexplain-line {
          display: grid;
          grid-template-columns: 1.6rem 1fr;
          gap: 0.7rem;
          white-space: pre;
          border-radius: 0.3rem;
        }

        .canvas-codeexplain-line:hover { background: rgba(99, 102, 241, 0.12); }
        .canvas-codeexplain-ln { color: #475569; text-align: right; user-select: none; }
        .canvas-codeexplain-code code { color: #e2e8f0; }

        .canvas-codeexplain-notes {
          margin: 0;
          padding: 0;
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
          overflow: auto;
        }

        .canvas-codeexplain-note {
          display: flex;
          flex-direction: column;
          gap: 0.3rem;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-left: 3px solid #6366f1;
          border-radius: 0 0.7rem 0.7rem 0;
          padding: 0.6rem 0.85rem;
          font-size: 0.98rem;
          line-height: 1.45;
          color: #1e293b;
        }

        .canvas-codeexplain-badge {
          align-self: flex-start;
          background: #eef2ff;
          color: #4338ca;
          font-size: 0.7rem;
          font-weight: 800;
          letter-spacing: 0.03em;
          text-transform: uppercase;
          padding: 0.12rem 0.5rem;
          border-radius: 999px;
        }

        .canvas-codeexplain-note-text p { margin: 0; }

        /* ── Mindmap ── */
        .canvas-mindmap {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0;
          flex: 1;
        }

        .canvas-mindmap-center {
          background: linear-gradient(135deg, #4f46e5, #6366f1);
          color: #fff;
          border-radius: 1.1rem;
          padding: 1.2rem 1.6rem;
          font-size: 1.5rem;
          font-weight: 800;
          max-width: 16rem;
          text-align: center;
          box-shadow: 0 8px 24px rgba(79, 70, 229, 0.3);
          flex: none;
        }

        /* Trunk: single line from the center node out to the branch spine. */
        .canvas-mindmap-trunk {
          flex: none;
          width: 2.5rem;
          height: 3px;
          background: #c7d2fe;
        }

        .canvas-mindmap-branches {
          list-style: none;
          margin: 0;
          padding-left: 2rem;
          display: flex;
          flex-direction: column;
          gap: 0.7rem;
          position: relative;
          flex: none;
        }

        /* Vertical spine all branches tap off — converges back to the trunk. */
        .canvas-mindmap-branches::before {
          content: "";
          position: absolute;
          left: 0;
          top: 1.6rem;
          bottom: 1.6rem;
          width: 3px;
          background: #c7d2fe;
          border-radius: 2px;
        }

        .canvas-mindmap-branch {
          background: #fff;
          border: 1px solid #e2e8f0;
          border-left: 4px solid #818cf8;
          border-radius: 0.7rem;
          padding: 0.7rem 1rem;
          font-size: 1.02rem;
          color: #1e293b;
          box-shadow: 0 2px 8px rgba(15, 23, 42, 0.05);
          position: relative;
        }

        /* Horizontal connector from the spine to each branch. */
        .canvas-mindmap-branch::before {
          content: "";
          position: absolute;
          left: -2rem;
          top: 50%;
          width: 2rem;
          height: 3px;
          background: #c7d2fe;
        }

        .canvas-mindmap-branch p { margin: 0; }

        /* ── Progressive reveal: each newly shown item animates in ── */
        .canvas-reveal-new {
          animation: canvas-pop 340ms cubic-bezier(0.22, 0.8, 0.2, 1) both;
        }

        @keyframes canvas-pop {
          from { opacity: 0; transform: translateY(10px) scale(0.97); }
          to   { opacity: 1; transform: none; }
        }

        /* Compare reveals left → VS → right; keep the grid stable meanwhile. */
        .canvas-compare-vs.is-hidden { visibility: hidden; }
        .canvas-compare-placeholder {
          background: transparent;
          border-color: transparent;
          box-shadow: none;
        }

        /* Flow stacked vertically when there are many nodes. */
        .canvas-flow.is-vertical { flex-direction: column; flex-wrap: nowrap; }
        .canvas-flow.is-vertical .canvas-flow-cell { flex-direction: column; }

        /* Code+explanation: stacked (code on top) for long code. */
        .canvas-codeexplain.is-stacked {
          grid-template-columns: 1fr;
          grid-template-rows: minmax(0, auto) minmax(0, 1fr);
        }
        .canvas-codeexplain.is-stacked .canvas-codeexplain-notes {
          flex-direction: row;
          flex-wrap: wrap;
          gap: 0.6rem;
        }
        .canvas-codeexplain.is-stacked .canvas-codeexplain-note {
          flex: 1 1 14rem;
        }

        /* ── Quiz ── */
        .canvas-quiz-question {
          font-size: 1.25rem;
          font-weight: 600;
          color: #0f172a;
          line-height: 1.45;
          margin-bottom: 1.1rem;
        }

        .canvas-quiz-question p { margin: 0; }

        .canvas-quiz-options {
          display: flex;
          flex-direction: column;
          gap: 0.65rem;
        }

        .canvas-quiz-option {
          display: flex;
          align-items: center;
          gap: 0.85rem;
          width: 100%;
          text-align: left;
          background: #fff;
          border: 2px solid #e2e8f0;
          border-radius: 0.85rem;
          padding: 0.8rem 1rem;
          font-size: 1.05rem;
          color: #1e293b;
          cursor: pointer;
          transition: border-color 0.15s, background 0.15s;
        }

        .canvas-quiz-option:not(:disabled):hover { border-color: #a5b4fc; background: #eef2ff; }
        .canvas-quiz-option:disabled { cursor: default; }

        .canvas-quiz-mark {
          height: 2rem;
          width: 2rem;
          flex: none;
          border-radius: 999px;
          background: #eef2ff;
          color: #4338ca;
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .canvas-quiz-label { flex: 1; }
        .canvas-quiz-option i { font-size: 1.2rem; }

        .canvas-quiz-option.is-correct { border-color: #16a34a; background: #f0fdf4; color: #166534; }
        .canvas-quiz-option.is-correct .canvas-quiz-mark { background: #dcfce7; color: #16a34a; }
        .canvas-quiz-option.is-correct i { color: #16a34a; }
        .canvas-quiz-option.is-wrong { border-color: #dc2626; background: #fef2f2; color: #991b1b; }
        .canvas-quiz-option.is-wrong .canvas-quiz-mark { background: #fee2e2; color: #dc2626; }
        .canvas-quiz-option.is-wrong i { color: #dc2626; }
        .canvas-quiz-option.is-dim { opacity: 0.55; }

        .canvas-quiz-explain {
          margin-top: 1rem;
          display: flex;
          gap: 0.6rem;
          background: #fffbeb;
          border: 1px solid #fde68a;
          border-radius: 0.75rem;
          padding: 0.8rem 1rem;
          color: #92400e;
          font-size: 0.98rem;
          line-height: 1.5;
        }

        .canvas-quiz-explain p { margin: 0; }

        /* ── Playground ── */
        .teaching-canvas-playground { gap: 0.85rem; }

        .canvas-playground-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 1rem;
        }

        .canvas-playground-title { margin: 0.4rem 0 0; font-size: 1.7rem; }

        .canvas-playground-run {
          flex: none;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          background: #4f46e5;
          color: #fff;
          border: none;
          border-radius: 0.7rem;
          padding: 0.6rem 1.1rem;
          font-size: 0.95rem;
          font-weight: 700;
          cursor: pointer;
        }

        .canvas-playground-run:disabled { opacity: 0.7; cursor: default; }

        .canvas-playground-editor {
          flex: 1 1 auto;
          min-height: 0;
          width: 100%;
          resize: none;
          background: #0f172a;
          color: #e2e8f0;
          border: none;
          border-radius: 0.85rem;
          padding: 1rem 1.1rem;
          font-family: ui-monospace, SFMono-Regular, monospace;
          font-size: 0.95rem;
          line-height: 1.6;
          tab-size: 4;
        }

        .canvas-playground-editor:focus { outline: 2px solid #6366f1; }

        .canvas-playground-output {
          flex: none;
          height: 9rem;
          overflow: auto;
          border-radius: 0.85rem;
          padding: 0.85rem 1.1rem;
          font-family: ui-monospace, SFMono-Regular, monospace;
          font-size: 0.92rem;
          line-height: 1.55;
          white-space: pre-wrap;
        }

        .canvas-playground-output.is-success { background: #f1f5f9; color: #0f172a; }
        .canvas-playground-output.is-error { background: #fef2f2; color: #b91c1c; }

        /* ── Accent (per-canvas color, additive — only when an accent class is set) ── */
        .teaching-canvas-inner { --canvas-accent: #4f46e5; --canvas-accent-soft: #e0e7ff; }
        .canvas-accent-indigo  { --canvas-accent: #4f46e5; --canvas-accent-soft: #e0e7ff; }
        .canvas-accent-teal    { --canvas-accent: #0d9488; --canvas-accent-soft: #ccfbf1; }
        .canvas-accent-amber   { --canvas-accent: #b45309; --canvas-accent-soft: #fef3c7; }
        .canvas-accent-rose    { --canvas-accent: #e11d48; --canvas-accent-soft: #ffe4e6; }
        .canvas-accent-emerald { --canvas-accent: #059669; --canvas-accent-soft: #d1fae5; }

        [class*="canvas-accent-"] .canvas-kicker { background: var(--canvas-accent-soft); color: var(--canvas-accent); }
        [class*="canvas-accent-"] .canvas-timeline-node { background: var(--canvas-accent); }
        [class*="canvas-accent-"] .canvas-flow-arrow { color: var(--canvas-accent); }
        [class*="canvas-accent-"] .canvas-quiz-mark { background: var(--canvas-accent-soft); color: var(--canvas-accent); }
        [class*="canvas-accent-"] .canvas-highlight-box { border-left-color: var(--canvas-accent); }
        [class*="canvas-accent-"] .canvas-highlight-label { color: var(--canvas-accent); }
        [class*="canvas-accent-"] .canvas-codeexplain-note { border-left-color: var(--canvas-accent); }
        [class*="canvas-accent-"] .canvas-codeexplain-badge { background: var(--canvas-accent-soft); color: var(--canvas-accent); }
        [class*="canvas-accent-"] .canvas-mindmap-center { background: var(--canvas-accent); }
        [class*="canvas-accent-"] .canvas-mindmap-branch { border-left-color: var(--canvas-accent); }

        /* ── Statement (câu chốt lớn) ── */
        .teaching-canvas-statement {
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 2.5rem 3.5rem;
        }

        .canvas-statement-box { max-width: 46rem; }
        .canvas-statement-mark { color: #c7d2fe; font-size: 2.4rem; margin-bottom: 0.6rem; }
        .canvas-statement-text { font-size: 2.2rem; font-weight: 800; line-height: 1.3; color: #0f172a; }
        .canvas-statement-text p { margin: 0; }
        .canvas-statement-by { margin: 1.2rem 0 0; font-size: 1rem; font-weight: 700; color: var(--canvas-accent, #6366f1); }

        /* ── Cover (ảnh nền tràn viền) ── */
        .teaching-canvas-cover {
          position: relative;
          align-items: flex-start;
          justify-content: flex-end;
          padding: 0;
          background: linear-gradient(135deg, #0c2340, #1a3a6b);
          background-size: cover;
          background-position: center;
        }

        .teaching-canvas-cover.has-image { background-color: #0c2340; }

        .canvas-cover-scrim {
          position: absolute;
          inset: 0;
          background: linear-gradient(0deg, rgba(8, 15, 30, 0.88) 0%, rgba(8, 15, 30, 0.3) 55%, rgba(8, 15, 30, 0.55) 100%);
        }

        .canvas-cover-content { position: relative; padding: 2.5rem 3rem; }

        .canvas-cover-title {
          margin: 0;
          color: #fff;
          font-size: 2.8rem;
          font-weight: 900;
          line-height: 1.1;
          text-wrap: balance;
        }

        .canvas-cover-sub { margin-top: 0.8rem; color: #cbd5e1; font-size: 1.25rem; }
        .canvas-cover-sub p { margin: 0; }

        /* ── Two-column text ── */
        .canvas-twocol-body {
          columns: 2;
          column-gap: 2.5rem;
          font-size: 1.05rem;
          line-height: 1.6;
          color: #1e293b;
        }

        .canvas-twocol-body :first-child { margin-top: 0; }
        .canvas-twocol-body h2,
        .canvas-twocol-body h3 { break-after: avoid; }

        /* ── Banner (ngăn cách phần) ── */
        .teaching-canvas-banner {
          align-items: center;
          justify-content: center;
          text-align: center;
          gap: 1.2rem;
          padding: 2.5rem 3.5rem;
        }

        .canvas-banner-rule { width: 4rem; height: 4px; border-radius: 2px; background: var(--canvas-accent, #4f46e5); }
        .canvas-banner-title { margin: 0; font-size: 2.6rem; font-weight: 900; color: #0f172a; line-height: 1.15; }
        .canvas-banner-sub { color: #64748b; font-size: 1.2rem; }
        .canvas-banner-sub p { margin: 0; }

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
          /* Thin scrollbars so long code lines scroll horizontally without clutter. */
          scrollbar-width: thin;
          scrollbar-color: rgba(148, 163, 184, 0.45) transparent;
        }

        .canvas-terminal-body::-webkit-scrollbar {
          height: 8px;
          width: 8px;
        }

        .canvas-terminal-body::-webkit-scrollbar-thumb {
          background: rgba(148, 163, 184, 0.45);
          border-radius: 999px;
        }

        .canvas-terminal-body::-webkit-scrollbar-thumb:hover {
          background: rgba(148, 163, 184, 0.7);
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
          /* Keep each code line on one line; scroll horizontally instead of wrapping. */
          white-space: pre;
          width: max-content;
          min-width: 100%;
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
    case "timeline":  return <TimelineSlide   {...props} />;
    case "compare":   return <CompareSlide    {...props} />;
    case "checklist": return <ChecklistSlide  {...props} />;
    case "chat":      return <ChatSlide       {...props} />;
    case "flow":      return <FlowSlide       {...props} />;
    case "code_explain": return <CodeExplainSlide {...props} />;
    case "mindmap":   return <MindmapSlide    {...props} />;
    case "quiz":      return <QuizSlide       {...props} />;
    case "playground": return <PlaygroundSlide {...props} />;
    case "statement": return <StatementSlide  {...props} />;
    case "cover":     return <CoverSlide      {...props} />;
    case "two_col_text": return <TwoColTextSlide {...props} />;
    case "banner":    return <BannerSlide     {...props} />;
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
function CardsSlide({ canvas, visibleSteps }: SlideProps) {
  const cards = (canvas.cards ?? []).slice(0, Math.max(1, visibleSteps));
  return (
    <article className="teaching-canvas teaching-canvas-cards">
      <h3 className="canvas-title">{canvas.title}</h3>
      <AutoFit>
        {(canvas.cards?.length ?? 0) > 0 ? (
          <div className="canvas-cards-grid">
            {cards.map((card, i) => (
              <div
                key={i}
                className={`canvas-card${i === visibleSteps - 1 ? " canvas-reveal-new" : ""}`}
              >
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

/* ─── Timeline (process / các bước) ─── */
function TimelineSlide({ canvas, visibleSteps }: SlideProps) {
  const steps = (canvas.steps ?? []).slice(0, Math.max(1, visibleSteps));
  return (
    <article className="teaching-canvas teaching-canvas-timeline">
      <span className="canvas-kicker kicker-purple">Quy trình</span>
      <h3 className="canvas-title">{canvas.title}</h3>
      <AutoFit>
        {(canvas.steps?.length ?? 0) > 0 ? (
          <ol className="canvas-timeline">
            {steps.map((step, i) => (
              <li
                key={step.id || i}
                className={`canvas-timeline-item${i === visibleSteps - 1 ? " canvas-reveal-new" : ""}`}
              >
                <span className="canvas-timeline-node">{i + 1}</span>
                <div
                  className="canvas-timeline-text"
                  dangerouslySetInnerHTML={{
                    __html: sanitizeLessonHtml(step.html || step.text || ""),
                  }}
                />
              </li>
            ))}
          </ol>
        ) : (
          <div className="canvas-body">
            <LessonContentRenderer html={canvas.html} media={[]} />
          </div>
        )}
      </AutoFit>
    </article>
  );
}

/* ─── Compare (A vs B) ─── */
function CompareSlide({ canvas, media, visibleSteps }: SlideProps) {
  const cards = canvas.cards ?? [];

  if (cards.length < 2) {
    // Not enough sides to compare — degrade to a plain concept slide.
    return (
      <article className="teaching-canvas teaching-canvas-concept">
        <span className="canvas-kicker kicker-amber">So sánh</span>
        <h3 className="canvas-title">{canvas.title}</h3>
        <AutoFit>
          <div className="canvas-body">
            <LessonContentRenderer html={canvas.html} media={media} />
          </div>
        </AutoFit>
      </article>
    );
  }

  // Reveal order: left (1) → VS (2) → right (3).
  const shown = Math.max(1, visibleSteps);
  const [left, right] = cards;
  return (
    <article className="teaching-canvas teaching-canvas-compare">
      <span className="canvas-kicker kicker-amber">So sánh</span>
      <h3 className="canvas-title">{canvas.title}</h3>
      <AutoFit>
        <div className="canvas-compare-grid">
          <div
            className={`canvas-compare-side canvas-compare-left${shown === 1 ? " canvas-reveal-new" : ""}`}
          >
            {left.icon && (
              <span className="canvas-compare-icon">
                <i className={`fa-solid ${left.icon}`}></i>
              </span>
            )}
            <h4 className="canvas-compare-title">{left.title}</h4>
            <p className="canvas-compare-desc">{left.description}</p>
          </div>
          <span
            className={`canvas-compare-vs${shown >= 2 ? "" : " is-hidden"}${shown === 2 ? " canvas-reveal-new" : ""}`}
          >
            VS
          </span>
          {shown >= 3 ? (
            <div className="canvas-compare-side canvas-compare-right canvas-reveal-new">
              {right.icon && (
                <span className="canvas-compare-icon">
                  <i className={`fa-solid ${right.icon}`}></i>
                </span>
              )}
              <h4 className="canvas-compare-title">{right.title}</h4>
              <p className="canvas-compare-desc">{right.description}</p>
            </div>
          ) : (
            <div className="canvas-compare-side canvas-compare-placeholder" aria-hidden="true" />
          )}
        </div>
      </AutoFit>
    </article>
  );
}

/* ─── Checklist (summary / ghi nhớ) ─── */
function ChecklistSlide({ canvas, media, visibleSteps }: SlideProps) {
  const steps = (canvas.steps ?? []).slice(0, Math.max(1, visibleSteps));
  return (
    <article className="teaching-canvas teaching-canvas-checklist">
      <span className="canvas-kicker kicker-teal">Ghi nhớ</span>
      <h3 className="canvas-title">{canvas.title}</h3>
      <AutoFit>
        {canvas.html.trim() && (
          <div className="canvas-body canvas-checklist-intro">
            <LessonContentRenderer html={canvas.html} media={media} />
          </div>
        )}
        {(canvas.steps?.length ?? 0) > 0 && (
          <ul className="canvas-checklist">
            {steps.map((step, i) => (
              <li
                key={step.id || i}
                className={`canvas-checklist-note${i === visibleSteps - 1 ? " canvas-reveal-new" : ""}`}
              >
                <span className="canvas-checklist-pin" aria-hidden="true"></span>
                <div
                  className="canvas-checklist-text"
                  dangerouslySetInnerHTML={{
                    __html: sanitizeLessonHtml(step.html || step.text || ""),
                  }}
                />
              </li>
            ))}
          </ul>
        )}
      </AutoFit>
    </article>
  );
}

/* ─── Chat / hội thoại ─── */
function ChatSlide({ canvas, visibleSteps }: SlideProps) {
  const allMessages = canvas.cards ?? [];
  const messages = allMessages.slice(0, Math.max(1, visibleSteps));
  if (allMessages.length === 0) {
    return (
      <article className="teaching-canvas teaching-canvas-concept">
        <span className="canvas-kicker kicker-purple">Hội thoại</span>
        <h3 className="canvas-title">{canvas.title}</h3>
        <AutoFit>
          <div className="canvas-body">
            <LessonContentRenderer html={canvas.html} media={[]} />
          </div>
        </AutoFit>
      </article>
    );
  }
  const firstSpeaker = allMessages.find((m) => m.title)?.title ?? "";
  return (
    <article className="teaching-canvas teaching-canvas-chat">
      <span className="canvas-kicker kicker-purple">Hội thoại</span>
      <h3 className="canvas-title">{canvas.title}</h3>
      <AutoFit>
        <div className="canvas-chat">
          {messages.map((m, i) => {
            const isLeft = (m.title || "") === firstSpeaker;
            return (
              <div
                key={i}
                className={`canvas-chat-row ${isLeft ? "is-left" : "is-right"}${i === visibleSteps - 1 ? " canvas-reveal-new" : ""}`}
              >
                <span className="canvas-chat-avatar">
                  {m.icon ? <i className={`fa-solid ${m.icon}`}></i> : (m.title || "?").slice(0, 1)}
                </span>
                <div className="canvas-chat-bubble">
                  {m.title && <span className="canvas-chat-name">{m.title}</span>}
                  <p className="canvas-chat-text">{m.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </AutoFit>
    </article>
  );
}

/* ─── Flow ngang / pipeline ─── */
function FlowSlide({ canvas, visibleSteps }: SlideProps) {
  const allSteps = canvas.steps ?? [];
  const steps = allSteps.slice(0, Math.max(1, visibleSteps));
  if (allSteps.length === 0) {
    return (
      <article className="teaching-canvas teaching-canvas-concept">
        <span className="canvas-kicker kicker-teal">Luồng xử lý</span>
        <h3 className="canvas-title">{canvas.title}</h3>
        <AutoFit>
          <div className="canvas-body">
            <LessonContentRenderer html={canvas.html} media={[]} />
          </div>
        </AutoFit>
      </article>
    );
  }
  // ≥4 nodes read better stacked vertically than wrapped horizontally.
  const vertical = allSteps.length >= 4;
  return (
    <article className="teaching-canvas teaching-canvas-flow">
      <span className="canvas-kicker kicker-teal">Luồng xử lý</span>
      <h3 className="canvas-title">{canvas.title}</h3>
      <AutoFit>
        <div className={`canvas-flow${vertical ? " is-vertical" : ""}`}>
          {steps.map((step, i) => (
            <div
              key={step.id || i}
              className={`canvas-flow-cell${i === visibleSteps - 1 ? " canvas-reveal-new" : ""}`}
            >
              <div
                className="canvas-flow-node"
                dangerouslySetInnerHTML={{
                  __html: sanitizeLessonHtml(step.html || step.text || ""),
                }}
              />
              {i < steps.length - 1 && (
                <span className="canvas-flow-arrow">
                  <i className={`fa-solid ${vertical ? "fa-arrow-down" : "fa-arrow-right"}`}></i>
                </span>
              )}
            </div>
          ))}
        </div>
      </AutoFit>
    </article>
  );
}

/* ─── Code + giải thích từng dòng ─── */
function CodeExplainSlide({ canvas, visibleSteps }: SlideProps) {
  const code = canvas.code?.trim() || "";
  if (!code) {
    return (
      <article className="teaching-canvas teaching-canvas-concept">
        <span className="canvas-kicker kicker-amber">Đọc code</span>
        <h3 className="canvas-title">{canvas.title}</h3>
        <AutoFit>
          <div className="canvas-body">
            <LessonContentRenderer html={canvas.html} media={[]} />
          </div>
        </AutoFit>
      </article>
    );
  }
  const lines = code.split("\n");
  const notes = (canvas.steps ?? []).slice(0, Math.max(1, visibleSteps));
  // Long code reads better stacked (code on top, notes below); short code sits
  // beside the notes in two columns.
  const longest = lines.reduce((max, l) => Math.max(max, l.length), 0);
  const stacked = lines.length > 9 || longest > 52;
  return (
    <article className="teaching-canvas teaching-canvas-codeexplain">
      <span className="canvas-kicker kicker-amber">Đọc code</span>
      <h3 className="canvas-title">{canvas.title}</h3>
      <AutoFit>
        <div className={`canvas-codeexplain${stacked ? " is-stacked" : ""}`}>
          <div className="canvas-codeexplain-panel">
            <div className="canvas-codeexplain-bar">
              <span className="canvas-codeexplain-dot" style={{ background: "#ff5f56" }}></span>
              <span className="canvas-codeexplain-dot" style={{ background: "#ffbd2e" }}></span>
              <span className="canvas-codeexplain-dot" style={{ background: "#27c93f" }}></span>
              <span className="canvas-codeexplain-file">main.py</span>
            </div>
            <pre className="canvas-codeexplain-code">
              {lines.map((line, i) => (
                <div key={i} className="canvas-codeexplain-line">
                  <span className="canvas-codeexplain-ln">{i + 1}</span>
                  <code>{line || " "}</code>
                </div>
              ))}
            </pre>
          </div>
          {notes.length > 0 && (
            <ol className="canvas-codeexplain-notes">
              {notes.map((step, i) => (
                <li
                  key={step.id || i}
                  className={`canvas-codeexplain-note${i === visibleSteps - 1 ? " canvas-reveal-new" : ""}`}
                >
                  <span className="canvas-codeexplain-badge">Dòng {i + 1}</span>
                  <div
                    className="canvas-codeexplain-note-text"
                    dangerouslySetInnerHTML={{
                      __html: sanitizeLessonHtml(step.html || step.text || ""),
                    }}
                  />
                </li>
              ))}
            </ol>
          )}
        </div>
      </AutoFit>
    </article>
  );
}

/* ─── Mindmap ─── */
function MindmapSlide({ canvas, visibleSteps }: SlideProps) {
  const allBranches = canvas.steps ?? [];
  const branches = allBranches.slice(0, Math.max(1, visibleSteps));
  if (allBranches.length === 0) {
    return (
      <article className="teaching-canvas teaching-canvas-concept">
        <span className="canvas-kicker kicker-purple">Sơ đồ tư duy</span>
        <h3 className="canvas-title">{canvas.title}</h3>
        <AutoFit>
          <div className="canvas-body">
            <LessonContentRenderer html={canvas.html} media={[]} />
          </div>
        </AutoFit>
      </article>
    );
  }
  return (
    <article className="teaching-canvas teaching-canvas-mindmap">
      <AutoFit>
        <div className="canvas-mindmap">
          <div className="canvas-mindmap-center">{canvas.title}</div>
          <span className="canvas-mindmap-trunk" aria-hidden="true"></span>
          <ul className="canvas-mindmap-branches">
            {branches.map((b, i) => (
              <li
                key={b.id || i}
                className={`canvas-mindmap-branch${i === visibleSteps - 1 ? " canvas-reveal-new" : ""}`}
                dangerouslySetInnerHTML={{
                  __html: sanitizeLessonHtml(b.html || b.text || ""),
                }}
              />
            ))}
          </ul>
        </div>
      </AutoFit>
    </article>
  );
}

/* ─── Quiz (trắc nghiệm, không chấm điểm) ─── */
function QuizSlide({ canvas }: SlideProps) {
  const options = canvas.cards ?? [];
  const [picked, setPicked] = useState<number | null>(null);
  const answered = picked !== null;

  return (
    <article className="teaching-canvas teaching-canvas-quiz">
      <span className="canvas-kicker kicker-amber">Câu hỏi nhanh</span>
      <h3 className="canvas-title">{canvas.title}</h3>
      <AutoFit>
        {canvas.html.trim() && (
          <div className="canvas-quiz-question">
            <LessonContentRenderer html={canvas.html} media={[]} />
          </div>
        )}
        <div className="canvas-quiz-options">
          {options.map((opt, i) => {
            const isCorrect = opt.correct === true;
            const state = !answered
              ? ""
              : isCorrect
                ? "is-correct"
                : i === picked
                  ? "is-wrong"
                  : "is-dim";
            return (
              <button
                key={i}
                type="button"
                disabled={answered}
                onClick={() => setPicked(i)}
                className={`canvas-quiz-option ${state}`}
              >
                <span className="canvas-quiz-mark">{String.fromCharCode(65 + i)}</span>
                <span className="canvas-quiz-label">{opt.title}</span>
                {answered && isCorrect && <i className="fa-solid fa-circle-check"></i>}
                {answered && !isCorrect && i === picked && (
                  <i className="fa-solid fa-circle-xmark"></i>
                )}
              </button>
            );
          })}
        </div>
        {answered && canvas.notesHtml?.trim() && (
          <div className="canvas-quiz-explain">
            <i className="fa-solid fa-lightbulb"></i>
            <LessonContentRenderer html={canvas.notesHtml} media={[]} />
          </div>
        )}
      </AutoFit>
    </article>
  );
}

/* ─── Playground (chạy Python ngay trong slide qua Pyodide worker) ─── */
function PlaygroundSlide({ canvas }: SlideProps) {
  const [code, setCode] = useState(canvas.code?.trim() || 'print("Xin chào!")');
  const [output, setOutput] = useState<string | null>(null);
  const [outputType, setOutputType] = useState<"success" | "error">("success");
  const [phase, setPhase] = useState<"idle" | "loading" | "running">("idle");

  const run = async () => {
    if (phase !== "idle") return;
    setPhase("loading");
    setOutput(null);
    const result = await runPython(code, (status) => setPhase(status));
    if (result.error) {
      setOutput(result.error);
      setOutputType("error");
    } else {
      setOutput(result.output || "(Không có output)");
      setOutputType("success");
    }
    setPhase("idle");
  };

  return (
    <article className="teaching-canvas teaching-canvas-playground">
      <div className="canvas-playground-head">
        <div>
          <span className="canvas-kicker kicker-teal">Thử code</span>
          <h3 className="canvas-title canvas-playground-title">{canvas.title}</h3>
        </div>
        <button
          type="button"
          onClick={run}
          disabled={phase !== "idle"}
          className="canvas-playground-run"
        >
          {phase === "running" ? (
            <><i className="fa-solid fa-spinner fa-spin"></i> Đang chạy…</>
          ) : phase === "loading" ? (
            <><i className="fa-solid fa-spinner fa-spin"></i> Đang tải Python…</>
          ) : (
            <><i className="fa-solid fa-play"></i> Chạy</>
          )}
        </button>
      </div>
      <textarea
        className="canvas-playground-editor"
        value={code}
        spellCheck={false}
        onChange={(e) => setCode(e.target.value)}
      />
      <div className={`canvas-playground-output is-${outputType}`}>
        {output ?? 'Bấm "Chạy" để xem kết quả.'}
      </div>
    </article>
  );
}

/* ─── Statement (1 câu chốt lớn, căn giữa) ─── */
function StatementSlide({ canvas }: SlideProps) {
  return (
    <article className="teaching-canvas teaching-canvas-statement">
      <AutoFit>
        <div className="canvas-statement-box">
          <i className="fa-solid fa-quote-left canvas-statement-mark"></i>
          <div
            className="canvas-statement-text"
            dangerouslySetInnerHTML={{
              __html: sanitizeLessonHtml(canvas.html || `<p>${canvas.title}</p>`),
            }}
          />
          {canvas.html.trim() && <p className="canvas-statement-by">{canvas.title}</p>}
        </div>
      </AutoFit>
    </article>
  );
}

/* ─── Cover (ảnh nền tràn viền + tiêu đề đè) ─── */
function CoverSlide({ canvas, media }: SlideProps) {
  const mediaView = canvas.mediaId
    ? media.find((m) => m.id === canvas.mediaId) || null
    : null;
  return (
    <article
      className={`teaching-canvas teaching-canvas-cover${mediaView ? " has-image" : ""}`}
      style={mediaView ? { backgroundImage: `url(${mediaView.publicUrl})` } : undefined}
    >
      <div className="canvas-cover-scrim" />
      <div className="canvas-cover-content">
        <h2 className="canvas-cover-title">{canvas.title}</h2>
        {canvas.html.trim() && (
          <div
            className="canvas-cover-sub"
            dangerouslySetInnerHTML={{ __html: sanitizeLessonHtml(canvas.html) }}
          />
        )}
      </div>
    </article>
  );
}

/* ─── Two-column text (chữ chia 2 cột) ─── */
function TwoColTextSlide({ canvas, media }: SlideProps) {
  return (
    <article className="teaching-canvas teaching-canvas-twocol">
      <span className="canvas-kicker">Nội dung</span>
      <h3 className="canvas-title">{canvas.title}</h3>
      <AutoFit>
        <div className="canvas-twocol-body">
          <LessonContentRenderer html={canvas.html} media={media} />
        </div>
      </AutoFit>
    </article>
  );
}

/* ─── Banner (slide ngăn cách giữa các phần) ─── */
function BannerSlide({ canvas }: SlideProps) {
  return (
    <article className="teaching-canvas teaching-canvas-banner">
      <div className="canvas-banner-rule" />
      <h2 className="canvas-banner-title">{canvas.title}</h2>
      {canvas.html.trim() && (
        <div
          className="canvas-banner-sub"
          dangerouslySetInnerHTML={{ __html: sanitizeLessonHtml(canvas.html) }}
        />
      )}
      <div className="canvas-banner-rule" />
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

  // Per-canvas ratio overrides the automatic column weight when set.
  const weight = (fallback: "light" | "even" | "heavy") =>
    canvas.ratio === "wide-text"
      ? "light"
      : canvas.ratio === "wide-side"
        ? "heavy"
        : canvas.ratio === "even"
          ? "even"
          : fallback;

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
        style={{ gridTemplateColumns: splitColumns(weight("even")) }}
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
        style={{ gridTemplateColumns: splitColumns(weight(hasText ? "even" : "heavy")) }}
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
        style={{ gridTemplateColumns: splitColumns(weight(codeWeight(code))) }}
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
