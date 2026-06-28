"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import LessonContentRenderer from "@/components/lessons/LessonContentRenderer";
import { sanitizeLessonHtml } from "@/lib/sanitize-html";
import { runPython } from "@/lib/python/pyodide-client";
import type { LessonMediaView } from "@/lib/lessons/lesson-media";
import type { TeachingCanvas } from "@/lib/lessons/teaching-canvas";
import { resolveCodeExplainLineIndexes, stripTags } from "@/lib/lessons/code-explain";

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
        [class*="canvas-theme-"] .canvas-mindmap-branch { border-left-color: var(--canvas-accent); }
        [class*="canvas-theme-"] .canvas-codeexplain-popover-head { color: var(--canvas-accent); }
        [class*="canvas-theme-"] .canvas-codeexplain-line.is-active { box-shadow: inset 3px 0 0 var(--canvas-accent); }

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

        .teaching-canvas .lesson-content p {
          margin: 0 0 1rem 0;
          font-size: 1.15rem;
          line-height: 1.75;
          color: #334155;
        }

        .teaching-canvas .lesson-content p:last-child {
          margin-bottom: 0;
        }

        .teaching-canvas .lesson-content ul {
          list-style: none;
          padding-left: 1.75rem;
          margin: 0.65rem 0 1.25rem 0;
        }

        .teaching-canvas .lesson-content ol {
          list-style-type: decimal;
          padding-left: 1.75rem;
          margin: 0.65rem 0 1.25rem 0;
        }

        .teaching-canvas .lesson-content li {
          margin-bottom: 0.5rem;
          font-size: 1.125rem;
          line-height: 1.65;
          color: #334155;
        }

        /* Bullet xanh "tự thân" cho canvas: list-style:none + MỘT chấm ::before. Tránh
           "double bullet" khi trang học sinh cũng thêm ::before (specificity của canvas
           cao hơn nên thắng → chỉ còn 1 chấm), đồng thời vẫn có bullet ở xem trước trong
           trình soạn — nơi không nạp CSS của trang học sinh. */
        .teaching-canvas .lesson-content ul > li {
          position: relative;
          padding-left: 1.6rem;
        }

        .teaching-canvas .lesson-content ul > li::before {
          content: "";
          position: absolute;
          left: 0;
          top: 0.7em;
          width: 7px;
          height: 7px;
          background: #3b82f6;
          border-radius: 50%;
        }

        .teaching-canvas .lesson-content li:last-child {
          margin-bottom: 0;
        }

        .teaching-canvas .lesson-content code {
          background: #eef2ff;
          border: 1px solid #e0e7ff;
          border-radius: 0.35rem;
          padding: 0.12rem 0.35rem;
          color: #4f46e5;
          font-size: 0.9em;
          font-weight: 600;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
        }

        .teaching-canvas .lesson-content strong {
          font-weight: 700;
          color: #0f172a;
        }

        .teaching-canvas .lesson-content h1,
        .teaching-canvas .lesson-content h2,
        .teaching-canvas .lesson-content h3,
        .teaching-canvas .lesson-content h4 {
          color: #0f172a;
          font-weight: 800;
          margin-top: 1.5rem;
          margin-bottom: 0.75rem;
          line-height: 1.25;
        }

        .teaching-canvas .lesson-content h1 { font-size: 1.8rem; }
        .teaching-canvas .lesson-content h2 { font-size: 1.5rem; }
        .teaching-canvas .lesson-content h3 { font-size: 1.3rem; }
        .teaching-canvas .lesson-content h4 { font-size: 1.15rem; }

        /* ── Density tiers: enlarge short text slides so they fill the frame
              (stays top-aligned — no vertical centering). AutoFit still scales
              down if a bump ever overflows, so this can never clip. ── */
        .teaching-canvas-concept.is-roomy .canvas-title,
        .teaching-canvas-highlight.is-roomy .canvas-highlight-label { letter-spacing: 0.01em; }
        .teaching-canvas-concept.is-roomy .canvas-title { font-size: 2.35rem; margin-bottom: 1.1rem; }
        .teaching-canvas-concept.is-roomy .lesson-content p { font-size: 1.4rem; line-height: 1.7; }
        .teaching-canvas-concept.is-roomy .lesson-content li { font-size: 1.35rem; line-height: 1.7; }

        .teaching-canvas-concept.is-lead .canvas-kicker { font-size: 0.8rem; padding: 0.32rem 0.8rem; margin-bottom: 1rem; }
        .teaching-canvas-concept.is-lead .canvas-title { font-size: 2.85rem; line-height: 1.12; margin-bottom: 1.4rem; }
        .teaching-canvas-concept.is-lead .lesson-content p { font-size: 1.72rem; line-height: 1.65; }
        .teaching-canvas-concept.is-lead .lesson-content li { font-size: 1.6rem; line-height: 1.6; }

        /* Short callout/note slides: grow the box so it anchors the frame. */
        .teaching-canvas-concept.is-lead .lesson-callout,
        .teaching-canvas-concept.is-roomy .lesson-callout { padding: 1.9rem 2.1rem; }
        .teaching-canvas-concept.is-lead .lesson-callout p { font-size: 1.55rem; line-height: 1.6; }
        .teaching-canvas-concept.is-roomy .lesson-callout p { font-size: 1.32rem; line-height: 1.65; }

        /* Short highlight slides: bump the highlighted statement. */
        .teaching-canvas-highlight.is-lead .canvas-highlight-box { padding: 2.2rem 2.4rem; }
        .teaching-canvas-highlight.is-lead .canvas-highlight-box .lesson-content { font-size: 1.7rem; line-height: 1.45; }
        .teaching-canvas-highlight.is-roomy .canvas-highlight-box .lesson-content { font-size: 1.5rem; }

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
        .teaching-canvas-chat .canvas-autofit-inner {
          height: 100%;
        }

        .canvas-chat {
          display: flex;
          flex-direction: column;
          gap: 0.8rem;
          width: 100%;
          height: 100%;
          overflow-y: auto;
          padding-right: 0.35rem;
          scrollbar-gutter: stable;
        }

        .canvas-chat::-webkit-scrollbar {
          width: 0.45rem;
        }

        .canvas-chat::-webkit-scrollbar-track {
          border-radius: 999px;
          background: rgba(226, 232, 240, 0.75);
        }

        .canvas-chat::-webkit-scrollbar-thumb {
          border-radius: 999px;
          background: #c7d2fe;
        }

        .canvas-chat-row {
          display: flex;
          align-items: flex-end;
          gap: 0.7rem;
          width: min(82%, 42rem);
          max-width: 100%;
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
          min-width: 0;
          max-width: calc(100% - 3.2rem);
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

        .canvas-chat-text {
          margin: 0;
          font-size: 1.02rem;
          line-height: 1.45;
          color: #1e293b;
          white-space: normal;
        }
        .canvas-chat-text p { margin: 0; }

        /* ── Flow (horizontal) ── */
        .canvas-flow {
          display: flex;
          align-items: stretch;
          justify-content: stretch;
          gap: 0.85rem;
          flex: 1;
          width: 100%;
          min-height: 15.5rem;
        }

        .canvas-flow-cell {
          position: relative;
          display: inline-flex;
          flex: 1 1 0;
          min-width: 0;
          align-items: stretch;
          gap: 0.6rem;
        }

        .canvas-flow-node {
          position: relative;
          display: flex;
          min-height: 7.2rem;
          width: 100%;
          align-items: center;
          justify-content: center;
          background: #fff;
          border: 2px solid #c7d2fe;
          border-radius: 0.9rem;
          padding: 1.45rem 0.95rem 1rem;
          font-size: 0.96rem;
          font-weight: 700;
          line-height: 1.45;
          color: #1e293b;
          box-shadow: 0 2px 10px rgba(15, 23, 42, 0.06);
          text-align: center;
          transition: opacity 0.22s ease, transform 0.22s ease;
          overflow-wrap: anywhere;
        }

        .canvas-flow-node p { margin: 0; }
        .canvas-flow-index {
          position: absolute;
          top: 0.55rem;
          left: 0.65rem;
          display: inline-flex;
          height: 1.35rem;
          min-width: 1.35rem;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          background: #ccfbf1;
          color: #0f766e;
          font-size: 0.72rem;
          font-weight: 900;
        }
        .canvas-flow-arrow {
          display: inline-flex;
          flex: 0 0 auto;
          align-items: center;
          justify-content: center;
          color: #14b8a6;
          font-size: 1.2rem;
        }
        .canvas-flow-arrow.is-hidden {
          visibility: hidden;
          opacity: 0;
        }
        .canvas-flow-cell.is-hidden { pointer-events: none; }
        .canvas-flow-cell.is-hidden .canvas-flow-node,
        .canvas-flow-cell.is-hidden .canvas-flow-arrow {
          visibility: hidden;
          opacity: 0;
        }

        /* ── Code + explanation ── */
        .canvas-codeexplain {
          position: relative;
          flex: 1;
          min-height: 0;
          padding-top: 0.25rem;
        }

        .canvas-codeexplain-panel {
          position: relative;
          display: flex;
          flex-direction: column;
          min-height: 0;
          border-radius: 0.9rem;
          overflow: visible;
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
          padding: 0.9rem 1.1rem 1.05rem;
          overflow: auto;
          font-family: ui-monospace, SFMono-Regular, monospace;
          font-size: 0.92rem;
          line-height: 1.7;
          min-height: 14.5rem;
          max-height: 19rem;
        }

        .canvas-codeexplain-line {
          position: relative;
          display: grid;
          grid-template-columns: 1.6rem 1fr;
          gap: 0.7rem;
          white-space: pre;
          border-radius: 0.4rem;
          padding: 0 0.35rem;
          transition: background 0.2s ease, box-shadow 0.2s ease;
        }

        .canvas-codeexplain-line:hover { background: rgba(99, 102, 241, 0.12); }
        .canvas-codeexplain-ln { color: #475569; text-align: right; user-select: none; }
        .canvas-codeexplain-code code { color: #e2e8f0; }
        .canvas-codeexplain-line.is-active {
          background: rgba(99, 102, 241, 0.18);
          box-shadow: inset 3px 0 0 #818cf8;
        }
        .canvas-codeexplain-line.is-active .canvas-codeexplain-ln { color: #a5b4fc; }

        .canvas-codeexplain-popover {
          position: absolute;
          z-index: 3;
          top: 3.65rem;
          right: 1.15rem;
          width: min(21rem, 42%);
          border: 1px solid #c7d2fe;
          border-radius: 1rem;
          background: #fff;
          color: #1e293b;
          box-shadow: 0 18px 46px rgba(30, 41, 59, 0.2);
          padding: 0.85rem 1rem 0.95rem;
          animation: canvas-popover-in 220ms ease-out;
        }

        .canvas-codeexplain-popover::before {
          content: "";
          position: absolute;
          left: -0.58rem;
          top: 1.25rem;
          width: 1rem;
          height: 1rem;
          transform: rotate(45deg);
          background: #fff;
          border-left: 1px solid #c7d2fe;
          border-bottom: 1px solid #c7d2fe;
        }

        .canvas-codeexplain-popover-head {
          display: flex;
          align-items: center;
          gap: 0.45rem;
          margin-bottom: 0.45rem;
          color: #4f46e5;
          font-size: 0.72rem;
          font-weight: 900;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .canvas-codeexplain-popover-text {
          font-size: 0.95rem;
          line-height: 1.5;
          font-weight: 600;
        }
        .canvas-codeexplain-popover-text p { margin: 0.25rem 0; }
        .canvas-codeexplain-popover-text :first-child { margin-top: 0; }
        .canvas-codeexplain-popover-text :last-child { margin-bottom: 0; }

        @keyframes canvas-popover-in {
          from { opacity: 0; transform: translateY(8px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        /* ── Mindmap ── */
        .canvas-mindmap {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0;
          flex: 1;
          width: 100%;
          min-width: 0;
          box-sizing: border-box;
          padding: 0 clamp(0.75rem, 3vw, 2rem);
        }

        .canvas-mindmap-center {
          background: linear-gradient(135deg, #4f46e5, #6366f1);
          color: #fff;
          border-radius: 1.1rem;
          padding: 1.2rem 1.6rem;
          font-size: 1.5rem;
          font-weight: 800;
          width: clamp(9rem, 24%, 15rem);
          max-width: 15rem;
          min-width: 0;
          text-align: center;
          box-shadow: 0 8px 24px rgba(79, 70, 229, 0.3);
          flex: 0 1 clamp(9rem, 24%, 15rem);
          line-height: 1.25;
          overflow-wrap: anywhere;
          word-break: break-word;
        }

        /* Trunk: single line from the center node out to the branch spine. */
        .canvas-mindmap-trunk {
          flex: 0 0 clamp(1.25rem, 4vw, 2.5rem);
          width: clamp(1.25rem, 4vw, 2.5rem);
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
          flex: 1 1 auto;
          min-width: 0;
          max-width: min(39rem, 100%);
          box-sizing: border-box;
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
          width: 100%;
          max-width: 100%;
          box-sizing: border-box;
          line-height: 1.45;
          white-space: normal;
          overflow-wrap: anywhere;
          word-break: break-word;
        }

        .canvas-mindmap.is-dense .canvas-mindmap-center {
          font-size: 1.28rem;
          padding: 1rem 1.25rem;
        }

        .canvas-mindmap-branch.is-long {
          font-size: 0.95rem;
          padding: 0.65rem 0.9rem;
        }

        .canvas-mindmap-branch :where(p, span, strong, em, code) {
          max-width: 100%;
          white-space: normal;
          overflow-wrap: anywhere;
          word-break: break-word;
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

        /* Flow adapts to node count instead of forcing 4 nodes into a narrow column. */
        .canvas-flow.is-row { flex-wrap: nowrap; }
        .canvas-flow.is-row .canvas-flow-cell { align-items: stretch; }
        .canvas-flow.is-row .canvas-flow-node { max-width: none; }

        .canvas-flow.is-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          align-content: center;
          gap: 1rem 1.25rem;
        }
        .canvas-flow.is-grid.is-grid-two {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
        .canvas-flow.is-grid .canvas-flow-cell {
          display: flex;
          min-height: 6.3rem;
        }
        .canvas-flow.is-grid .canvas-flow-node { min-height: 6.3rem; }
        .canvas-flow.is-grid .canvas-flow-arrow {
          position: absolute;
          right: -0.95rem;
          top: 50%;
          transform: translateY(-50%);
          font-size: 0.95rem;
        }
        .canvas-flow.is-grid .canvas-flow-cell:nth-child(3n) .canvas-flow-arrow {
          display: none;
        }
        .canvas-flow.is-grid.is-grid-two .canvas-flow-cell:nth-child(3n) .canvas-flow-arrow {
          display: inline-flex;
        }
        .canvas-flow.is-grid.is-grid-two .canvas-flow-cell:nth-child(2n) .canvas-flow-arrow {
          display: none;
        }

        .canvas-flow.is-vertical {
          flex-direction: column;
          flex-wrap: nowrap;
          align-items: center;
          justify-content: center;
          min-height: 0;
        }
        .canvas-flow.is-vertical .canvas-flow-cell {
          width: min(100%, 34rem);
          flex: 0 0 auto;
          flex-direction: column;
          align-items: center;
        }
        .canvas-flow.is-vertical .canvas-flow-node {
          min-height: 4.4rem;
          padding: 1.15rem 1.4rem 0.85rem;
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
        [class*="canvas-accent-"] .canvas-codeexplain-popover-head { color: var(--canvas-accent); }
        [class*="canvas-accent-"] .canvas-codeexplain-line.is-active { box-shadow: inset 3px 0 0 var(--canvas-accent); }
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

// Không thu nhỏ chữ xuống dưới mức này — dưới ngưỡng ~2/3 chữ trở nên khó đọc. Khi
// nội dung dài tới mức cần nhỏ hơn sàn, ta GIỮ ở sàn và cho khung cuộn dọc thay vì
// ép chữ li ti (đọc không nổi) hoặc cắt cụt nội dung phía dưới.
const AUTOFIT_MIN_SCALE = 0.66;

/* Shrinks content to fit the box; never below AUTOFIT_MIN_SCALE (scrolls instead). */
function AutoFit({ children }: { children: ReactNode }) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState<{ scale: number; overflowing: boolean }>({
    scale: 1,
    overflowing: false,
  });

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
      const ideal = Math.min(1, availH / needH, availW / needW);
      const scale = Math.max(AUTOFIT_MIN_SCALE, ideal);
      const overflowing = ideal < AUTOFIT_MIN_SCALE;
      setFit((prev) =>
        Math.abs(prev.scale - scale) > 0.004 || prev.overflowing !== overflowing
          ? { scale, overflowing }
          : prev
      );
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(outer);
    observer.observe(inner);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={outerRef}
      className="canvas-autofit"
      // Chạm sàn co chữ → cho cuộn dọc để không cắt mất nội dung (mặc định overflow ẩn).
      style={fit.overflowing ? { overflowY: "auto" } : undefined}
    >
      <div
        ref={innerRef}
        className="canvas-autofit-inner"
        style={{ transform: fit.scale < 1 ? `scale(${fit.scale})` : undefined }}
      >
        {children}
      </div>
    </div>
  );
}

function renderInlineLessonHtml(value: string) {
  return sanitizeLessonHtml(
    value
      .replace(/&lt;br\s*\/?&gt;/gi, "<br />")
      .replace(/\r?\n/g, "<br />")
  );
}

function renderCodeExplainNoteHtml(value: string) {
  return renderInlineLessonHtml(
    value.replace(
      /^\s*(<p>\s*)?(?:Dòng|Dong|Line)\s*\d+\s*[:.)-]\s*/i,
      (_match, paragraphStart) => paragraphStart || ""
    )
  );
}

function textLengthForLayout(value: string): number {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim().length;
}

type ContentDensity = "lead" | "roomy" | "normal";

/* How "full" a text slide is, so short content can be enlarged to fill the
   16:9 frame instead of clinging to the top with empty space below. Counts the
   prose length plus a rough budget per reveal step. */
function contentDensity(textHtml: string, stepCount: number): ContentDensity {
  const len = textLengthForLayout(textHtml) + stepCount * 110;
  if (stepCount === 0 && len <= 150) return "lead";
  if (stepCount <= 1 && len <= 380) return "roomy";
  return "normal";
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
                <h4
                  className="canvas-card-title"
                  dangerouslySetInnerHTML={{ __html: renderInlineLessonHtml(card.title || "") }}
                />
                <p
                  className="canvas-card-desc"
                  dangerouslySetInnerHTML={{
                    __html: renderInlineLessonHtml(card.description || ""),
                  }}
                />
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
  const density = contentDensity(canvas.html, canvas.steps.length);
  return (
    <article className={`teaching-canvas teaching-canvas-highlight is-${density}`}>
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
            <h4
              className="canvas-compare-title"
              dangerouslySetInnerHTML={{ __html: renderInlineLessonHtml(left.title || "") }}
            />
            <p
              className="canvas-compare-desc"
              dangerouslySetInnerHTML={{
                __html: renderInlineLessonHtml(left.description || ""),
              }}
            />
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
              <h4
                className="canvas-compare-title"
                dangerouslySetInnerHTML={{ __html: renderInlineLessonHtml(right.title || "") }}
              />
              <p
                className="canvas-compare-desc"
                dangerouslySetInnerHTML={{
                  __html: renderInlineLessonHtml(right.description || ""),
                }}
              />
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
                  <div
                    className="canvas-chat-text"
                    dangerouslySetInnerHTML={{
                      __html: renderInlineLessonHtml(m.description || ""),
                    }}
                  />
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
  const visibleCount = Math.max(1, visibleSteps);
  const longestStep = allSteps.reduce(
    (max, step) => Math.max(max, (step.text || step.html || "").length),
    0
  );
  const layout =
    allSteps.length <= 3 || (allSteps.length === 4 && longestStep <= 72)
      ? "row"
      : allSteps.length <= 6
        ? "grid"
        : "vertical";
  const flowClass = [
    "canvas-flow",
    `is-${layout}`,
    layout === "grid" && allSteps.length <= 4 ? "is-grid-two" : "",
  ].filter(Boolean).join(" ");

  return (
    <article className="teaching-canvas teaching-canvas-flow">
      <span className="canvas-kicker kicker-teal">Luồng xử lý</span>
      <h3 className="canvas-title">{canvas.title}</h3>
      <AutoFit>
        <div className={flowClass}>
          {allSteps.map((step, i) => {
            const isVisible = i < visibleCount;
            const arrowVisible = i + 1 < visibleCount;
            const arrowIcon = layout === "vertical" ? "fa-arrow-down" : "fa-arrow-right";

            return (
              <div
                key={step.id || i}
                className={[
                  "canvas-flow-cell",
                  isVisible ? "" : "is-hidden",
                  i === visibleSteps - 1 ? "canvas-reveal-new" : "",
                ].filter(Boolean).join(" ")}
              >
                <div
                  className="canvas-flow-node"
                  dangerouslySetInnerHTML={{
                    __html: `<span class="canvas-flow-index">${i + 1}</span>${sanitizeLessonHtml(step.html || step.text || "")}`,
                  }}
                />
                {i < allSteps.length - 1 && (
                  <span className={`canvas-flow-arrow${arrowVisible ? "" : " is-hidden"}`}>
                    <i className={`fa-solid ${arrowIcon}`}></i>
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </AutoFit>
    </article>
  );
}

/* ─── Code + giải thích từng dòng ─── */
function CodeExplainSlide({ canvas, visibleSteps }: SlideProps) {
  const code = canvas.code?.trim() || "";
  const lines = code.split("\n");
  const notes = canvas.steps ?? [];
  // Anchor each note to the real code line it quotes (steps often skip lines or
  // include a summary step, so a plain index→line mapping mislabels them).
  // LƯU Ý: hook PHẢI gọi trước mọi early-return để giữ đúng thứ tự (rules-of-hooks).
  const noteLineIndexes = useMemo(
    () => resolveCodeExplainLineIndexes(notes, lines),
    [notes, code]
  );

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

  const activeNoteIndex = Math.max(0, Math.min(Math.max(1, visibleSteps) - 1, Math.max(notes.length - 1, 0)));
  const activeLineIndex = Math.max(
    0,
    Math.min(
      noteLineIndexes[activeNoteIndex] ?? activeNoteIndex,
      Math.max(lines.length - 1, 0)
    )
  );
  const currentNote = notes[activeNoteIndex];
  const lineCenterRem = 3.88 + activeLineIndex * 1.565;
  const popoverTop = Math.max(2.25, Math.min(lineCenterRem - 1.25, 13.4));

  return (
    <article className="teaching-canvas teaching-canvas-codeexplain">
      <span className="canvas-kicker kicker-amber">Đọc code</span>
      <h3 className="canvas-title">{canvas.title}</h3>
      <AutoFit>
        <div className="canvas-codeexplain">
          <div className="canvas-codeexplain-panel">
            <div className="canvas-codeexplain-bar">
              <span className="canvas-codeexplain-dot" style={{ background: "#ff5f56" }}></span>
              <span className="canvas-codeexplain-dot" style={{ background: "#ffbd2e" }}></span>
              <span className="canvas-codeexplain-dot" style={{ background: "#27c93f" }}></span>
              <span className="canvas-codeexplain-file">main.py</span>
            </div>
            <pre className="canvas-codeexplain-code">
              {lines.map((line, i) => (
                <div
                  key={i}
                  className={`canvas-codeexplain-line${i === activeLineIndex && currentNote ? " is-active" : ""}`}
                >
                  <span className="canvas-codeexplain-ln">{i + 1}</span>
                  <code>{line || " "}</code>
                </div>
              ))}
            </pre>
            {currentNote && (
              <div
                key={currentNote.id || activeNoteIndex}
                className="canvas-codeexplain-popover"
                style={{ top: `${popoverTop}rem` }}
              >
                <div className="canvas-codeexplain-popover-head">
                  <i className="fa-solid fa-comment-dots"></i>
                  <span>Giải thích dòng {activeLineIndex + 1}</span>
                </div>
                <div
                  className="canvas-codeexplain-popover-text"
                  dangerouslySetInnerHTML={{
                    __html: renderCodeExplainNoteHtml(currentNote.html || currentNote.text || ""),
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </AutoFit>
    </article>
  );
}

/* ─── Mindmap ─── */
function MindmapSlide({ canvas, visibleSteps }: SlideProps) {
  const allBranches = canvas.steps ?? [];
  const branches = allBranches.slice(0, Math.max(1, visibleSteps));
  const isDense =
    textLengthForLayout(canvas.title) > 36 ||
    branches.some((branch) => textLengthForLayout(branch.html || branch.text || "") > 76);
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
        <div className={`canvas-mindmap${isDense ? " is-dense" : ""}`}>
          <div className="canvas-mindmap-center">{canvas.title}</div>
          <span className="canvas-mindmap-trunk" aria-hidden="true"></span>
          <ul className="canvas-mindmap-branches">
            {branches.map((b, i) => {
              const rawBranch = b.html || b.text || "";
              const isLong = textLengthForLayout(rawBranch) > 76;
              return (
                <li
                  key={b.id || i}
                  className={`canvas-mindmap-branch${isLong ? " is-long" : ""}${i === visibleSteps - 1 ? " canvas-reveal-new" : ""}`}
                  dangerouslySetInnerHTML={{
                    __html: sanitizeLessonHtml(rawBranch),
                  }}
                />
              );
            })}
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
                <span
                  className="canvas-quiz-label"
                  dangerouslySetInnerHTML={{ __html: renderInlineLessonHtml(opt.title || "") }}
                />
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

// stripTags, normalizeForMatch, codeLineMatchScore, resolveCodeExplainLineIndexes
// đã chuyển sang @/lib/lessons/code-explain (logic thuần, có unit test).

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

  // 4) text only → comfortable full-width slide. Short content is enlarged
  //    (density tier) so it fills the frame instead of leaving empty space.
  const density = contentDensity(textHtml, canvas.steps.length);
  return (
    <article className={`teaching-canvas teaching-canvas-concept is-${density}`}>
      {textZone}
    </article>
  );
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
