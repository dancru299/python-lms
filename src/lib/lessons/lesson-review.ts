import type { LessonDraft } from "@/lib/lessons/lesson-draft";
import type { LessonContentBlock } from "@/lib/lessons/lesson-media";
import {
  buildTeachingCanvases,
  type TeachingCanvas,
} from "@/lib/lessons/teaching-canvas";
import { findPythonSyntaxIssues, looksLikePython } from "@/lib/python/python-syntax";

// Sentinel chèn vào answer khi repair không tạo được đáp án thật (LLM fail).
// Reviewer nhận ra marker này để hạ cảnh báo "thiếu đáp án" xuống gợi ý "đang là
// nháp tạm" thay vì coi như đã có đáp án thật — giữ điểm trung thực.
export const LESSON_ANSWER_DRAFT_MARKER = "[[draft-answer-cần-giáo-viên-hoàn-thiện]]";

export type LessonReviewSeverity = "critical" | "warning" | "suggestion";
export type LessonReviewStatus = "pass" | "warning" | "fail";
// Where an issue came from. Only "deterministic" issues affect the gate score;
// "ai" issues are advisory (pedagogical hints) and never lower the score.
export type LessonReviewSource = "deterministic" | "ai";
export type LessonReviewCategory =
  | "metadata"
  | "objectives"
  | "section"
  | "canvas"
  | "exercise"
  | "pedagogy";

export interface LessonReviewIssue {
  id: string;
  severity: LessonReviewSeverity;
  category: LessonReviewCategory;
  source: LessonReviewSource;
  target: string;
  title: string;
  detail: string;
  suggestion?: string;
}

// Breakdown đa chiều cho điểm chất lượng SOẠN BÀI (không liên quan điểm học sinh).
// Mỗi chiều 0-100, suy ra từ chính các issue deterministic đã gom theo category,
// để Edit Agent biết ưu tiên sửa chiều yếu nhất trước.
export type LessonReviewDimensionKey =
  | "objectives"
  | "structure"
  | "presentation"
  | "practice"
  | "pedagogy";

export interface LessonReviewDimension {
  key: LessonReviewDimensionKey;
  label: string;
  score: number;
  status: "good" | "needs-work" | "blocked";
  critical: number;
  warnings: number;
  suggestions: number;
}

// Sàn chất lượng cứng (universal): mọi bài đều phải đạt — định nghĩa cụ thể của
// "đồng đều". Trên sàn là phần giáo viên tự polish. Auto-fix nhắm tới floor.meets.
export type LessonFloorKey =
  | "metadata"
  | "content"
  | "opener"
  | "diversity"
  | "render"
  | "density"
  | "closing";

export interface LessonFloorItem {
  key: LessonFloorKey;
  label: string;
  ok: boolean;
  hint: string;
}

export interface LessonFloorReport {
  meets: boolean;
  items: LessonFloorItem[];
}

export interface LessonReviewReport {
  status: LessonReviewStatus;
  score: number;
  summary: string;
  issues: LessonReviewIssue[];
  stats: {
    sections: number;
    canvases: number;
    exercises: number;
    // Gating counts — deterministic issues only. These drive score & status.
    critical: number;
    warnings: number;
    suggestions: number;
    // Advisory count — AI pedagogical hints. Does not affect score or status.
    advisories: number;
  };
  // Điểm theo từng chiều (chỉ tính issue deterministic). Tổng penalty các chiều =
  // penalty của điểm tổng nên hai con số luôn nhất quán.
  dimensions: LessonReviewDimension[];
  // Sàn chất lượng cứng — checklist "đồng đều" mà mọi bài phải đạt.
  floor: LessonFloorReport;
  reviewedAt: string;
}

function normalizeIssueKeyText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .toLowerCase()
    .trim();
}

