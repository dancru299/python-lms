"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import LessonSectionEditor, {
  type EditableLessonSection,
} from "@/components/lessons/LessonSectionEditor";
import {
  createTeachingCanvasBlock,
  lessonContentBlocksToHtml,
} from "@/lib/lessons/teaching-canvas";
import type { LessonContentBlock } from "@/lib/lessons/lesson-media";
import type { LessonReviewReport } from "@/lib/lessons/lesson-review";
import type {
  LessonAiClientConfig,
  LessonAiProvider,
  LessonAudience,
  LessonTeachingStyle,
} from "@/lib/ai/provider-types";
import type { LessonDraft } from "@/lib/lessons/lesson-draft";
import {
  findSuspectSlideMarkers,
  hasSlideTemplateMarkers,
  parseSlideTemplate,
  suggestLayouts,
} from "@/lib/lessons/slide-template";
import toast from "react-hot-toast";

// Số vòng tối đa cho vòng lặp tự động Duyệt → Sửa. Theo tiêu chuẩn: lặp tối đa 3
// vòng, nếu vẫn còn lỗi chặn thì dừng và giao lại cho giáo viên xử lý.
const MAX_AUTO_FIX_ROUNDS = 3;

// Các route AI cấu hình maxDuration = 60s trên Vercel và tự cắt upstream ở ~57s để
// trả lỗi sạch. Client chờ nhỉnh hơn cap đó (65s) để kịp nhận lỗi sạch từ server
// trước khi bỏ cuộc — đặt 90s là vô nghĩa vì kết nối đã đứt ở giây 60.
const AI_CLIENT_TIMEOUT_MS = 65_000;

// HTML clipboard có cấu trúc đáng giữ (bảng/list/heading/đậm/code) → chuyển sang
// Markdown khi dán. HTML "trơn" (vd code IDE chỉ gồm <span style>) thì để dán text
// thuần như cũ, bảo toàn code nguyên vẹn.
const RICH_PASTE_HTML =
  /<(table|thead|tbody|tr|th|td|ul|ol|li|h[1-6]|strong|em|b|i|blockquote|pre|code)\b/i;

// Runs an async mapper over items with a bounded number of in-flight calls so a
// templated paste doesn't fire one AI request per tab all at once.
async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  mapper: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await mapper(items[index], index);
    }
  }

  const workers = Array.from(
    { length: Math.max(1, Math.min(limit, items.length)) },
    () => worker()
  );
  await Promise.all(workers);
  return results;
}

// Gộp một AbortSignal cha (cấp component) với timeout riêng cho từng request: request
// bị huỷ khi HOẶC component abort (unmount / sinh lại) HOẶC quá hạn timeout. Nhờ vậy
// các request song song cũ không còn chạy ngầm rồi ghi đè state sau khi giáo viên rời đi.
function linkedTimeoutSignal(parent: AbortSignal, timeoutMs: number) {
  const controller = new AbortController();
  const onParentAbort = () => controller.abort();

  if (parent.aborted) {
    controller.abort();
  } else {
    parent.addEventListener("abort", onParentAbort, { once: true });
  }

  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const cleanup = () => {
    clearTimeout(timeoutId);
    parent.removeEventListener("abort", onParentAbort);
  };

  return { signal: controller.signal, cleanup };
}

interface Section extends EditableLessonSection {
  id: string;
  title: string;
  content: string;
  contentFormat?: string;
  contentBlocks?: LessonContentBlock[] | null;
}

type LessonObjectives = LessonDraft["objectives"];
type LessonReviewResponse = LessonReviewReport & {
  meta?: { provider: string; model: string } | null;
};
type LessonRepairResponse = {
  lesson?: unknown;
  repairSummary?: string[];
  review?: LessonReviewResponse;
  meta?: { provider: string; model: string } | null;
};

function asClientRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asClientArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asClientString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function hasMissingObjectives(objectives: LessonObjectives): boolean {
  return (
    !objectives.knowledge.trim() ||
    !objectives.skills.trim() ||
    !objectives.attitude.trim()
  );
}

function mergeMissingObjectives(
  current: LessonObjectives,
  generated: LessonObjectives
): LessonObjectives {
  return {
    knowledge: current.knowledge.trim() || generated.knowledge.trim(),
    skills: current.skills.trim() || generated.skills.trim(),
    attitude: current.attitude.trim() || generated.attitude.trim(),
  };
}

function normalizeObjectivesPayload(value: unknown): LessonObjectives | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const source = value as Record<string, unknown>;
  const knowledge = typeof source.knowledge === "string" ? source.knowledge.trim() : "";
  const skills = typeof source.skills === "string" ? source.skills.trim() : "";
  const attitude = typeof source.attitude === "string" ? source.attitude.trim() : "";

  if (!knowledge && !skills && !attitude) {
    return null;
  }

  return { knowledge, skills, attitude };
}

export interface LessonEditorExercise {
  id: string;
  type: "practice" | "homework";
  title: string;
  question: string;
  answer: string;
  difficulty: "easy" | "medium" | "hard";
  points: number;
  answerVisible: boolean;
}

export interface LessonEditorChapter {
  id: string;
  title: string;
}

export interface LessonEditorPersistedSection {
  id: string;
  title: string;
  content: string | null;
  contentFormat?: string | null;
  contentBlocks?: unknown;
}

export interface LessonEditorLesson {
  id: string;
  chapterId: string;
  title: string;
  duration: number;
  difficulty: string;
  theme: string | null;
  objectiveKnowledge: string | null;
  objectiveSkills: string | null;
  objectiveAttitude: string | null;
  sections: LessonEditorPersistedSection[];
  exercises: LessonEditorExercise[];
}

type LessonEditorFormProps =
  | {
      mode: "create";
      initialChapters: LessonEditorChapter[];
      initialChapterId: string;
      initialAiConfig: LessonAiClientConfig;
    }
  | {
      mode: "edit";
      initialChapters: LessonEditorChapter[];
      initialAiConfig: LessonAiClientConfig;
      initialLesson: LessonEditorLesson;
    };

function createDraftId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `lesson-draft-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function createDefaultSection(id: string, title: string): Section {
  const contentBlocks = [createTeachingCanvasBlock(title)];

  return {
    id,
    title,
    content: lessonContentBlocksToHtml(contentBlocks),
    contentFormat: "canvas",
    contentBlocks,
  };
}

// Template definitions
const CONTENT_TEMPLATES = [
  {
    id: "heading-section",
    name: "Tiêu đề + Nội dung",
    icon: "fa-heading",
    description: "Tiêu đề lớn với đoạn văn bản",
    code: `<h2>1. Tiêu đề chính</h2>
<p>Nội dung đoạn văn bản ở đây. Bạn có thể viết nhiều dòng và sử dụng <strong>in đậm</strong> hoặc <code>inline code</code>.</p>

<h3>1.1. Tiêu đề phụ</h3>
<p>Nội dung chi tiết hơn cho phần này...</p>`,
  },
  {
    id: "code-example",
    name: "Ví dụ Code Python",
    icon: "fa-code",
    description: "Block code với giải thích",
    code: `<h3>Ví dụ:</h3>
<p>Đoạn code dưới đây minh họa cách sử dụng...</p>
<div class="code-block">
# Đây là comment
my_variable = "Hello World"
print(my_variable)

# Kết quả: Hello World
</div>
<p><strong>Giải thích:</strong> Dòng 1 tạo biến, dòng 2 in ra màn hình.</p>`,
  },
  {
    id: "table-info",
    name: "Bảng thông tin",
    icon: "fa-table",
    description: "Bảng so sánh hoặc định nghĩa",
    code: `<h3>Bảng tóm tắt:</h3>
<table>
  <thead>
    <tr>
      <th>Thuộc tính</th>
      <th>Mô tả</th>
      <th>Ví dụ</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Tên 1</strong></td>
      <td>Mô tả cho thuộc tính 1</td>
      <td><code>ví dụ code</code></td>
    </tr>
    <tr>
      <td><strong>Tên 2</strong></td>
      <td>Mô tả cho thuộc tính 2</td>
      <td><code>ví dụ code</code></td>
    </tr>
  </tbody>
</table>`,
  },
  {
    id: "list-items",
    name: "Danh sách",
    icon: "fa-list",
    description: "Danh sách có thứ tự hoặc không",
    code: `<h3>Các điểm chính:</h3>
<ul>
  <li><strong>Điểm 1:</strong> Giải thích chi tiết cho điểm này.</li>
  <li><strong>Điểm 2:</strong> Giải thích chi tiết cho điểm này.</li>
  <li><strong>Điểm 3:</strong> Giải thích chi tiết cho điểm này.</li>
</ul>

<h3>Các bước thực hiện:</h3>
<ol>
  <li>Bước đầu tiên cần làm</li>
  <li>Bước thứ hai tiếp theo</li>
  <li>Bước cuối cùng hoàn thành</li>
</ol>`,
  },
  {
    id: "note-tip",
    name: "Ghi chú / Mẹo",
    icon: "fa-lightbulb",
    description: "Hộp ghi chú nổi bật",
    code: `<div style="background: #fef3c7; border: 1px solid #f59e0b; padding: 1rem; border-radius: 0.5rem; margin: 1rem 0;">
  <p style="margin: 0; color: #92400e;">
    <strong>💡 Mẹo:</strong> Đây là một mẹo hữu ích mà học sinh nên ghi nhớ!
  </p>
</div>

<div style="background: #dbeafe; border: 1px solid #3b82f6; padding: 1rem; border-radius: 0.5rem; margin: 1rem 0;">
  <p style="margin: 0; color: #1e40af;">
    <strong>📌 Lưu ý:</strong> Điều quan trọng cần chú ý khi học phần này.
  </p>
</div>`,
  },
  {
    id: "problem-solution",
    name: "Đặt vấn đề + Giải pháp",
    icon: "fa-puzzle-piece",
    description: "Trình bày vấn đề và giải pháp",
    code: `<h2>1. Đặt Vấn Đề</h2>
<p><strong>Tình huống:</strong> Mô tả tình huống thực tế mà học sinh có thể gặp phải...</p>
<ul>
  <li><strong>Khó khăn 1:</strong> Giải thích vấn đề đầu tiên.</li>
  <li><strong>Khó khăn 2:</strong> Giải thích vấn đề thứ hai.</li>
</ul>

<p>➡️ <strong>Giải pháp:</strong> Giới thiệu khái niệm/công cụ sẽ giải quyết vấn đề này!</p>

<h2>2. Cách Giải Quyết</h2>
<div class="code-block">
# Code minh họa giải pháp
solution = "Đây là giải pháp"
print(solution)
</div>`,
  },
  {
    id: "comparison",
    name: "So sánh",
    icon: "fa-arrows-left-right",
    description: "So sánh 2 khái niệm",
    code: `<h3>So sánh A và B:</h3>
<table>
  <thead>
    <tr>
      <th>Tiêu chí</th>
      <th>Khái niệm A</th>
      <th>Khái niệm B</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Định nghĩa</strong></td>
      <td>Mô tả A</td>
      <td>Mô tả B</td>
    </tr>
    <tr>
      <td><strong>Cú pháp</strong></td>
      <td><code>syntax_a</code></td>
      <td><code>syntax_b</code></td>
    </tr>
    <tr>
      <td><strong>Ưu điểm</strong></td>
      <td>Ưu điểm của A</td>
      <td>Ưu điểm của B</td>
    </tr>
  </tbody>
</table>

<p><strong>Kết luận:</strong> Khi nào dùng A, khi nào dùng B...</p>`,
  },
  {
    id: "visual-diagram",
    name: "Sơ đồ trực quan",
    icon: "fa-diagram-project",
    description: "Sơ đồ minh họa bằng HTML",
    code: `<h3>Sơ đồ minh họa:</h3>
