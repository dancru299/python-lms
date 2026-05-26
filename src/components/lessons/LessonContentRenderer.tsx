"use client";

import { useEffect, useMemo, useState, type MouseEvent } from "react";
import type {
  LessonImageAnnotation,
  LessonMediaView,
} from "@/lib/lessons/lesson-media";

interface LessonContentRendererProps {
  html: string;
  media: LessonMediaView[];
  editable?: boolean;
  onPlaceholderClick?: (placeholder: {
    id: string;
    suggestedCaption: string;
  }) => void;
}

export default function LessonContentRenderer({
  html,
  media,
  editable = false,
  onPlaceholderClick,
}: LessonContentRendererProps) {
  const [lightboxMediaId, setLightboxMediaId] = useState<string | null>(null);
  const [canEnhanceHtml, setCanEnhanceHtml] = useState(false);
  const mediaById = useMemo(
    () => new Map(media.map((item) => [item.id, item])),
    [media]
  );
  const enhancedHtml = useMemo(
    () => (canEnhanceHtml ? enhanceLessonHtml(html, mediaById, editable) : html || ""),
    [html, mediaById, editable, canEnhanceHtml]
  );
  const lightboxMedia = lightboxMediaId ? mediaById.get(lightboxMediaId) : null;

  useEffect(() => {
    setCanEnhanceHtml(true);
  }, []);

  useEffect(() => {
    if (!lightboxMedia) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setLightboxMediaId(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightboxMedia]);

  const handleContentClick = (event: MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    const mediaTrigger = target.closest<HTMLElement>("[data-lightbox-media-id]");

    if (mediaTrigger) {
      event.preventDefault();
      setLightboxMediaId(mediaTrigger.dataset.lightboxMediaId || null);
      return;
    }

    if (!editable || !onPlaceholderClick) {
      return;
    }

    const placeholder = target.closest<HTMLElement>("[data-placeholder-id]");
    if (placeholder) {
      event.preventDefault();
      onPlaceholderClick({
        id: placeholder.dataset.placeholderId || "",
        suggestedCaption: placeholder.dataset.suggestedCaption || "",
      });
    }
  };

  return (
    <>
      <div
        className="lesson-content"
        onClick={handleContentClick}
        dangerouslySetInnerHTML={{ __html: enhancedHtml }}
      />

      {lightboxMedia && (
        <div className="lesson-lightbox" role="dialog" aria-modal="true">
          <button
            className="lesson-lightbox-backdrop"
            onClick={() => setLightboxMediaId(null)}
            aria-label="Close image"
          />
          <div className="lesson-lightbox-panel">
            <button
              className="lesson-lightbox-close"
              onClick={() => setLightboxMediaId(null)}
              aria-label="Close image"
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
            <div className="lesson-lightbox-image-wrap">
              <img
                src={lightboxMedia.publicUrl}
                alt={lightboxMedia.altText || lightboxMedia.caption || lightboxMedia.fileName}
              />
              <AnnotationOverlay annotations={lightboxMedia.annotations || []} />
            </div>
            {lightboxMedia.caption && (
              <p className="lesson-lightbox-caption">{lightboxMedia.caption}</p>
            )}
          </div>
        </div>
      )}

      <style jsx global>{`
        .lesson-content .lesson-media {
          margin: 1.5rem auto;
          max-width: min(100%, 900px);
        }

        .lesson-content .lesson-media-zoom {
          position: relative;
          display: block;
          width: 100%;
          overflow: hidden;
          border: 1px solid #dbe4f0;
          border-radius: 0.75rem;
          background: #f8fafc;
          padding: 0;
          cursor: zoom-in;
          box-shadow: 0 16px 36px rgba(15, 23, 42, 0.08);
        }

        .lesson-content .lesson-media img {
          display: block;
          width: 100%;
          height: auto;
        }

        .lesson-content .lesson-media figcaption {
          margin-top: 0.65rem;
          color: #64748b;
          font-size: 0.9rem;
          line-height: 1.55;
          text-align: center;
        }

        .lesson-content .lesson-media-annotations,
        .lesson-lightbox-image-wrap .lesson-media-annotations {
          pointer-events: none;
          position: absolute;
          inset: 0;
        }

        .lesson-annotation-rect {
          position: absolute;
          border: 3px solid currentColor;
          border-radius: 0.45rem;
          box-shadow: 0 0 0 999px rgba(15, 23, 42, 0.04);
        }

        .lesson-annotation-marker {
          position: absolute;
          display: flex;
          height: 2rem;
          min-width: 2rem;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          border: 2px solid white;
          color: white;
          font-size: 0.85rem;
          font-weight: 800;
          transform: translate(-50%, -50%);
          box-shadow: 0 8px 18px rgba(15, 23, 42, 0.22);
        }

        .lesson-annotation-label {
          position: absolute;
          max-width: 16rem;
          border-radius: 0.6rem;
          border: 2px solid currentColor;
          background: rgba(255, 255, 255, 0.94);
          padding: 0.45rem 0.6rem;
          color: #0f172a;
          font-size: 0.82rem;
          font-weight: 700;
          line-height: 1.35;
          box-shadow: 0 10px 24px rgba(15, 23, 42, 0.12);
        }

        .lesson-annotation-arrow {
          position: absolute;
          height: 0;
          border-top: 4px solid currentColor;
          transform-origin: 0 50%;
        }

        .lesson-annotation-arrow::after {
          content: "";
          position: absolute;
          right: -1px;
          top: -8px;
          border-bottom: 6px solid transparent;
          border-left: 12px solid currentColor;
          border-top: 6px solid transparent;
        }

        .lesson-content .lesson-media-placeholder {
          margin: 1.25rem 0;
          border: 2px dashed #c7d2fe;
          border-radius: 0.75rem;
          background: #f8f7ff;
          color: #4338ca;
          padding: 1rem;
        }

        .lesson-content .lesson-media-placeholder-title {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-weight: 800;
        }

        .lesson-content .lesson-media-placeholder button {
          margin-top: 0.75rem;
          border-radius: 0.5rem;
          background: #4f46e5;
          color: white;
          padding: 0.45rem 0.75rem;
          font-size: 0.82rem;
          font-weight: 700;
        }

        .lesson-content .lesson-step-guide {
          margin: 1.5rem 0;
          border: 1px solid #bae6fd;
          border-radius: 1rem;
          background: linear-gradient(180deg, #f0f9ff 0%, #ffffff 100%);
          padding: 1.25rem;
        }

        .lesson-content .lesson-step-guide > h3 {
          margin-top: 0;
          border-left-color: #0284c7;
          color: #0c4a6e;
        }

        .lesson-content .lesson-step-guide > ol {
          counter-reset: step;
          list-style: none;
          padding-left: 0;
        }

        .lesson-content .lesson-step-guide > ol > li {
          position: relative;
          margin: 1rem 0 0;
          border-left: 3px solid #bae6fd;
          padding: 0.15rem 0 0.15rem 1.25rem;
        }

        .lesson-content .lesson-step-guide > ol > li::before {
          counter-increment: step;
          content: counter(step);
          position: absolute;
          left: -1rem;
          top: 0;
          display: flex;
          height: 2rem;
          width: 2rem;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          background: #0284c7;
          color: white;
          font-weight: 800;
        }

        .lesson-content .lesson-step-guide h4 {
          margin-top: 0;
          text-transform: none;
          letter-spacing: 0;
          color: #0f172a;
        }

        .lesson-lightbox {
          position: fixed;
          inset: 0;
          z-index: 80;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.5rem;
        }

        .lesson-lightbox-backdrop {
          position: absolute;
          inset: 0;
          background: rgba(15, 23, 42, 0.78);
          backdrop-filter: blur(4px);
        }

        .lesson-lightbox-panel {
          position: relative;
          z-index: 1;
          max-height: calc(100vh - 3rem);
          width: min(1080px, 100%);
          overflow: auto;
          border-radius: 1rem;
          background: white;
          padding: 1rem;
          box-shadow: 0 30px 90px rgba(0, 0, 0, 0.35);
        }

        .lesson-lightbox-close {
          position: absolute;
          right: 1.25rem;
          top: 1.25rem;
          z-index: 2;
          display: flex;
          height: 2.25rem;
          width: 2.25rem;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          background: rgba(15, 23, 42, 0.8);
          color: white;
        }

        .lesson-lightbox-image-wrap {
          position: relative;
          overflow: hidden;
          border-radius: 0.75rem;
          background: #0f172a;
        }

        .lesson-lightbox-image-wrap img {
          display: block;
          width: 100%;
          height: auto;
        }

        .lesson-lightbox-caption {
          margin: 0.85rem 0 0;
          color: #475569;
          text-align: center;
        }
      `}</style>
    </>
  );
}

function AnnotationOverlay({
  annotations,
}: {
  annotations: LessonImageAnnotation[];
}) {
  if (annotations.length === 0) {
    return null;
  }

  return (
    <div className="lesson-media-annotations">
      {annotations.map((annotation) => {
        if (annotation.type === "rect") {
          return (
            <span
              key={annotation.id}
              className="lesson-annotation-rect"
              style={{
                color: annotation.color,
                left: `${annotation.x}%`,
                top: `${annotation.y}%`,
                width: `${annotation.w}%`,
                height: `${annotation.h}%`,
              }}
            />
          );
        }

        if (annotation.type === "arrow") {
          const width = Math.hypot(
            annotation.endX - annotation.x,
            annotation.endY - annotation.y
          );
          const angle =
            Math.atan2(annotation.endY - annotation.y, annotation.endX - annotation.x) *
            (180 / Math.PI);

          return (
            <span
              key={annotation.id}
              className="lesson-annotation-arrow"
              style={{
                color: annotation.color,
                left: `${annotation.x}%`,
                top: `${annotation.y}%`,
                width: `${width}%`,
                transform: `rotate(${angle}deg)`,
              }}
            />
          );
        }

        if (annotation.type === "marker") {
          return (
            <span
              key={annotation.id}
              className="lesson-annotation-marker"
              style={{
                background: annotation.color,
                left: `${annotation.x}%`,
                top: `${annotation.y}%`,
              }}
            >
              {annotation.label}
            </span>
          );
        }

        return (
          <span
            key={annotation.id}
            className="lesson-annotation-label"
            style={{
              borderColor: annotation.color,
              left: `${annotation.x}%`,
              top: `${annotation.y}%`,
            }}
          >
            {annotation.text}
          </span>
        );
      })}
    </div>
  );
}

function enhanceLessonHtml(
  html: string,
  mediaById: Map<string, LessonMediaView>,
  editable: boolean
) {
  if (!html?.trim() || typeof DOMParser === "undefined") {
    return html || "";
  }

  const parser = new DOMParser();
  const document = parser.parseFromString(`<div>${html}</div>`, "text/html");
  const root = document.body.firstElementChild;

  if (!root) {
    return html;
  }

  root
    .querySelectorAll<HTMLElement>("figure.lesson-media[data-media-id]")
    .forEach((figure) => {
      const mediaId = figure.dataset.mediaId;
      const media = mediaId ? mediaById.get(mediaId) : null;

      if (!mediaId || !media) {
        return;
      }

      const caption =
        media.caption ||
        figure.querySelector("figcaption")?.textContent?.trim() ||
        "";
      const button = document.createElement("button");
      button.type = "button";
      button.className = "lesson-media-zoom";
      button.dataset.lightboxMediaId = mediaId;

      const image = document.createElement("img");
      image.src = media.publicUrl;
      image.alt = media.altText || caption || media.fileName;
      if (media.width) {
        image.width = media.width;
      }
      if (media.height) {
        image.height = media.height;
      }
      button.appendChild(image);

      const annotationRoot = document.createElement("div");
      annotationRoot.className = "lesson-media-annotations";
      appendAnnotationNodes(document, annotationRoot, media.annotations || []);
      button.appendChild(annotationRoot);

      figure.innerHTML = "";
      figure.appendChild(button);

      if (caption) {
        const figcaption = document.createElement("figcaption");
        figcaption.textContent = caption;
        figure.appendChild(figcaption);
      }
    });

  root
    .querySelectorAll<HTMLElement>(".lesson-media-placeholder")
    .forEach((placeholder) => {
      const placeholderId =
        placeholder.dataset.placeholderId ||
        placeholder.getAttribute("data-placeholder-id") ||
        `placeholder-${Math.random().toString(36).slice(2)}`;
      const suggestedCaption =
        placeholder.dataset.suggestedCaption ||
        placeholder.getAttribute("data-suggested-caption") ||
        placeholder.textContent?.trim() ||
        "";

      placeholder.dataset.placeholderId = placeholderId;
      placeholder.dataset.suggestedCaption = suggestedCaption;

      if (!placeholder.querySelector(".lesson-media-placeholder-title")) {
        const originalText = suggestedCaption || placeholder.textContent?.trim() || "";
        placeholder.innerHTML = "";

        const title = document.createElement("div");
        title.className = "lesson-media-placeholder-title";
        title.innerHTML = '<i class="fa-solid fa-image"></i><span>Can anh minh hoa</span>';
        placeholder.appendChild(title);

        const description = document.createElement("p");
        description.textContent = originalText;
        placeholder.appendChild(description);
      }

      if (editable && !placeholder.querySelector("button")) {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = "Chen anh";
        placeholder.appendChild(button);
      }
    });

  return root.innerHTML;
}

function appendAnnotationNodes(
  document: Document,
  root: HTMLElement,
  annotations: LessonImageAnnotation[]
) {
  for (const annotation of annotations) {
    const node = document.createElement("span");

    if (annotation.type === "rect") {
      node.className = "lesson-annotation-rect";
      node.style.color = annotation.color;
      node.style.left = `${annotation.x}%`;
      node.style.top = `${annotation.y}%`;
      node.style.width = `${annotation.w}%`;
      node.style.height = `${annotation.h}%`;
    } else if (annotation.type === "arrow") {
      const width = Math.hypot(
        annotation.endX - annotation.x,
        annotation.endY - annotation.y
      );
      const angle =
        Math.atan2(annotation.endY - annotation.y, annotation.endX - annotation.x) *
        (180 / Math.PI);

      node.className = "lesson-annotation-arrow";
      node.style.color = annotation.color;
      node.style.left = `${annotation.x}%`;
      node.style.top = `${annotation.y}%`;
      node.style.width = `${width}%`;
      node.style.transform = `rotate(${angle}deg)`;
    } else if (annotation.type === "marker") {
      node.className = "lesson-annotation-marker";
      node.style.background = annotation.color;
      node.style.left = `${annotation.x}%`;
      node.style.top = `${annotation.y}%`;
      node.textContent = annotation.label;
    } else {
      node.className = "lesson-annotation-label";
      node.style.borderColor = annotation.color;
      node.style.left = `${annotation.x}%`;
      node.style.top = `${annotation.y}%`;
      node.textContent = annotation.text;
    }

    root.appendChild(node);
  }
}
