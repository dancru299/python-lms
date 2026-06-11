import type { LessonExerciseDraft } from "@/lib/lessons/lesson-draft";

// Parses the "[SLIDE/...]" teaching template (the format teachers paste from their
// slide-prep prompt) into exact tabs + exercises WITHOUT calling an LLM. Each
// "[SLIDE/TAB ...]" marker the teacher wrote becomes one section, in their order,
// with their wording preserved. The AI step (if any) only beautifies a single
// tab's content into canvases — it can no longer merge or rename tabs.

export interface ParsedSlideTab {
  /** Short nav label derived from the marker title (e.g. "LỆNH INPUT()"). */
  title: string;
  /** Full tab title exactly as written, passed to the AI as context. */
  fullTitle: string;
  /** Raw text of the tab, fed to the AI beautifier. */
  rawText: string;
  /** Deterministic HTML rendering, used as the no-AI fallback. */
  html: string;
  /** Explicit layout from a "Vai trò gợi ý: <layout>" line, if present + valid. */
  roleHint?: string;
}

// Layouts the teacher can request via "Vai trò gợi ý: <layout>".
const VALID_LAYOUTS = new Set<string>([
  "hero",
  "highlight",
  "cards",
  "timeline",
  "flow",
  "compare",
  "chat",
  "code_explain",
  "quiz",
  "playground",
  "checklist",
  "mindmap",
  "statement",
  "two_col_text",
  "banner",
]);

export interface ParsedSlideTemplate {
  /** Lesson title from "[SLIDE CHÍNH]", or null when absent. */
  title: string | null;
  /** Content tabs (includes summary tabs like "TỔNG KẾT"). */
  sections: ParsedSlideTab[];
  /** Exercises routed from "LUYỆN TẬP" (practice) and "BÀI TẬP" (homework). */
  exercises: LessonExerciseDraft[];
}

interface RawSegment {
  kind: "main" | "tab";
  title: string;
  body: string;
}

const MARKER_LINE = /^\s*\[\s*SLIDE\b([^\]]*)\]\s*:?\s*(.*)$/i;
// Matches any slide marker: "[SLIDE CHÍNH]", "[SLIDE 1: ...]", "[SLIDE 6]",
// or the older "[SLIDE/TAB 1]" form.
const TEMPLATE_HINT = /\[\s*SLIDE(\s*\/\s*TAB)?\b[^\]]*\]/i;

// A lone word line that introduces a verbatim block (code or program output),
// e.g. "Python" / "Plaintext".
const CODE_FENCE =
  /^(python|py|plaintext|plain text|text|bash|shell|console|code|output|json|html|css|js|javascript|sql)\s*$/i;
