import { NextResponse } from "next/server";
import { generateAiJsonObject } from "@/lib/ai/lesson-generation";
import { normalizeLessonDraft, type LessonDraft } from "@/lib/lessons/lesson-draft";
import type { LessonContentBlock } from "@/lib/lessons/lesson-media";
import {
  buildTeachingCanvases,
  type TeachingCanvas,
} from "@/lib/lessons/teaching-canvas";
import {
  dedupeReviewIssues,
  rebuildLessonReviewReport,
  reviewLessonDraftDeterministic,
  type LessonReviewCategory,
  type LessonReviewIssue,
  type LessonReviewSeverity,
} from "@/lib/lessons/lesson-review";
import { requireTeacher } from "@/lib/session";

export const maxDuration = 60;

const VALID_SEVERITIES = new Set<LessonReviewSeverity>([
  "critical",
  "warning",
  "suggestion",
]);
const VALID_CATEGORIES = new Set<LessonReviewCategory>([
  "metadata",
  "objectives",
  "section",
  "canvas",
  "exercise",
  "pedagogy",
]);

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function stripHtml(value: string): string {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function truncate(value: string, maxLength: number): string {
  const trimmed = value.replace(/\s+/g, " ").trim();
  return trimmed.length > maxLength
    ? `${trimmed.slice(0, maxLength).replace(/\s+\S*$/, "").trim()}...`
    : trimmed;
}

function canvasBrief(canvas: TeachingCanvas) {
  return {
    kind: canvas.kind,
    title: canvas.title,
    text: truncate(stripHtml(canvas.html), 520),
    codeLines: canvas.code ? canvas.code.split(/\r?\n/).length : 0,
    steps: canvas.steps.map((step) => truncate(step.text || stripHtml(step.html), 140)),
    cards: (canvas.cards ?? []).map((card) => ({
      title: truncate(card.title, 80),
      description: truncate(card.description, 160),
      correct: card.correct === true,
    })),
  };
}

function compactLessonForReview(draft: LessonDraft) {
  return {
    title: draft.title,
    duration: draft.duration,
    difficulty: draft.difficulty,
    objectives: draft.objectives,
    sections: draft.sections.map((section, index) => {
      let canvases: ReturnType<typeof canvasBrief>[] = [];
      try {
        canvases = buildTeachingCanvases({
          id: `review-section-${index + 1}`,
          title: section.title,
          content: section.content,
          renderedContent: section.content,
          contentBlocks: Array.isArray(section.contentBlocks)
            ? (section.contentBlocks as LessonContentBlock[])
            : null,
        }).map(canvasBrief);
      } catch {
        canvases = [];
      }

      return {
        index: index + 1,
        title: section.title,
        contentPreview: truncate(stripHtml(section.content), 900),
        canvases,
      };
    }),
    exercises: draft.exercises.map((exercise, index) => ({
      index: index + 1,
      type: exercise.type,
      title: exercise.title,
      question: truncate(stripHtml(exercise.question), 700),
      hasAnswer: Boolean(exercise.answer.trim()),
      difficulty: exercise.difficulty,
      points: exercise.points,
    })),
  };
}

function buildReviewSystemPrompt(): string {
  return [
    "Bạn là Lesson Review Agent cho hệ thống LMS dạy Python cấp 2.",
    "Nhiệm vụ: duyệt bản nháp bài giảng trước khi giáo viên chốt lưu.",
    "Bạn kiểm tra chất lượng sư phạm, mức độ đầy đủ, khả năng vỡ canvas, sự phù hợp học sinh lớp 6-9, và tính nhất quán giữa mục tiêu - nội dung - luyện tập.",
    "Return ONLY one valid JSON object, no markdown fences, no extra text.",
  ].join("\n");
}

function buildReviewUserPrompt(
  compactDraft: ReturnType<typeof compactLessonForReview>,
  deterministicIssues: LessonReviewIssue[]
): string {
  return [
    "Hãy review bài giảng sau. Không cần lặp lại lỗi kỹ thuật đã được deterministic checker bắt, trừ khi bạn muốn bổ sung góc nhìn sư phạm.",
    "Chỉ báo issue có thể hành động được. Nếu bài ổn, trả issues rỗng hoặc vài suggestion nhẹ.",
    "",
    "JSON shape:",
    `{
  "summary": "1-2 câu tiếng Việt",
  "issues": [
    {
      "severity": "critical | warning | suggestion",
      "category": "metadata | objectives | section | canvas | exercise | pedagogy",
      "target": "lesson | section:1 | section:1.canvas:2 | exercise:1",
      "title": "tiêu đề ngắn",
      "detail": "vấn đề cụ thể",
      "suggestion": "cách sửa cụ thể"
    }
  ]
}`,
    "",
    "Rubric:",
    "- critical: thiếu nội dung quan trọng, sai logic, không thể dùng để dạy/lưu an toàn.",
    "- warning: dùng được nhưng nên sửa trước khi dạy.",
    "- suggestion: polish nhẹ, không bắt buộc.",
    "- Ưu tiên phát hiện: mục tiêu chưa khớp nội dung, thiếu ví dụ/output, bài 120 phút quá mỏng, canvas quá dài/dễ vỡ, luyện tập không đủ, bài tập thiếu đáp án, layout chưa phù hợp.",
    "- Khi giải thích code từng dòng: layout đúng là 'code_explain' (code + chú thích từng dòng trong CÙNG canvas). Nếu bài đang tách code và phần giải thích ra hai canvas, hoặc giải thích code bằng 'timeline'/'checklist', hãy đề xuất gộp về một 'code_explain'. Cũng báo nếu các step trùng ý hoặc có step 'Output:' thừa.",
    "- Báo khi ví dụ chạy được mà KHÔNG mô tả kết quả: code in ra console nên có '# Kết quả: ...'; code đồ họa (turtle/vẽ hình/biểu đồ) nên mô tả hình vẽ trong notesHtml hoặc đính ảnh minh họa.",
    "- Báo khi canvas tổng kết/ôn tập bị TRÙNG nội dung giữa các canvas (vd 'cards' và 'checklist' nói cùng một điều). Gợi ý tách: cards = khái niệm chính, checklist = kĩ năng 'Em có thể …'.",
    "- Báo khi một khái niệm/công thức được nhắc trong mục tiêu hoặc cần để giải bài tập nhưng KHÔNG được dạy ở phần lí thuyết (vd công thức góc xoay 360/n, các lệnh khởi tạo).",
    "- Báo khi gợi ý BÀI TẬP VỀ NHÀ quá lộ lời giải (cầm tay chỉ việc từng bước). Bài về nhà nên gợi ý bằng câu hỏi định hướng; chỉ bài practice mới nên gợi ý trực tiếp.",
    "- Không yêu cầu quá hoàn hảo; giáo viên vẫn là người chốt cuối.",
    "",
    "Deterministic checker issues already found:",
    JSON.stringify(deterministicIssues.slice(0, 20), null, 2),
    "",
    "Lesson draft compact JSON:",
    JSON.stringify(compactDraft, null, 2),
  ].join("\n");
}

function normalizeAiIssues(value: unknown): LessonReviewIssue[] {
  const root = asRecord(value) ?? {};
  const rawIssues = Array.isArray(root.issues) ? root.issues : [];

  return rawIssues
    .map((item, index): LessonReviewIssue | null => {
      const source = asRecord(item);
      if (!source) return null;

      const severityCandidate = asString(source.severity) as LessonReviewSeverity;
      const categoryCandidate = asString(source.category) as LessonReviewCategory;
      const title = asString(source.title);
      const detail = asString(source.detail);
      if (!title || !detail) return null;

      const severity = VALID_SEVERITIES.has(severityCandidate)
        ? severityCandidate
        : "suggestion";
      const category = VALID_CATEGORIES.has(categoryCandidate)
        ? categoryCandidate
        : "pedagogy";

      return {
        id: `llm-review-${index + 1}`,
        severity,
        category,
        source: "ai",
        target: asString(source.target) || "lesson",
        title,
        detail,
        suggestion: asString(source.suggestion) || undefined,
      };
    })
    .filter((item): item is LessonReviewIssue => item !== null)
    .slice(0, 12);
}

export async function POST(req: Request) {
  try {
    await requireTeacher();

    const body = await req.json();
    const draft = normalizeLessonDraft(body.lesson ?? body);
    const deterministicReport = reviewLessonDraftDeterministic(draft);

    let issues = [...deterministicReport.issues];
    let aiMeta: { provider: string; model: string } | null = null;

    try {
      const compactDraft = compactLessonForReview(draft);
      const { json, meta } = await generateAiJsonObject({
        systemPrompt: buildReviewSystemPrompt(),
        userPrompt: buildReviewUserPrompt(compactDraft, deterministicReport.issues),
        provider: asString(body.provider),
        model: asString(body.model),
      });
      aiMeta = meta;
      issues = dedupeReviewIssues([...issues, ...normalizeAiIssues(json)]);
    } catch (error) {
      console.warn("LLM lesson review failed, returning deterministic report:", error);
      issues.push({
        id: "llm-review-unavailable",
        severity: "suggestion",
        category: "pedagogy",
        source: "ai",
        target: "lesson",
        title: "Chưa chạy được LLM reviewer",
        detail: "Báo cáo hiện chỉ gồm kiểm tra kỹ thuật tự động vì provider AI không phản hồi hoặc chưa cấu hình.",
        suggestion: "Bạn vẫn có thể xem các lỗi kỹ thuật, hoặc thử lại review sau.",
      });
    }

    const report = rebuildLessonReviewReport(draft, dedupeReviewIssues(issues));

    return NextResponse.json({
      ...report,
      meta: aiMeta,
    });
  } catch (error) {
    console.error("Lesson review error:", error);
    return NextResponse.json(
      { error: "Không thể duyệt bài giảng lúc này." },
      { status: 500 }
    );
  }
}
