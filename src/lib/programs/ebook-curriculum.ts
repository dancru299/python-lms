export type EbookOutlineItemType =
  | "chapter"
  | "section"
  | "exercise"
  | "frontmatter";

export interface EbookOutlineItem {
  id: string;
  type: EbookOutlineItemType;
  number?: string;
  title: string;
  page?: number;
  children: EbookOutlineItem[];
}

export interface CurriculumDraft {
  programTitle: string;
  programDescription?: string;
  chapters: Array<{ key: string; title: string; sortOrder: number }>;
  lessons: Array<{
    key: string;
    chapterKey: string;
    title: string;
    sourceNumber?: string;
    sourcePage?: number;
    duration: number;
    difficulty: string;
  }>;
  milestones: Array<{
    key: string;
    title: string;
    description?: string;
    lessonKeys: string[];
  }>;
  outcomes: Array<{
    key: string;
    milestoneKey: string;
    title: string;
    description?: string;
    lessonKeys: string[];
  }>;
  skills: Array<{
    key: string;
    parentKey?: string;
    title: string;
    description?: string;
    outcomeKeys: string[];
  }>;
}

interface ParsedLine {
  type: EbookOutlineItemType;
  number?: string;
  title: string;
  page?: number;
}

const CHAPTER_RE = /^(?:chuong|chương)\s+(\d+)\s+(.+)$/i;
const SECTION_RE = /^(\d+(?:\.\d+)+)\s+(.+)$/;
const FRONTMATTER_RE =
  /^(loi noi dau|lời nói đầu|muc luc|mục lục|danh muc|danh mục|phu luc|phụ lục)\b/i;
const EXERCISE_RE =
  /^(bai tap|bài tập|thuc hanh|thực hành|du an|dự án|on tap|ôn tập|luyen tap|luyện tập|kiem tra|kiểm tra)\b/i;
const EXERCISE_TITLE_RE =
  /\b(bai tap|thuc hanh|du an|on tap|luyen tap|kiem tra|sua bai|practice|exercise|project|quiz|test)\b/i;

export function parseEbookOutlineText(text: string): EbookOutlineItem[] {
  const lines = joinWrappedTocLines(
    text
      .replace(/\u00a0/g, " ")
      .split(/\r?\n/)
      .map((line) => normalizeLine(line))
      .filter(Boolean)
  );
  const roots: EbookOutlineItem[] = [];
  let currentChapter: EbookOutlineItem | null = null;

  for (const line of lines) {
    const parsed = parseTocLine(line);
    if (!parsed) {
      continue;
    }

    const item: EbookOutlineItem = {
      id: buildOutlineId(parsed, roots.length),
      type: parsed.type,
      number: parsed.number,
      title: parsed.title,
      page: parsed.page,
      children: [],
    };

    if (item.type === "chapter") {
      roots.push(item);
      currentChapter = item;
      continue;
    }

    if ((item.type === "section" || item.type === "exercise") && currentChapter) {
      currentChapter.children.push(item);
      continue;
    }

    roots.push(item);
  }

  return roots;
}

