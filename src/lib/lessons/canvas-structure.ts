import type {
  CanvasCard,
  LessonContentBlock,
  LessonTeachingCanvasBlock,
  LessonTeachingCanvasLayout,
  LessonTeachingCanvasStep,
} from "@/lib/lessons/lesson-media";

/**
 * Deterministic structure repair for AI-generated teaching canvases.
 *
 * The reviewer (lesson-review.ts) hands out CRITICAL penalties (−18 each) when a
 * canvas picks a layout but omits the field that layout needs to render — e.g. a
 * `checklist` with no steps, or a `code` slide with no code. Generators routinely
 * make this mistake (content lands in `mainHtml` instead of `steps`), so a fresh
 * lesson can open at ~39/100 before any human touches it.
 *
 * This pass runs on generation output and, for each mismatch, first tries to
 * RECOVER the missing field from the prose (extract a <ul> into steps, split
 * sentences into steps); if nothing usable is there, it DEMOTES the layout to one
 * that renders the content it actually has (text/code) — never fabricating
 * content. The result clears the deterministic gate up front.
 *
 * Kept deterministic and side-effect free so both the generation routes and the
 * repair route can share it.
 */

// Layouts whose primary content lives in `steps`.
const STEP_LAYOUTS: ReadonlySet<LessonTeachingCanvasLayout> = new Set([
  "checklist",
  "timeline",
  "flow",
  "mindmap",
  "code_explain",
]);

// Layouts that require a non-empty `code` field.
const CODE_LAYOUTS: ReadonlySet<LessonTeachingCanvasLayout> = new Set([
  "code",
  "playground",
  "code_explain",
]);

export function normalizeGeneratedCanvasBlocks(
  blocks: LessonContentBlock[]
): LessonContentBlock[] {
  return mergeCodeWalkthroughBlocks(blocks).map((block) =>
    block.type === "teaching_canvas" ? fixCanvasStructure(block) : block
  );
}

/**
 * "Vai trò gợi ý: <layout>" mà giáo viên ghi trong input là LỆNH, không phải gợi
 * ý — nhưng LLM hay phớt lờ (đổi flow→mindmap, compare→text). Hàm này ÉP canvas
 * CHÍNH (block teaching_canvas đầu tiên không phải hero) về đúng roleHint, có cố
 * gắng nắn nội dung cho hợp (rút <li> ra steps/cards). Luôn chạy KÈM
 * normalizeGeneratedCanvasBlocks ngay sau: nếu nội dung vẫn không hợp layout ép,
 * normalize sẽ tự hạ cấp → không bao giờ tạo canvas vỡ.
 */
const ROLE_COERCIBLE_LAYOUTS: ReadonlySet<LessonTeachingCanvasLayout> = new Set([
  "highlight", "cards", "timeline", "compare", "checklist", "chat", "flow",
  "code_explain", "mindmap", "quiz", "playground", "statement", "cover",
  "two_col_text", "banner", "text", "split", "code", "media",
]);
const ROLE_STEP_LAYOUTS: ReadonlySet<string> = new Set([
  "flow", "timeline", "checklist", "mindmap",
]);
const ROLE_CARD_LAYOUTS: ReadonlySet<string> = new Set(["cards", "compare", "chat"]);

function extractListItemTexts(html: string): string[] {
  const out: string[] = [];
  const pattern = /<li\b[^>]*>([\s\S]*?)<\/li>/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(html))) {
    const text = match[1]
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (text) out.push(text);
  }
  return out;
}

function listItemToCard(text: string): CanvasCard {
  const colon = text.indexOf(":");
  if (colon > 0 && colon <= 60) {
    return { icon: "", title: text.slice(0, colon).trim(), description: text.slice(colon + 1).trim() };
  }
  const words = text.split(/\s+/);
  return {
    icon: "",
    title: words.slice(0, 6).join(" "),
    description: words.length > 6 ? text : "",
  };
}

