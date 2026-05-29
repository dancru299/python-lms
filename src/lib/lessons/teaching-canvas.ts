import type {
  CanvasCard,
  LessonContentBlock,
  LessonTeachingCanvasBlock,
  LessonTeachingCanvasStep,
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
  | "highlight";

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

function buildFromTeachingCanvasBlocks(section: TeachingCanvasSectionSource) {
  return (section.contentBlocks || [])
    .filter(isTeachingCanvasBlock)
    .map((block, index): TeachingCanvas => ({
      id: block.id || `${section.id}-canvas-${index + 1}`,
      kind: getTeachingCanvasKind(block),
      title: block.title || `${section.title} ${index + 1}`,
      html: block.mainHtml || "",
      notesHtml: block.notesHtml || "",
      code: block.code?.trim() || undefined,
      mediaId: block.mediaId?.trim() || undefined,
      cards: block.cards,
      steps:
        block.reveal === false
          ? []
          : block.steps.map((step, stepIndex) => ({
              id: step.id || `${block.id}-step-${stepIndex + 1}`,
              html: step.html || escapeHtml(step.text),
              text: step.text || stripHtml(step.html || ""),
            })),
      sourceBlockIds: [block.id],
    }));
}

function getTeachingCanvasKind(block: LessonTeachingCanvasBlock): TeachingCanvasKind {
  switch (block.layout) {
    case "hero": return "hero";
    case "cards": return "cards";
    case "highlight": return "highlight";
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

function buildTeachingCanvasMainHtml(block: LessonTeachingCanvasBlock) {
  const parts = [block.mainHtml || ""];

  if (block.code?.trim()) {
    parts.push(`<div class="code-block">\n${escapeHtml(block.code.trim())}\n</div>`);
  }

  if (block.mediaId?.trim()) {
    parts.push(
      `<figure class="lesson-media" data-media-id="${escapeAttribute(block.mediaId.trim())}"></figure>`
    );
  }

  return parts.filter((part) => part.trim()).join("\n\n");
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
  return drafts
    .filter((draft) => !isDraftEmpty(draft))
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

  return `<div class="lesson-callout lesson-callout-${block.tone}">${block.html}</div>`;
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