export function dedupeReviewIssues(issues: LessonReviewIssue[]): LessonReviewIssue[] {
  const seen = new Set<string>();

  return issues.filter((issue) => {
    const key =
      issue.category === "objectives"
        ? `${issue.category}|${issue.target}`
        : [
            issue.severity,
            issue.category,
            issue.target,
            normalizeIssueKeyText(issue.title),
          ].join("|");

    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function stripHtml(value: string): string {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function textLength(value: string): number {
  return stripHtml(value).length;
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

const DIMENSION_ORDER: LessonReviewDimensionKey[] = [
  "objectives",
  "structure",
  "presentation",
  "practice",
  "pedagogy",
];

const DIMENSION_LABELS: Record<LessonReviewDimensionKey, string> = {
  objectives: "Mục tiêu học tập",
  structure: "Cấu trúc & bố cục",
  presentation: "Chất lượng slide",
  practice: "Luyện tập & đánh giá",
  pedagogy: "Sư phạm & luồng",
};

// Mapping total: mọi category phải rơi đúng vào một chiều để tổng penalty các chiều
// khớp penalty điểm tổng. Chỉ issue deterministic mới tính điểm; issue pedagogy do
// LLM (source "ai") không gating nên không ảnh hưởng chiều này.
const CATEGORY_TO_DIMENSION: Record<LessonReviewCategory, LessonReviewDimensionKey> = {
  metadata: "structure",
  objectives: "objectives",
  section: "structure",
  canvas: "presentation",
  exercise: "practice",
  pedagogy: "pedagogy",
};

function dimensionStatus(score: number): LessonReviewDimension["status"] {
  if (score >= 80) return "good";
  if (score >= 50) return "needs-work";
  return "blocked";
}

export function buildLessonReviewDimensions(
  issues: LessonReviewIssue[]
): LessonReviewDimension[] {
  type Bucket = { critical: number; warnings: number; suggestions: number };
  const buckets = new Map<LessonReviewDimensionKey, Bucket>(
    DIMENSION_ORDER.map(
      (key): [LessonReviewDimensionKey, Bucket] => [
        key,
        { critical: 0, warnings: 0, suggestions: 0 },
      ]
    )
  );

  for (const issue of issues) {
    // Chỉ issue deterministic mới tính điểm chiều — khớp với gating của điểm tổng.
    if (issue.source !== "deterministic") continue;
    const bucket = buckets.get(CATEGORY_TO_DIMENSION[issue.category]);
    if (!bucket) continue;
    if (issue.severity === "critical") bucket.critical += 1;
    else if (issue.severity === "warning") bucket.warnings += 1;
    else bucket.suggestions += 1;
  }

  return DIMENSION_ORDER.map((key) => {
    const bucket = buckets.get(key) ?? {
      critical: 0,
      warnings: 0,
      suggestions: 0,
    };
    const score = clampScore(
      100 - bucket.critical * 18 - bucket.warnings * 7 - bucket.suggestions * 3
    );
    return {
      key,
      label: DIMENSION_LABELS[key],
      score,
      status: dimensionStatus(score),
      critical: bucket.critical,
      warnings: bucket.warnings,
      suggestions: bucket.suggestions,
    };
  });
}

function buildStats(
  draft: LessonDraft,
  canvasesBySection: TeachingCanvas[][],
  issues: LessonReviewIssue[]
): LessonReviewReport["stats"] {
  const gating = issues.filter((issue) => issue.source === "deterministic");
  const advisories = issues.filter((issue) => issue.source === "ai");
  return {
    sections: draft.sections.length,
    canvases: canvasesBySection.reduce((sum, canvases) => sum + canvases.length, 0),
    exercises: draft.exercises.length,
    critical: gating.filter((issue) => issue.severity === "critical").length,
    warnings: gating.filter((issue) => issue.severity === "warning").length,
    suggestions: gating.filter((issue) => issue.severity === "suggestion").length,
    advisories: advisories.length,
  };
}

export function summarizeReviewStatus(stats: LessonReviewReport["stats"]): {
  status: LessonReviewStatus;
  score: number;
  summary: string;
} {
  const score = clampScore(
    100 - stats.critical * 18 - stats.warnings * 7 - stats.suggestions * 3
  );

  if (stats.critical > 0) {
    return {
      status: "fail",
      score,
      summary: `Có ${stats.critical} lỗi cần sửa trước khi lưu bài.`,
    };
  }

  if (stats.warnings > 0) {
    return {
      status: "warning",
      score,
      summary: `Bài dùng được nhưng còn ${stats.warnings} điểm nên xem lại.`,
    };
  }

  if (stats.suggestions > 0) {
    return {
      status: "pass",
      score,
      summary: "Bài đạt yêu cầu chính, có vài gợi ý nhỏ để polish thêm.",
    };
  }

  if (stats.advisories > 0) {
    return {
      status: "pass",
      score,
      summary: `Bài đạt kiểm tra cấu trúc; có ${stats.advisories} gợi ý sư phạm từ AI để tham khảo.`,
    };
  }

  return {
    status: "pass",
    score,
    summary: "Bài đạt yêu cầu kiểm tra tự động.",
  };
}

function createIssueFactory() {
  let counter = 0;
  return (
    issues: LessonReviewIssue[],
    issue: Omit<LessonReviewIssue, "id" | "source">
  ) => {
    counter += 1;
    issues.push({
      id: `lesson-review-${counter}`,
      source: "deterministic",
      ...issue,
    });
  };
}

function hasLiteralBreak(value: string): boolean {
  return /&(?:amp;)?lt;br\s*\/?&(?:amp;)?gt;/i.test(value);
}

function hasRoleHintLeak(value: string): boolean {
  return /vai\s*tr[oò]\s*g[oợ]i\s*[yý]\s*:/i.test(value);
}

// Steps that read like a line-by-line code walkthrough ("Dòng 1: …"). When they
// sit in a timeline/checklist (not code_explain) the notes are detached from the
// code — a real quality problem the structural gate should not silently pass.
function looksLikeLineWalkthrough(canvas: TeachingCanvas): boolean {
  if (canvas.steps.length < 2) return false;
  const annotated = canvas.steps.filter((step) =>
    /^\s*(dòng|dong|line|câu lệnh)\s*\d+/i.test(step.text || stripHtml(step.html))
  ).length;
  return annotated >= 2 && annotated >= Math.ceil(canvas.steps.length / 2);
}

function canvasText(canvas: TeachingCanvas): string {
  const cardText = (canvas.cards ?? [])
    .map((card) => `${card.title} ${card.description}`)
    .join(" ");
  const stepText = canvas.steps.map((step) => step.text || stripHtml(step.html)).join(" ");
  return [
    canvas.title,
    stripHtml(canvas.html || ""),
    canvas.code || "",
    stripHtml(canvas.notesHtml || ""),
    cardText,
    stepText,
  ]
    .filter(Boolean)
    .join(" ");
}

function reviewCanvas(
  canvas: TeachingCanvas,
  target: string,
  issues: LessonReviewIssue[],
  addIssue: ReturnType<typeof createIssueFactory>
) {
  const totalText = canvasText(canvas);

  if (!totalText.trim()) {
    addIssue(issues, {
      severity: "critical",
      category: "canvas",
      target,
      title: "Canvas rỗng",
      detail: "Canvas không có nội dung hiển thị, code, steps hoặc cards.",
      suggestion: "Thêm nội dung chính hoặc đổi layout phù hợp hơn.",
    });
    return;
  }

  if (canvas.title.length > 58) {
    addIssue(issues, {
      severity: "warning",
      category: "canvas",
      target,
      title: "Tiêu đề canvas quá dài",
      detail: `Tiêu đề dài ${canvas.title.length} ký tự, dễ làm vỡ bố cục.`,
      suggestion: "Rút tiêu đề còn 3-6 từ, đưa phần giải thích vào nội dung.",
    });
  }

  if (canvas.code?.trim()) {
    const syntaxIssues = findPythonSyntaxIssues(canvas.code);
    if (syntaxIssues.length > 0) {
      addIssue(issues, {
        severity: "warning",
        category: "canvas",
        target,
        title: "Code mẫu có thể sai cú pháp",
        detail: `Học sinh chạy thử sẽ lỗi: ${syntaxIssues.join(" ")}`,
        suggestion: "Sửa lại code minh họa cho đúng cú pháp Python.",
      });
    }
  }

  if (hasRoleHintLeak(totalText)) {
    addIssue(issues, {
      severity: "warning",
      category: "canvas",
      target,
      title: "Còn sót dòng Vai trò gợi ý",
      detail: "Metadata layout đang bị lộ trong nội dung học sinh thấy.",
      suggestion: "Xóa dòng Vai trò gợi ý khỏi tiêu đề/nội dung hiển thị.",
    });
  }

  if (hasLiteralBreak(canvas.html) || (canvas.cards ?? []).some((card) => hasLiteralBreak(card.description))) {
    addIssue(issues, {
      severity: "warning",
      category: "canvas",
      target,
      title: "Có dấu <br> bị lộ",
      detail: "Một số nội dung có thể đang hiển thị literal <br> thay vì xuống dòng thật.",
      suggestion: "Chuẩn hóa HTML hoặc dùng markdown/code fence đúng định dạng.",
    });
  }

  if (textLength(canvas.html) > 520 && canvas.steps.length === 0 && !canvas.code) {
    addIssue(issues, {
      severity: "warning",
      category: "canvas",
      target,
      title: "Canvas nhiều chữ",
      detail: "Nội dung chính dài nhưng không được tách thành reveal steps.",
      suggestion: "Tách ý dài thành 2-4 steps hoặc chia thành canvas khác.",
    });
  }

  if (isThinCanvas(canvas)) {
    addIssue(issues, {
      severity: "warning",
      category: "canvas",
      target,
      title: "Canvas gần rỗng",
      detail: "Canvas chỉ có một câu ngắn, để trống phần lớn khung 16:9.",
      suggestion: "Thêm 2-4 steps để khai triển, hoặc đổi sang statement nếu là câu chốt.",
    });
  }

  switch (canvas.kind) {
    case "checklist":
    case "timeline":
    case "flow":
    case "mindmap":
      if (canvas.steps.length === 0) {
        addIssue(issues, {
          severity: "critical",
          category: "canvas",
          target,
          title: `${canvas.kind} thiếu steps`,
          detail: "Layout này cần steps để render nội dung chính.",
          suggestion: "Đưa từng ý/quy tắc/nhánh vào mảng steps.",
        });
      }
      if (looksLikeLineWalkthrough(canvas)) {
        addIssue(issues, {
          severity: "warning",
          category: "canvas",
          target,
          title: "Giải thích code sai layout",
          detail: `Các bước kiểu "Dòng N: …" là giải thích code từng dòng nhưng đang nằm ở layout ${canvas.kind}, tách rời khỏi code.`,
          suggestion: "Gộp code và phần chú thích vào MỘT canvas 'code_explain'.",
        });
      }
      if (canvas.kind === "flow" && canvas.steps.length > 6) {
        addIssue(issues, {
          severity: "warning",
          category: "canvas",
          target,
          title: "Flow có quá nhiều nút",
          detail: `Flow hiện có ${canvas.steps.length} nút, dễ khó đọc trên slide.`,
          suggestion: "Giữ flow khoảng 2-4 nút, phần còn lại chuyển sang timeline/checklist.",
        });
      }
      canvas.steps.forEach((step, index) => {
        if (textLength(step.html || step.text) > 150) {
          addIssue(issues, {
            severity: "warning",
            category: "canvas",
            target: `${target}.step:${index + 1}`,
            title: "Step quá dài",
            detail: "Một step dài quá mức, dễ tràn hoặc bị auto-scale nhỏ.",
            suggestion: "Tách step này thành 2 ý ngắn hơn.",
          });
        }
      });
      break;

    case "compare":
      if ((canvas.cards?.length ?? 0) !== 2) {
        addIssue(issues, {
          severity: "critical",
          category: "canvas",
          target,
          title: "Compare cần đúng 2 vế",
          detail: `Compare hiện có ${canvas.cards?.length ?? 0} cards.`,
          suggestion: "Đặt cards[0] là vế trái và cards[1] là vế phải.",
        });
      }
      break;

    case "quiz": {
      const cards = canvas.cards ?? [];
      const correct = cards.filter((card) => card.correct === true).length;
      if (cards.length < 2 || cards.length > 4) {
        addIssue(issues, {
          severity: "critical",
          category: "canvas",
          target,
          title: "Quiz cần 2-4 lựa chọn",
          detail: `Quiz hiện có ${cards.length} lựa chọn.`,
          suggestion: "Thêm/sửa cards để có 2-4 đáp án.",
        });
      }
      if (correct !== 1) {
        addIssue(issues, {
          severity: "critical",
          category: "canvas",
          target,
          title: "Quiz cần đúng 1 đáp án đúng",
          detail: `Quiz hiện đánh dấu ${correct} đáp án đúng.`,
          suggestion: 'Đặt đúng một card có "correct": true.',
        });
      }
      break;
    }

    case "cards":
      if ((canvas.cards?.length ?? 0) < 2) {
        addIssue(issues, {
          severity: "warning",
          category: "canvas",
          target,
          title: "Cards quá ít mục",
          detail: "Layout cards thường hiệu quả nhất với 2-4 mục song song.",
          suggestion: "Thêm cards hoặc đổi sang highlight/text nếu chỉ có một ý.",
        });
      }
      break;

    case "chat":
      if ((canvas.cards?.length ?? 0) < 2) {
        addIssue(issues, {
          severity: "warning",
          category: "canvas",
          target,
          title: "Hội thoại quá ngắn",
          detail: "Chat canvas cần ít nhất 2 lượt hội thoại để có nhịp hỏi đáp.",
          suggestion: "Thêm lượt phản hồi của học sinh/máy tính.",
        });
      }
      (canvas.cards ?? []).forEach((card, index) => {
        if (!card.title.trim() || !card.description.trim()) {
          addIssue(issues, {
            severity: "warning",
            category: "canvas",
            target: `${target}.message:${index + 1}`,
            title: "Tin nhắn thiếu speaker hoặc nội dung",
            detail: "Chat card nên có title là người nói và description là câu thoại.",
          });
        }
      });
      break;

    case "code_explain": {
      const nonEmptyLines = (canvas.code || "")
        .split(/\r?\n/)
        .filter((line) => line.trim()).length;
      if (!canvas.code?.trim()) {
        addIssue(issues, {
          severity: "critical",
          category: "canvas",
          target,
          title: "Code explain thiếu code",
          detail: "Layout đọc code cần trường code để render terminal.",
        });
      }
      if (nonEmptyLines > 0 && canvas.steps.length === 0) {
        addIssue(issues, {
          severity: "warning",
          category: "canvas",
          target,
          title: "Code explain thiếu giải thích dòng",
          detail: "Có code nhưng chưa có step giải thích từng dòng.",
          suggestion: "Thêm mỗi dòng code quan trọng một step giải thích.",
        });
      }
      if (canvas.steps.length > nonEmptyLines + 2) {
        addIssue(issues, {
          severity: "warning",
          category: "canvas",
          target,
          title: "Số giải thích lệch số dòng code",
          detail: `Có ${canvas.steps.length} steps cho ${nonEmptyLines} dòng code không rỗng.`,
          suggestion: "Giữ thứ tự steps khớp các dòng code cần giải thích.",
        });
      }
      // Phủ chưa tới: nhiều dòng/nhánh code không có bước giải thích nào (vd 5 step
      // cho 11 dòng) → phần đuôi code bị "bỏ trống". Lý tưởng là mỗi dòng một step.
      if (nonEmptyLines >= 4 && canvas.steps.length > 0) {
        const minSteps = Math.ceil(nonEmptyLines / 2);
        if (canvas.steps.length < minSteps) {
          addIssue(issues, {
            severity: "warning",
            category: "canvas",
            target,
            title: "Giải thích code chưa phủ hết",
            detail: `Code có ${nonEmptyLines} dòng nhưng chỉ ${canvas.steps.length} bước giải thích — nhiều dòng/nhánh chưa được nói tới.`,
            suggestion: "Thêm bước cho các dòng còn thiếu (lý tưởng mỗi dòng một bước, phủ hết các nhánh).",
          });
        }
      }
      break;
    }

    case "playground":
    case "code":
      if (!canvas.code?.trim()) {
        addIssue(issues, {
          severity: "critical",
          category: "canvas",
          target,
          title: "Canvas code thiếu code",
          detail: "Layout này cần code Python để học sinh xem/chạy.",
        });
      }
      break;

    case "statement":
      if (textLength(canvas.html || canvas.title) > 190) {
        addIssue(issues, {
          severity: "warning",
          category: "canvas",
          target,
          title: "Statement quá dài",
          detail: "Statement nên là một câu ngắn, dễ nhớ.",
          suggestion: "Rút gọn thành một quy tắc hoặc thông điệp chính.",
        });
      }
      break;
  }
}

function reviewExercises(
  draft: LessonDraft,
  issues: LessonReviewIssue[],
  addIssue: ReturnType<typeof createIssueFactory>
) {
  const practiceCount = draft.exercises.filter((item) => item.type === "practice").length;
  const homeworkCount = draft.exercises.filter((item) => item.type === "homework").length;

  if (practiceCount === 0) {
    addIssue(issues, {
      severity: "warning",
      category: "exercise",
      target: "exercises.practice",
      title: "Thiếu luyện tập trên lớp",
      detail: "Bài chưa có exercise loại practice.",
      suggestion: "Thêm 2-4 thử thách ngắn để học sinh gõ code ngay trên lớp.",
    });
  }

  if (homeworkCount === 0) {
    addIssue(issues, {
      severity: "suggestion",
      category: "exercise",
      target: "exercises.homework",
      title: "Chưa có bài tập về nhà",
      detail: "Bài có thể cần một vài bài độc lập để học sinh luyện thêm.",
    });
  }

  draft.exercises.forEach((exercise, index) => {
    const target = `exercise:${index + 1}`;
    if (!exercise.title.trim()) {
      addIssue(issues, {
        severity: "warning",
        category: "exercise",
        target,
        title: "Bài tập thiếu tiêu đề",
        detail: "Tiêu đề giúp giáo viên và học sinh quét nhanh nhiệm vụ.",
      });
    }
    if (textLength(exercise.question) < 20) {
      addIssue(issues, {
        severity: "warning",
        category: "exercise",
        target,
        title: "Đề bài quá ngắn",
        detail: "Question chưa đủ rõ yêu cầu học sinh cần làm gì.",
        suggestion: "Bổ sung input/output mong đợi hoặc nhiệm vụ sửa/chạy code.",
      });
    }
    if (!exercise.answer.trim()) {
      addIssue(issues, {
        severity: exercise.type === "practice" ? "warning" : "suggestion",
        category: "exercise",
        target,
        title: "Thiếu đáp án mẫu",
        detail: "Không có đáp án mẫu để giáo viên đối chiếu nhanh.",
      });
    } else if (exercise.answer.includes(LESSON_ANSWER_DRAFT_MARKER)) {
      addIssue(issues, {
        severity: "suggestion",
        category: "exercise",
        target,
        title: "Đáp án mẫu mới là nháp tạm",
        detail:
          "Repair đã chèn chỗ giữ tạm (đang ẩn với học sinh) vì AI chưa tạo được đáp án.",
        suggestion: "Giáo viên thay chỗ giữ tạm bằng đáp án Python thật trước khi dạy.",
      });
    } else if (
      !exercise.answer.includes(LESSON_ANSWER_DRAFT_MARKER) &&
      looksLikePython(exercise.answer)
    ) {
      const syntaxIssues = findPythonSyntaxIssues(exercise.answer);
      if (syntaxIssues.length > 0) {
        addIssue(issues, {
          severity: "warning",
          category: "exercise",
          target,
          title: "Đáp án Python có thể sai cú pháp",
          detail: `Học sinh sẽ gặp lỗi khi chạy: ${syntaxIssues.join(" ")}`,
          suggestion: "Kiểm tra lại đáp án mẫu (chạy thử) trước khi dạy.",
        });
      }
    }
  });
}

// Canvas mang ví dụ cụ thể (code chạy được) cho khái niệm trừu tượng.
function isExampleCanvas(canvas: TeachingCanvas): boolean {
  if (
    canvas.kind === "code" ||
    canvas.kind === "code_explain" ||
    canvas.kind === "playground"
  ) {
    return true;
  }
  return Boolean(canvas.code?.trim());
}

const SUMMARY_TITLE_RE = /tổng kết|tóm tắt|ghi nhớ|ôn lại|nhắc lại|kết bài|điều cần nhớ/i;

// Canvas đóng vòng / tổng kết cuối bài.
function isSummaryCanvas(canvas: TeachingCanvas): boolean {
  if (canvas.kind === "checklist" || canvas.kind === "mindmap") return true;
  return SUMMARY_TITLE_RE.test(canvas.title || "");
}

// Các gợi ý sư phạm deterministic ĐỦ TIN CẬY (chỉ kiểm tra hiện diện, không suy
// diễn ngữ nghĩa) — trừ điểm nhẹ ở mức warning/suggestion, không bao giờ critical.
// Bloom/transition/tiêu-đề-hành-động cố ý để LLM advisory lo vì heuristic dễ sai.
function reviewPedagogy(
  draft: LessonDraft,
  canvases: TeachingCanvas[],
  issues: LessonReviewIssue[],
  addIssue: ReturnType<typeof createIssueFactory>
) {
  // Bài quá ngắn thì bỏ qua để tránh phạt oan bài intro nhỏ.
  if (canvases.length < 4) return;

  if (!canvases.some(isSummaryCanvas)) {
    addIssue(issues, {
      severity: "suggestion",
      category: "pedagogy",
      target: "lesson.flow",
      title: "Thiếu slide tổng kết cuối bài",
      detail: "Bài chưa có canvas chốt lại (tổng kết/ghi nhớ) để đóng vòng kiến thức.",
      suggestion: "Thêm một canvas 'checklist' hoặc 'mindmap' tóm tắt các ý chính ở cuối bài.",
    });
  }

  const hasExampleCanvas = canvases.some(isExampleCanvas);
  const hasModelAnswer = draft.exercises.some(
    (exercise) =>
      exercise.answer.trim() &&
      !exercise.answer.includes(LESSON_ANSWER_DRAFT_MARKER)
  );
  if (!hasExampleCanvas && !hasModelAnswer) {
    addIssue(issues, {
      severity: "warning",
      category: "pedagogy",
      target: "lesson.examples",
      title: "Thiếu ví dụ code cụ thể",
      detail: "Cả bài chưa có canvas code/ví dụ chạy được nào để minh họa khái niệm.",
      suggestion: "Thêm ít nhất một canvas 'code' hoặc 'code_explain' minh họa bằng Python thật.",
    });
  }

  const hasQuiz = canvases.some((canvas) => canvas.kind === "quiz");
  const hasPractice = draft.exercises.some((exercise) => exercise.type === "practice");
  if (canvases.length >= 6 && !hasQuiz && !hasPractice) {
    addIssue(issues, {
      severity: "suggestion",
      category: "pedagogy",
      target: "lesson.check",
      title: "Thiếu điểm kiểm tra hiểu biết",
      detail: "Bài khá dài nhưng chưa có quiz hay bài luyện tập để học sinh tự kiểm tra.",
      suggestion: "Chèn một canvas 'quiz' giữa bài hoặc thêm một bài tập practice ngắn.",
    });
  }
}

// Check cấu trúc cấp bài (cần toàn bộ canvas của bài): slide mở đầu hero + đa dạng
// layout. Phát thành cảnh báo deterministic để điểm phản ánh đúng sàn (100 ⟺ đạt
// sàn), dùng CHUNG ngưỡng với evaluateLessonFloor.
function reviewLessonStructure(
  canvasesBySection: TeachingCanvas[][],
  issues: LessonReviewIssue[],
  addIssue: ReturnType<typeof createIssueFactory>
) {
  const canvases = canvasesBySection.flat();
  if (canvases.length === 0) return;

  const opener = canvases[0];
  if (opener.kind !== "hero" && opener.kind !== "cover") {
    addIssue(issues, {
      severity: "warning",
      category: "section",
      target: "lesson.opener",
      title: "Thiếu slide mở đầu (hero)",
      detail: "Canvas đầu tiên của bài không phải slide hero/cover giới thiệu.",
      suggestion: "Thêm một canvas hero làm slide mở đầu cho bài.",
    });
  }

  if (canvases.length >= FLOOR_DIVERSITY_MIN_CANVASES) {
    const distinctKinds = new Set(canvases.map((canvas) => canvas.kind)).size;
    if (distinctKinds < FLOOR_DIVERSITY_MIN_KINDS) {
      addIssue(issues, {
        severity: "warning",
        category: "canvas",
        target: "lesson.diversity",
        title: "Layout chưa đa dạng",
        detail: `Cả bài chỉ dùng ${distinctKinds} kiểu canvas, dễ đơn điệu.`,
        suggestion: "Đổi một số canvas sang layout khác (cards, timeline, compare, quiz...).",
      });
    }
  }
}

// ——— Sàn chất lượng cứng ———

function isBrokenCanvas(canvas: TeachingCanvas): boolean {
  switch (canvas.kind) {
    case "compare":
      return (canvas.cards?.length ?? 0) !== 2;
    case "quiz": {
      const cards = canvas.cards ?? [];
      const correct = cards.filter((card) => card.correct === true).length;
      return cards.length < 2 || cards.length > 4 || correct !== 1;
    }
    case "checklist":
    case "timeline":
    case "flow":
    case "mindmap":
      return canvas.steps.length === 0;
    case "code_explain":
    case "code":
    case "playground":
      return !canvas.code?.trim();
    default:
      return false;
  }
}

// Canvas "gần rỗng": để trống 16:9 vì chỉ một câu ngắn, không steps/code/cards.
// Các layout vốn ngắn (hero/statement/banner) được miễn.
function isThinCanvas(canvas: TeachingCanvas): boolean {
  if (canvas.kind === "hero" || canvas.kind === "statement" || canvas.kind === "banner") {
    return false;
  }
  if (canvas.code?.trim()) return false;
  if (canvas.steps.length > 0) return false;
  if ((canvas.cards?.length ?? 0) > 0) return false;
  return textLength(canvas.html || "") < 40;
}

// Canvas "tràn": nhiều chữ nhưng không tách steps cũng không có code.
function isOverflowCanvas(canvas: TeachingCanvas): boolean {
  return textLength(canvas.html || "") > 520 && canvas.steps.length === 0 && !canvas.code;
}

const FLOOR_DIVERSITY_MIN_CANVASES = 4;
const FLOOR_DIVERSITY_MIN_KINDS = 3;

export function evaluateLessonFloor(
  draft: LessonDraft,
  canvasesBySection: TeachingCanvas[][]
): LessonFloorReport {
  const canvases = canvasesBySection.flat();

  const metadataOk =
    Boolean(draft.title.trim()) &&
    Boolean(draft.objectives.knowledge.trim()) &&
    Boolean(draft.objectives.skills.trim()) &&
    Boolean(draft.objectives.attitude.trim());

  const contentOk =
    draft.sections.length > 0 &&
    canvasesBySection.every((sectionCanvases) => sectionCanvases.length > 0) &&
    canvases.every((canvas) => canvasText(canvas).trim().length > 0);

  const openerOk =
    canvases.length === 0
      ? false
      : canvases[0].kind === "hero" || canvases[0].kind === "cover";

  const distinctKinds = new Set(canvases.map((canvas) => canvas.kind)).size;
  const diversityOk =
    canvases.length < FLOOR_DIVERSITY_MIN_CANVASES ||
    distinctKinds >= FLOOR_DIVERSITY_MIN_KINDS;

  const renderOk = canvases.every((canvas) => !isBrokenCanvas(canvas));
  const densityOk = canvases.every(
    (canvas) => !isThinCanvas(canvas) && !isOverflowCanvas(canvas)
  );
  const closingOk =
    canvases.length < FLOOR_DIVERSITY_MIN_CANVASES || canvases.some(isSummaryCanvas);

  const items: LessonFloorItem[] = [
    {
      key: "metadata",
      label: "Đủ tiêu đề & 3 mục tiêu",
      ok: metadataOk,
      hint: "Điền tên bài và đủ mục tiêu kiến thức/kỹ năng/thái độ.",
    },
    {
      key: "content",
      label: "Mọi tab có canvas, không rỗng",
      ok: contentOk,
      hint: "Mỗi tab cần ít nhất một canvas có nội dung hiển thị.",
    },
    {
      key: "opener",
      label: "Có slide mở đầu (hero)",
      ok: openerOk,
      hint: "Canvas đầu tiên của bài nên là hero giới thiệu.",
    },
    {
      key: "diversity",
      label: `Đa dạng layout (≥${FLOOR_DIVERSITY_MIN_KINDS} loại)`,
      ok: diversityOk,
      hint: "Tránh dùng đi dùng lại một kiểu canvas cho cả bài.",
    },
    {
      key: "render",
      label: "Không vỡ layout",
      ok: renderOk,
      hint: "Mỗi layout cần đủ field bắt buộc (compare 2 vế, quiz 1 đáp án đúng, code có code...).",
    },
    {
      key: "density",
      label: "Không tràn / không gần rỗng",
      ok: densityOk,
      hint: "Canvas nhiều chữ tách thành steps; canvas một câu thêm steps hoặc đổi statement.",
    },
    {
      key: "closing",
      label: "Có slide tổng kết",
      ok: closingOk,
      hint: "Thêm một canvas checklist/mindmap chốt lại ý chính ở cuối.",
    },
  ];

  return { meets: items.every((item) => item.ok), items };
}

export function reviewLessonDraftDeterministic(draft: LessonDraft): LessonReviewReport {
  const issues: LessonReviewIssue[] = [];
  const addIssue = createIssueFactory();
  const canvasesBySection: TeachingCanvas[][] = [];

  if (!draft.title.trim()) {
    addIssue(issues, {
      severity: "critical",
      category: "metadata",
      target: "lesson.title",
      title: "Thiếu tên bài giảng",
      detail: "Tên bài là bắt buộc trước khi lưu.",
    });
  }

  if (draft.duration < 30) {
    addIssue(issues, {
      severity: "warning",
      category: "metadata",
      target: "lesson.duration",
      title: "Thời lượng quá ngắn",
      detail: "Bài học Python cấp 2 thường cần đủ thời gian giới thiệu, demo và luyện tập.",
    });
  }

  (["knowledge", "skills", "attitude"] as const).forEach((key) => {
    if (!draft.objectives[key].trim()) {
      addIssue(issues, {
        severity: "critical",
        category: "objectives",
        target: `objectives.${key}`,
        title: "Thiếu mục tiêu bài giảng",
        detail: `Ô ${key} đang trống.`,
        suggestion: "Dùng AI auto-fill hoặc tự điền trước khi lưu.",
      });
    }
  });

  if (draft.sections.length === 0) {
    addIssue(issues, {
      severity: "critical",
      category: "section",
      target: "sections",
      title: "Bài chưa có tab nội dung",
      detail: "Cần ít nhất một tab để học sinh học bài.",
    });
  }

  draft.sections.forEach((section, sectionIndex) => {
    const sectionTarget = `section:${sectionIndex + 1}`;
    if (!section.title.trim()) {
      addIssue(issues, {
        severity: "warning",
        category: "section",
        target: sectionTarget,
        title: "Tab thiếu tiêu đề",
        detail: "Tiêu đề tab giúp giáo viên điều hướng bài giảng.",
      });
    }

    let canvases: TeachingCanvas[] = [];
    try {
      canvases = buildTeachingCanvases({
        id: `review-section-${sectionIndex + 1}`,
        title: section.title || `Tab ${sectionIndex + 1}`,
        content: section.content,
        renderedContent: section.content,
        contentBlocks: Array.isArray(section.contentBlocks)
          ? (section.contentBlocks as LessonContentBlock[])
          : null,
      });
    } catch (error) {
      addIssue(issues, {
        severity: "critical",
        category: "section",
        target: sectionTarget,
        title: "Không build được canvas",
        detail: error instanceof Error ? error.message : "Lỗi không xác định khi dựng canvas.",
        suggestion: "Kiểm tra contentBlocks của tab này.",
      });
    }

    canvasesBySection.push(canvases);
    if (canvases.length === 0) {
      addIssue(issues, {
        severity: "critical",
        category: "section",
        target: sectionTarget,
        title: "Tab không có canvas",
        detail: "Tab không có nội dung hiển thị sau khi build.",
      });
    }

    if (canvases.length > 6) {
      addIssue(issues, {
        severity: "warning",
        category: "section",
        target: sectionTarget,
        title: "Tab có quá nhiều canvas",
        detail: `Tab này có ${canvases.length} canvas, có thể khiến buổi học dài và khó theo dõi.`,
        suggestion: "Giữ mỗi tab khoảng 1-4 canvas chính.",
      });
    }

    canvases.forEach((canvas, canvasIndex) => {
      reviewCanvas(
        canvas,
        `${sectionTarget}.canvas:${canvasIndex + 1}`,
        issues,
        addIssue
      );
    });
  });

  reviewExercises(draft, issues, addIssue);
  reviewLessonStructure(canvasesBySection, issues, addIssue);
  reviewPedagogy(draft, canvasesBySection.flat(), issues, addIssue);

  const stats = buildStats(draft, canvasesBySection, issues);
  const status = summarizeReviewStatus(stats);

  return {
    ...status,
    issues,
    stats,
    dimensions: buildLessonReviewDimensions(issues),
    floor: evaluateLessonFloor(draft, canvasesBySection),
    reviewedAt: new Date().toISOString(),
  };
}

export function rebuildLessonReviewReport(
  draft: LessonDraft,
  issues: LessonReviewIssue[]
): LessonReviewReport {
  const canvasesBySection = draft.sections.map((section, sectionIndex) => {
    try {
      return buildTeachingCanvases({
        id: `review-section-${sectionIndex + 1}`,
        title: section.title || `Tab ${sectionIndex + 1}`,
        content: section.content,
        renderedContent: section.content,
        contentBlocks: Array.isArray(section.contentBlocks)
          ? (section.contentBlocks as LessonContentBlock[])
          : null,
      });
    } catch {
      return [];
    }
  });
  const stats = buildStats(draft, canvasesBySection, issues);
  return {
    ...summarizeReviewStatus(stats),
    issues,
    stats,
    dimensions: buildLessonReviewDimensions(issues),
    floor: evaluateLessonFloor(draft, canvasesBySection),
    reviewedAt: new Date().toISOString(),
  };
}
