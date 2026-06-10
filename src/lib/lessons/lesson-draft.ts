export const LESSON_DIFFICULTIES = [
  "beginner",
  "intermediate",
  "advanced",
] as const;

export const EXERCISE_TYPES = ["practice", "homework"] as const;

export const EXERCISE_DIFFICULTIES = ["easy", "medium", "hard"] as const;

export type LessonDifficulty = (typeof LESSON_DIFFICULTIES)[number];
export type ExerciseType = (typeof EXERCISE_TYPES)[number];
export type ExerciseDifficulty = (typeof EXERCISE_DIFFICULTIES)[number];

export interface LessonObjectivesDraft {
  knowledge: string;
  skills: string;
  attitude: string;
}

export interface LessonSectionDraft {
  title: string;
  content: string;
  contentFormat: string;
  contentBlocks: unknown;
}

export interface LessonExerciseDraft {
  type: ExerciseType;
  title: string;
  question: string;
  answer: string;
  difficulty: ExerciseDifficulty;
  points: number;
  answerVisible: boolean;
}

export interface LessonDraft {
  title: string;
  duration: number;
  difficulty: LessonDifficulty;
  objectives: LessonObjectivesDraft;
  sections: LessonSectionDraft[];
  exercises: LessonExerciseDraft[];
}

export const LESSON_THEMES = [
  "default",
  "ocean",
  "sunset",
  "forest",
  "grape",
] as const;

export type LessonTheme = (typeof LESSON_THEMES)[number];

export interface LessonMutationPayload extends LessonDraft {
  chapterId: string;
  draftId: string;
  theme: LessonTheme;
}

export function normalizeLessonTheme(value: unknown): LessonTheme {
  const candidate = typeof value === "string" ? value.trim().toLowerCase() : "";
  return (LESSON_THEMES as readonly string[]).includes(candidate)
    ? (candidate as LessonTheme)
    : "default";
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function normalizeCanvasLayout(value: unknown): string {
  const candidate = asString(value).toLowerCase();
  return [
    "text",
    "split",
    "code",
    "media",
    "hero",
    "cards",
    "highlight",
    "timeline",
    "compare",
    "checklist",
    "chat",
    "flow",
    "code_explain",
    "mindmap",
    "quiz",
    "playground",
    "statement",
    "cover",
    "two_col_text",
    "banner",
  ].includes(candidate)
    ? candidate
    : "split";
}

function normalizeCanvasAccent(value: unknown): string | undefined {
  const candidate = asString(value).toLowerCase();
  return ["indigo", "teal", "amber", "rose", "emerald"].includes(candidate)
    ? candidate
    : undefined;
}

function normalizeCanvasRatio(value: unknown): string | undefined {
  const candidate = asString(value).toLowerCase();
  return ["even", "wide-text", "wide-side"].includes(candidate) ? candidate : undefined;
}

function normalizeCanvasCards(value: unknown): unknown[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const cards = value
    .map((item) => {
      const src = asRecord(item);
      if (!src) return null;
      const icon = asString(src.icon);
      const title = asString(src.title);
      const description = asString(src.description);
      if (!title && !description) return null;
      return {
        icon,
        title,
        description,
        color: asString(src.color) || undefined,
        ...(src.correct === true ? { correct: true } : {}),
      };
    })
    .filter((c) => c !== null);
  return cards.length > 0 ? cards : undefined;
}

function normalizeCanvasSteps(value: unknown, canvasId: string): unknown[] {
  return asArray(value)
    .map((step, index) => {
      const source = asRecord(step);
      if (!source) {
        return null;
      }

      const text = asString(source.text) || asString(source.html);
      if (!text) {
        return null;
      }

      return {
        id: asString(source.id) || `${canvasId}-step-${index + 1}`,
        text,
        html: asString(source.html) || text,
      };
    })
    .filter((step) => step !== null);
}

// Block types the lesson editor itself produces and that render correctly as-is.
const KNOWN_EDITOR_BLOCK_TYPES = ["rich_text", "image", "code", "step_guide", "callout"];

export function normalizeContentBlocks(value: unknown): unknown {
  const blocks = asArray(value)
    .map((block, index) => {
      const source = asRecord(block);
      if (!source) {
        return null;
      }

      const type = asString(source.type);

      // Preserve the editor's own block types untouched.
      if (KNOWN_EDITOR_BLOCK_TYPES.includes(type)) {
        return source;
      }

      // Anything else — a teaching_canvas, or a block from an AI response whose
      // type is missing/unrecognized — is salvaged into a clean teaching canvas.
      // This prevents a malformed block from later rendering as literal
      // "undefined" through the generic callout fallback.
      const canvasId = asString(source.id) || `canvas-${index + 1}`;
      const titleText = asString(source.title);
      const salvagedHtml =
        asString(source.mainHtml) ||
        asString(source.html) ||
        asString(source.content) ||
        (asString(source.text) ? `<p>${asString(source.text)}</p>` : "");
      const code = asString(source.code);
      const cards = normalizeCanvasCards(source.cards);
      const steps = normalizeCanvasSteps(source.steps, canvasId);

      // Drop an unknown-type block that carries no usable content at all.
      if (
        type !== "teaching_canvas" &&
        !titleText &&
        !salvagedHtml &&
        !code &&
        !cards &&
        steps.length === 0
      ) {
        return null;
      }

      const title = titleText || `Canvas ${index + 1}`;
      const accent = normalizeCanvasAccent(source.accent);
      const ratio = normalizeCanvasRatio(source.ratio);
      return {
        id: canvasId,
        type: "teaching_canvas",
        title,
        layout: normalizeCanvasLayout(source.layout),
        mainHtml: salvagedHtml || `<p>${title}</p>`,
        code,
        mediaId: asString(source.mediaId),
        notesHtml: asString(source.notesHtml),
        reveal: typeof source.reveal === "boolean" ? source.reveal : true,
        steps,
        ...(cards ? { cards } : {}),
        ...(accent ? { accent } : {}),
        ...(ratio ? { ratio } : {}),
      };
    })
    .filter((block) => block !== null);

  return blocks.length > 0 ? blocks : null;
}

function normalizeDuration(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return 120;
  }

  return Math.min(Math.max(Math.round(parsed), 15), 480);
}