const OUTPUT_FENCE = /^(plaintext|plain text|text|output|console|result)\s*$/i;
// A markdown fence line: ``` or ~~~ optionally followed by a language hint.
const MD_FENCE = /^\s*(```|~~~)\s*[a-z0-9+#.-]*\s*$/i;
const MD_OUTPUT_LANGS = /^(text|plaintext|plain|output|console)$/i;

/** True when the pasted text uses the "[SLIDE/TAB ...]" template. */
export function hasSlideTemplateMarkers(text: string): boolean {
  return TEMPLATE_HINT.test(text);
}

function normalizeVi(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[đĐ]/g, "d")
    .toUpperCase()
    .trim();
}

function escapeText(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Reads (and removes) a "Vai trò gợi ý: <layout>" directive line from a tab body
// so the layout can be honored without the directive showing up on the slide.
function extractRoleHint(body: string): { roleHint?: string; body: string } {
  const lines = body.split(/\r?\n/);
  const idx = lines.findIndex((line) => /^VAI TRO GOI Y\s*:/.test(normalizeVi(line)));
  if (idx === -1) return { body };

  const value = lines[idx].slice(lines[idx].indexOf(":") + 1).trim().toLowerCase();
  const roleHint = VALID_LAYOUTS.has(value) ? value : undefined;
  lines.splice(idx, 1);
  return { roleHint, body: lines.join("\n").replace(/^\n+/, "") };
}

// Turns a long marker title into a concise tab/nav label. Teachers write titles
// as "MAIN CONCEPT: flavour text" or "MAIN CONCEPT - flavour text"; the nav only
// needs the main concept. The colon usually has NO leading space ("CẨN THẬN:"),
// so we split on ":" regardless of spacing — but only on a SPACE-PADDED dash, so
// a hyphenated word/compound isn't cut. Anything still too long is truncated.
const MAX_LABEL_LENGTH = 28;
function shortLabel(title: string): string {
  const trimmed = title.trim();
  const beforeSep = trimmed.split(/\s*:\s*|\s[-–—]\s/)[0].trim();
  let label = beforeSep || trimmed;
  if (label.length > MAX_LABEL_LENGTH) {
    label = `${label.slice(0, MAX_LABEL_LENGTH).replace(/\s+\S*$/, "").trim()}…`;
  }
  return label || trimmed;
}

/** A short phrase ending in ":" that reads like a heading rather than code. */
function isHeadingLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed.endsWith(":") || trimmed.length > 90) return false;
  if (trimmed.startsWith("#") || trimmed.startsWith(">>>")) return false;
  // Assignments / statements end with ":" only as control-flow; treat "x =" as code.
  if (/[=;{}]/.test(trimmed.slice(0, -1)) && !/\(\)/.test(trimmed)) return false;
  return /[\p{L}]/u.test(trimmed);
}

function splitSegments(text: string): RawSegment[] {
  const lines = text.split(/\r?\n/);
  const segments: RawSegment[] = [];
  let current: RawSegment | null = null;
  const bodyLines: string[] = [];

  const flush = () => {
    if (current) {
      current.body = bodyLines.join("\n").replace(/^\n+|\n+$/g, "");
      segments.push(current);
    }
    bodyLines.length = 0;
  };

  for (const line of lines) {
    const match = line.match(MARKER_LINE);
    if (match) {
      flush();
      const inside = match[1] || "";
      const after = match[2].trim();
      // Title can sit either after the bracket ("[SLIDE 6]: TỔNG KẾT") or inside
      // it after the slide number ("[SLIDE 1: KHỞI ĐỘNG ...]").
      let title = after;
      if (!title) {
        const colonIdx = inside.indexOf(":");
        if (colonIdx !== -1) title = inside.slice(colonIdx + 1).trim();
      }
      current = {
        kind: normalizeVi(inside).includes("CHINH") ? "main" : "tab",
        title,
        body: "",
      };
      continue;
    }
    if (current) bodyLines.push(line);
  }
  flush();

  return segments;
}

function emitCodeBlock(parts: string[], collected: string[], isOutput: boolean): void {
  const code = escapeText(collected.join("\n").replace(/\s+$/, ""));
  if (!code.trim()) return;
  parts.push(
    isOutput
      ? `<pre class="lesson-output">${code}</pre>`
      : `<div class="code-block">\n${code}\n</div>`
  );
}

/** Converts one tab's raw text into renderable HTML (used when AI is skipped/fails). */
function slideTextToHtml(rawText: string): string {
  const lines = rawText.split(/\r?\n/);
  const parts: string[] = [];

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) continue;

    // Markdown fenced block (```python ... ```): take verbatim until the close
    // fence — this preserves blank lines inside the block.
    if (MD_FENCE.test(trimmed)) {
      const lang = trimmed.replace(/^```|^~~~/, "").trim().toLowerCase();
      const isOutput = MD_OUTPUT_LANGS.test(lang);
      const collected: string[] = [];
      let j = i + 1;
      for (; j < lines.length; j += 1) {
        if (MD_FENCE.test(lines[j].trim())) break;
        collected.push(lines[j]);
      }
      i = j; // skip the closing fence too
      emitCodeBlock(parts, collected, isOutput);
      continue;
    }

    // Bare fence word ("Python" / "Plaintext"): collect until a blank line,
    // heading, marker, or another fence.
    if (CODE_FENCE.test(trimmed)) {
      const isOutput = OUTPUT_FENCE.test(trimmed);
      const collected: string[] = [];
      let j = i + 1;
      for (; j < lines.length; j += 1) {
        const next = lines[j];
        if (!next.trim()) break;
        if (MARKER_LINE.test(next) || MD_FENCE.test(next.trim())) break;
        if (CODE_FENCE.test(next.trim())) break;
        if (isHeadingLine(next)) break;
        collected.push(next);
      }
      i = j - 1;
      emitCodeBlock(parts, collected, isOutput);
      continue;
    }

    if (isHeadingLine(trimmed)) {
      parts.push(`<h3>${escapeText(trimmed.replace(/:$/, ""))}</h3>`);
      continue;
    }

    parts.push(`<p>${escapeText(trimmed)}</p>`);
  }

  return parts.join("\n");
}

