import DOMPurify from "isomorphic-dompurify";
import type { LessonMutationPayload } from "@/lib/lessons/lesson-draft";

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

// Class trông giống utility của Tailwind mà LLM hay tự chèn (bg-*, text-*, p-4,
// rounded-lg, flex, grid, ...). Slide LMS dùng Vanilla CSS với class ngữ nghĩa
// (code-block, lesson-media, step-content...), nên ta CHỈ gỡ token khớp dạng Tailwind
// và giữ lại mọi class khác — tránh strip nhầm class hợp lệ.
const TAILWIND_UTILITY =
  /^(?:(?:sm|md|lg|xl|2xl|hover|focus|active|group-hover|dark|first|last|odd|even|disabled|motion-safe|motion-reduce)::?)*(?:bg|text|border|rounded|p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|ml|mr|w|h|min|max|flex|inline|grid|gap|space|items|justify|content|self|place|font|leading|tracking|shadow|opacity|z|top|bottom|left|right|inset|absolute|relative|fixed|sticky|static|block|hidden|table|overflow|cursor|pointer|select|transition|duration|delay|ease|transform|scale|rotate|skew|translate|origin|order|col|row|grow|shrink|basis|divide|ring|outline|from|via|to|object|aspect|whitespace|break|truncate|uppercase|lowercase|capitalize|underline|overline|line-through|antialiased|italic|align|float|clear|container|backdrop|filter|blur|brightness|contrast|grayscale|invert|saturate|sepia)(?:-[a-z0-9.+/[\]%()#-]+)?$/i;

function filterTailwindClasses(value: string): string {
  return value
    .split(/\s+/)
    .filter((token) => token && !TAILWIND_UTILITY.test(token))
    .join(" ");
}

// Hook chạy MỘT lần trên DOMPurify singleton (chỉ file này dùng DOMPurify). Sau khi
// sanitize attribute, lọc bỏ các class Tailwind rác khỏi mọi phần tử.
let classHookRegistered = false;
function ensureClassFilterHook(): void {
  if (classHookRegistered) return;
  classHookRegistered = true;
  DOMPurify.addHook("afterSanitizeAttributes", (node) => {
    if (node.nodeType !== 1) return; // chỉ xét element
    const element = node as Element;
    if (!element.hasAttribute("class")) return;
    const cleaned = filterTailwindClasses(element.getAttribute("class") || "");
    if (cleaned) element.setAttribute("class", cleaned);
    else element.removeAttribute("class");
  });
}

export function sanitizeLessonHtml(html: string): string {
  ensureClassFilterHook();
  return DOMPurify.sanitize(html, {
    ADD_ATTR: ALLOWED_DATA_ATTRS,
  });
}

// Các khóa bên trong contentBlocks chứa HTML cần làm sạch. Cố tình BỎ "code" (Python
// thuần) để không nuốt các ký tự < > trong code mẫu.
const HTML_BLOCK_KEYS = new Set(["mainHtml", "notesHtml", "html"]);

function deepSanitizeBlocks(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => deepSanitizeBlocks(item));
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      out[key] =
        typeof child === "string" && HTML_BLOCK_KEYS.has(key)
          ? sanitizeLessonHtml(child)
          : deepSanitizeBlocks(child);
    }
    return out;
  }
  return value;
}

// Làm sạch MỌI trường HTML do client gửi lên TRƯỚC khi ghi DB (defense-in-depth):
// không tin client, không phụ thuộc việc render có sanitize hay không. Chỉ đụng các
// trường thực sự render bằng HTML (content slide, HTML trong canvas, đề bài) — KHÔNG
// đụng đáp án (answer = code Python) để tránh hỏng code.
export function sanitizeLessonMutationHtml(
  payload: LessonMutationPayload
): LessonMutationPayload {
  return {
    ...payload,
    sections: payload.sections.map((section) => ({
      ...section,
      content:
        typeof section.content === "string"
          ? sanitizeLessonHtml(section.content)
          : section.content,
      contentBlocks: deepSanitizeBlocks(section.contentBlocks),
    })),
    exercises: payload.exercises.map((exercise) => ({
      ...exercise,
      question:
        typeof exercise.question === "string"
          ? sanitizeLessonHtml(exercise.question)
          : exercise.question,
    })),
  };
}
