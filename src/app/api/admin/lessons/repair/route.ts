import { NextResponse } from "next/server";
import {
  generateAiJsonObject,
  generateLessonObjectives,
} from "@/lib/ai/lesson-generation";
import { normalizeLessonDraft } from "@/lib/lessons/lesson-draft";
import type { LessonReviewIssue } from "@/lib/lessons/lesson-review";
import {
  dedupeReviewIssues,
  reviewLessonDraftDeterministic,
} from "@/lib/lessons/lesson-review";
import { requireTeacher } from "@/lib/session";

export const maxDuration = 60;

type JsonRecord = Record<string, unknown>;

const STEP_LAYOUTS = new Set([
  "checklist",
  "timeline",
  "flow",
  "mindmap",
  "code_explain",
]);

function asRecord(value: unknown): JsonRecord | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as JsonRecord)
    : null;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
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

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function compact(value: string, max = 1200): string {
  const text = value.replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max).trim()}...` : text;
}

function extractListSteps(html: string) {
  const steps: { id: string; text: string; html: string }[] = [];
  const pattern = /<li\b[^>]*>([\s\S]*?)<\/li>/gi;
  let match: RegExpExecArray | null;
  let index = 0;

  while ((match = pattern.exec(html))) {
    const itemHtml = match[1].trim();
    const text = stripHtml(itemHtml);
    if (!text) continue;
    index += 1;
    steps.push({
      id: `repair-step-${Date.now()}-${index}`,
      text,
      html: itemHtml,
    });
  }

  return steps;
}

function removeListHtml(html: string) {
  return html.replace(/<(ul|ol)\b[\s\S]*?<\/\1>/gi, "").trim();
}

function sentenceStepsFromHtml(html: string) {
  const text = stripHtml(html);
  return text
    .split(/(?<=[.!?。])\s+|\n+|(?:\s+-\s+)/)
    .map((item) => item.trim())
    .filter((item) => item.length >= 18)
    .slice(0, 4)
    .map((text, index) => ({
      id: `repair-step-${Date.now()}-${index + 1}`,
      text,
      html: escapeHtml(text),
    }));
}

function normalizeBreaks(value: string) {
  return value.replace(/&lt;br\s*\/?&gt;/gi, "<br />");
}

function removeRoleHint(value: string) {
  return value
    .split(/\r?\n/)
    .filter((line) => !/vai\s*tr[oò]\s*g[oợ]i\s*[yý]\s*:/i.test(line))
    .join("\n")
    .trim();
}

function repairVisibleText(value: unknown) {
  return typeof value === "string" ? removeRoleHint(normalizeBreaks(value)) : value;
}

function ensureObjectivesContainer(lesson: JsonRecord) {
  const objectives = asRecord(lesson.objectives) ?? {};
  lesson.objectives = objectives;
  return objectives;
}

function lessonSourceText(lesson: JsonRecord) {
  const sections = asArray(lesson.sections)
    .map((section) => {
      const source = asRecord(section) ?? {};
      return [
        asString(source.title),
        stripHtml(asString(source.content)),
        JSON.stringify(source.contentBlocks ?? ""),
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n");
  const exercises = asArray(lesson.exercises)
    .map((exercise) => {
      const source = asRecord(exercise) ?? {};
      return [asString(source.title), stripHtml(asString(source.question))]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n");
  return compact([asString(lesson.title), sections, exercises].join("\n\n"), 12000);
}

async function repairObjectives(
  lesson: JsonRecord,
  provider: string,
  model: string,
  actions: string[]
): Promise<{ provider: string; model: string } | null> {
  const objectives = ensureObjectivesContainer(lesson);
  const missing =
    !asString(objectives.knowledge) ||
    !asString(objectives.skills) ||
    !asString(objectives.attitude);

  if (!missing) return null;

  const { objectives: generated, meta } = await generateLessonObjectives({
    title: asString(lesson.title),
    content: lessonSourceText(lesson),
    provider,
    model,
  });

  if (!asString(objectives.knowledge)) objectives.knowledge = generated.knowledge;
  if (!asString(objectives.skills)) objectives.skills = generated.skills;
  if (!asString(objectives.attitude)) objectives.attitude = generated.attitude;
  actions.push("Đã tự điền các mục tiêu bài giảng còn trống.");
  return meta;
}

function repairContentBlocks(lesson: JsonRecord, actions: string[]) {
  asArray(lesson.sections).forEach((section, sectionIndex) => {
    const sectionRecord = asRecord(section);
    if (!sectionRecord) return;

    sectionRecord.title = repairVisibleText(sectionRecord.title);
    sectionRecord.content = repairVisibleText(sectionRecord.content);

    asArray(sectionRecord.contentBlocks).forEach((block, blockIndex) => {
      const blockRecord = asRecord(block);
      if (!blockRecord) return;

      blockRecord.title = repairVisibleText(blockRecord.title);
      blockRecord.mainHtml = repairVisibleText(blockRecord.mainHtml);
      blockRecord.notesHtml = repairVisibleText(blockRecord.notesHtml);

      asArray(blockRecord.cards).forEach((card) => {
        const cardRecord = asRecord(card);
        if (!cardRecord) return;
        cardRecord.title = repairVisibleText(cardRecord.title);
        cardRecord.description = repairVisibleText(cardRecord.description);
      });

      const layout = asString(blockRecord.layout).toLowerCase();
      const steps = asArray(blockRecord.steps);
      const mainHtml = asString(blockRecord.mainHtml);
      if (!STEP_LAYOUTS.has(layout) || steps.length > 0 || !mainHtml) return;

      const extracted = extractListSteps(mainHtml);
      const inferred = extracted.length > 0 ? extracted : sentenceStepsFromHtml(mainHtml);
      if (inferred.length === 0) return;

      blockRecord.steps = inferred;
      if (extracted.length > 0) {
        blockRecord.mainHtml = removeListHtml(mainHtml);
      }
      actions.push(
        `Đã tạo ${inferred.length} steps cho canvas ${sectionIndex + 1}.${blockIndex + 1}.`
      );
    });
  });
}

function repairExerciseText(lesson: JsonRecord) {
  asArray(lesson.exercises).forEach((exercise) => {
    const exerciseRecord = asRecord(exercise);
    if (!exerciseRecord) return;
    exerciseRecord.title = repairVisibleText(exerciseRecord.title);
    exerciseRecord.question = repairVisibleText(exerciseRecord.question);
    exerciseRecord.answer = repairVisibleText(exerciseRecord.answer);
  });
}

function compactLessonForRepair(lesson: JsonRecord) {
  return {
    title: asString(lesson.title),
    duration: lesson.duration,
    difficulty: asString(lesson.difficulty),
    objectives: asRecord(lesson.objectives) ?? {},
    sections: asArray(lesson.sections).map((section, sectionIndex) => {
      const source = asRecord(section) ?? {};
      return {
        index: sectionIndex + 1,
        title: asString(source.title),
        contentPreview: compact(stripHtml(asString(source.content)), 900),
        contentBlocks: asArray(source.contentBlocks).map((block, blockIndex) => {
          const b = asRecord(block) ?? {};
          return {
            index: blockIndex + 1,
            title: asString(b.title),
            layout: asString(b.layout),
            mainText: compact(stripHtml(asString(b.mainHtml)), 700),
            hasCode: Boolean(asString(b.code)),
            steps: asArray(b.steps).map((step) => {
              const s = asRecord(step);
              return s ? compact(asString(s.text) || stripHtml(asString(s.html)), 160) : "";
            }),
            cards: asArray(b.cards).map((card) => {
              const c = asRecord(card) ?? {};
              return {
                title: asString(c.title),
                description: compact(asString(c.description), 180),
                correct: c.correct === true,
              };
            }),
          };
        }),
      };
    }),
    exercises: asArray(lesson.exercises).map((exercise, exerciseIndex) => {
      const source = asRecord(exercise) ?? {};
      return {
        index: exerciseIndex + 1,
        type: asString(source.type),
        title: asString(source.title),
        question: compact(stripHtml(asString(source.question)), 900),
        answer: compact(asString(source.answer), 700),
        difficulty: asString(source.difficulty),
      };
    }),
  };
}

function buildRepairSystemPrompt() {
  return [
    "Bạn là Lesson Repair Agent cho LMS dạy Python cấp 2.",
    "Bạn nhận bản nháp bài giảng và report review, rồi trả về PATCH nhỏ để sửa lỗi.",
    "Không rewrite toàn bộ bài nếu không cần. Chỉ sửa những lỗi có thể hành động được.",
    "Return ONLY one valid JSON object, no markdown fences, no extra text.",
  ].join("\n");
}

function buildRepairUserPrompt(lesson: JsonRecord, issues: LessonReviewIssue[]) {
  return [
    "Hãy tạo patch sửa các lỗi review còn lại. Ưu tiên sửa critical và warning.",
    "",
    "JSON shape:",
    `{
  "summary": "1-2 câu tiếng Việt",
  "objectives": {
    "knowledge": "optional",
    "skills": "optional",
    "attitude": "optional"
  },
  "sectionPatches": [
    {
      "index": 1,
      "title": "optional",
      "content": "optional",
      "contentFormat": "optional",
      "contentBlocks": [
        {
          "type": "teaching_canvas",
          "layout": "checklist | timeline | flow | mindmap | code_explain | cards | quiz",
          "title": "optional",
          "mainHtml": "optional HTML",
          "steps": [
            { "id": "step-1", "text": "short step text", "html": "optional HTML" }
          ],
          "cards": [
            { "title": "optional", "description": "optional", "correct": false }
          ],
          "code": "optional Python code"
        }
      ]
    }
  ],
  "exercisePatches": [
    {
      "index": 1,
      "title": "optional",
      "question": "optional HTML",
      "answer": "optional plain text or Python",
      "difficulty": "optional easy | medium | hard",
      "points": "optional number",
      "answerVisible": "optional boolean"
    }
  ],
  "actions": ["short Vietnamese action note"]
}`,
    "",
    "Rules:",
    "- Nếu checklist/mindmap/timeline/flow thiếu steps, hãy trả contentBlocks replacement cho section đó, giữ các canvas khác càng nguyên càng tốt.",
    "- Nếu bài tập thiếu đáp án, hãy tạo đáp án mẫu ngắn, đúng Python, không HTML.",
    "- Nếu quiz thiếu correct, đánh dấu đúng một option correct=true nếu có thể suy luận từ câu hỏi; nếu không chắc, để suggestion trong actions thay vì đoán bừa.",
    "- Không xóa code mẫu. Không đổi thứ tự section/exercise.",
    "- Tất cả text cho người học phải bằng tiếng Việt.",
    "",
    "Review issues:",
    JSON.stringify(issues.slice(0, 18), null, 2),
    "",
    "Compact lesson:",
    JSON.stringify(compactLessonForRepair(lesson), null, 2),
  ].join("\n");
}

function applyRepairPatch(lesson: JsonRecord, patchValue: unknown, actions: string[]) {
  const patch = asRecord(patchValue);
  if (!patch) return;

  const objectivesPatch = asRecord(patch.objectives);
  if (objectivesPatch) {
    const objectives = ensureObjectivesContainer(lesson);
    for (const key of ["knowledge", "skills", "attitude"]) {
      const value = asString(objectivesPatch[key]);
      if (value) objectives[key] = value;
    }
  }

  asArray(patch.sectionPatches).forEach((item) => {
    const sectionPatch = asRecord(item);
    if (!sectionPatch) return;
    const index = Number(sectionPatch.index);
    const section = asRecord(asArray(lesson.sections)[index - 1]);
    if (!section) return;

    for (const key of ["title", "content", "contentFormat"]) {
      const value = asString(sectionPatch[key]);
      if (value) section[key] = value;
    }
    if (Array.isArray(sectionPatch.contentBlocks)) {
      section.contentBlocks = sectionPatch.contentBlocks;
    }
  });

  asArray(patch.exercisePatches).forEach((item) => {
    const exercisePatch = asRecord(item);
    if (!exercisePatch) return;
    const index = Number(exercisePatch.index);
    const exercise = asRecord(asArray(lesson.exercises)[index - 1]);
    if (!exercise) return;

    for (const key of ["title", "question", "answer", "difficulty"]) {
      const value = asString(exercisePatch[key]);
      if (value) exercise[key] = value;
    }
    if (typeof exercisePatch.answerVisible === "boolean") {
      exercise.answerVisible = exercisePatch.answerVisible;
    }
    if (typeof exercisePatch.points === "number" && Number.isFinite(exercisePatch.points)) {
      exercise.points = exercisePatch.points;
    }
  });

  asArray(patch.actions).forEach((action) => {
    const text = asString(action);
    if (text) actions.push(text);
  });
  const summary = asString(patch.summary);
  if (summary) actions.unshift(summary);
}

function normalizeProvidedIssue(value: unknown, index: number): LessonReviewIssue | null {
  const source = asRecord(value);
  if (!source) return null;

  const title = asString(source.title);
  const detail = asString(source.detail);
  if (!title || !detail) return null;

  const severity = asString(source.severity);
  const category = asString(source.category);

  return {
    id: asString(source.id) || `provided-review-${index + 1}`,
    severity:
      severity === "critical" || severity === "warning" || severity === "suggestion"
        ? severity
        : "suggestion",
    category:
      category === "metadata" ||
      category === "objectives" ||
      category === "section" ||
      category === "canvas" ||
      category === "exercise" ||
      category === "pedagogy"
        ? category
        : "pedagogy",
    target: asString(source.target) || "lesson",
    title,
    detail,
    suggestion: asString(source.suggestion) || undefined,
  };
}

export async function POST(req: Request) {
  try {
    await requireTeacher();

    const body = await req.json();
    const provider = asString(body.provider);
    const model = asString(body.model);
    const lesson = cloneJson(asRecord(body.lesson) ?? {});
    const providedIssues = asArray(asRecord(body.review)?.issues)
      .map(normalizeProvidedIssue)
      .filter((issue): issue is LessonReviewIssue => issue !== null);
    const initialReview = reviewLessonDraftDeterministic(normalizeLessonDraft(lesson));
    const issues = dedupeReviewIssues([...initialReview.issues, ...providedIssues]);
    const actions: string[] = [];
    let meta: { provider: string; model: string } | null = null;

    try {
      meta = await repairObjectives(lesson, provider, model, actions);
    } catch (error) {
      console.warn("Objective repair failed:", error);
      actions.push("Chưa tự điền được mục tiêu bài giảng do AI objective lỗi.");
    }

    repairContentBlocks(lesson, actions);
    repairExerciseText(lesson);

    try {
      const { json, meta: aiMeta } = await generateAiJsonObject({
        systemPrompt: buildRepairSystemPrompt(),
        userPrompt: buildRepairUserPrompt(lesson, issues),
        provider,
        model,
      });
      meta = aiMeta;
      applyRepairPatch(lesson, json, actions);
    } catch (error) {
      console.warn("LLM lesson repair failed, returning deterministic repairs:", error);
      actions.push("LLM repair chưa chạy được, chỉ áp dụng các sửa tự động an toàn.");
    }

    const normalized = normalizeLessonDraft(lesson);
    const postRepairReview = reviewLessonDraftDeterministic(normalized);

    return NextResponse.json({
      lesson,
      repairSummary: Array.from(new Set(actions)).slice(0, 10),
      review: postRepairReview,
      meta,
    });
  } catch (error) {
    console.error("Lesson repair error:", error);
    return NextResponse.json(
      { error: "Không thể sửa bản nháp bài giảng lúc này." },
      { status: 500 }
    );
  }
}
