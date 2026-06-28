import type {
  CanvasCard,
  LessonContentBlock,
  LessonTeachingCanvasBlock,
} from "@/lib/lessons/lesson-media";

export type TeachingCanvasKind =
  | "concept"
  | "split"
  | "code"
  | "media"
  | "steps"
  | "note"
  | "hero"
  | "cards"
  | "highlight"
  | "timeline"
  | "compare"
  | "checklist"
  | "chat"
  | "flow"
  | "code_explain"
  | "mindmap"
  | "quiz"
  | "playground"
  | "statement"
  | "cover"
  | "two_col_text"
  | "banner";

export interface TeachingCanvasStep {
  id: string;
  html: string;
  text: string;
}

export interface TeachingCanvas {
  id: string;
  kind: TeachingCanvasKind;
  title: string;
  html: string;
  notesHtml: string;
  code?: string;
  mediaId?: string;
  cards?: CanvasCard[];
  steps: TeachingCanvasStep[];
  sourceBlockIds: string[];
  // Per-canvas layout customization (carried through from the source block).
  accent?: string;
  ratio?: string;
}

export interface TeachingCanvasSectionSource {
  id: string;
  title: string;
  content?: string;
  renderedContent?: string;
  contentBlocks?: LessonContentBlock[] | null;
}

interface DraftCanvas {
  id: string;
  kind: TeachingCanvasKind;
  title: string;
  htmlParts: string[];
  noteParts: string[];
  steps: TeachingCanvasStep[];
  sourceBlockIds: string[];
}

const MAX_CANVAS_TEXT_LENGTH = 900;
const MAX_CANVAS_PARTS = 4;

export function buildTeachingCanvases(
  section: TeachingCanvasSectionSource
): TeachingCanvas[] {
  if (
    Array.isArray(section.contentBlocks) &&
    section.contentBlocks.some(isTeachingCanvasBlock)
  ) {
    const canvases = buildFromTeachingCanvasBlocks(section);
    if (canvases.length > 0) {
      return canvases;
    }
  }

  if (!Array.isArray(section.contentBlocks) || section.contentBlocks.length === 0) {
    const rawHtml = section.renderedContent || section.content || "";
    const parsedMindmap = tryParseMindmapFromHtml(section.id, section.title, rawHtml);
    if (parsedMindmap) {
      return parsedMindmap;
    }
  }

  const canvases =
    Array.isArray(section.contentBlocks) && section.contentBlocks.length > 0
      ? buildFromBlocks(section)
      : buildFromHtml(section.id, section.title, section.renderedContent || section.content || "");

  if (canvases.length > 0) {
    return canvases;
  }

  return [
    {
      id: `${section.id}-canvas-empty`,
      kind: "concept",
      title: section.title,
      html: "",
      notesHtml: "",
      steps: [],
      sourceBlockIds: [],
    },
  ];
}

export function isTeachingCanvasBlock(
  block: LessonContentBlock
): block is LessonTeachingCanvasBlock {
  return block.type === "teaching_canvas";
}