export function createCurriculumDraftFromOutline(
  outline: EbookOutlineItem[],
  title = "Chương trình từ ebook"
): CurriculumDraft {
  const chapterItems = outline.filter((item) => item.type === "chapter");
  const chaptersSource =
    chapterItems.length > 0
      ? chapterItems
      : [
          {
            id: "chapter-1",
            type: "chapter" as const,
            title,
            children: outline.filter((item) => item.type !== "frontmatter"),
          },
        ];

  const chapters = chaptersSource.map((chapter, index) => ({
    key: `chapter-${index + 1}`,
    title: cleanProgramTitle(chapter.title),
    sortOrder: index,
  }));

  const lessons = chaptersSource.flatMap((chapter, chapterIndex) => {
    const children = chapter.children.filter(
      (item) => item.type === "section" || item.type === "exercise"
    );
    const lessonItems =
      children.length > 0
        ? children
        : [
            {
              id: `${chapter.id}-overview`,
              type: "section" as const,
              title: `Tổng quan ${chapter.title}`,
              number: chapter.number,
              page: chapter.page,
              children: [],
            },
          ];

    return lessonItems.map((item, lessonIndex) => ({
      key: `lesson-${chapterIndex + 1}-${lessonIndex + 1}`,
      chapterKey: `chapter-${chapterIndex + 1}`,
      title: cleanProgramTitle(
        item.number ? `${item.number} ${item.title}` : item.title
      ),
      sourceNumber: item.number,
      sourcePage: item.page,
      duration: item.type === "exercise" ? 90 : 60,
      difficulty: inferLessonDifficulty(item.title),
    }));
  });

  const milestones = chapters.map((chapter) => ({
    key: `milestone-${chapter.key}`,
    title: chapter.title,
    description: `Chặng học giúp học sinh nắm được ${chapter.title.toLowerCase()}.`,
    lessonKeys: lessons
      .filter((lesson) => lesson.chapterKey === chapter.key)
      .map((lesson) => lesson.key),
  }));

  const outcomes = milestones.flatMap((milestone, index) => {
    const milestoneLessons = lessons.filter((lesson) =>
      milestone.lessonKeys.includes(lesson.key)
    );
    const exerciseLessons = milestoneLessons.filter((lesson) =>
      EXERCISE_RE.test(removeVietnameseTone(lesson.title))
    );
    const base = [
      {
        key: `outcome-${index + 1}-understand`,
        milestoneKey: milestone.key,
        title: `Giải thích được kiến thức chính trong ${milestone.title}`,
        description: "Học sinh trình bày được khái niệm chính và dùng chúng để chuẩn bị cho bài thực hành.",
        lessonKeys: milestone.lessonKeys,
      },
    ];

    if (exerciseLessons.length > 0) {
      base.push({
        key: `outcome-${index + 1}-practice`,
        milestoneKey: milestone.key,
        title: `Hoàn thành được bài tập vận dụng trong ${milestone.title}`,
        description: "Học sinh áp dụng kiến thức của chặng học để giải các bài thực hành liên quan.",
        lessonKeys: exerciseLessons.map((lesson) => lesson.key),
      });
    }

    return base;
  });

  const categorized = categorizeLessons(lessons, outcomes);
  const skills = buildSkillsFromCategories(categorized);

  return normalizeCurriculumDraft({
    programTitle: title,
    programDescription:
      "Chương trình được khởi tạo từ mục lục ebook. Các bài học mới đang ở trạng thái nháp.",
    chapters,
    lessons,
    milestones,
    outcomes,
    skills,
  });
}

export function normalizeCurriculumDraft(
  input: Partial<CurriculumDraft>,
  fallback?: CurriculumDraft
): CurriculumDraft {
  const chapters = normalizeKeyedItems(input.chapters, fallback?.chapters, "chapter")
    .map((chapter, index) => ({
      key: chapter.key,
      title: asText(chapter.title) || `Chuong ${index + 1}`,
      sortOrder: asNumber(chapter.sortOrder, index),
    }));
  const chapterKeys = new Set(chapters.map((chapter) => chapter.key));

  const lessons = normalizeKeyedItems(input.lessons, fallback?.lessons, "lesson")
    .map((lesson, index) => ({
      key: lesson.key,
      chapterKey: chapterKeys.has(asText(lesson.chapterKey))
        ? asText(lesson.chapterKey)
        : chapters[0]?.key ?? "chapter-1",
      title: asText(lesson.title) || `Bai hoc ${index + 1}`,
      sourceNumber: asOptionalText(lesson.sourceNumber),
      sourcePage: asOptionalNumber(lesson.sourcePage),
      duration: clampNumber(lesson.duration, 45, 15, 240),
      difficulty: normalizeDifficulty(lesson.difficulty),
    }));
  const lessonKeys = new Set(lessons.map((lesson) => lesson.key));

  const milestones = normalizeKeyedItems(
    input.milestones,
    fallback?.milestones,
    "milestone"
  ).map((milestone, index) => ({
    key: milestone.key,
    title: asText(milestone.title) || `Milestone ${index + 1}`,
    description: asOptionalText(milestone.description),
    lessonKeys: asStringArray(milestone.lessonKeys).filter((key) =>
      lessonKeys.has(key)
    ),
  }));
  const milestoneKeys = new Set(milestones.map((milestone) => milestone.key));

  const outcomes = normalizeKeyedItems(input.outcomes, fallback?.outcomes, "outcome")
    .map((outcome, index) => ({
      key: outcome.key,
      milestoneKey: milestoneKeys.has(asText(outcome.milestoneKey))
        ? asText(outcome.milestoneKey)
        : milestones[0]?.key ?? "milestone-1",
      title: asText(outcome.title) || `Outcome ${index + 1}`,
      description: asOptionalText(outcome.description),
      lessonKeys: asStringArray(outcome.lessonKeys).filter((key) =>
        lessonKeys.has(key)
      ),
    }));
  const outcomeKeys = new Set(outcomes.map((outcome) => outcome.key));
  const rawSkills = normalizeKeyedItems(input.skills, fallback?.skills, "skill");
  const skillKeys = new Set(rawSkills.map((skill) => skill.key));

  const skills = rawSkills.map((skill, index) => ({
    key: skill.key,
    parentKey:
      skill.parentKey && skillKeys.has(asText(skill.parentKey))
        ? asText(skill.parentKey)
        : undefined,
    title: asText(skill.title) || `Skill ${index + 1}`,
    description: asOptionalText(skill.description),
    outcomeKeys: asStringArray(skill.outcomeKeys).filter((key) =>
      outcomeKeys.has(key)
    ),
  }));

  return {
    programTitle: asText(input.programTitle) || fallback?.programTitle || "Chương trình từ ebook",
    programDescription: asOptionalText(input.programDescription) ?? fallback?.programDescription,
    chapters,
    lessons,
    milestones,
    outcomes,
    skills,
  };
}

