export const LESSON_MEDIA_BUCKET =
  process.env.SUPABASE_STORAGE_BUCKET?.trim() || "lesson-media";

export const LESSON_MEDIA_ALLOWED_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;

export const LESSON_MEDIA_MAX_BYTES = 10 * 1024 * 1024;

export type LessonMediaMimeType =
  (typeof LESSON_MEDIA_ALLOWED_MIME_TYPES)[number];

export type LessonImageAnnotation =
  | {
      id: string;
      type: "rect";
      x: number;
      y: number;
      w: number;
      h: number;
      color: string;
    }
  | {
      id: string;
      type: "arrow";
      x: number;
      y: number;
      endX: number;
      endY: number;
      color: string;
    }
  | {
      id: string;
      type: "marker";
      x: number;
      y: number;
      label: string;
      color: string;
    }
  | {
      id: string;
      type: "label";
      x: number;
      y: number;
      text: string;
      color: string;
    };

export interface LessonMediaView {
  id: string;
  lessonId: string | null;
  draftId: string | null;
  storageKey: string;
  publicUrl: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  caption: string | null;
  altText: string | null;
  annotations: LessonImageAnnotation[] | null;
  createdAt: string;
  updatedAt: string;
}

export interface StepGuideItem {
  id: string;
  title: string;
  html: string;
  mediaId?: string;
  caption?: string;
}

export type LessonCanvasBlockRole = "main" | "note";

export interface LessonCanvasBlockOptions {
  canvasBreakBefore?: boolean;
  canvasTitle?: string;
  reveal?: boolean;
  canvasRole?: LessonCanvasBlockRole;
}

export type LessonTeachingCanvasLayout =
  | "text"
  | "split"
  | "code"
  | "media"
  | "hero"
  | "cards"
  | "highlight"
  | "timeline"
  | "compare"
  | "checklist"
  | "chat"
  | "flow"
  | "code_explain"
  | "mindmap"
  | "quiz"
  | "playground"
  | "statement"
  | "cover"
  | "two_col_text"
  | "banner";

// Optional per-canvas layout customization (stored in JSON, no DB change).
export type CanvasAccent = "indigo" | "teal" | "amber" | "rose" | "emerald";
// Width balance between the main text column and the support (code/image) column.
// Content always reads top-to-bottom, left-to-right; this only tunes column widths.
export type CanvasRatio = "even" | "wide-text" | "wide-side";

export interface CanvasCard {
  icon: string;
  title: string;
  description: string;
  color?: string;
  // Only used by the 'quiz' layout: marks an option as the correct answer.
  correct?: boolean;
}

export interface LessonTeachingCanvasStep {
  id: string;
  text: string;
  html?: string;
}

export interface LessonTeachingCanvasBlock {
  id: string;
  type: "teaching_canvas";
  title: string;
  layout?: LessonTeachingCanvasLayout;
  mainHtml: string;
  code?: string;
  mediaId?: string;
  notesHtml?: string;
  steps: LessonTeachingCanvasStep[];
  reveal?: boolean;
  cards?: CanvasCard[];
  // Per-canvas layout customization (optional).
  accent?: CanvasAccent;
  ratio?: CanvasRatio;
}

export type LessonContentBlock =
  | LessonTeachingCanvasBlock
  | ({ id: string; type: "rich_text"; html: string } & LessonCanvasBlockOptions)
  | ({ id: string; type: "image"; mediaId: string } & LessonCanvasBlockOptions)
  | ({
      id: string;
      type: "step_guide";
      title: string;
      steps: StepGuideItem[];
    } & LessonCanvasBlockOptions)
  | ({ id: string; type: "code"; language?: string; code: string } & LessonCanvasBlockOptions)
  | ({
      id: string;
      type: "callout";
      tone: "info" | "warning" | "success";
      html: string;
    } & LessonCanvasBlockOptions);

