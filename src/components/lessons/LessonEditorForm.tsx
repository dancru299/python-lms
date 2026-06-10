"use client";

import { useState } from "react";
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
import type {
  LessonAiClientConfig,
  LessonAiProvider,
} from "@/lib/ai/provider-types";
import type { LessonDraft } from "@/lib/lessons/lesson-draft";
import {
  hasSlideTemplateMarkers,
  parseSlideTemplate,
  suggestLayouts,
} from "@/lib/lessons/slide-template";
import toast from "react-hot-toast";

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

interface Section extends EditableLessonSection {
  id: string;
  title: string;
  content: string;
  contentFormat?: string;
  contentBlocks?: LessonContentBlock[] | null;
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
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiProgress, setAiProgress] = useState<{ done: number; total: number } | null>(null);
  const [aiDraftReady, setAiDraftReady] = useState(false);
  const [aiMeta, setAiMeta] = useState<{ provider: string; model: string } | null>(null);
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
  const generateFromTemplate = async (): Promise<boolean> => {
    const parsed = parseSlideTemplate(aiContent);

    if (parsed.sections.length === 0 && parsed.exercises.length === 0) {
      return false;
    }

    setIsGenerating(true);
    setAiProgress({ done: 0, total: parsed.sections.length });
    const generatedAt = Date.now();
    let aiFailures = 0;
    let lastMeta: { provider: string; model: string } | null = null;

    try {
      // Lesson title + exercises are derived deterministically — no AI needed.
      setFormData((prev) => ({ ...prev, title: parsed.title || prev.title }));

      if (parsed.exercises.length > 0) {
        setExercises(
          parsed.exercises.map((ex, idx) => ({
            id: `${initialLesson ? "tpl-ex" : "ex-tpl"}-${generatedAt}-${idx}`,
            type: ex.type,
            title: ex.title,
            question: ex.question,
            answer: ex.answer,
            difficulty: ex.difficulty,
            points: ex.points,
            answerVisible: ex.answerVisible,
          }))
        );
      }

      const builtSections = await mapWithConcurrency(
        parsed.sections,
        3,
        async (tab, idx): Promise<Section> => {
          const id = `${initialLesson ? "tpl-sec" : "sec-tpl"}-${generatedAt}-${idx}`;
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 60_000);
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
                  provider: aiProvider,
                  model: aiModel,
                }),
                signal: controller.signal,
              });
            } finally {
              clearTimeout(timeoutId);
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

      if (builtSections.length > 0) {
        setSections(builtSections);
        setActiveSection(builtSections[0]?.id ?? null);
      }
      if (lastMeta) setAiMeta(lastMeta);

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
      setIsGenerating(false);
      setAiProgress(null);
    }
  };

  const handleAiGenerate = async () => {
    if (!aiContent.trim()) {
      toast.error("Vui lòng nhập nội dung để AI phân tích!");
      return;
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

    // Auto-detect the [SLIDE...] template and take the lossless hybrid path.
    // If the markers yield nothing usable, fall through to the whole-doc AI path.
    if (hasSlideTemplateMarkers(aiContent)) {
      const handled = await generateFromTemplate();
      if (handled) return;
    }

    setIsGenerating(true);
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), 90_000);
    try {
      const res = await fetch("/api/admin/lessons/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: aiContent,
          provider: aiProvider,
          model: aiModel,
        }),
        signal: abortController.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(await readAiErrorMessage(res));
      }

      // Server đã chạy normalizeLessonDraft — dùng thẳng, không chuẩn hóa lại
      const generatedData = (await res.json()) as LessonDraft & {
        meta?: { provider: string; model: string };
      };
      const generatedAt = Date.now();

      if (generatedData.meta) {
        setAiMeta(generatedData.meta);
      }

      // Update Form Data — dùng trực tiếp giá trị đã chuẩn hóa từ server
      setFormData((prev) => ({
        ...prev,
        title: generatedData.title || prev.title,
        duration: generatedData.duration || (initialLesson ? prev.duration : 120),
        difficulty: generatedData.difficulty || (initialLesson ? prev.difficulty : "beginner"),
        objectives: {
          knowledge:
            generatedData.objectives.knowledge ||
            (initialLesson ? prev.objectives.knowledge : ""),
          skills:
            generatedData.objectives.skills ||
            (initialLesson ? prev.objectives.skills : ""),
          attitude:
            generatedData.objectives.attitude ||
            (initialLesson ? prev.objectives.attitude : ""),
        },
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
        setExercises(newExercises);
      }

      // Chuyển về tab manual để user review
      setCreationMode("manual");
      setAiDraftReady(true);
      if (initialLesson) {
        toast.success("AI đã xử lý xong! Hãy kiểm tra lại cấu trúc trước khi lưu.");
      }

    } catch (error) {
      clearTimeout(timeoutId);
      const isTimeout =
        error instanceof Error &&
        (error.name === "AbortError" || error.message.includes("abort"));
      toast.error(
        isTimeout
          ? "AI phản hồi quá lâu (90 giây). Hãy rút ngắn nội dung hoặc chọn provider nhanh hơn."
          : (error instanceof Error ? error.message : "Đã xảy ra lỗi khi tạo bằng AI."),
        { duration: 6000 }
      );
      console.warn("AI generation request failed:", error);
    } finally {
      setIsGenerating(false);
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
      const sectionsForSave = sections
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

      const res = await fetch(
        initialLesson ? `/api/admin/lessons/${initialLesson.id}` : "/api/admin/lessons",
        {
          method: initialLesson ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...formData,
            draftId,
            sections: sectionsForSave,
            exercises: exercises.filter((e) => e.title.trim()),
          }),
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

            <div className="mb-6 overflow-hidden rounded-lg border border-gray-300 bg-white">
              <textarea
                value={aiContent}
                onChange={(event) => setAiContent(event.target.value)}
                className="min-h-[420px] w-full resize-y border-0 p-4 text-sm leading-6 text-slate-800 outline-none focus:ring-2 focus:ring-purple-300"
                placeholder="Dán nội dung sách, giáo án, ghi chú, HTML hoặc code mẫu vào đây. AI sẽ chuyển thành các tab và teaching canvas để bạn kiểm tra trước khi lưu."
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