export function createTeachingCanvasBlock(
  title = "Canvas mới"
): LessonTeachingCanvasBlock {
  const id = `canvas-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  return {
    id,
    type: "teaching_canvas",
    title,
    layout: "split",
    mainHtml: "<p>Nội dung chính của canvas...</p>",
    code: "",
    mediaId: "",
    notesHtml: "<p>Ghi chú nhanh cho học sinh...</p>",
    steps: [
      {
        id: `${id}-step-1`,
        text: "Ý đầu tiên cần học sinh nắm được",
      },
    ],
    reveal: true,
  };
}

export function teachingCanvasBlockToHtml(block: LessonTeachingCanvasBlock) {
  const parts = [block.mainHtml || ""];

  if (block.code?.trim()) {
    parts.push(`<div class="code-block">\n${escapeHtml(block.code.trim())}\n</div>`);
  }

  if (block.mediaId?.trim()) {
    parts.push(
      `<figure class="lesson-media" data-media-id="${escapeAttribute(block.mediaId.trim())}"></figure>`
    );
  }

  if (block.reveal !== false && block.steps.length > 0) {
    const steps = block.steps
      .map((step) => {
        const html = step.html?.trim();
        const content = html && /<\/?[a-z][\s\S]*>/i.test(html)
          ? html
          : escapeHtml(step.text);
        return `<li>${content}</li>`;
      })
      .join("");
    parts.push(`<ul>${steps}</ul>`);
  }

  if (block.notesHtml?.trim()) {
    parts.push(`<blockquote>${block.notesHtml}</blockquote>`);
  }

  return parts.filter((part) => part.trim()).join("\n\n");
}

export function lessonContentBlocksToHtml(blocks: LessonContentBlock[]) {
  return blocks
    .map((block) => blockToHtml(block))
    .filter(Boolean)
    .join("\n\n");
}

const STEP_LAYOUT_KINDS = new Set<TeachingCanvasKind>([
  "steps",
  "timeline",
  "checklist",
  "flow",
  "code_explain",
  "mindmap",
]);

function buildFromTeachingCanvasBlocks(section: TeachingCanvasSectionSource) {
  return (section.contentBlocks || [])
    .filter(isTeachingCanvasBlock)
    .map((block, index): TeachingCanvas => {
      const id = block.id || `${section.id}-canvas-${index + 1}`;
      const kind = getTeachingCanvasKind(block);
      let html = block.mainHtml || "";
      let steps =
        block.reveal === false ? [] : normalizeTeachingCanvasSteps(block.steps, id);

      if (block.reveal !== false && steps.length === 0 && STEP_LAYOUT_KINDS.has(kind)) {
        const listSteps = extractListSteps(html, `${id}-main-list`);
        if (listSteps.length > 0) {
          steps = listSteps;
          html = removeListHtml(html);
        }
      }

      return {
        id,
        kind,
        title: block.title || `${section.title} ${index + 1}`,
        html,
        notesHtml: block.notesHtml || "",
        code: block.code?.trim() || undefined,
        mediaId: block.mediaId?.trim() || undefined,
        cards: block.cards,
        steps,
        sourceBlockIds: [block.id],
        accent: block.accent,
        ratio: block.ratio,
      };
    });
}

function normalizeTeachingCanvasSteps(value: unknown, idPrefix: string): TeachingCanvasStep[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((step, stepIndex): TeachingCanvasStep | null => {
      if (typeof step === "string") {
        const text = step.trim();
        if (!text) return null;
        return {
          id: `${idPrefix}-step-${stepIndex + 1}`,
          html: escapeHtml(text),
          text,
        };
      }

      if (!step || typeof step !== "object") return null;
      const source = step as Record<string, unknown>;
      const html = stringField(source.html);
      const title = stringField(source.title) || stringField(source.label);
      const body =
        stringField(source.text) ||
        stringField(source.description) ||
        stringField(source.content) ||
        stripHtml(html);
      const text = [title, body && body !== title ? body : ""].filter(Boolean).join(": ");
      if (!text) return null;

      return {
        id: stringField(source.id) || `${idPrefix}-step-${stepIndex + 1}`,
        html: html || escapeHtml(text),
        text,
      };
    })
    .filter((step): step is TeachingCanvasStep => step !== null);
}

function stringField(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function removeListHtml(html: string) {
  return html.replace(/<(ul|ol)\b[\s\S]*?<\/\1>/gi, "").trim();
}

function getTeachingCanvasKind(block: LessonTeachingCanvasBlock): TeachingCanvasKind {
  switch (block.layout) {
    case "hero": return "hero";
    case "cards": return "cards";
    case "highlight": return "highlight";
    case "timeline": return "timeline";
    case "compare": return "compare";
    case "checklist": return "checklist";
    case "chat": return "chat";
    case "flow": return "flow";
    case "code_explain": return "code_explain";
    case "mindmap": return "mindmap";
    case "quiz": return "quiz";
    case "playground": return "playground";
    case "statement": return "statement";
    case "cover": return "cover";
    case "two_col_text": return "two_col_text";
    case "banner": return "banner";
    case "code": return "code";
    case "media": return "media";
    case "split":
      if (block.mediaId?.trim()) return "split";
      if (block.code?.trim()) return "code";
      return "concept";
    case "text": return "concept";
  }

  if (block.code?.trim()) return "code";
  if (block.mediaId?.trim()) return "media";
  if (block.steps.length > 0) return "steps";
  return "concept";
}

function buildFromBlocks(section: TeachingCanvasSectionSource) {
  const drafts: DraftCanvas[] = [];
  let current = createDraft(section.id, section.title, drafts.length);

  const flush = () => {
    if (!isDraftEmpty(current)) {
      drafts.push(current);
    }
    current = createDraft(section.id, section.title, drafts.length);
  };

  for (const [index, block] of (section.contentBlocks || []).entries()) {
    if (isTeachingCanvasBlock(block)) {
      continue;
    }

    if (block.canvasBreakBefore && !isDraftEmpty(current)) {
      flush();
    }

    if (block.canvasTitle?.trim()) {
      current.title = block.canvasTitle.trim();
    }

    if (block.canvasRole === "note") {
      current.noteParts.push(blockToHtml(block));
      current.sourceBlockIds.push(block.id);
      continue;
    }

    if (block.type === "rich_text") {
      appendHtmlFragments(
        section.id,
        section.title,
        block.html,
        block.id,
        block.reveal !== false,
        drafts,
        () => current,
        (next) => {
          current = next;
        },
        flush
      );
      continue;
    }

    if ((block.type === "code" || block.type === "image" || block.type === "step_guide") && !isDraftEmpty(current)) {
      flush();
    }

    if (block.canvasTitle?.trim()) {
      current.title = block.canvasTitle.trim();
    }

    current.kind = kindForBlock(block);
    current.sourceBlockIds.push(block.id);

    if (block.type === "step_guide" && block.reveal !== false) {
      current.title = block.canvasTitle?.trim() || block.title || current.title;
      current.steps.push(
        ...block.steps.map((step, stepIndex) => ({
          id: `${block.id}-step-${step.id || stepIndex}`,
          html: `<strong>${escapeHtml(step.title || `Buoc ${stepIndex + 1}`)}</strong>${step.html ? `<div>${step.html}</div>` : ""}`,
          text: `${step.title || `Buoc ${stepIndex + 1}`}${step.html ? ` ${stripHtml(step.html)}` : ""}`.trim(),
        }))
      );
    } else {
      current.htmlParts.push(blockToHtml(block));
    }

    if (index < (section.contentBlocks?.length || 0) - 1 && shouldFlush(current)) {
      flush();
    }
  }

  flush();
  return normalizeDrafts(drafts, section.title);
}

function appendHtmlFragments(
  sectionId: string,
  sectionTitle: string,
  html: string,
  blockId: string,
  reveal: boolean,
  drafts: DraftCanvas[],
  getCurrent: () => DraftCanvas,
  setCurrent: (draft: DraftCanvas) => void,
  flush: () => void
) {
  const fragments = splitHtmlIntoFragments(html);

  for (const fragment of fragments) {
    if (isCanvasBreakHtml(fragment)) {
      flush();
      continue;
    }

    const current = getCurrent();

    if (isHeadingHtml(fragment)) {
      if (!isDraftEmpty(current)) {
        flush();
      }
      const next = getCurrent();
      next.title = stripHtml(fragment) || sectionTitle;
      next.sourceBlockIds.push(blockId);
      continue;
    }

    if (isCodeHtml(fragment) || isMediaHtml(fragment)) {
      if (!isDraftEmpty(current)) {
        flush();
      }
      const next = getCurrent();
      next.kind = isMediaHtml(fragment) ? "media" : "code";
      next.htmlParts.push(fragment);
      next.sourceBlockIds.push(blockId);
      if (shouldFlush(next)) {
        flush();
      }
      continue;
    }

    if (isListHtml(fragment) && reveal) {
      current.kind = "steps";
      current.steps.push(...extractListSteps(fragment, `${blockId}-list-${current.steps.length}`));
      current.sourceBlockIds.push(blockId);
      if (shouldFlush(current)) {
        flush();
      }
      continue;
    }

    if (shouldSplitBefore(current, fragment)) {
      flush();
    }

    const next = getCurrent();
    next.htmlParts.push(fragment);
    next.sourceBlockIds.push(blockId);

    if (isCalloutHtml(fragment)) {
      next.kind = "note";
    }

    if (shouldFlush(next)) {
      flush();
      setCurrent(createDraft(sectionId, sectionTitle, drafts.length));
    }
  }
}

function buildFromHtml(sectionId: string, sectionTitle: string, html: string) {
  const drafts: DraftCanvas[] = [];
  let current = createDraft(sectionId, sectionTitle, drafts.length);

  const flush = () => {
    if (!isDraftEmpty(current)) {
      drafts.push(current);
    }
    current = createDraft(sectionId, sectionTitle, drafts.length);
  };

  appendHtmlFragments(
    sectionId,
    sectionTitle,
    html,
    `${sectionId}-html`,
    true,
    drafts,
    () => current,
    (next) => {
      current = next;
    },
    flush
  );

  flush();
  return normalizeDrafts(drafts, sectionTitle);
}

function createDraft(sectionId: string, sectionTitle: string, index: number): DraftCanvas {
  return {
    id: `${sectionId}-canvas-${index + 1}`,
    kind: "concept",
    title: index === 0 ? sectionTitle : `${sectionTitle} ${index + 1}`,
    htmlParts: [],
    noteParts: [],
    steps: [],
    sourceBlockIds: [],
  };
}

function normalizeDrafts(drafts: DraftCanvas[], sectionTitle: string): TeachingCanvas[] {
  return mergeTinyDrafts(drafts.filter((draft) => !isDraftEmpty(draft)))
    .map((draft, index) => ({
      id: draft.id,
      kind: draft.kind,
      title: draft.title || `${sectionTitle} ${index + 1}`,
      html: draft.htmlParts.join("\n\n"),
      notesHtml: draft.noteParts.join("\n\n"),
      steps: draft.steps,
      sourceBlockIds: Array.from(new Set(draft.sourceBlockIds)),
    }));
}

// A near-empty text fragment (a lone short paragraph or stray heading) becomes
// an ugly half-blank canvas on its own. Fold it back into the previous canvas
// when there's room, so we don't ship "trống" tabs from raw HTML/blocks.
const TINY_DRAFT_TEXT_LENGTH = 60;

function mergeTinyDrafts(drafts: DraftCanvas[]): DraftCanvas[] {
  const result: DraftCanvas[] = [];

  for (const draft of drafts) {
    const prev = result[result.length - 1];
    if (prev && isTinyTextDraft(draft) && canAbsorbDraft(prev, draft)) {
      prev.htmlParts.push(...draft.htmlParts);
      prev.noteParts.push(...draft.noteParts);
      prev.sourceBlockIds.push(...draft.sourceBlockIds);
      continue;
    }
    result.push(draft);
  }

  return result;
}

function isTinyTextDraft(draft: DraftCanvas) {
  if (draft.steps.length > 0) return false;
  if (draft.kind === "code" || draft.kind === "media") return false;
  const text = stripHtml([...draft.htmlParts, ...draft.noteParts].join(" "));
  return text.length < TINY_DRAFT_TEXT_LENGTH;
}

function canAbsorbDraft(prev: DraftCanvas, draft: DraftCanvas) {
  if (prev.kind === "code" || prev.kind === "media") return false;
  if (prev.htmlParts.length + draft.htmlParts.length > MAX_CANVAS_PARTS) return false;
  const combined = stripHtml([...prev.htmlParts, ...draft.htmlParts].join(" "));
  return combined.length <= MAX_CANVAS_TEXT_LENGTH;
}

function isDraftEmpty(draft: DraftCanvas) {
  return (
    draft.htmlParts.length === 0 &&
    draft.noteParts.length === 0 &&
    draft.steps.length === 0
  );
}

function shouldFlush(draft: DraftCanvas) {
  return (
    draft.steps.length >= 5 ||
    draft.htmlParts.length >= MAX_CANVAS_PARTS ||
    stripHtml(draft.htmlParts.join(" ")).length > MAX_CANVAS_TEXT_LENGTH
  );
}

function shouldSplitBefore(draft: DraftCanvas, nextHtml: string) {
  if (isDraftEmpty(draft)) {
    return false;
  }

  if (draft.steps.length > 0 && stripHtml(nextHtml).length > 220) {
    return true;
  }

  const nextLength = stripHtml(draft.htmlParts.join(" ") + " " + nextHtml).length;
  return draft.htmlParts.length >= 2 && nextLength > MAX_CANVAS_TEXT_LENGTH;
}

function kindForBlock(block: LessonContentBlock): TeachingCanvasKind {
  if (block.type === "teaching_canvas") {
    return getTeachingCanvasKind(block);
  }

  if (block.type === "code") {
    return "code";
  }

  if (block.type === "image") {
    return "media";
  }

  if (block.type === "step_guide") {
    return "steps";
  }

  if (block.type === "callout") {
    return "note";
  }

  return "concept";
}

function blockToHtml(block: LessonContentBlock) {
  if (block.type === "teaching_canvas") {
    return teachingCanvasBlockToHtml(block);
  }

  if (block.type === "rich_text") {
    return block.html;
  }

  if (block.type === "image") {
    return `<figure class="lesson-media" data-media-id="${escapeAttribute(block.mediaId)}"></figure>`;
  }

  if (block.type === "code") {
    return `<div class="code-block">\n${escapeHtml(block.code)}\n</div>`;
  }

  if (block.type === "step_guide") {
    const steps = block.steps
      .map(
        (step, index) => `<li data-step-id="${escapeAttribute(step.id || `step-${index + 1}`)}">
  <h4>${escapeHtml(step.title || `Buoc ${index + 1}`)}</h4>
  <div class="step-content">${step.html || ""}</div>
</li>`
      )
      .join("\n");

    return `<section class="lesson-step-guide" data-block-type="step-guide">
  <h3>${escapeHtml(block.title || "Huong dan tung buoc")}</h3>
  <ol>${steps}</ol>
</section>`;
  }

  // Callout (and any unexpected block shape): guard the fields so a missing
  // tone/html never renders as the literal string "undefined".
  const fallback = block as { tone?: string; html?: string };
  return `<div class="lesson-callout lesson-callout-${fallback.tone || "info"}">${
    fallback.html || ""
  }</div>`;
}

function splitHtmlIntoFragments(html: string) {
  if (!html?.trim()) {
    return [];
  }

  const fragments: string[] = [];
  const pattern =
    /<hr\b[^>]*>|<(h2|h3|h4|p|ul|ol|pre|div|section|figure|table|blockquote)\b[\s\S]*?<\/\1>/gi;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(html))) {
    const before = html.slice(lastIndex, match.index).trim();
    if (before) {
      fragments.push(wrapLooseText(before));
    }

    fragments.push(match[0].trim());
    lastIndex = pattern.lastIndex;
  }

  const rest = html.slice(lastIndex).trim();
  if (rest) {
    fragments.push(wrapLooseText(rest));
  }

  return fragments;
}

function wrapLooseText(value: string) {
  if (/<\/?[a-z][\s\S]*>/i.test(value)) {
    return value;
  }

  return `<p>${escapeHtml(value)}</p>`;
}

function extractListSteps(html: string, idPrefix: string): TeachingCanvasStep[] {
  const steps: TeachingCanvasStep[] = [];
  const pattern = /<li\b[^>]*>([\s\S]*?)<\/li>/gi;
  let match: RegExpExecArray | null;
  let index = 0;

  while ((match = pattern.exec(html))) {
    const itemHtml = match[1].trim();
    const text = stripHtml(itemHtml);
    if (text) {
      steps.push({
        id: `${idPrefix}-${index + 1}`,
        html: itemHtml,
        text,
      });
      index += 1;
    }
  }

  return steps;
}

function isHeadingHtml(html: string) {
  return /^<h[2-4]\b/i.test(html.trim());
}

function isListHtml(html: string) {
  return /^<(ul|ol)\b/i.test(html.trim());
}

function isCodeHtml(html: string) {
  return /^<pre\b/i.test(html.trim()) || /class=["'][^"']*code-block/i.test(html);
}

function isMediaHtml(html: string) {
  return /^<figure\b/i.test(html.trim()) || /class=["'][^"']*lesson-media/i.test(html);
}

function isCalloutHtml(html: string) {
  return /lesson-callout|blockquote/i.test(html);
}

function isCanvasBreakHtml(html: string) {
  return /^<hr\b[^>]*data-canvas-break/i.test(html.trim());
}

function stripHtml(html: string) {
  return decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  );
}

function decodeEntities(value: string) {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttribute(value: string) {
  return escapeHtml(value).replace(/`/g, "&#96;");
}