export function coerceCanvasToRoleHint(
  blocks: LessonContentBlock[],
  roleHintInput: string
): LessonContentBlock[] {
  const roleHint = roleHintInput.trim().toLowerCase() as LessonTeachingCanvasLayout;
  // Layout không hỗ trợ ép (hoặc hero — đã xử lý riêng) → giữ nguyên.
  if (!ROLE_COERCIBLE_LAYOUTS.has(roleHint)) return blocks;
  // LLM đã honor rồi thì thôi.
  if (blocks.some((b) => b.type === "teaching_canvas" && b.layout === roleHint)) {
    return blocks;
  }

  const index = blocks.findIndex(
    (b) => b.type === "teaching_canvas" && b.layout !== "hero"
  );
  if (index === -1) return blocks;

  const main = blocks[index] as LessonTeachingCanvasBlock;
  const next: LessonTeachingCanvasBlock = { ...main, layout: roleHint };

  if (ROLE_STEP_LAYOUTS.has(roleHint)) {
    if (!Array.isArray(next.steps) || next.steps.length === 0) {
      const items = extractListItemTexts(next.mainHtml || "");
      if (items.length > 0) {
        next.steps = items.map((text, i) => ({ id: `${main.id}-role-step-${i + 1}`, text }));
        next.mainHtml = (next.mainHtml || "").replace(/<(ul|ol)\b[\s\S]*?<\/\1>/gi, "").trim();
      }
    }
  } else if (ROLE_CARD_LAYOUTS.has(roleHint)) {
    const haveCards = Array.isArray(next.cards) ? next.cards : [];
    if (haveCards.length < 2) {
      const items = extractListItemTexts(next.mainHtml || "");
      if (items.length >= 2) {
        const cards = items.map(listItemToCard);
        next.cards = roleHint === "compare" ? cards.slice(0, 2) : cards;
        next.mainHtml = "";
      }
    } else if (roleHint === "compare" && haveCards.length > 2) {
      next.cards = haveCards.slice(0, 2);
    }
  }
  // code/prose layouts: chỉ đổi nhãn — normalize sẽ hạ cấp nếu thiếu code.

  const out = [...blocks];
  out[index] = next;
  return out;
}

/**
 * Generators often split a line-by-line walkthrough into TWO canvases: a `code`
 * slide followed by a `timeline`/`checklist` whose steps read "Dòng 1: …". That
 * passes the structural gate (both have their field) but detaches the notes from
 * the code. Re-join such an adjacent pair into a single `code_explain` so the
 * notes anchor to the real lines — and drop a trailing "Output: …" step (output
 * belongs in the code, not as a step).
 */
function mergeCodeWalkthroughBlocks(
  blocks: LessonContentBlock[]
): LessonContentBlock[] {
  const out: LessonContentBlock[] = [];

  for (let i = 0; i < blocks.length; i += 1) {
    const a = blocks[i];
    const b = blocks[i + 1];

    if (
      a?.type === "teaching_canvas" &&
      b?.type === "teaching_canvas" &&
      isCodeBlock(a) &&
      isDetachedLineWalkthrough(b)
    ) {
      out.push({
        ...a,
        layout: "code_explain",
        title: a.title || b.title,
        steps: stripOutputSteps(b.steps),
      });
      i += 1; // consume b
      continue;
    }

    out.push(a);
  }

  return out;
}

function isCodeBlock(block: LessonTeachingCanvasBlock): boolean {
  const layout = block.layout;
  return (
    (layout === "code" || layout === "code_explain" || layout === "playground") &&
    (block.code ?? "").trim().length > 0
  );
}

function isDetachedLineWalkthrough(block: LessonTeachingCanvasBlock): boolean {
  const layout = block.layout;
  return (
    !(block.code ?? "").trim() &&
    (layout === "timeline" || layout === "checklist" || layout === "flow") &&
    looksLikeLineWalkthrough(block.steps ?? [])
  );
}

function stripOutputSteps(
  steps: LessonTeachingCanvasStep[]
): LessonTeachingCanvasStep[] {
  return steps.filter(
    (step) =>
      !/^\s*output\s*[:：]/i.test(step.text || stripHtml(step.html ?? ""))
  );
}

