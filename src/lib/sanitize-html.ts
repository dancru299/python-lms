import DOMPurify from "isomorphic-dompurify";

const ALLOWED_DATA_ATTRS = [
  "data-media-id",
  "data-placeholder-id",
  "data-suggested-caption",
  "data-canvas-break",
  "data-step-id",
  "data-lightbox-media-id",
  "data-block-type",
  "data-annotation-id",
];

export function sanitizeLessonHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ADD_ATTR: ALLOWED_DATA_ATTRS,
  });
}