export function isLessonMediaMimeType(value: string): value is LessonMediaMimeType {
  return (LESSON_MEDIA_ALLOWED_MIME_TYPES as readonly string[]).includes(value);
}

export function serializeLessonMedia(media: {
  id: string;
  lessonId: string | null;
  draftId: string | null;
  storageKey: string;
  publicUrl: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  caption: string | null;
  altText: string | null;
  annotations: unknown;
  createdAt: Date;
  updatedAt: Date;
}): LessonMediaView {
  return {
    id: media.id,
    lessonId: media.lessonId,
    draftId: media.draftId,
    storageKey: media.storageKey,
    publicUrl: media.publicUrl,
    fileName: media.fileName,
    mimeType: media.mimeType,
    sizeBytes: media.sizeBytes,
    width: media.width,
    height: media.height,
    caption: media.caption,
    altText: media.altText,
    annotations: normalizeAnnotations(media.annotations),
    createdAt: media.createdAt.toISOString(),
    updatedAt: media.updatedAt.toISOString(),
  };
}

export function normalizeAnnotations(value: unknown): LessonImageAnnotation[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const source = item as Record<string, unknown>;
      const id = typeof source.id === "string" && source.id ? source.id : cryptoId();
      const type = source.type;
      const color =
        typeof source.color === "string" && source.color.trim()
          ? source.color.trim()
          : "#ef4444";

      if (type === "rect") {
        return {
          id,
          type,
          x: clampPercent(source.x),
          y: clampPercent(source.y),
          w: clampPercent(source.w, 20),
          h: clampPercent(source.h, 12),
          color,
        };
      }

      if (type === "arrow") {
        return {
          id,
          type,
          x: clampPercent(source.x),
          y: clampPercent(source.y),
          endX: clampPercent(source.endX, 70),
          endY: clampPercent(source.endY, 45),
          color,
        };
      }

      if (type === "marker") {
        return {
          id,
          type,
          x: clampPercent(source.x),
          y: clampPercent(source.y),
          label:
            typeof source.label === "string" && source.label.trim()
              ? source.label.trim().slice(0, 6)
              : "1",
          color,
        };
      }

      if (type === "label") {
        return {
          id,
          type,
          x: clampPercent(source.x),
          y: clampPercent(source.y),
          text:
            typeof source.text === "string" && source.text.trim()
              ? source.text.trim().slice(0, 140)
              : "Ghi chu",
          color,
        };
      }

      return null;
    })
    .filter((item): item is LessonImageAnnotation => item !== null);
}

export function extractReferencedMediaIds(htmlValues: string[]): string[] {
  const mediaIds = new Set<string>();
  const pattern = /data-media-id\s*=\s*["']([^"']+)["']/gi;

  for (const html of htmlValues) {
    if (!html) {
      continue;
    }

    let match: RegExpExecArray | null;
    while ((match = pattern.exec(html))) {
      if (match[1]) {
        mediaIds.add(match[1]);
      }
    }
  }

  return Array.from(mediaIds);
}

// Quét trực tiếp JSON contentBlocks để gom mọi `mediaId` (kể cả ảnh trong step_guide
// hay block ảnh chưa kịp render ra data-media-id). Dùng làm lưới đỡ ở server thay vì
// chỉ tin vào HTML do client derive — tránh ảnh canvas bị "mồ côi" (lessonId = null).
export function collectMediaIdsFromBlocks(
  value: unknown,
  found: Set<string> = new Set<string>()
): Set<string> {
  if (Array.isArray(value)) {
    for (const item of value) {
      collectMediaIdsFromBlocks(item, found);
    }
  } else if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      if (key === "mediaId" && typeof child === "string" && child.trim()) {
        found.add(child.trim());
      } else {
        collectMediaIdsFromBlocks(child, found);
      }
    }
  }

  return found;
}

function clampPercent(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(Math.max(parsed, 0), 100);
}

function cryptoId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `ann-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