export function outlineToPromptText(outline: EbookOutlineItem[]) {
  const lines: string[] = [];

  function walk(items: EbookOutlineItem[], depth: number) {
    for (const item of items) {
      const prefix = "  ".repeat(depth);
      lines.push(
        `${prefix}- ${item.type}: ${item.number ? `${item.number} ` : ""}${item.title}${
          item.page ? ` (page ${item.page})` : ""
        }`
      );
      walk(item.children, depth + 1);
    }
  }

  walk(outline, 0);
  return lines.join("\n");
}

function parseTocLine(input: string): ParsedLine | null {
  const line = normalizeLine(input);
  if (!line) return null;

  const { body, page } = splitPageNumber(line);
  const normalizedBody = removeVietnameseTone(body);
  const chapterMatch = normalizedBody.match(CHAPTER_RE);

  if (chapterMatch) {
    const originalTitle = body.replace(/^(?:Chuong|Chương)\s+\d+\s+/i, "");
    return {
      type: "chapter",
      number: chapterMatch[1],
      title: cleanProgramTitle(originalTitle),
      page,
    };
  }

  const sectionMatch = body.match(SECTION_RE);
  if (sectionMatch) {
    const title = cleanProgramTitle(sectionMatch[2]);
    return {
      type: isExerciseTitle(title) ? "exercise" : "section",
      number: sectionMatch[1],
      title,
      page,
    };
  }

  if (isExerciseTitle(body)) {
    return { type: "exercise", title: cleanProgramTitle(body), page };
  }

  if (FRONTMATTER_RE.test(normalizedBody)) {
    return { type: "frontmatter", title: cleanProgramTitle(body), page };
  }

  return page ? { type: "frontmatter", title: cleanProgramTitle(body), page } : null;
}

function joinWrappedTocLines(lines: string[]) {
  const result: string[] = [];
  let buffer = "";

  for (const line of lines) {
    const beginsItem = isItemStart(line);

    if (!buffer) {
      buffer = line;
    } else if (beginsItem) {
      result.push(buffer);
      buffer = line;
    } else {
      buffer = `${buffer} ${line}`;
    }

    if (hasTrailingPageNumber(buffer)) {
      result.push(buffer);
      buffer = "";
    }
  }

  if (buffer) result.push(buffer);
  return result;
}

function isItemStart(line: string) {
  const normalized = removeVietnameseTone(line);
  return (
    CHAPTER_RE.test(normalized) ||
    SECTION_RE.test(line) ||
    isExerciseTitle(line) ||
    FRONTMATTER_RE.test(normalized)
  );
}

function hasTrailingPageNumber(line: string) {
  return /(?:\.|\s)+\d{1,4}$/.test(line.trim());
}

function splitPageNumber(line: string) {
  const match = line.match(/(?:\.|\s)+(\d{1,4})$/);
  if (!match) {
    return { body: stripDotLeaders(line), page: undefined };
  }

  return {
    body: stripDotLeaders(line.slice(0, match.index).trim()),
    page: Number(match[1]),
  };
}