<div style="background: #f3f4f6; padding: 1rem; border-radius: 0.5rem; margin: 1rem 0;">
  <div style="display: flex; flex-direction: column; align-items: center; gap: 0.5rem;">
    <!-- Index dương -->
    <div style="display: flex; gap: 0.5rem; font-family: monospace; color: #3b82f6;">
      <span style="width: 2.5rem; text-align: center;">0</span>
      <span style="width: 2.5rem; text-align: center;">1</span>
      <span style="width: 2.5rem; text-align: center;">2</span>
      <span style="width: 2.5rem; text-align: center;">3</span>
      <span style="width: 2.5rem; text-align: center;">4</span>
    </div>
    <!-- Boxes -->
    <div style="display: flex; gap: 0.5rem;">
      <div style="width: 2.5rem; height: 2.5rem; background: #3b82f6; color: white; display: flex; align-items: center; justify-content: center; border-radius: 0.25rem; font-weight: bold;">'A'</div>
      <div style="width: 2.5rem; height: 2.5rem; background: #3b82f6; color: white; display: flex; align-items: center; justify-content: center; border-radius: 0.25rem; font-weight: bold;">'B'</div>
      <div style="width: 2.5rem; height: 2.5rem; background: #3b82f6; color: white; display: flex; align-items: center; justify-content: center; border-radius: 0.25rem; font-weight: bold;">'C'</div>
      <div style="width: 2.5rem; height: 2.5rem; background: #3b82f6; color: white; display: flex; align-items: center; justify-content: center; border-radius: 0.25rem; font-weight: bold;">'D'</div>
      <div style="width: 2.5rem; height: 2.5rem; background: #3b82f6; color: white; display: flex; align-items: center; justify-content: center; border-radius: 0.25rem; font-weight: bold;">'E'</div>
    </div>
    <!-- Index âm -->
    <div style="display: flex; gap: 0.5rem; font-family: monospace; color: #ef4444;">
      <span style="width: 2.5rem; text-align: center;">-5</span>
      <span style="width: 2.5rem; text-align: center;">-4</span>
      <span style="width: 2.5rem; text-align: center;">-3</span>
      <span style="width: 2.5rem; text-align: center;">-2</span>
      <span style="width: 2.5rem; text-align: center;">-1</span>
    </div>
  </div>
