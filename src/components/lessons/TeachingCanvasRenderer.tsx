"use client";

import { useEffect, useMemo, useState } from "react";
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