function stripDotLeaders(value: string) {
  return value.replace(/\.{2,}/g, " ").replace(/\s+/g, " ").trim();
}

function normalizeLine(value: string) {
  return value
    .replace(/[·•]/g, " ")
    .replace(/\t/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildOutlineId(item: ParsedLine, index: number) {
  return `${item.type}-${item.number ? slugify(item.number) : slugify(item.title)}-${index}`;
}

function cleanProgramTitle(value: string) {
  return stripDotLeaders(value).replace(/\s+/g, " ").trim();
}

function inferLessonDifficulty(title: string) {
  const normalized = removeVietnameseTone(title);
  if (/nang cao|du an|project|de quy|oop|class/.test(normalized)) return "advanced";
  if (/if|vong lap|list|chuoi|ham|file/.test(normalized) || isExerciseTitle(title)) return "intermediate";
  return "beginner";
}

function categorizeLessons(
  lessons: CurriculumDraft["lessons"],
  outcomes: CurriculumDraft["outcomes"]
) {
  const categories = new Map<string, { title: string; outcomeKeys: Set<string> }>();

  function ensure(key: string, title: string) {
    if (!categories.has(key)) {
      categories.set(key, { title, outcomeKeys: new Set() });
    }
    return categories.get(key)!;
  }

  for (const lesson of lessons) {
    const normalized = removeVietnameseTone(lesson.title);
    const category =
      /cai dat|vs code|moi truong/.test(normalized)
        ? ["environment", "Môi trường lập trình"]
        : isExerciseTitle(lesson.title)
          ? ["practice", "Tư duy thực hành"]
          : /toan|bien|nhap|xuat|if|vong|list|chuoi|ham|cu phap/.test(normalized)
            ? ["syntax", "Cú pháp Python cơ bản"]
            : ["foundation", "Nền tảng lập trình"];

    const bucket = ensure(category[0], category[1]);
    for (const outcome of outcomes) {
      if (outcome.lessonKeys.includes(lesson.key)) {
        bucket.outcomeKeys.add(outcome.key);
      }
    }
  }

  return categories;
}

function buildSkillsFromCategories(
  categories: Map<string, { title: string; outcomeKeys: Set<string> }>
): CurriculumDraft["skills"] {
  const skills: CurriculumDraft["skills"] = [];

  Array.from(categories.entries()).forEach(([key, category], index) => {
    const rootKey = `skill-${key}`;
    skills.push({
      key: rootKey,
      title: category.title,
      description: "Nhóm kỹ năng được suy ra từ mục lục ebook.",
      outcomeKeys: Array.from(category.outcomeKeys),
    });
    skills.push({
      key: `${rootKey}-apply`,
      parentKey: rootKey,
      title: `Vận dụng ${category.title.toLowerCase()}`,
      description: "Áp dụng kỹ năng này trong bài học và bài tập liên quan.",
      outcomeKeys: Array.from(category.outcomeKeys),
    });

    if (index > 4) return;
  });

  return skills;
}

function normalizeKeyedItems<T extends { key?: unknown }>(
  input: T[] | undefined,
  fallback: T[] | undefined,
  prefix: string
): Array<T & { key: string }> {
  const source = Array.isArray(input) && input.length > 0 ? input : fallback ?? [];
  return source.map((item, index) => ({
    ...item,
    key: asText(item.key) || `${prefix}-${index + 1}`,
  }));
}

function asText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asOptionalText(value: unknown) {
  const text = asText(value);
  return text || undefined;
}

function asNumber(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed) : fallback;
}

function asOptionalNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed) : undefined;
}

function clampNumber(value: unknown, fallback: number, min: number, max: number) {
  const parsed = asNumber(value, fallback);
  return Math.min(Math.max(parsed, min), max);
}

function normalizeDifficulty(value: unknown) {
  const difficulty = asText(value).toLowerCase();
  return ["beginner", "intermediate", "advanced"].includes(difficulty)
    ? difficulty
    : "beginner";
}

function isExerciseTitle(value: string) {
  return EXERCISE_RE.test(removeVietnameseTone(value)) || EXERCISE_TITLE_RE.test(removeVietnameseTone(value));
}

function asStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.map((item) => asText(item)).filter(Boolean)
    : [];
}

function slugify(value: string) {
  return removeVietnameseTone(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function removeVietnameseTone(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
}
