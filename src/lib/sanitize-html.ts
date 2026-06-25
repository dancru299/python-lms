import { parse, HTMLElement } from "node-html-parser";
import type { LessonMutationPayload } from "@/lib/lessons/lesson-draft";

const ALLOWED_TAGS = new Set([
  "p", "span", "div", "h1", "h2", "h3", "h4", "h5", "h6",
  "ul", "ol", "li", "strong", "em", "b", "i", "u", "s", "del", "ins",
  "blockquote", "pre", "code", "table", "thead", "tbody", "tr", "th", "td",
  "img", "a", "br", "hr", "sub", "sup", "mark", "details", "summary", "figure", "figcaption"
]);

const ALLOWED_ATTRS = new Set([
  "class", "style", "href", "src", "alt", "title", "target", "rel",
  "width", "height", "controls", "colspan", "rowspan", "align"
]);

const ALLOWED_DATA_ATTRS = new Set([
  "data-media-id",
  "data-placeholder-id",
  "data-suggested-caption",
  "data-canvas-break",
  "data-step-id",
  "data-lightbox-media-id",
  "data-block-type",
  "data-annotation-id",
]);

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

// Kiểm tra thuộc tính có được phép giữ lại không
function isAttributeAllowed(name: string): boolean {
  if (ALLOWED_ATTRS.has(name)) return true;
  if (name.startsWith("data-") && ALLOWED_DATA_ATTRS.has(name)) return true;
  return false;
}

// Đệ quy làm sạch từng node HTML
function cleanHtmlNode(node: any): any {
  // Node loại TEXT_NODE (type === 3) giữ nguyên
  if (node.nodeType === 3) {
    return node;
  }

  // Node loại ELEMENT_NODE (type === 1)
  if (node.nodeType === 1) {
    const element = node as HTMLElement;
    const tagName = element.tagName.toLowerCase();

    // Nếu tag nằm trong danh sách cấm (script, style, iframe...), xóa bỏ hoàn toàn
    if (["script", "style", "iframe", "object", "embed", "link", "meta", "form", "input", "button", "textarea", "select"].includes(tagName)) {
      return null;
    }

    // Nếu tag không nằm trong danh sách được phép (nhưng không phải cấm nguy hiểm), xóa thẻ nhưng giữ lại con hoặc loại bỏ
    if (!ALLOWED_TAGS.has(tagName)) {
      return null;
    }

    // Làm sạch các thuộc tính (attributes)
    const attrs = { ...element.attributes };
    
    // Gỡ tất cả thuộc tính hiện tại để build lại thuộc tính sạch
    for (const key of Object.keys(attrs)) {
      element.removeAttribute(key);
    }

    for (const [name, value] of Object.entries(attrs)) {
      const lowerName = name.toLowerCase();

      // Bỏ qua mọi thuộc tính sự kiện (onclick, onerror, onload...) để tránh XSS
      if (lowerName.startsWith("on")) {
        continue;
      }

      if (isAttributeAllowed(lowerName)) {
        let cleanedValue = value;

        // Chống XSS qua giao thức javascript: hoặc data: trong liên kết/ảnh
        if (lowerName === "href" || lowerName === "src") {
          const trimmed = value.trim().toLowerCase();
          if (trimmed.startsWith("javascript:") || trimmed.startsWith("data:")) {
            continue;
          }
        }

        // Lọc bỏ class Tailwind rác nếu là thuộc tính class
        if (lowerName === "class") {
          cleanedValue = filterTailwindClasses(value);
        }

        if (cleanedValue !== undefined && cleanedValue !== null) {
          element.setAttribute(name, cleanedValue);
        }
      }
    }

    // Đệ quy làm sạch các node con và loại bỏ node null
    const childNodes = [...element.childNodes];
    for (const child of childNodes) {
      const cleanedChild = cleanHtmlNode(child);
      if (!cleanedChild) {
        element.removeChild(child);
      }
    }

    return element;
  }

  return null;
}

export function sanitizeLessonHtml(html: string): string {
  if (!html || !html.trim()) return "";
  try {
    const root = parse(html);
    const childNodes = [...root.childNodes];
    for (const child of childNodes) {
      const cleaned = cleanHtmlNode(child);
      if (!cleaned) {
        root.removeChild(child);
      }
    }
    return root.toString();
  } catch (error) {
    console.error("Sanitize HTML error:", error);
    return html; // Trả về HTML gốc nếu có lỗi ngoài ý muốn
  }
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
