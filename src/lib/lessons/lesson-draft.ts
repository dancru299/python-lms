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

export interface LessonMutationPayload extends LessonDraft {
  chapterId: string;
  draftId: string;
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
      const contentBlocks: unknown = Array.isArray(source.contentBlocks)
        ? source.contentBlocks
        : null;

      if (!title && !content) {
        return null;
      }

      return {
        title,
        content,
        contentFormat: asString(source.contentFormat) || "html",
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
    ...draft,
  };
}