// A label like "(Cấp độ: Dễ)", "(Độ khó: ⭐⭐⭐)", "(Level 2)" or a bare "(Dễ)".
const LEVEL_LABEL = /\b(CAP DO|DO KHO|MUC DO|LEVEL|DIFFICULTY)\b/;
const BARE_DIFFICULTY = /^(DE|KHO|TRUNG BINH|DE DANG|THAP|CAO|EASY|MEDIUM|HARD|NORMAL)$/;
// A standalone difficulty line, e.g. "Độ khó: Cao", "Cấp độ: Trung bình".
const DIFFICULTY_LINE = /^(DO KHO|CAP DO|MUC DO)\s*:/;

function isLevelLabel(text: string): boolean {
  if (LEVEL_LABEL.test(normalizeVi(text)) || /[★⭐]/.test(text)) return true;
  // Bare "(Dễ)" / "(Khó)" — exact difficulty word only, so titles like
  // "(để làm gì)" → "DE LAM GI" are NOT mistaken for a difficulty.
  return BARE_DIFFICULTY.test(normalizeVi(text.replace(/[():]/g, " ")).trim());
}

/** Difficulty from a standalone "Độ khó: X" line — only when X is a real level. */
function difficultyLineValue(line: string): string | null {
  const normalized = normalizeVi(line);
  if (!DIFFICULTY_LINE.test(normalized)) return null;
  const value = line.slice(line.indexOf(":") + 1).trim();
  return BARE_DIFFICULTY.test(normalizeVi(value)) ? value : null;
}

function difficultyFromLabel(label: string): LessonExerciseDraft["difficulty"] {
  const stars = (label.match(/[★⭐]/gu) || []).length;
  if (stars >= 3) return "hard";
  if (stars === 2) return "medium";
  if (stars === 1) return "easy";

  // Match only the VALUE after the colon — the label prefix "Độ khó" itself
  // normalizes to "DO KHO" and would otherwise always match "KHO" (hard).
  const value = label.includes(":") ? label.slice(label.indexOf(":") + 1) : label;
  const normalized = normalizeVi(value);
  if (/\b(KHO|HARD|CAO)\b/.test(normalized)) return "hard";
  if (/\b(TRUNG BINH|MEDIUM)\b/.test(normalized)) return "medium";
  if (/\b(DE|EASY|THAP|DE DANG)\b/.test(normalized)) return "easy";
  return "medium";
}

/**
 * Splits an exercise tab into individual exercises. Items start at lines like
 * "Bài 1:", "Thử thách 1:" (practice) or "Nhiệm vụ 1:" (homework). Within each
 * item, anything after a "Đáp án mẫu" header becomes the model answer, not part
 * of the question.
 */