function tryParseMindmapFromHtml(
  sectionId: string,
  sectionTitle: string,
  html: string
): TeachingCanvas[] | null {
  const cleanHtml = html.trim();
  // Check if it has the "Chủ đề trung tâm" heading
  const hasCenter = /<h[2-4]\b[^>]*>\s*Chủ đề trung tâm\s*<\/h[2-4]>/i.test(cleanHtml);
  if (!hasCenter) {
    return null;
  }

  const fragments = splitHtmlIntoFragments(cleanHtml);
  const canvases: TeachingCanvas[] = [];

  let centerTitle = "";
  let nextIsCenterTitle = false;
  
  interface TempBranch {
    title: string;
    items: string[];
  }
  const branches: TempBranch[] = [];
  let currentBranch: TempBranch | null = null;
  
  // For non-mindmap content that appears after or outside the mindmap (like "Lỗi phổ biến cần nhớ")
  const extraDrafts: DraftCanvas[] = [];
  let currentConcept: DraftCanvas | null = null;
  let isBuildingMindmap = true;

  const flushConcept = () => {
    if (currentConcept && !isDraftEmpty(currentConcept)) {
      extraDrafts.push(currentConcept);
    }
    currentConcept = null;
  };

  for (const fragment of fragments) {
    const text = stripHtml(fragment).trim();
    if (!fragment.trim()) continue;

    // 1. Detect "Chủ đề trung tâm" heading
    if (/<h[2-4]\b[^>]*>\s*Chủ đề trung tâm\s*<\/h[2-4]>/i.test(fragment)) {
      nextIsCenterTitle = true;
      isBuildingMindmap = true;
      continue;
    }

    if (nextIsCenterTitle) {
      centerTitle = text;
      nextIsCenterTitle = false;
      continue;
    }

    if (isBuildingMindmap) {
      const startsWithBranch = /^\s*Nhánh\s*\d*\s*:/i.test(text);

      if (startsWithBranch) {
        currentBranch = {
          title: text,
          items: [],
        };
        branches.push(currentBranch);
        continue;
      }

      // Check if we should end the mindmap at this heading
      if (isHeadingHtml(fragment)) {
        // Look ahead to see if there is any remaining fragment starting with "Nhánh"
        const remainingFragments = fragments.slice(fragments.indexOf(fragment) + 1);
        const hasMoreBranches = remainingFragments.some(f => 
          /^\s*Nhánh\s*\d*\s*:/i.test(stripHtml(f).trim())
        );

        if (!hasMoreBranches) {
          isBuildingMindmap = false;
          // fall through to non-mindmap processing!
        }
      }

      if (isBuildingMindmap) {
        if (currentBranch) {
          currentBranch.items.push(text);
        }
        continue;
      }
    }

    // 2. Non-mindmap processing (starts here if isBuildingMindmap was set to false or was never true)
    if (!currentConcept) {
      currentConcept = createDraft(sectionId, sectionTitle, canvases.length + extraDrafts.length + 1);
    }

    if (isHeadingHtml(fragment)) {
      flushConcept();
      currentConcept = createDraft(sectionId, sectionTitle, canvases.length + extraDrafts.length + 1);
      currentConcept.title = text;
      currentConcept.sourceBlockIds.push(`${sectionId}-html`);
    } else if (isCodeHtml(fragment) || isMediaHtml(fragment)) {
      flushConcept();
      currentConcept = createDraft(sectionId, sectionTitle, canvases.length + extraDrafts.length + 1);
      currentConcept.kind = isMediaHtml(fragment) ? "media" : "code";
      currentConcept.htmlParts.push(fragment);
      currentConcept.sourceBlockIds.push(`${sectionId}-html`);
      flushConcept();
    } else {
      currentConcept.htmlParts.push(fragment);
      currentConcept.sourceBlockIds.push(`${sectionId}-html`);
      if (isCalloutHtml(fragment)) {
        currentConcept.kind = "note";
      }
      if (shouldFlush(currentConcept)) {
        flushConcept();
      }
    }
  }

  // Flush mindmap canvas
  if (branches.length > 0) {
    const steps: TeachingCanvasStep[] = branches.map((b, bIdx) => {
      // Group items with bullet points
      const titleHtml = `<strong>${escapeHtml(b.title)}</strong>`;
      const itemsHtml = b.items
        .map(item => `• ${escapeHtml(item)}`)
        .join("<br />");
      const combinedHtml = itemsHtml ? `${titleHtml}<br />${itemsHtml}` : titleHtml;

      return {
        id: `${sectionId}-mindmap-branch-${bIdx + 1}`,
        html: combinedHtml,
        text: stripHtml(combinedHtml),
      };
    });

    canvases.push({
      id: `${sectionId}-canvas-1`,
      kind: "mindmap",
      title: centerTitle || sectionTitle,
      html: "",
      notesHtml: "",
      steps,
      sourceBlockIds: [`${sectionId}-html`],
    });
  }

  // Flush remaining concept canvas
  flushConcept();

  // Add extraDrafts to canvases
  for (const draft of extraDrafts) {
    canvases.push({
      id: draft.id,
      kind: draft.kind,
      title: draft.title || `${sectionTitle} ${canvases.length + 1}`,
      html: draft.htmlParts.join("\n\n"),
      notesHtml: draft.noteParts.join("\n\n"),
      steps: draft.steps,
      sourceBlockIds: Array.from(new Set(draft.sourceBlockIds)),
    });
  }

  return canvases.length > 0 ? canvases : null;
}
