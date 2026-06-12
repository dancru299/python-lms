import type { LessonDraft } from "@/lib/lessons/lesson-draft";
import type { LessonContentBlock } from "@/lib/lessons/lesson-media";
import {
  buildTeachingCanvases,
  type TeachingCanvas,
} from "@/lib/lessons/teaching-canvas";

export type LessonReviewSeverity = "critical" | "warning" | "suggestion";
export type LessonReviewStatus = "pass" | "warning" | "fail";
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
  target: string;
  title: string;
  detail: string;
  suggestion?: string;
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
    critical: number;
    warnings: number;
    suggestions: number;
  };
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

function buildStats(
  draft: LessonDraft,
  canvasesBySection: TeachingCanvas[][],
  issues: LessonReviewIssue[]
): LessonReviewReport["stats"] {
  return {
    sections: draft.sections.length,
    canvases: canvasesBySection.reduce((sum, canvases) => sum + canvases.length, 0),
    exercises: draft.exercises.length,
    critical: issues.filter((issue) => issue.severity === "critical").length,
    warnings: issues.filter((issue) => issue.severity === "warning").length,
    suggestions: issues.filter((issue) => issue.severity === "suggestion").length,
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
    issue: Omit<LessonReviewIssue, "id">
  ) => {
    counter += 1;
    issues.push({
      id: `lesson-review-${counter}`,
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
    }
  });
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

  const stats = buildStats(draft, canvasesBySection, issues);
  const status = summarizeReviewStatus(stats);

  return {
    ...status,
    issues,
    stats,
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
    reviewedAt: new Date().toISOString(),
  };
}