function parseExerciseTab(
  body: string,
  type: LessonExerciseDraft["type"]
): LessonExerciseDraft[] {
  // Item heading: a known word (longest variants first) + a number, e.g.
  // "Bài 1:", "Thử thách 2)", "Nhiệm vụ 3.", "Câu hỏi 1 -".
  const itemMarker =
    /^\s*(Bài luyện tập|Bài tập|Thử thách|Nhiệm vụ|Câu hỏi|Yêu cầu|Exercise|Task|Ví dụ|Bài|Câu|Phần)\s*\d+\s*[:.)\-–—]/i;
  // Header that starts the model answer (so it never bleeds into the question).
  const isAnswerHeader = (line: string) =>
    /^(DAP AN|LOI GIAI|BAI GIAI|CODE MAU|CODE GOI Y|GOI Y DAP AN|ANSWER|SOLUTION)\b/.test(
      normalizeVi(line)
    );
  const lines = body.split(/\r?\n/);
  const chunks: string[][] = [];
  let currentChunk: string[] | null = null;

  for (const line of lines) {
    if (itemMarker.test(line)) {
      currentChunk = [line];
      chunks.push(currentChunk);
    } else if (currentChunk) {
      currentChunk.push(line);
    }
  }

  // No explicit item markers — treat the whole tab as a single exercise.
  if (chunks.length === 0 && body.trim()) {
    chunks.push(lines);
  }

  return chunks
    .map((chunk, index): LessonExerciseDraft | null => {
      const firstLine = chunk[0]?.trim() ?? "";
      const headingMatch = firstLine.match(itemMarker);
      const rawTitle = headingMatch
        ? firstLine.slice(headingMatch[0].length).trim()
        : firstLine;

      // Pull a trailing difficulty hint in the title — "(Cấp độ: Dễ)" / "(Độ khó: ⭐⭐)".
      const trailingParen = rawTitle.match(/\(([^)]*)\)\s*$/);
      const levelMatch =
        trailingParen && isLevelLabel(trailingParen[1]) ? trailingParen : null;

      const title =
        (levelMatch ? rawTitle.replace(levelMatch[0], "") : rawTitle).trim() ||
        `${type === "homework" ? "Bài tập" : "Luyện tập"} ${index + 1}`;

      // Split the item at the "Đáp án mẫu" header: everything before is the
      // question (đề bài), everything after (or inline after the colon) is the answer.
      const rest = chunk.slice(1);
      const answerIdx = rest.findIndex(isAnswerHeader);
      const inlineAnswer =
        answerIdx !== -1
          ? (rest[answerIdx].match(/:\s*(.+)$/)?.[1]?.trim() ?? "")
          : "";
      const beforeAnswer = answerIdx === -1 ? rest : rest.slice(0, answerIdx);
      const answerLines = answerIdx === -1 ? [] : rest.slice(answerIdx + 1);

      // A standalone "Độ khó: X" line overrides the title hint; strip it from the question.
      const diffLineIdx = beforeAnswer.findIndex((l) => difficultyLineValue(l) !== null);
      const lineDifficulty =
        diffLineIdx !== -1 ? difficultyFromLabel(beforeAnswer[diffLineIdx]) : null;
      const questionLines = beforeAnswer.filter((_, i) => i !== diffLineIdx);

      const difficulty =
        lineDifficulty ??
        (levelMatch
          ? difficultyFromLabel(levelMatch[1])
          : type === "homework"
            ? "medium"
            : "easy");

      const questionHtml =
        slideTextToHtml(questionLines.join("\n")) || `<p>${escapeText(title)}</p>`;

      // Model answer kept as PLAIN code — combine the inline value (after the
      // colon) with following lines, stripping bare and markdown fences.
      const answerBody = answerLines
        .filter((line) => !CODE_FENCE.test(line.trim()) && !MD_FENCE.test(line.trim()))
        .join("\n")
        .trim();
      const answer = [inlineAnswer, answerBody].filter(Boolean).join("\n").trim();

      if (!title && !questionHtml) return null;

      return {
        type,
        title,
        question: questionHtml,
        answer,
        difficulty,
        points: type === "homework" ? 20 : 10,
        answerVisible: type === "practice",
      };
    })
    .filter((item): item is LessonExerciseDraft => item !== null);
}

/**
 * Returns layout hints for a tab. An explicit roleHint is a verified directive,
 * so it wins outright; keyword heuristics are only a fallback when absent.
 */
export function suggestLayouts(tab: ParsedSlideTab): string[] {
  if (tab.roleHint) {
    return [tab.roleHint];
  }
  return autoSuggestLayouts(tab);
}