function fixCanvasStructure(
  block: LessonTeachingCanvasBlock
): LessonTeachingCanvasBlock {
  let layout: LessonTeachingCanvasLayout = block.layout ?? "text";
  let mainHtml = block.mainHtml ?? "";
  let steps = Array.isArray(block.steps) ? block.steps : [];
  const code = (block.code ?? "").trim();
  const cards = Array.isArray(block.cards) ? block.cards : [];

  // 0) A numbered code walkthrough mislabeled as a generic step list (its steps
  //    read "Dòng 1: …", "Dòng 5: …") → promote to code_explain so the notes
  //    anchor to the real code lines instead of a detached timeline.
  if (
    code &&
    (layout === "timeline" ||
      layout === "checklist" ||
      layout === "flow" ||
      layout === "code") &&
    looksLikeLineWalkthrough(steps)
  ) {
    layout = "code_explain";
  }

  // 1) Step layout without steps → recover from prose, else demote.
  if (STEP_LAYOUTS.has(layout) && steps.length === 0) {
    const extracted = extractListSteps(mainHtml, block.id);
    const inferred =
      extracted.length > 0 ? extracted : sentenceSteps(mainHtml, block.id);

    if (inferred.length > 0) {
      steps = inferred;
      // Steps came from a <ul>/<ol> → drop it so it isn't shown twice.
      if (extracted.length > 0) mainHtml = removeListHtml(mainHtml);
    } else {
      // Nothing steppable — render the prose (or code) it actually has.
      layout = code ? "code" : "text";
    }
  }

  // 2) Code layout without code → demote (keep steps as a checklist if present).
  if (CODE_LAYOUTS.has(layout) && !code) {
    layout = steps.length > 0 ? "checklist" : "text";
  }

  // 3) Compare needs exactly two cards.
  if (layout === "compare" && cards.length !== 2) {
    layout = cards.length >= 2 ? "cards" : "text";
  }

  // 4) Quiz needs 2–4 options with exactly one correct answer.
  if (layout === "quiz") {
    const correct = cards.filter((card) => card.correct === true).length;
    if (cards.length < 2 || cards.length > 4 || correct !== 1) {
      layout = cards.length >= 2 ? "cards" : "text";
    }
  }

  if (
    layout === block.layout &&
    mainHtml === block.mainHtml &&
    steps === block.steps
  ) {
    return block;
  }

  return { ...block, layout, mainHtml, steps };
}

// True when the steps read like a line-by-line code walkthrough ("Dòng 1: …").
function looksLikeLineWalkthrough(steps: LessonTeachingCanvasStep[]): boolean {
  if (steps.length < 2) return false;
  const annotated = steps.filter((step) =>
    /^\s*(dòng|dong|line|câu lệnh)\s*\d+/i.test(step.text || stripHtml(step.html ?? ""))
  ).length;
  return annotated >= 2 && annotated >= Math.ceil(steps.length / 2);
}

/* ── prose → steps helpers (deterministic, ids derived from block id) ── */

function extractListSteps(
  html: string,
  idPrefix: string
): LessonTeachingCanvasStep[] {
  const steps: LessonTeachingCanvasStep[] = [];
  const pattern = /<li\b[^>]*>([\s\S]*?)<\/li>/gi;
  let match: RegExpExecArray | null;
  let index = 0;

  while ((match = pattern.exec(html))) {
    const itemHtml = match[1].trim();
    const text = stripHtml(itemHtml);
    if (!text) continue;
    index += 1;
    steps.push({ id: `${idPrefix}-fix-step-${index}`, text, html: itemHtml });
  }

  return steps;
}

function sentenceSteps(
  html: string,
  idPrefix: string
): LessonTeachingCanvasStep[] {
  return stripHtml(html)
    .split(/(?<=[.!?。])\s+|\n+|(?:\s+-\s+)/)
    .map((item) => item.trim())
    .filter((item) => item.length >= 18)
    .slice(0, 4)
    .map((text, index) => ({
      id: `${idPrefix}-fix-step-${index + 1}`,
      text,
      html: escapeHtml(text),
    }));
}

function removeListHtml(html: string): string {
  return html.replace(/<(ul|ol)\b[\s\S]*?<\/\1>/gi, "").trim();
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