function normalizeLessonDifficulty(value: unknown): LessonDifficulty {
  const candidate = asString(value).toLowerCase();
  return (LESSON_DIFFICULTIES as readonly string[]).includes(candidate)
    ? (candidate as LessonDifficulty)
    : "beginner";
}

function normalizeExerciseType(value: unknown): ExerciseType {
  const candidate = asString(value).toLowerCase();
  return (EXERCISE_TYPES as readonly string[]).includes(candidate)
    ? (candidate as ExerciseType)
    : "practice";
}

function normalizeExerciseDifficulty(value: unknown): ExerciseDifficulty {
  const candidate = asString(value).toLowerCase();
  return (EXERCISE_DIFFICULTIES as readonly string[]).includes(candidate)
    ? (candidate as ExerciseDifficulty)
    : "easy";
}

function normalizePoints(value: unknown, type: ExerciseType): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return type === "homework" ? 20 : 10;
  }

  return Math.min(Math.max(Math.round(parsed), 1), 100);
}

function normalizeObjectives(
  source: Record<string, unknown>,
  objectivesSource: Record<string, unknown> | null
): LessonObjectivesDraft {
  return {
    knowledge:
      asString(objectivesSource?.knowledge) || asString(source.objectiveKnowledge),
    skills: asString(objectivesSource?.skills) || asString(source.objectiveSkills),
    attitude:
      asString(objectivesSource?.attitude) || asString(source.objectiveAttitude),
  };
}

function normalizeSections(value: unknown): LessonSectionDraft[] {
  return asArray(value)
    .map((section, index): LessonSectionDraft | null => {
      const source = asRecord(section);
      if (!source) {
        return null;
      }

      const title = asString(source.title) || `Phần ${index + 1}`;
      const content = typeof source.content === "string" ? source.content.trim() : "";
      const contentBlocks = normalizeContentBlocks(source.contentBlocks);

      if (!title && !content) {
        return null;
      }

      return {
        title,
        content,
        contentFormat:
          asString(source.contentFormat) ||
          (Array.isArray(contentBlocks) ? "canvas" : "html"),
        contentBlocks,
      };
    })
    .filter((section): section is LessonSectionDraft => section !== null);
}

function normalizeExercises(value: unknown): LessonExerciseDraft[] {
  return asArray(value)
    .map((exercise, index) => {
      const source = asRecord(exercise);
      if (!source) {
        return null;
      }

      const type = normalizeExerciseType(source.type);
      const title = asString(source.title) || `Bài tập ${index + 1}`;
      const question =
        typeof source.question === "string" ? source.question.trim() : "";
      const answer = typeof source.answer === "string" ? source.answer.trim() : "";

      if (!title && !question && !answer) {
        return null;
      }

      return {
        type,
        title,
        question,
        answer,
        difficulty: normalizeExerciseDifficulty(source.difficulty),
        points: normalizePoints(source.points, type),
        answerVisible:
          typeof source.answerVisible === "boolean"
            ? source.answerVisible
            : type === "practice",
      };
    })
    .filter((exercise): exercise is LessonExerciseDraft => exercise !== null);
}

export function normalizeLessonDraft(input: unknown): LessonDraft {
  const root = asRecord(input) ?? {};
  const lessonInfo = asRecord(root.lessonInfo);
  const source = lessonInfo ?? root;
  const objectivesSource = asRecord(source.objectives);

  return {
    title: asString(source.title),
    duration: normalizeDuration(source.duration),
    difficulty: normalizeLessonDifficulty(source.difficulty),
    objectives: normalizeObjectives(source, objectivesSource),
    sections: normalizeSections(root.sections),
    exercises: normalizeExercises(root.exercises),
  };
}

export function normalizeLessonMutationPayload(
  input: unknown
): LessonMutationPayload {
  const root = asRecord(input) ?? {};
  const draft = normalizeLessonDraft(input);

  return {
    chapterId: asString(root.chapterId),
    draftId: asString(root.draftId),
    theme: normalizeLessonTheme(root.theme),
    ...draft,
  };
}