</div>`,
  },
];

export default function LessonEditorForm(props: LessonEditorFormProps) {
  const { initialChapters, initialAiConfig } = props;
  const router = useRouter();
  const initialLesson = props.mode === "edit" ? props.initialLesson : null;
  const lessonId = initialLesson?.id;
  const [draftId] = useState(() =>
    initialLesson ? `lesson-${initialLesson.id}-edit-draft` : createDraftId()
  );

  const [creationMode, setCreationMode] = useState<"manual" | "ai">("manual");
  const [aiContent, setAiContent] = useState("");
  // Ngữ cảnh sư phạm tuỳ chọn cho AI (đối tượng học sinh + phong cách). undefined =
  // để AI tự quyết (giọng trung lập).
  const [aiAudience, setAiAudience] = useState<LessonAudience | undefined>(undefined);
  const [aiStyle, setAiStyle] = useState<LessonTeachingStyle | undefined>(undefined);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiProgress, setAiProgress] = useState<{ done: number; total: number } | null>(null);
  const [aiDraftReady, setAiDraftReady] = useState(false);
  const [aiMeta, setAiMeta] = useState<{ provider: string; model: string } | null>(null);
  const [isReviewing, setIsReviewing] = useState(false);
  const [isRepairing, setIsRepairing] = useState(false);
  const [lessonReview, setLessonReview] = useState<LessonReviewResponse | null>(null);
  const [repairSummary, setRepairSummary] = useState<string[]>([]);
  const [isAutoFixing, setIsAutoFixing] = useState(false);
  const [autoFixProgress, setAutoFixProgress] = useState<{
    round: number;
    maxRounds: number;
    note: string;
  } | null>(null);
  const autoFixAbortRef = useRef<AbortController | null>(null);
  // AbortController cấp component cho luồng sinh bài (full-AI + hybrid template). Cho
  // phép huỷ mọi request đang chạy khi unmount hoặc khi bấm sinh lại.
  const generationAbortRef = useRef<AbortController | null>(null);
  const [aiProvider, setAiProvider] = useState<LessonAiProvider>(
    initialAiConfig.defaultProvider
  );
  const [aiModel, setAiModel] = useState(() => {
    const defaultOption = initialAiConfig.providers.find(
      (provider) => provider.value === initialAiConfig.defaultProvider
    );

    return defaultOption?.defaultModel || "";
  });
  const [chapters] = useState<LessonEditorChapter[]>(initialChapters);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(() =>
    initialLesson?.sections[0]?.id ?? (props.mode === "create" ? "sec-1" : null)
  );
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templateTargetSection, setTemplateTargetSection] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    chapterId:
      initialLesson?.chapterId ?? (props.mode === "create" ? props.initialChapterId : ""),
    title: initialLesson?.title ?? "",
    duration: initialLesson?.duration ?? 120,
    difficulty: initialLesson?.difficulty ?? "beginner",
    theme: initialLesson?.theme ?? "default",
    objectives: {
      knowledge: initialLesson?.objectiveKnowledge || "",
      skills: initialLesson?.objectiveSkills || "",
      attitude: initialLesson?.objectiveAttitude || "",
    },
  });

  const [sections, setSections] = useState<Section[]>(() =>
    initialLesson
      ? initialLesson.sections.map((section) => ({
          id: section.id,
          title: section.title,
          content: section.content || "",
          contentFormat: section.contentFormat || "html",
          contentBlocks: Array.isArray(section.contentBlocks)
            ? (section.contentBlocks as LessonContentBlock[])
            : null,
        }))
      : [
          createDefaultSection("sec-1", "Khái niệm"),
          createDefaultSection("sec-2", "Ví dụ minh họa"),
          createDefaultSection("sec-3", "Thực hành"),
        ]
  );

  const [exercises, setExercises] = useState<LessonEditorExercise[]>(() =>
    initialLesson
      ? initialLesson.exercises.map((exercise) => ({
          id: exercise.id,
          type: exercise.type,
          title: exercise.title,
          question: exercise.question || "",
          answer: exercise.answer || "",
          difficulty: exercise.difficulty,
          points: exercise.points,
          answerVisible: exercise.answerVisible,
        }))
      : []
  );

  // Bản chụp trạng thái TRƯỚC khi AI ghi đè (sinh/sửa/tự sửa) để giáo viên hoàn tác.
  const [lessonBackup, setLessonBackup] = useState<{
    formData: typeof formData;
    sections: Section[];
    exercises: LessonEditorExercise[];
    activeSection: string | null;
  } | null>(null);

  // Khoá vùng soạn thảo khi AI đang sửa/tự sửa: chặn giáo viên gõ tay rồi bị
  // applyRepairedLesson ghi đè mất công.
  const editingLocked = isRepairing || isAutoFixing;

  const snapshotLesson = () => {
    setLessonBackup({
      formData: JSON.parse(JSON.stringify(formData)),
      sections: JSON.parse(JSON.stringify(sections)),
      exercises: JSON.parse(JSON.stringify(exercises)),
      activeSection,
    });
  };

  const restoreLessonBackup = () => {
    if (!lessonBackup) return;
    setFormData(lessonBackup.formData);
    setSections(lessonBackup.sections);
    setExercises(lessonBackup.exercises);
    setActiveSection(lessonBackup.activeSection);
    setLessonBackup(null);
    toast.success("Đã khôi phục bản trước khi AI chỉnh sửa.");
  };

  // Bắt đầu một lượt sinh bài mới: huỷ lượt cũ (nếu còn) rồi cấp controller mới.
  const beginGeneration = () => {
    generationAbortRef.current?.abort();
    const controller = new AbortController();
    generationAbortRef.current = controller;
    return controller;
  };

  // Huỷ mọi request AI còn treo khi component bị gỡ (đóng modal / rời trang) để không
  // còn callback nào gọi setState trên component đã unmount.
  useEffect(() => {
    return () => {
      generationAbortRef.current?.abort();
      autoFixAbortRef.current?.abort();
    };
  }, []);

  const selectedAiProvider =
    initialAiConfig.providers.find((provider) => provider.value === aiProvider) ||
    initialAiConfig.providers[0];

  const handleAiProviderChange = (provider: LessonAiProvider) => {
    setAiProvider(provider);
    const providerOption = initialAiConfig.providers.find(
      (option) => option.value === provider
    );

    if (providerOption) {
      setAiModel(providerOption.defaultModel);
    }
  };

  const readAiErrorMessage = async (response: Response) => {
    try {
      const payload = await response.json();
      const errorMessage =
        typeof payload?.error === "string" ? payload.error.trim() : "";
      const detailMessage =
        typeof payload?.details === "string" ? payload.details.trim() : "";

      if (errorMessage && detailMessage && errorMessage !== detailMessage) {
        return `${errorMessage}\nChi tiết: ${detailMessage}`;
      }

      if (detailMessage) {
        return detailMessage;
      }

      if (errorMessage) {
        return errorMessage;
      }
    } catch {
      // Fall through to the generic fallback below.
    }

    return "Lỗi khi gọi AI API";
  };

  const generateObjectives = async (options: {
    title?: string;
    content: string;
  }): Promise<LessonObjectives | null> => {
    const res = await fetch("/api/admin/lessons/generate-objectives", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: options.title,
        content: options.content,
        provider: aiProvider,
        model: aiModel,
      }),
    });

    if (!res.ok) {
      throw new Error(await readAiErrorMessage(res));
    }

    const data = (await res.json()) as {
      objectives?: unknown;
      meta?: { provider: string; model: string };
    };
    if (data.meta) setAiMeta(data.meta);
    return normalizeObjectivesPayload(data.objectives);
  };

  const buildSectionsForPayload = (sourceSections: Section[] = sections) =>
    sourceSections
      .filter((section) => section.title.trim())
      .map((section) => {
        const contentBlocks = Array.isArray(section.contentBlocks)
          ? section.contentBlocks
          : null;

        return {
          ...section,
          content: contentBlocks?.length
            ? lessonContentBlocksToHtml(contentBlocks)
            : section.content,
          contentFormat:
            contentBlocks?.length && section.contentFormat !== "html"
              ? section.contentFormat || "canvas"
              : section.contentFormat || "html",
          contentBlocks,
        };
      });

  const buildLessonPayload = (options?: {
    form?: typeof formData;
    sections?: Section[];
    exercises?: LessonEditorExercise[];
  }) => {
    const nextForm = options?.form ?? formData;
    const nextExercises = options?.exercises ?? exercises;

    return {
      ...nextForm,
      draftId,
      sections: buildSectionsForPayload(options?.sections),
      exercises: nextExercises.filter((exercise) => exercise.title.trim()),
    };
  };

  const coerceRepairedForm = (lesson: unknown): typeof formData => {
    const source = asClientRecord(lesson) ?? {};
    const objectives =
      normalizeObjectivesPayload(source.objectives) ?? formData.objectives;
    const duration = Number(source.duration);

    return {
      ...formData,
      title: asClientString(source.title) || formData.title,
      duration: Number.isFinite(duration) ? duration : formData.duration,
      difficulty: asClientString(source.difficulty) || formData.difficulty,
      theme: asClientString(source.theme) || formData.theme,
      objectives: mergeMissingObjectives(objectives, formData.objectives),
    };
  };

  const coerceRepairedSections = (lesson: unknown): Section[] => {
    const source = asClientRecord(lesson) ?? {};
    const repairedSections = asClientArray(source.sections);
    if (repairedSections.length === 0) return sections;

    return repairedSections.map((item, index) => {
      const sectionSource = asClientRecord(item) ?? {};
      const previous = sections[index];
      const contentBlocks = Array.isArray(sectionSource.contentBlocks)
        ? (sectionSource.contentBlocks as LessonContentBlock[])
        : previous?.contentBlocks ?? null;
      const content =
        asClientString(sectionSource.content) ||
        (contentBlocks?.length ? lessonContentBlocksToHtml(contentBlocks) : previous?.content || "");

      return {
        id:
          asClientString(sectionSource.id) ||
          previous?.id ||
          `${initialLesson ? "repair-sec" : "sec-repair"}-${Date.now()}-${index}`,
        title:
          asClientString(sectionSource.title) ||
          previous?.title ||
          `Tab ${index + 1}`,
        content,
        contentFormat:
          asClientString(sectionSource.contentFormat) ||
          (contentBlocks?.length ? "canvas" : previous?.contentFormat || "html"),
        contentBlocks,
      };
    });
  };

  const coerceRepairedExercises = (lesson: unknown): LessonEditorExercise[] => {
    const source = asClientRecord(lesson) ?? {};
    const repairedExercises = asClientArray(source.exercises);
    if (repairedExercises.length === 0) return exercises;

    return repairedExercises.map((item, index) => {
      const exerciseSource = asClientRecord(item) ?? {};
      const previous = exercises[index];
      const type = asClientString(exerciseSource.type);
      const difficulty = asClientString(exerciseSource.difficulty);
      const points = Number(exerciseSource.points);

      return {
        id:
          asClientString(exerciseSource.id) ||
          previous?.id ||
          `${initialLesson ? "repair-ex" : "ex-repair"}-${Date.now()}-${index}`,
        type: type === "homework" ? "homework" : "practice",
        title:
          asClientString(exerciseSource.title) ||
          previous?.title ||
          `Bài tập ${index + 1}`,
        question:
          asClientString(exerciseSource.question) ||
          previous?.question ||
          "<p>Hoàn thành yêu cầu bài tập.</p>",
        answer: asClientString(exerciseSource.answer) || previous?.answer || "",
        difficulty:
          difficulty === "hard" || difficulty === "medium" || difficulty === "easy"
            ? difficulty
            : previous?.difficulty || "easy",
        points: Number.isFinite(points) ? points : previous?.points || 10,
        answerVisible:
          typeof exerciseSource.answerVisible === "boolean"
            ? exerciseSource.answerVisible
            : previous?.answerVisible ?? true,
      };
    });
  };

  // Gọi thuần /review, không đụng state/toast — để cả vòng lặp tự sửa và lượt
  // duyệt thủ công cùng tái dùng (và truyền được AbortSignal để hủy).
  const requestLessonReview = async (
    lesson: unknown,
    signal?: AbortSignal
  ): Promise<LessonReviewResponse> => {
    const res = await fetch("/api/admin/lessons/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lesson, provider: aiProvider, model: aiModel }),
      signal,
    });

    if (!res.ok) {
      throw new Error(await readAiErrorMessage(res));
    }

    return (await res.json()) as LessonReviewResponse;
  };

  const requestLessonRepair = async (
    lesson: unknown,
    review: LessonReviewResponse,
    signal?: AbortSignal
  ): Promise<LessonRepairResponse> => {
    const res = await fetch("/api/admin/lessons/repair", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lesson, review, provider: aiProvider, model: aiModel }),
      signal,
    });

    if (!res.ok) {
      throw new Error(await readAiErrorMessage(res));
    }

    return (await res.json()) as LessonRepairResponse;
  };

  // Áp bản nháp đã sửa vào form/sections/exercises — dùng chung cho repair thủ công
  // và vòng lặp tự sửa.
  const applyRepairedLesson = (repairedLesson: unknown) => {
    const nextSections = coerceRepairedSections(repairedLesson);
    setFormData(coerceRepairedForm(repairedLesson));
    setSections(nextSections);
    setExercises(coerceRepairedExercises(repairedLesson));
    setActiveSection(nextSections[0]?.id ?? null);
  };

  const runLessonReview = async (
    lesson = buildLessonPayload(),
    options?: { silent?: boolean }
  ) => {
    setIsReviewing(true);
    // Một lượt duyệt mới phản ánh trạng thái hiện tại — bỏ tóm tắt repair cũ để
    // tránh hiển thị mâu thuẫn (ví dụ "giữ nguyên ở 50" cạnh điểm mới 93).
    setRepairSummary([]);
    try {
      const report = await requestLessonReview(lesson);
      setLessonReview(report);
      if (report.meta) setAiMeta(report.meta);

      if (!options?.silent) {
        if (report.status === "fail") {
          toast.error("Báo cáo duyệt bài có lỗi cần sửa trước khi lưu.", {
            duration: 5000,
          });
        } else if (report.status === "warning") {
          toast("Bài dùng được nhưng còn điểm nên xem lại.", {
            icon: "!",
            duration: 5000,
          });
        } else {
          toast.success("Bài đã qua lượt duyệt tự động.");
        }
      }

      return report;
    } catch (error) {
      if (!options?.silent) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Không thể duyệt bài giảng lúc này."
        );
      }
      console.warn("Lesson review request failed:", error);
      return null;
    } finally {
      setIsReviewing(false);
    }
  };

  const runLessonRepair = async () => {
    const currentLesson = buildLessonPayload();
    const currentReview =
      lessonReview ?? (await runLessonReview(currentLesson, { silent: true }));

    if (!currentReview) {
      toast.error("Cần có báo cáo duyệt bài trước khi AI sửa lỗi.");
      return;
    }

    snapshotLesson();
    setIsRepairing(true);
    try {
      const data = await requestLessonRepair(currentLesson, currentReview);
      applyRepairedLesson(data.lesson ?? currentLesson);
      setRepairSummary(Array.isArray(data.repairSummary) ? data.repairSummary : []);
      if (data.meta) setAiMeta(data.meta);

      // Dùng thẳng báo cáo deterministic mà repair trả về làm điểm chính thức.
      // Không gọi lại /review để tránh re-roll LLM (gây nhiễu điểm) — gợi ý sư phạm
      // AI được xóa sạch, người dùng bấm "Duyệt lại" khi muốn lấy gợi ý mới.
      if (data.review) {
        setLessonReview(data.review);
      }
      toast.success(
        "AI đã sửa bản nháp. Bấm Duyệt lại nếu muốn gợi ý sư phạm mới."
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Không thể sửa bản nháp lúc này."
      );
      console.warn("Lesson repair request failed:", error);
    } finally {
      setIsRepairing(false);
    }
  };

  const cancelAutoFix = () => {
    autoFixAbortRef.current?.abort();
  };

  // Vòng lặp tự động Duyệt → Sửa. Lặp tối đa MAX_AUTO_FIX_ROUNDS vòng; dừng sớm khi
  // hết lỗi chặn (critical) — đây là mục tiêu "đạt". Nếu repair không cải thiện thêm
  // (kẹt), hoặc đã hết số vòng mà vẫn còn lỗi chặn, dừng và giao giáo viên xử lý.
  // Mỗi vòng tái dùng report deterministic mà /repair trả về nên không tốn thêm lượt
  // LLM review. Luôn áp bản có điểm cao nhất để không bao giờ để lại bản tệ hơn.
  const runAutoFixLoop = async () => {
    if (isAutoFixing || isRepairing || isReviewing) return;

    snapshotLesson();
    const controller = new AbortController();
    autoFixAbortRef.current = controller;
    setIsAutoFixing(true);
    setRepairSummary([]);
    setAutoFixProgress({
      round: 0,
      maxRounds: MAX_AUTO_FIX_ROUNDS,
      note: "Đang duyệt bài để lấy mốc ban đầu...",
    });

    const log: string[] = [];

    try {
      let lesson: unknown = buildLessonPayload();
      let review = lessonReview;

      // Mốc ban đầu: tái dùng report đang có, nếu chưa có thì duyệt một lượt.
      if (!review) {
        try {
          review = await requestLessonReview(lesson, controller.signal);
          setLessonReview(review);
          if (review.meta) setAiMeta(review.meta);
        } catch (error) {
          if (!controller.signal.aborted) {
            toast.error(
              error instanceof Error
                ? error.message
                : "Không duyệt được bài để bắt đầu tự sửa."
            );
          }
          return;
        }
      }

      // Mục tiêu: đưa bài ĐẠT SÀN chất lượng (floor.meets), không chỉ hết critical.
      const unmetOf = (r: LessonReviewResponse) =>
        r.floor?.items.filter((item) => !item.ok).length ?? 0;
      // Bản "tốt nhất" = ít mục sàn còn thiếu nhất, tie-break bằng điểm.
      const isBetter = (
        candidate: LessonReviewResponse,
        current: LessonReviewResponse
      ) => {
        const cu = unmetOf(candidate);
        const ru = unmetOf(current);
        return cu < ru || (cu === ru && candidate.score > current.score);
      };

      let best: { lesson: unknown; review: LessonReviewResponse } = { lesson, review };
      let stopReason: "pass" | "cap" | "stuck" | "error" | "cancelled" = "pass";
      let didRepair = false;

      for (let round = 1; round <= MAX_AUTO_FIX_ROUNDS; round++) {
        if (review.floor?.meets) {
          stopReason = "pass";
          break;
        }

        const prevScore = review.score;
        const prevUnmet = unmetOf(review);
        const firstUnmet = review.floor?.items.find((item) => !item.ok);
        setAutoFixProgress({
          round,
          maxRounds: MAX_AUTO_FIX_ROUNDS,
          note: firstUnmet
            ? `Đạt sàn: còn ${prevUnmet} mục — ưu tiên "${firstUnmet.label}"...`
            : "Đang nâng bài lên sàn chuẩn...",
        });

        let data: LessonRepairResponse;
        try {
          data = await requestLessonRepair(lesson, review, controller.signal);
        } catch (error) {
          if (controller.signal.aborted) {
            stopReason = "cancelled";
            log.push(`Vòng ${round}: đã hủy giữa chừng.`);
          } else {
            stopReason = "error";
            log.push(
              `Vòng ${round}: lỗi khi sửa — ${
                error instanceof Error ? error.message : "không rõ"
              }.`
            );
          }
          break;
        }

        lesson = data.lesson ?? lesson;
        const nextReview = data.review;
        if (!nextReview) {
          stopReason = "error";
          log.push(`Vòng ${round}: repair không trả báo cáo duyệt.`);
          break;
        }
        review = nextReview;
        didRepair = true;
        if (isBetter(review, best.review)) {
          best = { lesson, review };
        }
        if (data.meta) setAiMeta(data.meta);

        log.push(
          `Vòng ${round}: còn ${unmetOf(review)} mục sàn, điểm ${prevScore} → ${review.score}/100.`
        );

        if (review.floor?.meets) {
          stopReason = "pass";
          break;
        }

        const improved = unmetOf(review) < prevUnmet || review.score > prevScore;
        if (!improved) {
          stopReason = "stuck";
          log.push("Repair không cải thiện thêm — dừng để giáo viên xử lý.");
          break;
        }

        if (round === MAX_AUTO_FIX_ROUNDS) {
          stopReason = "cap";
        }
      }

      // Áp bản tốt nhất vào editor — bỏ qua nếu chưa sửa lần nào để không reset
      // tab/nội dung một cách vô ích.
      if (didRepair) {
        applyRepairedLesson(best.lesson);
      }
      setLessonReview(best.review);

      const remaining = unmetOf(best.review);
      const head =
        stopReason === "pass"
          ? didRepair
            ? `✅ Đạt sàn chất lượng sau ${log.length} vòng — điểm ${best.review.score}/100.`
            : `✅ Bài đã đạt sàn chất lượng — không cần tự sửa (${best.review.score}/100).`
          : stopReason === "cancelled"
            ? `⏹️ Đã dừng theo yêu cầu — giữ bản tốt nhất (còn ${remaining} mục sàn).`
            : stopReason === "cap"
              ? `⚠️ Đã sửa tối đa ${MAX_AUTO_FIX_ROUNDS} vòng, còn ${remaining} mục sàn — cần giáo viên xử lý.`
              : stopReason === "stuck"
                ? `⚠️ Repair bị kẹt, còn ${remaining} mục sàn — cần giáo viên xử lý.`
                : `⚠️ Dừng do lỗi, còn ${remaining} mục sàn — cần giáo viên xử lý.`;
      setRepairSummary([head, ...log]);

      if (stopReason === "pass") {
        toast.success("Tự động sửa xong — bài đạt sàn chất lượng.");
      } else if (stopReason === "cancelled") {
        toast("Đã dừng tự sửa, giữ bản tốt nhất.", { icon: "⏹️", duration: 4000 });
      } else {
        toast("Còn mục sàn cần giáo viên xử lý.", { icon: "!", duration: 5000 });
      }
    } finally {
      autoFixAbortRef.current = null;
      setIsAutoFixing(false);
      setAutoFixProgress(null);
    }
  };

  // Section handlers
  const addSection = () => {
    const newId = `${initialLesson ? "new-sec" : "sec"}-${Date.now()}`;
    setSections((current) => [...current, createDefaultSection(newId, "Tab mới")]);
    setActiveSection(newId);
  };

  const updateSection = (id: string, field: string, value: string) => {
    setSections((current) =>
      current.map((section) => (section.id === id ? { ...section, [field]: value } : section))
    );
  };

  const updateSectionDraft = (nextSection: EditableLessonSection) => {
    setSections((current) =>
      current.map((section) =>
        section.id === nextSection.id ? { ...section, ...nextSection } : section
      )
    );
  };

  const removeSection = (id: string) => {
    setSections((current) =>
      current.length > 1 ? current.filter((section) => section.id !== id) : current
    );
    if (activeSection === id) setActiveSection(null);
  };

  const moveSection = (id: string, direction: "up" | "down") => {
    setSections((current) => {
      const index = current.findIndex((section) => section.id === id);
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (index < 0 || targetIndex < 0 || targetIndex >= current.length) {
        return current;
      }

      const nextSections = [...current];
      [nextSections[index], nextSections[targetIndex]] = [
        nextSections[targetIndex],
        nextSections[index],
      ];
      return nextSections;
    });
  };

  // Template handlers
  const openTemplateModal = (sectionId: string) => {
    setTemplateTargetSection(sectionId);
    setShowTemplateModal(true);
  };

  const insertTemplate = (template: typeof CONTENT_TEMPLATES[0]) => {
    if (templateTargetSection) {
      setSections((current) =>
        current.map((section) =>
          section.id === templateTargetSection
            ? {
                ...section,
                content: section.content + (section.content ? "\n\n" : "") + template.code,
              }
            : section
        )
      );
    }
    setShowTemplateModal(false);
    setTemplateTargetSection(null);
  };

  // Exercise handlers
  const addExercise = (type: "practice" | "homework") => {
    const newId = `${initialLesson ? "new-ex" : "ex"}-${Date.now()}`;
    setExercises((current) => {
      const count = current.filter((exercise) => exercise.type === type).length + 1;
      return [
        ...current,
        {
        id: newId,
        type,
        title: type === "practice" ? `Bài tập ${count}` : `BTVN ${count}`,
        question: "",
        answer: "",
        difficulty: "easy",
        points: type === "homework" ? 20 : 10,
        answerVisible: type === "practice",
        },
      ];
    });
  };

  const updateExercise = (
    id: string,
    field: string,
    value: string | number | boolean
  ) => {
    setExercises((current) =>
      current.map((exercise) =>
        exercise.id === id ? { ...exercise, [field]: value } : exercise
      )
    );
  };

  const removeExercise = (id: string) => {
    setExercises((current) => current.filter((exercise) => exercise.id !== id));
  };

  // Hybrid path: the paste already carries explicit [SLIDE/TAB] markers, so split
  // it into exact tabs locally (instant, lossless, respects the teacher's order),
  // then ask the AI to beautify ONE tab at a time into canvases. Any tab the AI
  // can't handle keeps its parsed HTML, so the tab structure is never lost.
  // Returns true when it handled the paste, false when the markers yielded
  // nothing usable so the caller should fall back to the whole-document AI path.
  const generateFromTemplate = async (
    parentSignal: AbortSignal
  ): Promise<boolean> => {
    const parsed = parseSlideTemplate(aiContent);

    if (parsed.sections.length === 0 && parsed.exercises.length === 0) {
      return false;
    }

    setIsGenerating(true);
    setAiProgress({ done: 0, total: parsed.sections.length });
    const generatedAt = Date.now();
    let aiFailures = 0;
    let lastMeta: { provider: string; model: string } | null = null;
    const objectivePromise = hasMissingObjectives(formData.objectives)
      ? generateObjectives({
          title: parsed.title || formData.title,
          content: aiContent,
        }).catch((error) => {
          console.warn("Objective generation failed:", error);
          return null;
        })
      : Promise.resolve(null);

    try {
      // Lesson title + exercises are derived deterministically — no AI needed.
      setFormData((prev) => ({ ...prev, title: parsed.title || prev.title }));

      const templateExercises = parsed.exercises.map((ex, idx) => ({
        id: `${initialLesson ? "tpl-ex" : "ex-tpl"}-${generatedAt}-${idx}`,
        type: ex.type,
        title: ex.title,
        question: ex.question,
        answer: ex.answer,
        difficulty: ex.difficulty,
        points: ex.points,
        answerVisible: ex.answerVisible,
      }));

      if (templateExercises.length > 0) {
        setExercises(templateExercises);
      }

      const builtSections = await mapWithConcurrency(
        parsed.sections,
        3,
        async (tab, idx): Promise<Section> => {
          const id = `${initialLesson ? "tpl-sec" : "sec-tpl"}-${generatedAt}-${idx}`;
          try {
            const { signal, cleanup } = linkedTimeoutSignal(
              parentSignal,
              AI_CLIENT_TIMEOUT_MS
            );
            let res: Response;
            try {
              res = await fetch("/api/admin/lessons/generate-canvas", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  title: tab.fullTitle,
                  content: tab.rawText,
                  lessonTitle: parsed.title ?? formData.title,
                  isFirst: idx === 0,
                  layoutHints: suggestLayouts(tab),
                  roleHint: tab.roleHint,
                  provider: aiProvider,
                  model: aiModel,
                  context: { audience: aiAudience, style: aiStyle },
                }),
                signal,
              });
            } finally {
              cleanup();
            }

            if (!res.ok) {
              throw new Error(await readAiErrorMessage(res));
            }

            const data = (await res.json()) as {
              contentBlocks?: LessonContentBlock[];
              meta?: { provider: string; model: string };
            };
            const contentBlocks = Array.isArray(data.contentBlocks)
              ? data.contentBlocks
              : [];
            if (data.meta) lastMeta = data.meta;

            if (contentBlocks.length > 0) {
              return {
                id,
                title: tab.title,
                content: lessonContentBlocksToHtml(contentBlocks),
                contentFormat: "canvas",
                contentBlocks,
              };
            }

            throw new Error("AI không trả về canvas hợp lệ");
          } catch (error) {
            // Graceful fallback: keep the teacher's exact content as HTML slides.
            aiFailures += 1;
            console.warn(`Tab "${tab.title}" dùng bản HTML gốc:`, error);
            return {
              id,
              title: tab.title,
              content: tab.html,
              contentFormat: "html",
              contentBlocks: null,
            };
          } finally {
            setAiProgress((prev) =>
              prev ? { ...prev, done: prev.done + 1 } : prev
            );
          }
        }
      );

      // Đã bị huỷ giữa chừng (đóng modal / bấm sinh lại) → KHÔNG ghi đè state với kết
      // quả cũ, tránh nội dung cũ và mới chồng lên nhau.
      if (parentSignal.aborted) {
        return true;
      }

      if (builtSections.length > 0) {
        setSections(builtSections);
        setActiveSection(builtSections[0]?.id ?? null);
      }
      const generatedObjectives = await objectivePromise;
      const nextFormData = {
        ...formData,
        title: parsed.title || formData.title,
        objectives: generatedObjectives
          ? mergeMissingObjectives(formData.objectives, generatedObjectives)
          : formData.objectives,
      };
      if (generatedObjectives) {
        setFormData((prev) => ({
          ...prev,
          title: parsed.title || prev.title,
          objectives: mergeMissingObjectives(prev.objectives, generatedObjectives),
        }));
      }
      if (lastMeta) setAiMeta(lastMeta);
      void runLessonReview(
        buildLessonPayload({
          form: nextFormData,
          sections: builtSections,
          exercises: templateExercises.length > 0 ? templateExercises : exercises,
        }),
        { silent: true }
      );

      setCreationMode("manual");
      setAiDraftReady(true);

      const tabCount = builtSections.length;
      if (aiFailures === 0) {
        toast.success(
          `Đã tách ${tabCount} tab theo mẫu và dựng slide bằng AI. Hãy kiểm tra lại trước khi lưu.`
        );
      } else if (aiFailures < parsed.sections.length) {
        toast(
          `Đã tách ${tabCount} tab. ${aiFailures} tab giữ nguyên bản HTML gốc do AI lỗi.`,
          { icon: "⚠️", duration: 6000 }
        );
      } else {
        toast(
          `Đã tách ${tabCount} tab theo mẫu (giữ nguyên nội dung). AI chưa dựng được slide — kiểm tra cấu hình provider/model.`,
          { icon: "⚠️", duration: 7000 }
        );
      }
      return true;
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Đã xảy ra lỗi khi tách theo mẫu.",
        { duration: 6000 }
      );
      console.warn("Template hybrid generation failed:", error);
      // We already took the template path; don't also run the whole-doc AI path.
      return true;
    } finally {
      // Bỏ qua nếu lượt này đã bị thay/huỷ, để không tắt spinner của lượt mới.
      if (!parentSignal.aborted) {
        setIsGenerating(false);
        setAiProgress(null);
      }
    }
  };

  // Dán nội dung có định dạng → chuyển HTML clipboard sang Markdown, giữ bảng/list/
  // heading/đậm và code (trong khối ```), thay vì để textarea san phẳng thành chữ thô.
  const handleAiContentPaste = (
    event: React.ClipboardEvent<HTMLTextAreaElement>
  ) => {
    const html = event.clipboardData.getData("text/html");
    if (!html || !RICH_PASTE_HTML.test(html)) {
      return; // không có cấu trúc → để trình duyệt dán text thuần như bình thường
    }

    event.preventDefault();
    const textarea = event.currentTarget;
    const plain = event.clipboardData.getData("text/plain");
    const start = textarea.selectionStart ?? aiContent.length;
    const end = textarea.selectionEnd ?? aiContent.length;

    const insert = (text: string) => {
      if (!text) return;
      const next = aiContent.slice(0, start) + text + aiContent.slice(end);
      setAiContent(next);
      const caret = start + text.length;
      // Đặt lại con trỏ sau đoạn vừa chèn (sau khi React cập nhật value).
      window.setTimeout(() => {
        try {
          textarea.setSelectionRange(caret, caret);
        } catch {
          /* textarea có thể đã unmount */
        }
      }, 0);
    };

    // Lazy-load turndown chỉ khi thực sự cần (lần dán có định dạng đầu tiên).
    void import("@/lib/lessons/paste-to-markdown")
      .then(({ htmlToMarkdown }) => insert(htmlToMarkdown(html) || plain))
      .catch(() => insert(plain));
  };

  const handleAiGenerate = async () => {
    if (!aiContent.trim()) {
      toast.error("Vui lòng nhập nội dung để AI phân tích!");
      return;
    }

    // Cảnh báo các marker [SLIDE...] viết sai (vd "[Silde: ...]") sẽ bị gộp nhầm vào
    // slide trước. Cho giáo viên cơ hội quay lại sửa trước khi tốn lượt gọi AI.
    const suspectMarkers = findSuspectSlideMarkers(aiContent);
    if (suspectMarkers.length > 0) {
      const proceed = window.confirm(
        `Phát hiện ${suspectMarkers.length} dòng có thể là marker [SLIDE...] viết sai và sẽ KHÔNG được tách đúng (nội dung bị gộp vào slide trước):\n\n${suspectMarkers.join(
          "\n"
        )}\n\nBấm Hủy để quay lại sửa, hoặc OK để vẫn tiếp tục.`
      );
      if (!proceed) return;
    }

    const defaultSectionTitles = ["Khái niệm", "Ví dụ minh họa", "Thực hành"];
    const hasExistingContent =
      initialLesson ||
      exercises.length > 0 ||
      sections.some(
        (s, i) =>
          s.title !== (defaultSectionTitles[i] ?? "Tab mới") ||
          s.content.trim().length > 50
      );

    if (hasExistingContent) {
      const confirmed = window.confirm(
        "AI sẽ thay toàn bộ nội dung hiện tại (sections, bài tập, tiêu đề). Tiếp tục?"
      );
      if (!confirmed) return;
    }

    // Chụp lại bản hiện tại để giáo viên hoàn tác nếu kết quả AI không ưng ý.
    snapshotLesson();

    // Controller cấp component: bấm sinh lại sẽ huỷ lượt cũ; unmount cũng huỷ.
    const controller = beginGeneration();

    // Auto-detect the [SLIDE...] template and take the lossless hybrid path.
    // If the markers yield nothing usable, fall through to the whole-doc AI path.
    if (hasSlideTemplateMarkers(aiContent)) {
      const handled = await generateFromTemplate(controller.signal);
      if (handled) return;
    }

    setIsGenerating(true);
    const { signal, cleanup } = linkedTimeoutSignal(
      controller.signal,
      AI_CLIENT_TIMEOUT_MS
    );
    try {
      const res = await fetch("/api/admin/lessons/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: aiContent,
          provider: aiProvider,
          model: aiModel,
          context: { audience: aiAudience, style: aiStyle },
        }),
        signal,
      });
      cleanup();

      // Lượt này đã bị thay bởi lượt mới / unmount → bỏ qua, không ghi đè state.
      if (controller.signal.aborted) {
        return;
      }

      if (!res.ok) {
        throw new Error(await readAiErrorMessage(res));
      }

      // Server đã chạy normalizeLessonDraft — dùng thẳng, không chuẩn hóa lại
      const generatedData = (await res.json()) as LessonDraft & {
        meta?: { provider: string; model: string };
      };
      const generatedAt = Date.now();
      const nextFormData = {
        ...formData,
        title: generatedData.title || formData.title,
        duration: generatedData.duration || (initialLesson ? formData.duration : 120),
        difficulty:
          generatedData.difficulty || (initialLesson ? formData.difficulty : "beginner"),
        objectives: {
          knowledge:
            generatedData.objectives.knowledge ||
            (initialLesson ? formData.objectives.knowledge : ""),
          skills:
            generatedData.objectives.skills ||
            (initialLesson ? formData.objectives.skills : ""),
          attitude:
            generatedData.objectives.attitude ||
            (initialLesson ? formData.objectives.attitude : ""),
        },
      };
      let generatedSectionsForReview = sections;
      let generatedExercisesForReview = exercises;

      if (generatedData.meta) {
        setAiMeta(generatedData.meta);
      }

      // Update Form Data — dùng trực tiếp giá trị đã chuẩn hóa từ server
      setFormData((prev) => ({
        ...prev,
        title: nextFormData.title,
        duration: nextFormData.duration,
        difficulty: nextFormData.difficulty,
        objectives: nextFormData.objectives,
      }));

      // Update Sections — server đã chuẩn hóa, chỉ cần gán id + derive content từ contentBlocks
      if (generatedData.sections.length > 0) {
        const newSections = generatedData.sections.map((sec, idx) => {
          const contentBlocks = Array.isArray(sec.contentBlocks)
            ? (sec.contentBlocks as LessonContentBlock[])
            : null;
          return {
            id: `${initialLesson ? "ai-sec" : "sec-ai"}-${generatedAt}-${idx}`,
            title: sec.title,
            content: contentBlocks?.length
              ? lessonContentBlocksToHtml(contentBlocks)
              : sec.content,
            contentFormat: contentBlocks?.length ? "canvas" : sec.contentFormat || "html",
            contentBlocks,
          };
        });
        generatedSectionsForReview = newSections;
        setSections(newSections);
        setActiveSection(newSections[0]?.id || null);
      }

      // Update Exercises — server đã chuẩn hóa difficulty/points/answerVisible, chỉ cần gán id
      if (generatedData.exercises.length > 0) {
        const newExercises = generatedData.exercises.map((ex, idx) => ({
          id: `${initialLesson ? "ai-ex" : "ex-ai"}-${generatedAt}-${idx}`,
          type: ex.type,
          title: ex.title,
          question: ex.question,
          answer: ex.answer,
          difficulty: ex.difficulty,
          points: ex.points,
          answerVisible: ex.answerVisible,
        }));
        generatedExercisesForReview = newExercises;
        setExercises(newExercises);
      }

      void runLessonReview(
        buildLessonPayload({
          form: nextFormData,
          sections: generatedSectionsForReview,
          exercises: generatedExercisesForReview,
        }),
        { silent: true }
      );

      // Chuyển về tab manual để user review
      setCreationMode("manual");
      setAiDraftReady(true);
      if (initialLesson) {
        toast.success("AI đã xử lý xong! Hãy kiểm tra lại cấu trúc trước khi lưu.");
      }

    } catch (error) {
      cleanup();
      // Parent controller abort = giáo viên bấm sinh lại hoặc rời trang → im lặng.
      if (controller.signal.aborted) {
        return;
      }
      const isTimeout =
        error instanceof Error &&
        (error.name === "AbortError" || error.message.includes("abort"));
      toast.error(
        isTimeout
          ? "AI phản hồi quá lâu (quá 60 giây cho phép). Hãy rút ngắn nội dung hoặc chọn provider nhanh hơn."
          : (error instanceof Error ? error.message : "Đã xảy ra lỗi khi tạo bằng AI."),
        { duration: 6000 }
      );
      console.warn("AI generation request failed:", error);
    } finally {
      // Chỉ tắt cờ nếu lượt này vẫn là lượt hiện hành — tránh ghi đè trạng thái của
      // một lượt sinh mới đã thay thế controller.
      if (generationAbortRef.current === controller) {
        setIsGenerating(false);
      }
    }
  };

  // Save lesson
  const handleSave = async () => {
    if (!formData.chapterId) {
      toast.error("Vui lòng chọn chương học!");
      return;
    }
    if (!formData.title.trim()) {
      toast.error("Vui lòng nhập tên bài giảng!");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(
        initialLesson ? `/api/admin/lessons/${initialLesson.id}` : "/api/admin/lessons",
        {
          method: initialLesson ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildLessonPayload()),
        }
      );

      if (res.ok) {
        router.push("/admin/lessons");
      } else {
        const data = await res.json();
        toast.error(
          data.error ||
            (initialLesson ? "Lỗi khi cập nhật bài giảng!" : "Lỗi khi tạo bài giảng!")
        );
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Đã xảy ra lỗi!");
    } finally {
      setSaving(false);
    }
  };

  const practiceExercises = exercises.filter((e) => e.type === "practice");
  const homeworkExercises = exercises.filter((e) => e.type === "homework");
  const headerTitle = initialLesson ? "✏️ Sửa Bài Giảng" : "📝 Tạo Bài Giảng Mới";
  const headerSubtitle = initialLesson
    ? formData.title || "Đang tải..."
    : "Điền thông tin để tạo bài giảng hoàn chỉnh";
  const saveLabel = initialLesson ? "Lưu thay đổi" : "Lưu bài giảng";
  const isAiGenerateDisabled = isGenerating || !aiModel.trim() || !aiContent.trim();
  const headerButtonAction =
    initialLesson && creationMode === "ai" ? handleAiGenerate : handleSave;
  const headerButtonDisabled =
    saving || Boolean(initialLesson && creationMode === "ai" && isAiGenerateDisabled);

  return (
    <div className="min-h-0">
      {/* Header */}
      <header className="sticky top-0 z-30 -mx-4 -mt-4 mb-6 border-b border-gray-200 bg-white shadow-sm sm:-mx-6 sm:-mt-6 lg:-mx-8 lg:-mt-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/admin/lessons" className="text-gray-600 hover:text-gray-900">
                <i className="fa-solid fa-arrow-left text-lg"></i>
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{headerTitle}</h1>
                <p className="text-sm text-gray-500">{headerSubtitle}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {initialLesson && lessonId ? (
                <Link href={`/lessons/${lessonId}`} target="_blank" className="btn btn-secondary">
                  <i className="fa-solid fa-eye"></i> Xem trước
                </Link>
              ) : null}
              <button
                onClick={headerButtonAction}
                disabled={headerButtonDisabled}
                className="btn btn-success"
              >
                {initialLesson && creationMode === "ai" ? (
                  isGenerating ? (
                    <><i className="fa-solid fa-spinner fa-spin"></i> Đang xử lý...</>
                  ) : (
                    <><i className="fa-solid fa-wand-magic-sparkles"></i> Sinh bài giảng</>
                  )
                ) : saving ? (
                  <><i className="fa-solid fa-spinner fa-spin"></i> Đang lưu...</>
                ) : (
                  <><i className="fa-solid fa-save"></i> {saveLabel}</>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        
        {/* Mode Selector Tabs */}
        <div className="flex p-1 bg-gray-200 rounded-lg w-max mx-auto mb-8">
          <button
            onClick={() => setCreationMode("manual")}
            className={`px-6 py-2.5 rounded-md font-medium text-sm transition-all ${
              creationMode === "manual"
                ? "bg-white text-indigo-600 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <i className="fa-solid fa-pen-nib mr-2"></i>
            Tạo thủ công / Xem trước
          </button>
          <button
            onClick={() => setCreationMode("ai")}
            className={`px-6 py-2.5 rounded-md font-medium text-sm transition-all flex items-center gap-2 ${
              creationMode === "ai"
                ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-200"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <i className="fa-solid fa-wand-magic-sparkles"></i>
            AI tạo bài giảng
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-purple-100 text-purple-700 font-bold uppercase tracking-wider">Mới</span>
          </button>
        </div>

        {creationMode === "ai" && (
          <div className="card p-8 border-none bg-gradient-to-br from-purple-50 via-white to-indigo-50 shadow-xl shadow-purple-100 animate-fade-in ring-1 ring-purple-100">
            <h2 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-3">
              <span className="w-10 h-10 bg-gradient-to-br from-purple-600 to-indigo-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-purple-200">
                <i className="fa-solid fa-wand-magic-sparkles"></i>
              </span>
              AI Trợ Lý Soạn Bài Giảng
            </h2>
            <p className="text-gray-500 mb-2">
              Hãy dán toàn bộ nội dung tài liệu, bản thảo hoặc sách vào đây. Bạn có thể chọn provider và model phù hợp, hệ thống AI sẽ tự động phân tích và tạo cấu trúc Tabs, trích xuất mục tiêu, và tạo sẵn bài tập dự thảo cho bạn.
            </p>
            <p className="mb-6 flex items-start gap-2 rounded-xl bg-indigo-50 px-3 py-2 text-sm text-indigo-700">
              <i className="fa-solid fa-bolt mt-0.5"></i>
              <span>
                Mẹo: nếu nội dung đã có mốc <strong>[SLIDE/TAB]</strong>, hệ thống tự
                tách đúng từng tab theo thứ tự bạn viết (giữ nguyên chữ &amp; code),
                rồi chỉ dùng AI để dựng slide cho từng tab — nhanh và không gộp nhầm.
              </span>
            </p>

            <div className="mb-6 grid gap-4 rounded-2xl border border-purple-100 bg-white/80 p-4 md:grid-cols-[1fr_1.4fr]">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Provider AI
                </label>
                <select
                  value={aiProvider}
                  onChange={(event) =>
                    handleAiProviderChange(event.target.value as LessonAiProvider)
                  }
                  className="input"
                >
                  {initialAiConfig.providers.map((provider) => (
                    <option
                      key={provider.value}
                      value={provider.value}
                      disabled={!provider.configured}
                    >
                      {provider.label}
                      {provider.configured ? "" : " (chưa cấu hình key)"}
                    </option>
                  ))}
                </select>
                {selectedAiProvider ? (
                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    {selectedAiProvider.description}
                  </p>
                ) : null}
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Model
                </label>
                <input
                  type="text"
                  value={aiModel}
                  onChange={(event) => setAiModel(event.target.value)}
                  className="input"
                  placeholder={selectedAiProvider?.defaultModel || "Nhập tên model"}
                />
                <p className="mt-2 text-xs leading-5 text-slate-500">
                  Gợi ý: {selectedAiProvider?.defaultModel || "Nhập model bạn muốn dùng"}.
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Bạn có thể nhập "ChatGPT", "GPT-5" hoặc "Gemini", hệ thống
                  sẽ tự map sang provider phù hợp nếu đã có API key.
                </p>
              </div>
            </div>

            <div className="mb-4 rounded-lg border border-purple-100 bg-purple-50/40 p-3">
              <p className="mb-2 text-xs font-semibold text-purple-700">
                <i className="fa-solid fa-sliders mr-1.5"></i>
                Ngữ cảnh cho AI (tuỳ chọn — để trống nếu muốn AI tự quyết)
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <span className="w-20 text-xs font-medium text-gray-500">Đối tượng:</span>
                {(
                  [
                    ["grade6_7", "Lớp 6-7 (dễ hiểu, ẩn dụ)"],
                    ["grade8_9", "Lớp 8-9 (thực tế, học thuật)"],
                  ] as [LessonAudience, string][]
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() =>
                      setAiAudience((current) => (current === value ? undefined : value))
                    }
                    className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                      aiAudience === value
                        ? "bg-purple-600 text-white"
                        : "border border-gray-200 bg-white text-gray-600 hover:border-purple-300"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="w-20 text-xs font-medium text-gray-500">Phong cách:</span>
                {(
                  [
                    ["gamified", "Game hóa"],
                    ["project", "Học qua dự án"],
                    ["concise", "Cơ bản, ngắn gọn"],
                  ] as [LessonTeachingStyle, string][]
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() =>
                      setAiStyle((current) => (current === value ? undefined : value))
                    }
                    className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                      aiStyle === value
                        ? "bg-purple-600 text-white"
                        : "border border-gray-200 bg-white text-gray-600 hover:border-purple-300"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-6 overflow-hidden rounded-lg border border-gray-300 bg-white">
              <textarea
                value={aiContent}
                onChange={(event) => setAiContent(event.target.value)}
                onPaste={handleAiContentPaste}
                className="min-h-[420px] w-full resize-y border-0 p-4 text-sm leading-6 text-slate-800 outline-none focus:ring-2 focus:ring-purple-300"
                placeholder="Dán nội dung sách, giáo án, ghi chú, HTML hoặc code mẫu vào đây. Bảng/danh sách/tiêu đề khi dán sẽ tự chuyển thành Markdown để giữ cấu trúc (dùng Ctrl+Shift+V nếu muốn dán text thô). AI sẽ chuyển thành các tab và teaching canvas để bạn kiểm tra trước khi lưu."
              />
              <div className={`flex items-center justify-end gap-2 border-t px-3 py-1.5 text-xs ${
                aiContent.length > 50_000
                  ? "border-amber-200 bg-amber-50 text-amber-700"
                  : "border-gray-100 text-gray-400"
              }`}>
                {aiContent.length > 50_000 && (
                  <span className="font-medium">
                    <i className="fa-solid fa-triangle-exclamation mr-1"></i>
                    Nội dung dài — có thể vượt giới hạn model, cân nhắc tách nhỏ.
                  </span>
                )}
                <span>{aiContent.length.toLocaleString("vi-VN")} ký tự</span>
              </div>
            </div>

            <div className="bg-purple-50 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="text-sm text-purple-800">
                <i className="fa-solid fa-circle-info mr-2"></i>
                Sau khi phân tích, hệ thống sẽ tự động chuyển về chế độ{" "}
                <strong>Tạo thủ công</strong> để bạn xem trước và chỉnh sửa kết quả.{" "}
                {initialLesson ? (
                  <>
                    Bài giảng sẽ chỉ được cập nhật khi bạn bấm{" "}
                    <strong>"Lưu thay đổi"</strong>.
                  </>
                ) : (
                  <>
                    Bài giảng chưa được lưu cho đến khi bạn bấm{" "}
                    <strong>"Lưu bài giảng"</strong>.
                  </>
                )}
              </div>
              <button
                onClick={handleAiGenerate}
                disabled={isAiGenerateDisabled}
                className="btn btn-primary whitespace-nowrap bg-gradient-to-r from-purple-600 to-indigo-600 border-none shadow-md hover:shadow-lg disabled:opacity-70"
              >
                {isGenerating ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin mr-2"></i>
                    {aiProgress
                      ? ` Đang dựng slide (${aiProgress.done}/${aiProgress.total})...`
                      : " Đang phân tích..."}
                  </>
                ) : (
                  <><i className="fa-solid fa-wand-magic-sparkles mr-2"></i> Tự động điền</>
                )}
              </button>
            </div>
          </div>
        )}

        {/* CÁC PHẦN DƯỚI ĐÂY LÀ CHẾ ĐỘ THỦ CÔNG */}
        <div className={creationMode !== "manual" ? "hidden" : "space-y-6 animate-fade-in"}>
        {aiDraftReady && (
          <div className="rounded-2xl border border-purple-200 bg-purple-50 p-4 text-sm text-purple-900 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-purple-600 text-white">
                  <i className="fa-solid fa-wand-magic-sparkles"></i>
                </span>
                <div>
                  <div className="font-bold">AI đã tạo bản nháp canvas.</div>
                  {aiMeta && (
                    <p className="mt-0.5 text-xs font-medium text-purple-600">
                      {aiMeta.provider} · {aiMeta.model}
                    </p>
                  )}
                  <p className="mt-1 leading-6">
                    Hãy kiểm tra từng tab, từng canvas, reveal steps, code/ảnh và bài tập trước khi lưu.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAiDraftReady(false)}
                className="rounded-lg bg-white px-3 py-2 text-xs font-bold text-purple-700 hover:bg-purple-100"
              >
                Đã hiểu
              </button>
            </div>
          </div>
        )}

        <LessonReviewPanel
          report={lessonReview}
          isReviewing={isReviewing}
          isRepairing={isRepairing}
          isAutoFixing={isAutoFixing}
          autoFixProgress={autoFixProgress}
          repairSummary={repairSummary}
          onReview={() => void runLessonReview()}
          onRepair={() => void runLessonRepair()}
          onAutoFix={() => void runAutoFixLoop()}
          onCancelAutoFix={cancelAutoFix}
        />

        {/* Banner hoàn tác: hiện khi đã có bản chụp trước lần AI chỉnh sửa gần nhất */}
        {lessonBackup && !editingLocked && (
          <div className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 shadow-sm md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white">
                <i className="fa-solid fa-clock-rotate-left"></i>
              </span>
              <p className="leading-6">
                Có một bản trước lần AI chỉnh sửa gần nhất. Nếu kết quả không ưng ý,
                bạn có thể khôi phục lại công sức đã soạn.
              </p>
            </div>
            <button
              type="button"
              onClick={restoreLessonBackup}
              className="shrink-0 rounded-lg bg-amber-500 px-3 py-2 text-xs font-bold text-white hover:bg-amber-600"
            >
              <i className="fa-solid fa-rotate-left mr-1.5"></i> Khôi phục bản trước
            </button>
          </div>
        )}

        {/* Vùng soạn thảo — khoá bằng overlay khi AI đang sửa/tự sửa để không bị ghi đè */}
        <div className="relative">
          {editingLocked && (
            <div
              className="absolute inset-0 z-20 flex items-start justify-center rounded-2xl bg-white/60 backdrop-blur-[1px] cursor-not-allowed"
              aria-hidden="true"
            >
              <div className="mt-6 flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-lg">
                <i className="fa-solid fa-lock"></i>
                {isAutoFixing
                  ? "AI đang tự sửa — vùng soạn thảo tạm khoá để tránh mất nội dung."
                  : "AI đang sửa bản nháp — vui lòng đợi trong giây lát."}
              </div>
            </div>
          )}

        {/* Section 1: Basic Info */}
        <div className="card p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center">
              <i className="fa-solid fa-info-circle"></i>
            </span>
            Thông tin cơ bản
          </h2>

          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Chương học <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.chapterId}
                onChange={(e) => setFormData({ ...formData, chapterId: e.target.value })}
                className="input"
              >
                <option value="">-- Chọn chương --</option>
                {chapters.map((chapter) => (
                  <option key={chapter.id} value={chapter.id}>
                    {chapter.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Độ khó</label>
              <select
                value={formData.difficulty}
                onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                className="input"
              >
                <option value="beginner">🟢 Cơ bản</option>
                <option value="intermediate">🟡 Trung bình</option>
                <option value="advanced">🔴 Nâng cao</option>
              </select>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tên bài giảng <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Ví dụ: List - Khái Niệm, Tạo và Truy Xuất"
              className="input text-lg font-medium"
            />
          </div>

          <div className="flex flex-wrap gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Thời lượng (phút)</label>
              <input
                type="number"
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: Number(e.target.value) })}
                min={15}
                className="input w-32"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Giao diện (theme cả bài)
              </label>
              <select
                value={formData.theme}
                onChange={(e) => setFormData({ ...formData, theme: e.target.value })}
                className="input"
              >
                <option value="default">⚪ Mặc định</option>
                <option value="ocean">🌊 Ocean (xanh biển)</option>
                <option value="sunset">🌇 Sunset (cam ấm)</option>
                <option value="forest">🌲 Forest (xanh lá)</option>
                <option value="grape">🍇 Grape (tím)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: Learning Objectives */}
        <div className="card p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
              <i className="fa-solid fa-bullseye"></i>
            </span>
            Mục tiêu bài giảng
          </h2>
          
          <p className="text-sm text-gray-500 mb-4">
            Định nghĩa những gì học sinh sẽ đạt được sau bài học này. Thông tin sẽ hiển thị ở trang Trang Chủ của bài giảng.
          </p>

          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <i className="fa-solid fa-brain text-blue-500 mr-1"></i>
                Kiến thức
              </label>
              <textarea
                value={formData.objectives.knowledge}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  objectives: { ...formData.objectives, knowledge: e.target.value } 
                })}
                placeholder="Ví dụ: Hiểu khái niệm List trong Python, biết các cách tạo và truy xuất List..."
                className="input min-h-[100px] text-sm"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <i className="fa-solid fa-hands text-green-500 mr-1"></i>
                Kỹ năng
              </label>
              <textarea
                value={formData.objectives.skills}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  objectives: { ...formData.objectives, skills: e.target.value } 
                })}
                placeholder="Ví dụ: Viết code tạo và thao tác với List, sử dụng slicing và index..."
                className="input min-h-[100px] text-sm"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <i className="fa-solid fa-heart text-red-500 mr-1"></i>
                Thái độ
              </label>
              <textarea
                value={formData.objectives.attitude}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  objectives: { ...formData.objectives, attitude: e.target.value } 
                })}
                placeholder="Ví dụ: Tự tin sử dụng List trong các bài toán thực tế, hứng thú tìm hiểu thêm..."
                className="input min-h-[100px] text-sm"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Content Tabs — 3-column canvas layout */}
        <div className="card overflow-hidden p-0">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 bg-white">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <span className="w-8 h-8 bg-green-100 text-green-600 rounded-lg flex items-center justify-center shrink-0">
                <i className="fa-solid fa-layer-group"></i>
              </span>
              Nội dung bài giảng
            </h2>
            <button onClick={addSection} className="btn btn-secondary text-sm">
              <i className="fa-solid fa-plus"></i> Thêm tab
            </button>
          </div>

          <div className="flex min-h-[640px]">
            {/* Cột trái: danh sách tab/section */}
            <nav className="w-52 shrink-0 border-r border-gray-200 bg-slate-50 flex flex-col overflow-y-auto">
              {sections.map((section, index) => (
                <div
                  key={section.id}
                  className={`group relative cursor-pointer border-b border-gray-100 transition-colors ${
                    activeSection === section.id ? "bg-white" : "hover:bg-gray-100/60"
                  }`}
                  onClick={() => setActiveSection(section.id)}
                >
                  {activeSection === section.id && (
                    <span className="absolute left-0 top-0 bottom-0 w-[3px] rounded-r bg-indigo-500" />
                  )}
                  <div className="flex items-center gap-2 px-3 py-2.5 pl-4">
                    <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-black ${
                      activeSection === section.id
                        ? "bg-indigo-500 text-white"
                        : "bg-slate-200 text-slate-500"
                    }`}>
                      {index + 1}
                    </span>
                    <input
                      type="text"
                      value={section.title}
                      onChange={(e) => updateSection(section.id, "title", e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      placeholder="Tên tab"
                      className={`flex-1 min-w-0 bg-transparent border-none p-0 focus:outline-none focus:ring-0 text-sm ${
                        activeSection === section.id
                          ? "font-semibold text-indigo-700"
                          : "font-medium text-gray-600"
                      }`}
                    />
                    <div className="flex shrink-0 items-center gap-0 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        onClick={(e) => { e.stopPropagation(); moveSection(section.id, "up"); }}
                        disabled={index === 0}
                        className="flex h-6 w-6 items-center justify-center rounded text-gray-400 hover:bg-white hover:text-gray-700 disabled:opacity-20"
                      >
                        <i className="fa-solid fa-chevron-up" style={{ fontSize: "9px" }}></i>
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); moveSection(section.id, "down"); }}
                        disabled={index === sections.length - 1}
                        className="flex h-6 w-6 items-center justify-center rounded text-gray-400 hover:bg-white hover:text-gray-700 disabled:opacity-20"
                      >
                        <i className="fa-solid fa-chevron-down" style={{ fontSize: "9px" }}></i>
                      </button>
                      {sections.length > 1 && (
                        <button
                          onClick={(e) => { e.stopPropagation(); removeSection(section.id); }}
                          className="flex h-6 w-6 items-center justify-center rounded text-red-400 hover:bg-red-50 hover:text-red-600"
                        >
                          <i className="fa-solid fa-trash" style={{ fontSize: "9px" }}></i>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <button
                onClick={addSection}
                className="mt-auto flex items-center gap-2 border-t border-gray-200 px-4 py-3 text-xs font-semibold text-indigo-600 transition-colors hover:bg-indigo-50"
              >
                <i className="fa-solid fa-plus text-[10px]"></i>
                Thêm tab
              </button>
            </nav>

            {/* Cột phải: canvas editor cho tab đang chọn */}
            <div className="flex-1 min-w-0 p-4 bg-white">
              {activeSection ? (
                sections
                  .filter((s) => s.id === activeSection)
                  .map((section) => (
                    <LessonSectionEditor
                      key={section.id}
                      section={section}
                      lessonId={lessonId}
                      draftId={draftId}
                      onOpenTemplate={() => openTemplateModal(section.id)}
                      onChange={updateSectionDraft}
                    />
                  ))
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 py-16">
                  <i className="fa-solid fa-layer-group text-4xl mb-3 text-gray-300"></i>
                  <p className="text-sm">Chọn một tab ở cột trái để chỉnh sửa</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Section 3: Exercises */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <span className="w-8 h-8 bg-orange-100 text-orange-600 rounded-lg flex items-center justify-center">
                <i className="fa-solid fa-dumbbell"></i>
              </span>
              Bài tập
            </h2>
            <div className="flex gap-2">
              <button onClick={() => addExercise("practice")} className="btn btn-secondary text-sm">
                <i className="fa-solid fa-plus"></i> Luyện tập
              </button>
              <button onClick={() => addExercise("homework")} className="btn btn-secondary text-sm">
                <i className="fa-solid fa-plus"></i> BTVN
              </button>
            </div>
          </div>

          {exercises.length === 0 ? (
            <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
              <i className="fa-solid fa-clipboard-list text-4xl mb-3"></i>
              <p>Chưa có bài tập nào</p>
              <p className="text-sm">Nhấn nút "Luyện tập" hoặc "BTVN" để thêm</p>
            </div>
          ) : (
            <div className="space-y-4">
              {practiceExercises.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-orange-600 uppercase tracking-wide mb-3">
                    <i className="fa-solid fa-dumbbell mr-2"></i>
                    Bài Luyện Tập ({practiceExercises.length})
                  </h3>
                  <div className="space-y-3">
                    {practiceExercises.map((exercise, index) => (
                      <ExerciseEditor key={exercise.id} exercise={exercise} index={index} onUpdate={updateExercise} onRemove={removeExercise} />
                    ))}
                  </div>
                </div>
              )}

              {homeworkExercises.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm font-semibold text-purple-600 uppercase tracking-wide mb-3">
                    <i className="fa-solid fa-house-laptop mr-2"></i>
                    Bài Tập Về Nhà ({homeworkExercises.length})
                  </h3>
                  <div className="space-y-3">
                    {homeworkExercises.map((exercise, index) => (
                      <ExerciseEditor key={exercise.id} exercise={exercise} index={index} onUpdate={updateExercise} onRemove={removeExercise} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        </div>
        {/* End vùng soạn thảo có thể khoá */}

        {/* Actions */}
        <div className="flex items-center justify-between py-4">
          <Link href="/admin/lessons" className="btn btn-secondary">
            <i className="fa-solid fa-times"></i> Hủy bỏ
          </Link>
          <button onClick={handleSave} disabled={saving} className="btn btn-success btn-lg">
            {saving ? (
              <><i className="fa-solid fa-spinner fa-spin"></i> Đang lưu...</>
            ) : (
              <><i className="fa-solid fa-save"></i> {saveLabel}</>
            )}
          </button>
        </div>
        
        </div>
        {/* End of manual wrapper */}

      </main>

      {/* Template Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  <i className="fa-solid fa-wand-magic-sparkles mr-2 text-indigo-600"></i>
                  Chọn Template
                </h2>
                <p className="text-sm text-gray-500 mt-1">Chọn mẫu để chèn vào nội dung bài giảng</p>
              </div>
              <button
                onClick={() => setShowTemplateModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <i className="fa-solid fa-times text-xl"></i>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-100px)]">
              <div className="grid md:grid-cols-2 gap-4">
                {CONTENT_TEMPLATES.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => insertTemplate(template)}
                    className="text-left p-4 border border-gray-200 rounded-xl hover:border-indigo-500 hover:shadow-md transition-all group"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                        <i className={`fa-solid ${template.icon}`}></i>
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{template.name}</h3>
                        <p className="text-sm text-gray-500">{template.description}</p>
                      </div>
                    </div>
                    <div className="mt-3 p-2 bg-gray-50 rounded-lg text-xs font-mono text-gray-600 max-h-20 overflow-hidden">
                      {template.code.substring(0, 150)}...
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function reviewStatusMeta(status: LessonReviewReport["status"]) {
  if (status === "fail") {
    return {
      label: "Cần sửa",
      icon: "fa-triangle-exclamation",
      card: "border-red-200 bg-red-50 text-red-900",
      badge: "bg-red-600 text-white",
      score: "text-red-700",
    };
  }

  if (status === "warning") {
    return {
      label: "Nên xem lại",
      icon: "fa-circle-exclamation",
      card: "border-amber-200 bg-amber-50 text-amber-900",
      badge: "bg-amber-500 text-white",
      score: "text-amber-700",
    };
  }

  return {
    label: "Đạt",
    icon: "fa-circle-check",
    card: "border-emerald-200 bg-emerald-50 text-emerald-900",
    badge: "bg-emerald-600 text-white",
    score: "text-emerald-700",
  };
}

function reviewSeverityMeta(
  severity: LessonReviewReport["issues"][number]["severity"],
  source?: LessonReviewReport["issues"][number]["source"]
) {
  // AI issues are advisory — they never change the score, so don't dress them as
  // a red "Lỗi"/amber "Cảnh báo" (that reads as a gating failure next to 100/100).
  if (source === "ai") {
    return {
      label: "Gợi ý AI",
      icon: "fa-wand-magic-sparkles",
      badge: "bg-violet-100 text-violet-700",
      border: "border-violet-200",
    };
  }

  if (severity === "critical") {
    return {
      label: "Lỗi",
      icon: "fa-circle-xmark",
      badge: "bg-red-100 text-red-700",
      border: "border-red-200",
    };
  }

  if (severity === "warning") {
    return {
      label: "Cảnh báo",
      icon: "fa-triangle-exclamation",
      badge: "bg-amber-100 text-amber-700",
      border: "border-amber-200",
    };
  }

  return {
    label: "Gợi ý",
    icon: "fa-lightbulb",
    badge: "bg-sky-100 text-sky-700",
    border: "border-sky-200",
  };
}

type AutoFixProgress = { round: number; maxRounds: number; note: string } | null;

function AutoFixControls({
  isAutoFixing,
  autoFixProgress,
  disabled,
  compact,
  onAutoFix,
  onCancelAutoFix,
}: {
  isAutoFixing: boolean;
  autoFixProgress: AutoFixProgress;
  disabled: boolean;
  compact?: boolean;
  onAutoFix: () => void;
  onCancelAutoFix: () => void;
}) {
  if (isAutoFixing) {
    const label =
      autoFixProgress && autoFixProgress.round > 0
        ? `Vòng ${autoFixProgress.round}/${autoFixProgress.maxRounds} — ${autoFixProgress.note}`
        : autoFixProgress?.note ?? "Đang tự sửa...";

    return (
      <div className="flex items-center gap-2 rounded-xl bg-white/85 px-3 py-2 text-sm font-semibold text-slate-700 ring-1 ring-black/5">
        <i className="fa-solid fa-spinner fa-spin text-indigo-600"></i>
        <span className="max-w-[20rem] truncate">{label}</span>
        <button
          type="button"
          onClick={onCancelAutoFix}
          className="ml-1 rounded-lg bg-slate-900 px-2.5 py-1 text-xs font-bold text-white hover:bg-slate-800"
        >
          Dừng
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onAutoFix}
      disabled={disabled}
      className={
        compact
          ? "rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-70"
          : "btn btn-primary whitespace-nowrap"
      }
    >
      <i className="fa-solid fa-wand-magic-sparkles mr-2"></i>
      Tự động sửa (≤{MAX_AUTO_FIX_ROUNDS} vòng)
    </button>
  );
}

function LessonFloorChecklist({
  floor,
}: {
  floor: LessonReviewReport["floor"];
}) {
  if (!floor || floor.items.length === 0) return null;

  return (
    <div className="mt-3 rounded-xl bg-white/85 p-3 ring-1 ring-black/5">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-black uppercase tracking-wide ${
            floor.meets
              ? "bg-emerald-100 text-emerald-700"
              : "bg-rose-100 text-rose-700"
          }`}
        >
          <i className="fa-solid fa-shield-halved"></i>
          {floor.meets ? "Đạt sàn chất lượng" : "Chưa đạt sàn"}
        </span>
        <span className="text-[11px] font-semibold text-slate-500">
          Mọi bài phải đạt các mục dưới đây
        </span>
      </div>
      <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        {floor.items.map((item) => (
          <li
            key={item.key}
            className="flex items-start gap-2 text-sm"
            title={item.ok ? undefined : item.hint}
          >
            <i
              className={`fa-solid mt-0.5 ${
                item.ok ? "fa-circle-check text-emerald-500" : "fa-circle-xmark text-rose-500"
              }`}
            ></i>
            <span className={item.ok ? "text-slate-600" : "font-semibold text-slate-800"}>
              {item.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function LessonReviewDimensionCard({
  dimension,
}: {
  dimension: LessonReviewReport["dimensions"][number];
}) {
  const tone =
    dimension.status === "good"
      ? { bar: "bg-emerald-500", text: "text-emerald-700", ring: "ring-emerald-200" }
      : dimension.status === "needs-work"
        ? { bar: "bg-amber-500", text: "text-amber-700", ring: "ring-amber-200" }
        : { bar: "bg-rose-500", text: "text-rose-700", ring: "ring-rose-200" };

  return (
    <div className={`rounded-xl bg-white/85 p-2.5 ring-1 ${tone.ring}`} title={`${dimension.critical} critical · ${dimension.warnings} cảnh báo · ${dimension.suggestions} gợi ý`}>
      <div className="flex items-center justify-between gap-1">
        <span className="truncate text-xs font-semibold text-slate-700">
          {dimension.label}
        </span>
        <span className={`shrink-0 text-xs font-black ${tone.text}`}>
          {dimension.score}
        </span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-200">
        <div className={`h-full ${tone.bar}`} style={{ width: `${dimension.score}%` }} />
      </div>
    </div>
  );
}

function LessonReviewPanel({
  report,
  isReviewing,
  isRepairing,
  isAutoFixing,
  autoFixProgress,
  repairSummary,
  onReview,
  onRepair,
  onAutoFix,
  onCancelAutoFix,
}: {
  report: LessonReviewResponse | null;
  isReviewing: boolean;
  isRepairing: boolean;
  isAutoFixing: boolean;
  autoFixProgress: AutoFixProgress;
  repairSummary: string[];
  onReview: () => void;
  onRepair: () => void;
  onAutoFix: () => void;
  onCancelAutoFix: () => void;
}) {
  if (!report) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white">
              <i className="fa-solid fa-clipboard-check"></i>
            </span>
            <div>
              <div className="font-bold text-slate-900">Agent duyệt bài giảng</div>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Chạy một lượt kiểm tra nội dung, canvas, mục tiêu và bài tập trước khi lưu.
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={onReview}
              disabled={isReviewing || isAutoFixing}
              className="btn btn-secondary whitespace-nowrap"
            >
              {isReviewing ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin"></i> Đang duyệt...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-magnifying-glass-chart"></i> Duyệt bài
                </>
              )}
            </button>
            <AutoFixControls
              isAutoFixing={isAutoFixing}
              autoFixProgress={autoFixProgress}
              disabled={isReviewing || isRepairing || isAutoFixing}
              onAutoFix={onAutoFix}
              onCancelAutoFix={onCancelAutoFix}
            />
          </div>
        </div>
      </div>
    );
  }

  const meta = reviewStatusMeta(report.status);
  const bySeverity = (a: LessonReviewResponse["issues"][number], b: LessonReviewResponse["issues"][number]) => {
    const order = { critical: 0, warning: 1, suggestion: 2 };
    return order[a.severity] - order[b.severity];
  };
  // Lỗi cấu trúc (deterministic) tính điểm; gợi ý AI chỉ tham khảo.
  const gatingIssues = report.issues.filter((issue) => issue.source !== "ai").sort(bySeverity);
  const advisoryIssues = report.issues.filter((issue) => issue.source === "ai").sort(bySeverity);

  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${meta.card}`}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide ${meta.badge}`}>
              <i className={`fa-solid ${meta.icon}`}></i>
              {meta.label}
            </span>
            <span className={`text-2xl font-black ${meta.score}`}>{report.score}/100</span>
            {report.meta && (
              <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-semibold text-slate-600">
                {report.meta.provider} · {report.meta.model}
              </span>
            )}
          </div>
          <div className="mt-2 font-bold">Báo cáo duyệt bài</div>
          <p className="mt-1 text-sm leading-6">{report.summary}</p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
            <span className="rounded-full bg-white/70 px-3 py-1">{report.stats.sections} tab</span>
            <span className="rounded-full bg-white/70 px-3 py-1">{report.stats.canvases} canvas</span>
            <span className="rounded-full bg-white/70 px-3 py-1">{report.stats.exercises} bài tập</span>
            <span className="rounded-full bg-white/70 px-3 py-1">{report.stats.critical} lỗi</span>
            <span className="rounded-full bg-white/70 px-3 py-1">{report.stats.warnings} cảnh báo</span>
            {report.stats.advisories > 0 && (
              <span className="rounded-full bg-white/70 px-3 py-1">{report.stats.advisories} gợi ý AI</span>
            )}
          </div>

          <LessonFloorChecklist floor={report.floor} />

          {report.dimensions && report.dimensions.length > 0 && (
            <div className="mt-3">
              <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                Chất lượng soạn bài theo chiều (không phải điểm học sinh)
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                {report.dimensions.map((dimension) => (
                  <LessonReviewDimensionCard key={dimension.key} dimension={dimension} />
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <AutoFixControls
            isAutoFixing={isAutoFixing}
            autoFixProgress={autoFixProgress}
            disabled={isReviewing || isRepairing || isAutoFixing}
            compact
            onAutoFix={onAutoFix}
            onCancelAutoFix={onCancelAutoFix}
          />
          {report.issues.length > 0 && (
            <button
              type="button"
              onClick={onRepair}
              disabled={isRepairing || isReviewing || isAutoFixing}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-slate-800 disabled:opacity-70"
            >
              {isRepairing ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin mr-2"></i> Đang sửa
                </>
              ) : (
                <>
                  <i className="fa-solid fa-screwdriver-wrench mr-2"></i> AI sửa lỗi đề xuất
                </>
              )}
            </button>
          )}
          <button
            type="button"
            onClick={onReview}
            disabled={isReviewing || isRepairing || isAutoFixing}
            className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-slate-800 shadow-sm ring-1 ring-black/5 hover:bg-slate-50 disabled:opacity-70"
          >
            {isReviewing ? (
              <>
                <i className="fa-solid fa-spinner fa-spin mr-2"></i> Đang duyệt
              </>
            ) : (
              <>
                <i className="fa-solid fa-rotate-right mr-2"></i> Duyệt lại
              </>
            )}
          </button>
        </div>
      </div>

      {repairSummary.length > 0 && (
        <div className="mt-4 rounded-xl border border-slate-200 bg-white/85 p-3 text-sm text-slate-700">
          <div className="mb-2 font-bold text-slate-900">AI vừa sửa</div>
          <ul className="list-disc space-y-1 pl-5">
            {repairSummary.map((item, index) => (
              <li key={`${item}-${index}`}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      {gatingIssues.length > 0 ? (
        <div className="mt-4">
          <div className="mb-2 text-xs font-black uppercase tracking-wide text-slate-500">
            Lỗi cấu trúc (ảnh hưởng điểm)
          </div>
          <div className="space-y-2">
            {gatingIssues.map((issue) => (
              <LessonReviewIssueCard key={issue.id} issue={issue} />
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-white/85 p-3 text-sm font-semibold text-emerald-700">
          Không còn lỗi cấu trúc nào — bài đạt kiểm tra tự động.
        </div>
      )}

      {advisoryIssues.length > 0 && (
        <div className="mt-4">
          <div className="mb-2 text-xs font-black uppercase tracking-wide text-slate-500">
            Gợi ý sư phạm từ AI (không tính điểm)
          </div>
          <div className="space-y-2">
            {advisoryIssues.map((issue) => (
              <LessonReviewIssueCard key={issue.id} issue={issue} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function LessonReviewIssueCard({
  issue,
}: {
  issue: LessonReviewResponse["issues"][number];
}) {
  const severity = reviewSeverityMeta(issue.severity, issue.source);
  return (
    <div
      className={`rounded-xl border bg-white/85 p-3 text-slate-800 shadow-sm ${severity.border}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-black uppercase tracking-wide ${severity.badge}`}>
          <i className={`fa-solid ${severity.icon}`}></i>
          {severity.label}
        </span>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-500">
          {issue.target}
        </span>
        <span className="text-sm font-bold text-slate-900">{issue.title}</span>
      </div>
      <p className="mt-2 text-sm leading-6 text-slate-600">{issue.detail}</p>
      {issue.suggestion && (
        <p className="mt-1 text-sm leading-6 text-slate-700">
          <span className="font-bold">Gợi ý sửa:</span> {issue.suggestion}
        </p>
      )}
    </div>
  );
}

// Exercise Editor Component
function ExerciseEditor({
  exercise,
  index,
  onUpdate,
  onRemove,
}: {
  exercise: LessonEditorExercise;
  index: number;
  onUpdate: (id: string, field: string, value: string | number | boolean) => void;
  onRemove: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const isHomework = exercise.type === "homework";

  return (
    <div className={`rounded-lg border overflow-hidden ${isHomework ? "border-purple-200 bg-purple-50" : "border-orange-200 bg-orange-50"}`}>
      <div className="flex items-center justify-between p-3 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-3">
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${isHomework ? "bg-purple-200 text-purple-700" : "bg-orange-200 text-orange-700"}`}>
            {isHomework ? "BTVN" : "LT"} {index + 1}
          </span>
          <input
            type="text"
            value={exercise.title}
            onChange={(e) => { e.stopPropagation(); onUpdate(exercise.id, "title", e.target.value); }}
            onClick={(e) => e.stopPropagation()}
            className="font-medium bg-transparent border-none focus:outline-none"
            placeholder="Tên bài tập"
          />
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1 text-xs" onClick={(e) => e.stopPropagation()}>
            <input
              type="checkbox"
              checked={exercise.answerVisible}
              onChange={(e) => onUpdate(exercise.id, "answerVisible", e.target.checked)}
              className="w-4 h-4"
            />
            Hiện đáp án
          </label>
          <select
            value={exercise.difficulty}
            onChange={(e) => { e.stopPropagation(); onUpdate(exercise.id, "difficulty", e.target.value); }}
            onClick={(e) => e.stopPropagation()}
            className="text-xs py-1 px-2 rounded border border-gray-200 bg-white"
          >
            <option value="easy">🟢 Dễ</option>
            <option value="medium">🟡 TB</option>
            <option value="hard">🔴 Khó</option>
          </select>
          <div className="flex items-center gap-1">
            <input
              type="number"
              value={exercise.points}
              onChange={(e) => { e.stopPropagation(); onUpdate(exercise.id, "points", Number(e.target.value)); }}
              onClick={(e) => e.stopPropagation()}
              className="w-12 text-center text-sm py-1 px-1 rounded border border-gray-200 bg-white"
              min={1}
            />
            <span className="text-xs text-gray-500">đ</span>
          </div>
          <button onClick={(e) => { e.stopPropagation(); onRemove(exercise.id); }} className="text-red-400 hover:text-red-600">
            <i className="fa-solid fa-trash"></i>
          </button>
          <i className={`fa-solid fa-chevron-${expanded ? "up" : "down"} text-gray-400`}></i>
        </div>
      </div>

      {expanded && (
        <div className="p-4 border-t border-gray-200 bg-white space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Đề bài (HTML)</label>
            <textarea
              value={exercise.question}
              onChange={(e) => onUpdate(exercise.id, "question", e.target.value)}
              placeholder="<p>Viết đề bài ở đây...</p>"
              className="input min-h-[100px] font-mono text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Đáp án mẫu (giữ nguyên format xuống dòng)</label>
            <textarea
              value={exercise.answer}
              onChange={(e) => onUpdate(exercise.id, "answer", e.target.value)}
              placeholder={`# Code đáp án
my_list = [1, 2, 3]
print(my_list)`}
              className="input min-h-[100px] font-mono text-sm"
              style={{ whiteSpace: "pre" }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