/** Keyword-only fallback used when a tab has no explicit "Vai trò gợi ý". */
function autoSuggestLayouts(tab: ParsedSlideTab): string[] {
  const haystack = normalizeVi(`${tab.fullTitle}\n${tab.rawText}`);
  const hints: string[] = [];

  if (/\b(TONG KET|TOM TAT|GHI NHO|CHOT LAI|KET LUAN)\b/.test(haystack)) {
    hints.push("checklist");
  }
  if (
    /\bVS\b/.test(haystack) ||
    /\b(SO SANH|KHAC NHAU|KHAC BIET)\b/.test(haystack) ||
    /\bDUNG\b[\s\S]{0,40}\bSAI\b/.test(haystack) ||
    /\bTRUOC\b[\s\S]{0,40}\bSAU\b/.test(haystack)
  ) {
    hints.push("compare");
  }
  if (
    /\bBUOC\s*\d/.test(haystack) ||
    /→|->/.test(`${tab.fullTitle}\n${tab.rawText}`) ||
    /\b(QUY TRINH|TUAN TU|LAN LUOT|CAC BUOC)\b/.test(haystack)
  ) {
    hints.push("timeline");
  }
  if (/\b(TRO CHUYEN|HOI THOAI)\b/.test(haystack)) {
    hints.push("chat");
  }
  if (
    /\b(EP KIEU|BIEN HINH|CASTING)\b/.test(haystack) ||
    /\bCHUYEN\b[\s\S]{0,15}\bSANG\b/.test(haystack) ||
    /\bBIEN\b[\s\S]{0,15}\bTHANH\b/.test(haystack)
  ) {
    hints.push("flow");
  }

  return hints;
}

// A content tab whose body is shorter than this (whitespace-collapsed chars)
// doesn't earn its own nav entry — it gets folded into the previous tab so the
// lesson flow isn't padded with stubs. Code counts toward the length, so a
// code-heavy slide is never considered thin. Tabs with an explicit "Vai trò gợi
// ý" are intentional and are never merged (nor merged into). Tune here.
const MIN_SECTION_CHARS = 200;

function mergeShortSections(sections: ParsedSlideTab[]): ParsedSlideTab[] {
  const merged: ParsedSlideTab[] = [];

  for (const section of sections) {
    const prev = merged[merged.length - 1];
    const contentLength = section.rawText.replace(/\s+/g, " ").trim().length;
    const isThin =
      !section.roleHint && contentLength > 0 && contentLength < MIN_SECTION_CHARS;

    if (prev && !prev.roleHint && isThin) {
      // Fold the stub into the previous tab, keeping its title as a sub-heading
      // so neither the AI context (rawText) nor the no-AI fallback (html) loses it.
      const heading = section.fullTitle.trim();
      prev.rawText = [prev.rawText, heading, section.rawText]
        .filter(Boolean)
        .join("\n\n");
      prev.html = [
        prev.html,
        heading ? `<h3>${escapeText(heading)}</h3>` : "",
        section.html,
      ]
        .filter(Boolean)
        .join("\n");
      continue;
    }

    merged.push({ ...section });
  }

  return merged;
}

export function parseSlideTemplate(text: string): ParsedSlideTemplate {
  const segments = splitSegments(text);

  let title: string | null = null;
  const sections: ParsedSlideTab[] = [];
  const exercises: LessonExerciseDraft[] = [];

  for (const segment of segments) {
    if (segment.kind === "main") {
      title = segment.title || title;
      continue;
    }

    const normalizedTitle = normalizeVi(segment.title);

    // Homework checked first because "BÀI TẬP VỀ NHÀ" also contains nothing that
    // matches the practice set; practice covers in-class drills.
    if (/\b(BAI TAP|VE NHA|HOMEWORK|BTVN)\b/.test(normalizedTitle)) {
      exercises.push(...parseExerciseTab(segment.body, "homework"));
      continue;
    }
    if (/\b(LUYEN TAP|PRACTICE|THUC HANH|ON LUYEN)\b/.test(normalizedTitle)) {
      exercises.push(...parseExerciseTab(segment.body, "practice"));
      continue;
    }

    if (!segment.title && !segment.body.trim()) continue;

    const fullTitle = segment.title || `Phần ${sections.length + 1}`;
    const { roleHint, body } = extractRoleHint(segment.body);
    sections.push({
      title: shortLabel(fullTitle),
      fullTitle,
      rawText: body,
      html: slideTextToHtml(body),
      ...(roleHint ? { roleHint } : {}),
    });
  }

  return { title, sections: mergeShortSections(sections), exercises };
}
