"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent,
} from "react";
import LessonContentRenderer from "@/components/lessons/LessonContentRenderer";
import TeachingCanvasRenderer from "@/components/lessons/TeachingCanvasRenderer";
import {
  buildTeachingCanvases,
  createTeachingCanvasBlock,
  isTeachingCanvasBlock,
  lessonContentBlocksToHtml,
} from "@/lib/lessons/teaching-canvas";
import type {
  CanvasCard,
  LessonContentBlock,
  LessonImageAnnotation,
  LessonMediaView,
  LessonTeachingCanvasBlock,
  LessonTeachingCanvasLayout,
  LessonTeachingCanvasStep,
  StepGuideItem,
} from "@/lib/lessons/lesson-media";

export interface EditableLessonSection {
  id: string;
  title: string;
  content: string;
  contentFormat?: string;
  contentBlocks?: LessonContentBlock[] | null;
}

interface LessonSectionEditorProps {
  section: EditableLessonSection;
  lessonId?: string;
  draftId: string;
  onOpenTemplate: () => void;
  onChange: (nextSection: EditableLessonSection) => void;
}

type EditorMode = "canvas" | "blocks" | "html";
type AnnotationTool = "rect" | "arrow" | "marker" | "label";

const DEFAULT_STEP: StepGuideItem = {
  id: "step-1",
  title: "Buoc 1",
  html: "<p>Mo ta thao tac can thuc hien...</p>",
};

export default function LessonSectionEditor({
  section,
  lessonId,
  draftId,
  onOpenTemplate,
  onChange,
}: LessonSectionEditorProps) {
  const [media, setMedia] = useState<LessonMediaView[]>([]);
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [mediaModal, setMediaModal] = useState<{
    placeholderId?: string;
    suggestedCaption?: string;
    canvasBlockId?: string;
    mainHtmlPlaceholderId?: string;
  } | null>(null);
  const [stepModalOpen, setStepModalOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<EditorMode>("canvas");
  const [blocks, setBlocks] = useState<LessonContentBlock[]>(
    () => normalizeBlocksForCanvasEditor(section)
  );
  const [activeCanvasId, setActiveCanvasId] = useState(() => {
    const firstCanvas = normalizeBlocksForCanvasEditor(section).find(isTeachingCanvasBlock);
    return firstCanvas?.id || null;
  });

  useEffect(() => {
    let cancelled = false;

    async function loadMedia() {
      if (!lessonId && !draftId) {
        return;
      }

      setLoadingMedia(true);
      try {
        const params = new URLSearchParams();
        if (lessonId) {
          params.set("lessonId", lessonId);
        } else {
          params.set("draftId", draftId);
        }

        const response = await fetch(`/api/admin/lesson-media?${params}`);
        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as LessonMediaView[];
        if (!cancelled) {
          setMedia(data);
        }
      } finally {
        if (!cancelled) {
          setLoadingMedia(false);
        }
      }
    }

    void loadMedia();
    return () => {
      cancelled = true;
    };
  }, [lessonId, draftId]);

  const mediaById = useMemo(
    () => new Map(media.map((item) => [item.id, item])),
    [media]
  );

  useEffect(() => {
    const nextBlocks = normalizeBlocksForCanvasEditor(section);
    setBlocks(nextBlocks);
    setActiveCanvasId(nextBlocks.find(isTeachingCanvasBlock)?.id || null);
    setEditorMode("canvas");
    if (
      nextBlocks.some(isTeachingCanvasBlock) &&
      (section.contentFormat !== "canvas" ||
        !Array.isArray(section.contentBlocks) ||
        !section.contentBlocks.some(isTeachingCanvasBlock))
    ) {
      onChange({
        ...section,
        content: lessonContentBlocksToHtml(nextBlocks),
        contentFormat: "canvas",
        contentBlocks: nextBlocks,
      });
    }
  }, [section.id]);

  const updateContent = (
    content: string,
    nextBlocks: LessonContentBlock[] | null = section.contentBlocks || null,
    nextFormat: string =
      editorMode === "canvas" ? "canvas" : editorMode === "blocks" ? "blocks" : "html"
  ) => {
    onChange({
      ...section,
      content,
      contentFormat: nextFormat,
      contentBlocks: nextBlocks,
    });
  };

  const insertContent = (content: string) => {
    updateContent(section.content + (section.content ? "\n\n" : "") + content);
  };

  const insertMediaFigure = (
    selectedMedia: LessonMediaView,
    caption: string,
    altText: string,
    placeholderId?: string
  ) => {
    const figureHtml = buildMediaFigureHtml(selectedMedia, caption, altText);
    const nextContent = placeholderId
      ? replacePlaceholderWithFigure(section.content, placeholderId, figureHtml)
      : section.content + (section.content ? "\n\n" : "") + figureHtml;

    updateContent(nextContent);
  };

  const insertStepGuide = (title: string, steps: StepGuideItem[]) => {
    insertContent(buildStepGuideHtml(title, steps, mediaById));
  };

  const switchToBlocks = () => {
    const nextBlocks =
      blocks.length > 0 ? blocks : htmlToBlocks(section.content);
    setBlocks(nextBlocks);
    updateContent(blocksToHtml(nextBlocks, mediaById), nextBlocks, "blocks");
    setEditorMode("blocks");
  };

  const switchToCanvas = () => {
    const nextBlocks = normalizeBlocksForCanvasEditor({
      ...section,
      contentBlocks: blocks.length > 0 ? blocks : section.contentBlocks,
    });
    setBlocks(nextBlocks);
    setActiveCanvasId(nextBlocks.find(isTeachingCanvasBlock)?.id || null);
    updateContent(blocksToHtml(nextBlocks, mediaById), nextBlocks, "canvas");
    setEditorMode("canvas");
  };

  const updateBlocks = (
    nextBlocks: LessonContentBlock[],
    nextFormat: "canvas" | "blocks" = editorMode === "canvas" ? "canvas" : "blocks"
  ) => {
    setBlocks(nextBlocks);
    updateContent(blocksToHtml(nextBlocks, mediaById), nextBlocks, nextFormat);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 pb-3">
        <div className="flex rounded-lg bg-gray-100 p-1 text-xs">
          <button
            type="button"
            onClick={switchToCanvas}
            className={`rounded-md px-3 py-1.5 font-semibold ${
              editorMode === "canvas" ? "bg-white text-indigo-700 shadow-sm" : "text-gray-500"
            }`}
          >
            Canvas
          </button>
          <button
            type="button"
            onClick={switchToBlocks}
            className={`rounded-md px-3 py-1.5 font-semibold ${
              editorMode === "blocks" ? "bg-white text-indigo-700 shadow-sm" : "text-gray-500"
            }`}
          >
            Blocks
          </button>
          <button
            type="button"
            onClick={() => {
              setEditorMode("html");
              updateContent(section.content, null, "html");
            }}
            className={`rounded-md px-3 py-1.5 font-semibold ${
              editorMode === "html" ? "bg-white text-indigo-700 shadow-sm" : "text-gray-500"
            }`}
          >
            HTML
          </button>
        </div>

        {editorMode === "canvas" && (
          <button
            type="button"
            onClick={() => setPreviewOpen(true)}
            className="ml-auto flex items-center gap-1.5 rounded-lg bg-indigo-50 px-3 py-1.5 text-sm font-semibold text-indigo-700 hover:bg-indigo-100"
          >
            <i className="fa-solid fa-eye"></i>
            Preview
          </button>
        )}

        {editorMode !== "canvas" && (
          <>
            <span className="ml-2 text-xs text-gray-500">Chen nhanh:</span>
            <button
              type="button"
              onClick={onOpenTemplate}
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
            >
              <i className="fa-solid fa-wand-magic-sparkles mr-1"></i>
              Mau
            </button>
            <button
              type="button"
              onClick={() => setMediaModal({})}
              className="rounded bg-sky-100 px-2 py-1 text-xs font-semibold text-sky-700 hover:bg-sky-200"
            >
              <i className="fa-solid fa-image mr-1"></i>
              Anh
            </button>
            <button
              type="button"
              onClick={() => setStepModalOpen(true)}
              className="rounded bg-cyan-100 px-2 py-1 text-xs font-semibold text-cyan-700 hover:bg-cyan-200"
            >
              <i className="fa-solid fa-list-ol mr-1"></i>
              Step guide
            </button>
            <div className="h-6 w-px bg-gray-200"></div>
            <button
              type="button"
              onClick={() =>
                insertContent(`<div class="code-block">\n# Code o day\nprint("Hello")\n</div>`)
              }
              className="rounded bg-gray-100 px-2 py-1 text-xs hover:bg-gray-200"
            >
              <i className="fa-solid fa-code mr-1"></i>
              Code
            </button>
            <button
              type="button"
              onClick={() => insertContent(`<ul>\n  <li>Muc 1</li>\n  <li>Muc 2</li>\n</ul>`)}
              className="rounded bg-gray-100 px-2 py-1 text-xs hover:bg-gray-200"
            >
              <i className="fa-solid fa-list mr-1"></i>
              List
            </button>
            <button
              type="button"
              onClick={() => insertContent(`<hr data-canvas-break />`)}
              className="rounded bg-violet-100 px-2 py-1 text-xs font-semibold text-violet-700 hover:bg-violet-200"
            >
              <i className="fa-solid fa-clapperboard mr-1"></i>
              Canvas moi
            </button>
          </>
        )}
      </div>

      {loadingMedia && (
        <div className="rounded-lg border border-sky-100 bg-sky-50 px-3 py-2 text-xs font-medium text-sky-700">
          Dang tai thu vien anh...
        </div>
      )}

      {editorMode === "canvas" ? (
        <LessonCanvasBuilder
          blocks={blocks.filter(isTeachingCanvasBlock)}
          media={media}
          activeCanvasId={activeCanvasId}
          onActiveCanvasChange={setActiveCanvasId}
          onPickMedia={(canvasBlockId, placeholderInfo) =>
            setMediaModal({
              canvasBlockId,
              mainHtmlPlaceholderId: placeholderInfo?.id,
              suggestedCaption: placeholderInfo?.suggestedCaption,
            })
          }
          onChange={(nextCanvasBlocks) => updateBlocks(nextCanvasBlocks, "canvas")}
        />
      ) : (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.9fr)]">
          <div className="min-w-0">
            {editorMode === "blocks" ? (
              <LessonBlockBuilder
                blocks={blocks}
                media={media}
                onChange={(nextBlocks) => updateBlocks(nextBlocks, "blocks")}
              />
            ) : (
              <textarea
                value={section.content}
                onChange={(event) => updateContent(event.target.value, null, "html")}
                placeholder={`Noi dung HTML cua tab "${section.title}"...`}
                className="input min-h-[420px] font-mono text-sm"
                style={{ whiteSpace: "pre-wrap" }}
              />
            )}
          </div>

          <div className="min-w-0 rounded-xl border border-gray-200 bg-slate-50 p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm font-bold text-gray-700">
                <i className="fa-solid fa-eye mr-2 text-indigo-500"></i>
                Preview
              </div>
              <div className="text-xs text-gray-400">{media.length} anh</div>
            </div>
            <div className="max-h-[560px] overflow-auto rounded-lg bg-white p-4 shadow-inner">
              {section.content.trim() ? (
                <LessonContentRenderer
                  html={section.content}
                  media={media}
                  editable
                  onPlaceholderClick={(placeholder) =>
                    setMediaModal({
                      placeholderId: placeholder.id,
                      suggestedCaption: placeholder.suggestedCaption,
                    })
                  }
                />
              ) : (
                <div className="rounded-lg border-2 border-dashed border-gray-200 py-12 text-center text-sm text-gray-400">
                  Preview se hien thi tai day
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {mediaModal && (
        <LessonMediaModal
          lessonId={lessonId}
          draftId={draftId}
          media={media}
          suggestedCaption={mediaModal.suggestedCaption}
          onClose={() => setMediaModal(null)}
          onMediaChange={setMedia}
          onInsert={(selectedMedia, caption, altText) => {
            if (mediaModal.canvasBlockId && mediaModal.mainHtmlPlaceholderId) {
              // Replace placeholder inside canvas mainHtml
              const figureHtml = buildMediaFigureHtml(selectedMedia, caption, altText);
              updateBlocks(
                blocks.map((block) =>
                  block.id === mediaModal.canvasBlockId && isTeachingCanvasBlock(block)
                    ? {
                        ...block,
                        mainHtml: replacePlaceholderWithFigure(
                          block.mainHtml,
                          mediaModal.mainHtmlPlaceholderId!,
                          figureHtml
                        ),
                        layout: block.layout === "text" ? "media" : block.layout,
                      }
                    : block
                ),
                "canvas"
              );
            } else if (mediaModal.canvasBlockId) {
              updateBlocks(
                blocks.map((block) =>
                  block.id === mediaModal.canvasBlockId && isTeachingCanvasBlock(block)
                    ? {
                        ...block,
                        mediaId: selectedMedia.id,
                        layout: block.layout === "text" ? "split" : block.layout,
                      }
                    : block
                ),
                "canvas"
              );
            } else {
              insertMediaFigure(
                selectedMedia,
                caption,
                altText,
                mediaModal.placeholderId
              );
            }
            setMediaModal(null);
          }}
        />
      )}

      {stepModalOpen && (
        <StepGuideModal
          media={media}
          onClose={() => setStepModalOpen(false)}
          onInsert={(title, steps) => {
            insertStepGuide(title, steps);
            setStepModalOpen(false);
          }}
        />
      )}

      {previewOpen && (
        <CanvasPreviewModal
          sectionId={section.id}
          sectionTitle={section.title}
          blocks={blocks}
          media={media}
          mediaById={mediaById}
          onClose={() => setPreviewOpen(false)}
        />
      )}
    </div>
  );
}

function CanvasPreviewModal({
  sectionId,
  sectionTitle,
  blocks,
  media,
  mediaById,
  onClose,
}: {
  sectionId: string;
  sectionTitle: string;
  blocks: LessonContentBlock[];
  media: LessonMediaView[];
  mediaById: Map<string, LessonMediaView>;
  onClose: () => void;
}) {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-sm"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <i className="fa-solid fa-eye text-indigo-500"></i>
            <span className="text-sm font-bold text-gray-800">Preview — {sectionTitle}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          >
            <i className="fa-solid fa-times"></i>
          </button>
        </div>
        <div className="flex-1 overflow-auto bg-slate-50 p-5">
          <TeachingCanvasRenderer
            sectionId={sectionId}
            sectionTitle={sectionTitle}
            canvases={buildTeachingCanvases({
              id: sectionId,
              title: sectionTitle,
              content: blocksToHtml(blocks, mediaById),
              contentBlocks: blocks,
            })}
            media={media}
          />
        </div>
      </div>
    </div>
  );
}

function LessonCanvasBuilder({
  blocks,
  media,
  activeCanvasId,
  onActiveCanvasChange,
  onPickMedia,
  onChange,
}: {
  blocks: LessonTeachingCanvasBlock[];
  media: LessonMediaView[];
  activeCanvasId: string | null;
  onActiveCanvasChange: (id: string | null) => void;
  onPickMedia: (canvasBlockId: string, placeholderInfo?: { id: string; suggestedCaption: string }) => void;
  onChange: (blocks: LessonTeachingCanvasBlock[]) => void;
}) {
  const activeCanvas =
    blocks.find((block) => block.id === activeCanvasId) || blocks[0] || null;
  const selectedMedia = activeCanvas?.mediaId
    ? media.find((item) => item.id === activeCanvas.mediaId)
    : null;
  const [supportOpen, setSupportOpen] = useState(
    !!(activeCanvas?.code?.trim() || activeCanvas?.mediaId?.trim() || activeCanvas?.notesHtml?.trim())
  );

  useEffect(() => {
    const canvas = blocks.find((b) => b.id === activeCanvasId) ?? blocks[0];
    setSupportOpen(!!(canvas?.code?.trim() || canvas?.mediaId?.trim() || canvas?.notesHtml?.trim()));
  }, [activeCanvasId]);

  const updateCanvas = (
    id: string,
    patch: Partial<LessonTeachingCanvasBlock>
  ) => {
    onChange(blocks.map((block) => (block.id === id ? { ...block, ...patch } : block)));
  };

  const addCanvas = () => {
    const next = createTeachingCanvasBlock(`Canvas ${blocks.length + 1}`);
    onChange([...blocks, next]);
    onActiveCanvasChange(next.id);
  };

  const removeCanvas = (id: string) => {
    if (blocks.length <= 1) {
      return;
    }

    const nextBlocks = blocks.filter((block) => block.id !== id);
    onChange(nextBlocks);
    onActiveCanvasChange(nextBlocks[0]?.id || null);
  };

  const moveCanvas = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= blocks.length) {
      return;
    }

    const next = [...blocks];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  const updateStep = (
    canvasId: string,
    stepId: string,
    patch: Partial<LessonTeachingCanvasStep>
  ) => {
    const canvas = blocks.find((block) => block.id === canvasId);
    if (!canvas) {
      return;
    }

    updateCanvas(canvasId, {
      steps: canvas.steps.map((step) =>
        step.id === stepId ? { ...step, ...patch } : step
      ),
    });
  };

  const addStep = (canvas: LessonTeachingCanvasBlock) => {
    const stepId = `${canvas.id}-step-${Date.now()}`;
    updateCanvas(canvas.id, {
      reveal: true,
      steps: [
        ...canvas.steps,
        {
          id: stepId,
          text: `Ý ${canvas.steps.length + 1}`,
        },
      ],
    });
  };

  const removeStep = (canvas: LessonTeachingCanvasBlock, stepId: string) => {
    updateCanvas(canvas.id, {
      steps: canvas.steps.filter((step) => step.id !== stepId),
    });
  };

  const moveStep = (canvas: LessonTeachingCanvasBlock, index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= canvas.steps.length) {
      return;
    }

    const next = [...canvas.steps];
    [next[index], next[target]] = [next[target], next[index]];
    updateCanvas(canvas.id, { steps: next });
  };

  if (!activeCanvas) {
    return (
      <div className="rounded-xl border-2 border-dashed border-indigo-200 bg-indigo-50/50 p-8 text-center">
        <p className="text-sm font-semibold text-indigo-700">Chưa có canvas nào</p>
        <button type="button" onClick={addCanvas} className="btn btn-primary mt-4">
          <i className="fa-solid fa-plus"></i>
          Thêm canvas
        </button>
      </div>
    );
  }

  const activeIndex = blocks.findIndex((b) => b.id === activeCanvas.id);

  return (
    <div className="space-y-3">
      {/* Canvas navigation — horizontal tabs */}
      <div className="flex items-center gap-2">
        <div className="flex flex-1 items-center gap-1.5 overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 p-1.5">
          {blocks.map((block, index) => (
            <button
              key={block.id}
              type="button"
              onClick={() => onActiveCanvasChange(block.id)}
              className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-all ${
                activeCanvas.id === block.id
                  ? "bg-white font-bold text-indigo-700 shadow-sm ring-1 ring-indigo-100"
                  : "font-medium text-slate-500 hover:bg-white/70 hover:text-slate-700"
              }`}
            >
              <span className={`text-[10px] font-black ${activeCanvas.id === block.id ? "text-indigo-400" : "text-slate-400"}`}>
                {index + 1}
              </span>
              <span className="max-w-[140px] truncate">{block.title || `Canvas ${index + 1}`}</span>
              {block.steps.length > 0 && (
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                  activeCanvas.id === block.id ? "bg-violet-100 text-violet-600" : "bg-slate-200 text-slate-500"
                }`}>
                  {block.steps.length}
                </span>
              )}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={addCanvas}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-indigo-600 transition-colors hover:border-indigo-200 hover:bg-indigo-50"
        >
          <i className="fa-solid fa-plus text-sm"></i>
        </button>
      </div>

      {/* Canvas header: số thứ tự + điều hướng vị trí */}
      <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="shrink-0 text-[11px] font-black uppercase tracking-wider text-indigo-400">
            {activeIndex + 1} / {blocks.length}
          </span>
          <span className="truncate text-sm font-bold text-slate-700">{activeCanvas.title}</span>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => moveCanvas(activeIndex, -1)}
            disabled={activeIndex === 0}
            title="Di chuyển sang trái"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-25"
          >
            <i className="fa-solid fa-chevron-left text-xs"></i>
          </button>
          <button
            type="button"
            onClick={() => moveCanvas(activeIndex, 1)}
            disabled={activeIndex === blocks.length - 1}
            title="Di chuyển sang phải"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-25"
          >
            <i className="fa-solid fa-chevron-right text-xs"></i>
          </button>
          {blocks.length > 1 && (
            <button
              type="button"
              onClick={() => removeCanvas(activeCanvas.id)}
              title="Xóa canvas này"
              className="flex h-7 w-7 items-center justify-center rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600"
            >
              <i className="fa-solid fa-trash text-xs"></i>
            </button>
          )}
        </div>
      </div>

      <div className="flex min-w-0 flex-col gap-3">
        {/* Nhóm chính: Tiêu đề + Layout + Nội dung */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px]">
            <div>
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Tiêu đề canvas
              </label>
              <input
                value={activeCanvas.title}
                onChange={(event) =>
                  updateCanvas(activeCanvas.id, { title: event.target.value })
                }
                className="input text-base font-bold"
                placeholder="Ví dụ: print() là chiếc loa phát thanh"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Layout
              </label>
              <select
                value={activeCanvas.layout || "split"}
                onChange={(event) =>
                  updateCanvas(activeCanvas.id, {
                    layout: event.target.value as LessonTeachingCanvasLayout,
                  })
                }
                className="input text-sm"
              >
                <option value="hero">🎯 Hero (mở đầu bài)</option>
                <option value="cards">🃏 Cards (danh sách icon)</option>
                <option value="highlight">💡 Điểm nhấn</option>
                <option value="split">Nội dung + phụ trợ</option>
                <option value="text">Chỉ nội dung</option>
                <option value="code">Ưu tiên code</option>
                <option value="media">Ưu tiên ảnh</option>
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Nội dung chính
            </label>
            <textarea
              value={activeCanvas.mainHtml}
              onChange={(event) =>
                updateCanvas(activeCanvas.id, { mainHtml: event.target.value })
              }
              className="input min-h-[130px] font-mono text-sm"
              placeholder="<p>Nội dung chính dùng để giảng...</p>"
            />
            <CanvasPlaceholderPanel
              mainHtml={activeCanvas.mainHtml}
              canvasId={activeCanvas.id}
              onPickMedia={onPickMedia}
            />
          </div>
        </div>

        {/* Nhóm phụ trợ (thu gọn được): Code + Ảnh + Ghi chú */}
        <div className="overflow-hidden rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() => setSupportOpen(!supportOpen)}
            className="flex w-full items-center justify-between bg-slate-50 px-4 py-2.5 text-left transition-colors hover:bg-slate-100"
          >
            <span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <i className="fa-solid fa-screwdriver-wrench text-slate-400" style={{ fontSize: "10px" }}></i>
              Phụ trợ — code, ảnh, ghi chú
            </span>
            <div className="flex items-center gap-2">
              {(activeCanvas.code?.trim() || activeCanvas.mediaId?.trim() || activeCanvas.notesHtml?.trim()) && (
                <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-600">
                  Có nội dung
                </span>
              )}
              <i className={`fa-solid fa-chevron-${supportOpen ? "up" : "down"} text-slate-400`} style={{ fontSize: "10px" }}></i>
            </div>
          </button>

          {supportOpen && (
            <div className="space-y-4 border-t border-slate-200 bg-white p-4">
              <div className="grid gap-4 lg:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Code chính
                  </label>
                  <textarea
                    value={activeCanvas.code || ""}
                    onChange={(event) =>
                      updateCanvas(activeCanvas.id, { code: event.target.value })
                    }
                    className="input min-h-[140px] font-mono text-sm"
                    placeholder={`print("Hello")`}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Ảnh minh họa
                  </label>
                  {selectedMedia ? (
                    <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                      <img
                        src={selectedMedia.publicUrl}
                        alt={selectedMedia.altText || selectedMedia.fileName}
                        className="h-32 w-full object-cover"
                      />
                      <div className="flex items-center justify-between gap-2 p-3">
                        <div className="min-w-0 truncate text-sm font-semibold text-slate-700">
                          {selectedMedia.caption || selectedMedia.fileName}
                        </div>
                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => onPickMedia(activeCanvas.id)}
                            className="rounded-lg bg-sky-100 px-2.5 py-1.5 text-xs font-bold text-sky-700 hover:bg-sky-200"
                          >
                            Đổi ảnh
                          </button>
                          <button
                            type="button"
                            onClick={() => updateCanvas(activeCanvas.id, { mediaId: "" })}
                            className="rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-bold text-red-600 hover:bg-red-100"
                          >
                            Xóa
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onPickMedia(activeCanvas.id)}
                      className="flex min-h-[140px] w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-sky-200 bg-sky-50/60 text-sky-700 transition hover:border-sky-300 hover:bg-sky-50"
                    >
                      <i className="fa-solid fa-image mb-2 text-2xl"></i>
                      <span className="text-sm font-bold">Chọn hoặc upload ảnh</span>
                    </button>
                  )}
                </div>
              </div>
              {activeCanvas.layout === "cards" ? (
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Danh sách cards
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const newCard: CanvasCard = { icon: "fa-star", title: "Tiêu đề", description: "Mô tả ngắn" };
                        updateCanvas(activeCanvas.id, { cards: [...(activeCanvas.cards || []), newCard] });
                      }}
                      className="rounded-lg bg-indigo-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-indigo-700"
                    >
                      <i className="fa-solid fa-plus mr-1"></i>Thêm card
                    </button>
                  </div>
                  <div className="space-y-2">
                    {(activeCanvas.cards || []).length === 0 && (
                      <div className="rounded-lg border border-dashed border-slate-200 p-3 text-center text-xs text-slate-400">
                        Chưa có card nào — bấm "Thêm card"
                      </div>
                    )}
                    {(activeCanvas.cards || []).map((card, ci) => (
                      <div key={ci} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-2 rounded-lg border border-slate-200 bg-white p-2.5">
                        <div className="flex flex-col gap-1.5 pt-0.5">
                          <input
                            value={card.icon}
                            onChange={(e) => {
                              const next = [...(activeCanvas.cards || [])];
                              next[ci] = { ...next[ci], icon: e.target.value };
                              updateCanvas(activeCanvas.id, { cards: next });
                            }}
                            className="input w-32 font-mono text-xs"
                            placeholder="fa-star"
                          />
                          <div className="flex h-7 w-7 items-center justify-center rounded bg-slate-100 text-slate-600">
                            <i className={`fa-solid ${card.icon || "fa-star"} text-sm`}></i>
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <input
                            value={card.title}
                            onChange={(e) => {
                              const next = [...(activeCanvas.cards || [])];
                              next[ci] = { ...next[ci], title: e.target.value };
                              updateCanvas(activeCanvas.id, { cards: next });
                            }}
                            className="input text-sm font-bold"
                            placeholder="Tiêu đề card"
                          />
                          <input
                            value={card.description}
                            onChange={(e) => {
                              const next = [...(activeCanvas.cards || [])];
                              next[ci] = { ...next[ci], description: e.target.value };
                              updateCanvas(activeCanvas.id, { cards: next });
                            }}
                            className="input text-sm"
                            placeholder="Mô tả ngắn"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const next = (activeCanvas.cards || []).filter((_, i) => i !== ci);
                            updateCanvas(activeCanvas.id, { cards: next });
                          }}
                          className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600"
                        >
                          <i className="fa-solid fa-xmark text-xs"></i>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Ghi chú nội bộ
                  </label>
                  <textarea
                    value={activeCanvas.notesHtml || ""}
                    onChange={(event) =>
                      updateCanvas(activeCanvas.id, { notesHtml: event.target.value })
                    }
                    className="input min-h-[100px] font-mono text-sm"
                    placeholder="<p>Ghi chú nội bộ, không hiển thị trên slide...</p>"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Reveal steps */}
        <div className="rounded-xl border border-violet-100 bg-violet-50/60 p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-sm font-bold text-violet-900">
              <input
                type="checkbox"
                checked={activeCanvas.reveal !== false}
                onChange={(event) =>
                  updateCanvas(activeCanvas.id, { reveal: event.target.checked })
                }
              />
              Reveal từng ý khi bấm tiếp
            </label>
            <button
              type="button"
              onClick={() => addStep(activeCanvas)}
              className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-violet-700"
            >
              <i className="fa-solid fa-plus mr-1"></i>
              Thêm ý
            </button>
          </div>
          <div className="space-y-2">
            {activeCanvas.steps.length === 0 ? (
              <div className="rounded-lg border border-dashed border-violet-200 bg-white/70 p-4 text-center text-sm text-violet-500">
                Chưa có ý reveal nào
              </div>
            ) : (
              activeCanvas.steps.map((step, index) => (
                <div key={step.id} className="grid gap-2 rounded-lg bg-white p-2 md:grid-cols-[2rem_minmax(0,1fr)_auto] md:items-center">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-100 text-sm font-black text-violet-700">
                    {index + 1}
                  </span>
                  <input
                    value={step.text}
                    onChange={(event) =>
                      updateStep(activeCanvas.id, step.id, {
                        text: event.target.value,
                        html: event.target.value,
                      })
                    }
                    className="input py-2 text-sm"
                    placeholder="Ý sẽ hiện từng từ..."
                  />
                  <div className="flex gap-1">
                    <button type="button" onClick={() => moveStep(activeCanvas, index, -1)} className="rounded p-2 text-slate-400 hover:bg-slate-100">
                      <i className="fa-solid fa-chevron-up"></i>
                    </button>
                    <button type="button" onClick={() => moveStep(activeCanvas, index, 1)} className="rounded p-2 text-slate-400 hover:bg-slate-100">
                      <i className="fa-solid fa-chevron-down"></i>
                    </button>
                    <button type="button" onClick={() => removeStep(activeCanvas, step.id)} className="rounded p-2 text-red-400 hover:bg-red-50">
                      <i className="fa-solid fa-trash"></i>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function LessonMediaModal({
  lessonId,
  draftId,
  media,
  suggestedCaption,
  onClose,
  onMediaChange,
  onInsert,
}: {
  lessonId?: string;
  draftId: string;
  media: LessonMediaView[];
  suggestedCaption?: string;
  onClose: () => void;
  onMediaChange: (media: LessonMediaView[]) => void;
  onInsert: (media: LessonMediaView, caption: string, altText: string) => void;
}) {
  const [selectedId, setSelectedId] = useState(media[0]?.id || "");
  const [caption, setCaption] = useState(suggestedCaption || media[0]?.caption || "");
  const [altText, setAltText] = useState(suggestedCaption || media[0]?.altText || "");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const selectedMedia = media.find((item) => item.id === selectedId) || null;

  const handleDeleteMedia = async (itemId: string) => {
    if (!confirm("Xóa ảnh này vĩnh viễn? Hành động không thể hoàn tác.")) return;
    setDeletingId(itemId);
    try {
      const response = await fetch(`/api/admin/lesson-media/${itemId}`, { method: "DELETE" });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        if (response.status === 409) {
          alert("Ảnh này đang được dùng trong bài học, không thể xóa.");
        } else {
          alert(payload.error || "Không xóa được ảnh");
        }
        return;
      }
      const next = media.filter((item) => item.id !== itemId);
      onMediaChange(next);
      if (selectedId === itemId) setSelectedId(next[0]?.id || "");
    } catch {
      alert("Lỗi kết nối, thử lại.");
    } finally {
      setDeletingId(null);
    }
  };

  useEffect(() => {
    if (!selectedMedia) {
      return;
    }

    setCaption(suggestedCaption || selectedMedia.caption || "");
    setAltText(suggestedCaption || selectedMedia.altText || selectedMedia.caption || "");
  }, [selectedId]);

  const upload = async () => {
    if (!file) {
      alert("Chon mot file anh truoc.");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.set("file", file);
      formData.set("caption", caption);
      formData.set("altText", altText || caption);
      if (lessonId) {
        formData.set("lessonId", lessonId);
      } else {
        formData.set("draftId", draftId);
      }

      const response = await fetch("/api/admin/lesson-media", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "Upload failed");
      }

      const uploaded = (await response.json()) as LessonMediaView;
      onMediaChange([uploaded, ...media.filter((item) => item.id !== uploaded.id)]);
      setSelectedId(uploaded.id);
      setFile(null);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Khong upload duoc anh");
    } finally {
      setUploading(false);
    }
  };

  const saveMetadata = async (nextMedia: LessonMediaView) => {
    const response = await fetch(`/api/admin/lesson-media/${nextMedia.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        caption,
        altText: altText || caption,
        annotations: nextMedia.annotations || [],
      }),
    });

    if (!response.ok) {
      throw new Error("Cannot save image metadata");
    }

    const updated = (await response.json()) as LessonMediaView;
    onMediaChange(media.map((item) => (item.id === updated.id ? updated : item)));
    return updated;
  };

  const insertSelected = async () => {
    if (!selectedMedia) {
      alert("Chon hoac upload mot anh truoc.");
      return;
    }

    try {
      const updated = await saveMetadata(selectedMedia);
      onInsert(updated, caption, altText || caption);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Khong luu duoc anh");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
      <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Chen anh minh hoa</h3>
            <p className="text-sm text-gray-500">Upload anh, them caption va annotation.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <i className="fa-solid fa-times text-lg"></i>
          </button>
        </div>

        <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto p-6 lg:grid-cols-[340px_minmax(0,1fr)]">
          <div className="space-y-4">
            <div className="rounded-xl border border-gray-200 p-4">
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Upload anh moi
              </label>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(event) => setFile(event.target.files?.[0] || null)}
                className="input"
              />
              <button
                type="button"
                onClick={upload}
                disabled={uploading || !file}
                className="btn btn-primary mt-3 w-full disabled:opacity-50"
              >
                {uploading ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin"></i>
                    Dang upload
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-upload"></i>
                    Upload
                  </>
                )}
              </button>
            </div>

            <div className="rounded-xl border border-gray-200 p-4">
              <div className="mb-3 text-sm font-semibold text-gray-700">Thu vien anh</div>
              <div className="max-h-[360px] space-y-2 overflow-auto">
                {media.length === 0 ? (
                  <div className="rounded-lg border-2 border-dashed border-gray-200 p-5 text-center text-sm text-gray-400">
                    Chua co anh nao
                  </div>
                ) : (
                  media.map((item) => (
                    <div
                      key={item.id}
                      className={`flex items-center gap-2 rounded-lg border p-2 transition ${
                        selectedId === item.id
                          ? "border-indigo-500 bg-indigo-50"
                          : "border-gray-200"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedId(item.id)}
                        className="flex min-w-0 flex-1 items-center gap-3 text-left"
                      >
                        <img
                          src={item.publicUrl}
                          alt={item.altText || item.fileName}
                          className="h-14 w-20 shrink-0 rounded-md object-cover"
                        />
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-gray-800">
                            {item.caption || item.fileName}
                          </div>
                          <div className="text-xs text-gray-400">
                            {Math.round(item.sizeBytes / 1024)}KB
                          </div>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteMedia(item.id)}
                        disabled={deletingId === item.id}
                        className="shrink-0 rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-40"
                        title="Xóa ảnh"
                      >
                        {deletingId === item.id
                          ? <i className="fa-solid fa-spinner fa-spin text-xs"></i>
                          : <i className="fa-solid fa-trash text-xs"></i>
                        }
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="min-w-0 space-y-4">
            {selectedMedia ? (
              <>
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-gray-700">
                      Caption
                    </label>
                    <input
                      value={caption}
                      onChange={(event) => setCaption(event.target.value)}
                      className="input"
                      placeholder="Mo ta ngan ben duoi anh"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-gray-700">
                      Alt text
                    </label>
                    <input
                      value={altText}
                      onChange={(event) => setAltText(event.target.value)}
                      className="input"
                      placeholder="Mo ta anh cho accessibility"
                    />
                  </div>
                </div>

                <AnnotationEditor
                  media={selectedMedia}
                  onSave={(updated) =>
                    onMediaChange(
                      media.map((item) => (item.id === updated.id ? updated : item))
                    )
                  }
                />
              </>
            ) : (
              <div className="flex min-h-[420px] items-center justify-center rounded-xl border-2 border-dashed border-gray-200 text-sm text-gray-400">
                Chon anh de xem preview va annotation
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-gray-200 px-6 py-4">
          <button type="button" onClick={onClose} className="btn btn-secondary">
            Huy
          </button>
          <button type="button" onClick={insertSelected} className="btn btn-success">
            <i className="fa-solid fa-plus"></i>
            Chen vao bai
          </button>
        </div>
      </div>
    </div>
  );
}

function AnnotationEditor({
  media,
  onSave,
}: {
  media: LessonMediaView;
  onSave: (media: LessonMediaView) => void;
}) {
  const [annotations, setAnnotations] = useState<LessonImageAnnotation[]>(
    media.annotations || []
  );
  const [tool, setTool] = useState<AnnotationTool>("rect");
  const [color, setColor] = useState("#ef4444");
  const [pendingArrow, setPendingArrow] = useState<{ x: number; y: number } | null>(null);
  const [dragging, setDragging] = useState<{
    id: string;
    offsetX: number;
    offsetY: number;
  } | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setAnnotations(media.annotations || []);
  }, [media.id]);

  const readPoint = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: clamp(((event.clientX - rect.left) / rect.width) * 100),
      y: clamp(((event.clientY - rect.top) / rect.height) * 100),
    };
  };

  const addAnnotation = (event: PointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest("[data-annotation-id]")) {
      return;
    }

    const point = readPoint(event);
    const id = `ann-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    if (tool === "arrow") {
      if (!pendingArrow) {
        setPendingArrow(point);
        return;
      }

      setAnnotations((current) => [
        ...current,
        {
          id,
          type: "arrow",
          x: pendingArrow.x,
          y: pendingArrow.y,
          endX: point.x,
          endY: point.y,
          color,
        },
      ]);
      setPendingArrow(null);
      return;
    }

    if (tool === "rect") {
      setAnnotations((current) => [
        ...current,
        { id, type: "rect", x: point.x, y: point.y, w: 22, h: 14, color },
      ]);
      return;
    }

    if (tool === "marker") {
      const nextNumber =
        annotations.filter((item) => item.type === "marker").length + 1;
      setAnnotations((current) => [
        ...current,
        { id, type: "marker", x: point.x, y: point.y, label: String(nextNumber), color },
      ]);
      return;
    }

    setAnnotations((current) => [
      ...current,
      { id, type: "label", x: point.x, y: point.y, text: "Ghi chu", color },
    ]);
  };

  const startDrag = (
    event: PointerEvent<HTMLElement>,
    annotation: LessonImageAnnotation
  ) => {
    event.preventDefault();
    event.stopPropagation();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }

    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    setDragging({
      id: annotation.id,
      offsetX: x - annotation.x,
      offsetY: y - annotation.y,
    });
  };

  const drag = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragging) {
      return;
    }

    const point = readPoint(event);
    setAnnotations((current) =>
      current.map((annotation) => {
        if (annotation.id !== dragging.id) {
          return annotation;
        }

        const nextX = clamp(point.x - dragging.offsetX);
        const nextY = clamp(point.y - dragging.offsetY);

        if (annotation.type === "arrow") {
          const dx = annotation.endX - annotation.x;
          const dy = annotation.endY - annotation.y;
          return {
            ...annotation,
            x: nextX,
            y: nextY,
            endX: clamp(nextX + dx),
            endY: clamp(nextY + dy),
          };
        }

        return { ...annotation, x: nextX, y: nextY } as LessonImageAnnotation;
      })
    );
  };

  const save = async () => {
    const response = await fetch(`/api/admin/lesson-media/${media.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        caption: media.caption || "",
        altText: media.altText || "",
        annotations,
      }),
    });

    if (!response.ok) {
      alert("Khong luu duoc annotation.");
      return;
    }

    onSave((await response.json()) as LessonMediaView);
  };

  return (
    <div className="rounded-xl border border-gray-200 p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold text-gray-700">Annotation</span>
        {(["rect", "arrow", "marker", "label"] as AnnotationTool[]).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => {
              setTool(item);
              setPendingArrow(null);
            }}
            className={`rounded-md px-2 py-1 text-xs font-semibold ${
              tool === item ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600"
            }`}
          >
            {item}
          </button>
        ))}
        <input
          type="color"
          value={color}
          onChange={(event) => setColor(event.target.value)}
          className="h-8 w-10 rounded border border-gray-200"
        />
        <button type="button" onClick={save} className="btn btn-secondary ml-auto">
          <i className="fa-solid fa-save"></i>
          Luu annotation
        </button>
      </div>

      {pendingArrow && (
        <div className="mb-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
          Click diem ket thuc cua mui ten.
        </div>
      )}

      <div
        ref={canvasRef}
        className="relative overflow-hidden rounded-lg border border-gray-200 bg-slate-100"
        onPointerDown={addAnnotation}
        onPointerMove={drag}
        onPointerUp={() => setDragging(null)}
        onPointerLeave={() => setDragging(null)}
      >
        <img
          src={media.publicUrl}
          alt={media.altText || media.fileName}
          className="block w-full select-none"
          draggable={false}
        />
        <div className="pointer-events-none absolute inset-0">
          {annotations.map((annotation) => (
            <AnnotationNode
              key={annotation.id}
              annotation={annotation}
              onPointerDown={startDrag}
            />
          ))}
        </div>
      </div>

      <div className="mt-3 max-h-44 space-y-2 overflow-auto">
        {annotations.map((annotation) => (
          <AnnotationRow
            key={annotation.id}
            annotation={annotation}
            onChange={(next) =>
              setAnnotations((current) =>
                current.map((item) => (item.id === next.id ? next : item))
              )
            }
            onDelete={() =>
              setAnnotations((current) => current.filter((item) => item.id !== annotation.id))
            }
          />
        ))}
      </div>
    </div>
  );
}

function AnnotationNode({
  annotation,
  onPointerDown,
}: {
  annotation: LessonImageAnnotation;
  onPointerDown: (
    event: PointerEvent<HTMLElement>,
    annotation: LessonImageAnnotation
  ) => void;
}) {
  if (annotation.type === "rect") {
    return (
      <span
        data-annotation-id={annotation.id}
        onPointerDown={(event) => onPointerDown(event, annotation)}
        className="pointer-events-auto absolute cursor-move rounded-md border-4"
        style={{
          borderColor: annotation.color,
          left: `${annotation.x}%`,
          top: `${annotation.y}%`,
          width: `${annotation.w}%`,
          height: `${annotation.h}%`,
        }}
      />
    );
  }

  if (annotation.type === "arrow") {
    const width = Math.hypot(annotation.endX - annotation.x, annotation.endY - annotation.y);
    const angle =
      Math.atan2(annotation.endY - annotation.y, annotation.endX - annotation.x) *
      (180 / Math.PI);

    return (
      <span
        data-annotation-id={annotation.id}
        onPointerDown={(event) => onPointerDown(event, annotation)}
        className="pointer-events-auto absolute h-0 cursor-move border-t-4"
        style={{
          borderColor: annotation.color,
          left: `${annotation.x}%`,
          top: `${annotation.y}%`,
          width: `${width}%`,
          transform: `rotate(${angle}deg)`,
          transformOrigin: "0 50%",
        }}
      />
    );
  }

  if (annotation.type === "marker") {
    return (
      <span
        data-annotation-id={annotation.id}
        onPointerDown={(event) => onPointerDown(event, annotation)}
        className="pointer-events-auto absolute flex h-8 min-w-8 -translate-x-1/2 -translate-y-1/2 cursor-move items-center justify-center rounded-full border-2 border-white px-2 text-sm font-black text-white shadow-lg"
        style={{
          background: annotation.color,
          left: `${annotation.x}%`,
          top: `${annotation.y}%`,
        }}
      >
        {annotation.label}
      </span>
    );
  }

  return (
    <span
      data-annotation-id={annotation.id}
      onPointerDown={(event) => onPointerDown(event, annotation)}
      className="pointer-events-auto absolute max-w-56 cursor-move rounded-lg border-2 bg-white/95 px-2 py-1 text-xs font-bold shadow-lg"
      style={{
        borderColor: annotation.color,
        left: `${annotation.x}%`,
        top: `${annotation.y}%`,
      }}
    >
      {annotation.text}
    </span>
  );
}

function AnnotationRow({
  annotation,
  onChange,
  onDelete,
}: {
  annotation: LessonImageAnnotation;
  onChange: (annotation: LessonImageAnnotation) => void;
  onDelete: () => void;
}) {
  const update = (patch: Partial<LessonImageAnnotation>) => {
    onChange({ ...annotation, ...patch } as LessonImageAnnotation);
  };

  return (
    <div className="grid grid-cols-[72px_1fr_auto] items-center gap-2 rounded-lg bg-gray-50 p-2 text-xs">
      <span className="font-bold text-gray-600">{annotation.type}</span>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <input
          type="number"
          value={Math.round(annotation.x)}
          onChange={(event) => update({ x: Number(event.target.value) } as never)}
          className="input py-1 text-xs"
        />
        <input
          type="number"
          value={Math.round(annotation.y)}
          onChange={(event) => update({ y: Number(event.target.value) } as never)}
          className="input py-1 text-xs"
        />
        {annotation.type === "rect" && (
          <>
            <input
              type="number"
              value={Math.round(annotation.w)}
              onChange={(event) => update({ w: Number(event.target.value) } as never)}
              className="input py-1 text-xs"
            />
            <input
              type="number"
              value={Math.round(annotation.h)}
              onChange={(event) => update({ h: Number(event.target.value) } as never)}
              className="input py-1 text-xs"
            />
          </>
        )}
        {annotation.type === "marker" && (
          <input
            value={annotation.label}
            onChange={(event) => update({ label: event.target.value } as never)}
            className="input py-1 text-xs"
          />
        )}
        {annotation.type === "label" && (
          <input
            value={annotation.text}
            onChange={(event) => update({ text: event.target.value } as never)}
            className="input py-1 text-xs md:col-span-2"
          />
        )}
      </div>
      <button
        type="button"
        onClick={onDelete}
        className="rounded-md p-2 text-red-500 hover:bg-red-50"
      >
        <i className="fa-solid fa-trash"></i>
      </button>
    </div>
  );
}

function StepGuideModal({
  media,
  onClose,
  onInsert,
}: {
  media: LessonMediaView[];
  onClose: () => void;
  onInsert: (title: string, steps: StepGuideItem[]) => void;
}) {
  const [title, setTitle] = useState("Huong dan tung buoc");
  const [steps, setSteps] = useState<StepGuideItem[]>([DEFAULT_STEP]);

  const updateStep = (id: string, patch: Partial<StepGuideItem>) => {
    setSteps((current) =>
      current.map((step) => (step.id === id ? { ...step, ...patch } : step))
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h3 className="text-lg font-bold text-gray-900">Huong dan tung buoc</h3>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100">
            <i className="fa-solid fa-times"></i>
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto p-6">
          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">Tieu de block</label>
            <input value={title} onChange={(event) => setTitle(event.target.value)} className="input" />
          </div>

          {steps.map((step, index) => (
            <div key={step.id} className="rounded-xl border border-gray-200 p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-sm font-bold text-gray-700">Buoc {index + 1}</div>
                {steps.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setSteps((current) => current.filter((item) => item.id !== step.id))}
                    className="rounded-md p-2 text-red-500 hover:bg-red-50"
                  >
                    <i className="fa-solid fa-trash"></i>
                  </button>
                )}
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <input
                  value={step.title}
                  onChange={(event) => updateStep(step.id, { title: event.target.value })}
                  className="input"
                  placeholder="Ten buoc"
                />
                <select
                  value={step.mediaId || ""}
                  onChange={(event) => updateStep(step.id, { mediaId: event.target.value || undefined })}
                  className="input"
                >
                  <option value="">Khong dung anh</option>
                  {media.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.caption || item.fileName}
                    </option>
                  ))}
                </select>
              </div>
              <textarea
                value={step.html}
                onChange={(event) => updateStep(step.id, { html: event.target.value })}
                className="input mt-3 min-h-[110px] font-mono text-sm"
                placeholder="<p>Noi dung mo ta buoc...</p>"
              />
              {step.mediaId && (
                <input
                  value={step.caption || ""}
                  onChange={(event) => updateStep(step.id, { caption: event.target.value })}
                  className="input mt-3"
                  placeholder="Caption rieng cho anh trong buoc"
                />
              )}
            </div>
          ))}

          <button
            type="button"
            onClick={() =>
              setSteps((current) => [
                ...current,
                {
                  id: `step-${Date.now()}`,
                  title: `Buoc ${current.length + 1}`,
                  html: "<p>Mo ta thao tac...</p>",
                },
              ])
            }
            className="btn btn-secondary"
          >
            <i className="fa-solid fa-plus"></i>
            Them buoc
          </button>
        </div>

        <div className="flex justify-end gap-3 border-t border-gray-200 px-6 py-4">
          <button type="button" onClick={onClose} className="btn btn-secondary">
            Huy
          </button>
          <button type="button" onClick={() => onInsert(title, steps)} className="btn btn-success">
            Chen step guide
          </button>
        </div>
      </div>
    </div>
  );
}

function LessonBlockBuilder({
  blocks,
  media,
  onChange,
}: {
  blocks: LessonContentBlock[];
  media: LessonMediaView[];
  onChange: (blocks: LessonContentBlock[]) => void;
}) {
  const addBlock = (type: LessonContentBlock["type"]) => {
    const id = `block-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const firstMedia = media[0]?.id || "";
    const block: LessonContentBlock =
      type === "image"
        ? { id, type, mediaId: firstMedia }
        : type === "code"
          ? { id, type, language: "python", code: "# Code o day\nprint('Hello')" }
          : type === "callout"
            ? { id, type, tone: "info", html: "<p>Ghi chu quan trong...</p>" }
            : type === "step_guide"
              ? { id, type, title: "Huong dan tung buoc", steps: [DEFAULT_STEP] }
              : { id, type: "rich_text", html: "<p>Noi dung...</p>" };

    onChange([...blocks, block]);
  };

  const updateBlock = (id: string, patch: Partial<LessonContentBlock>) => {
    onChange(
      blocks.map((block) =>
        block.id === id ? ({ ...block, ...patch } as LessonContentBlock) : block
      )
    );
  };

  const moveBlock = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= blocks.length) {
      return;
    }

    const next = [...blocks];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {(["rich_text", "image", "step_guide", "code", "callout"] as const).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => addBlock(type)}
            className="rounded-md bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-200"
          >
            + {type}
          </button>
        ))}
      </div>

      {blocks.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-200 p-8 text-center text-sm text-gray-400">
          Chua co block nao
        </div>
      ) : (
        blocks.map((block, index) => (
          <div key={block.id} className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="text-sm font-bold text-gray-700">{block.type}</div>
              <div className="flex gap-1">
                <button type="button" onClick={() => moveBlock(index, -1)} className="rounded p-2 text-gray-500 hover:bg-gray-100">
                  <i className="fa-solid fa-chevron-up"></i>
                </button>
                <button type="button" onClick={() => moveBlock(index, 1)} className="rounded p-2 text-gray-500 hover:bg-gray-100">
                  <i className="fa-solid fa-chevron-down"></i>
                </button>
                <button
                  type="button"
                  onClick={() => onChange(blocks.filter((item) => item.id !== block.id))}
                  className="rounded p-2 text-red-500 hover:bg-red-50"
                >
                  <i className="fa-solid fa-trash"></i>
                </button>
              </div>
            </div>

            {!isTeachingCanvasBlock(block) && (
              <div className="mb-3 grid gap-2 rounded-lg border border-violet-100 bg-violet-50/60 p-3 text-xs md:grid-cols-[auto_minmax(160px,1fr)_auto_auto] md:items-center">
                <label className="flex items-center gap-2 font-semibold text-violet-800">
                  <input
                    type="checkbox"
                    checked={!!block.canvasBreakBefore}
                    onChange={(event) =>
                      updateBlock(block.id, { canvasBreakBefore: event.target.checked } as never)
                    }
                  />
                  Canvas moi
                </label>
                <input
                  value={block.canvasTitle || ""}
                  onChange={(event) =>
                    updateBlock(block.id, { canvasTitle: event.target.value } as never)
                  }
                  className="input py-1 text-xs"
                  placeholder="Tieu de canvas rieng"
                />
                <label className="flex items-center gap-2 font-semibold text-violet-800">
                  <input
                    type="checkbox"
                    checked={block.reveal !== false}
                    onChange={(event) =>
                      updateBlock(block.id, { reveal: event.target.checked } as never)
                    }
                  />
                  Reveal
                </label>
                <select
                  value={block.canvasRole || "main"}
                  onChange={(event) =>
                    updateBlock(block.id, { canvasRole: event.target.value as never } as never)
                  }
                  className="input py-1 text-xs"
                >
                  <option value="main">Noi dung</option>
                  <option value="note">Ghi chu</option>
                </select>
              </div>
            )}

            {block.type === "rich_text" && (
              <textarea
                value={block.html}
                onChange={(event) => updateBlock(block.id, { html: event.target.value } as never)}
                className="input min-h-[140px] font-mono text-sm"
              />
            )}
            {block.type === "code" && (
              <textarea
                value={block.code}
                onChange={(event) => updateBlock(block.id, { code: event.target.value } as never)}
                className="input min-h-[140px] font-mono text-sm"
              />
            )}
            {block.type === "callout" && (
              <div className="space-y-2">
                <select
                  value={block.tone}
                  onChange={(event) => updateBlock(block.id, { tone: event.target.value as never } as never)}
                  className="input"
                >
                  <option value="info">info</option>
                  <option value="warning">warning</option>
                  <option value="success">success</option>
                </select>
                <textarea
                  value={block.html}
                  onChange={(event) => updateBlock(block.id, { html: event.target.value } as never)}
                  className="input min-h-[110px] font-mono text-sm"
                />
              </div>
            )}
            {block.type === "teaching_canvas" && (
              <textarea
                value={JSON.stringify(block, null, 2)}
                onChange={(event) => {
                  try {
                    const parsed = JSON.parse(event.target.value);
                    updateBlock(block.id, parsed);
                  } catch {
                    // Keep editing until JSON is valid.
                  }
                }}
                className="input min-h-[260px] font-mono text-xs"
              />
            )}
            {block.type === "image" && (
              <select
                value={block.mediaId}
                onChange={(event) => updateBlock(block.id, { mediaId: event.target.value } as never)}
                className="input"
              >
                <option value="">Chon anh</option>
                {media.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.caption || item.fileName}
                  </option>
                ))}
              </select>
            )}
            {block.type === "step_guide" && (
              <div className="space-y-2">
                <input
                  value={block.title}
                  onChange={(event) => updateBlock(block.id, { title: event.target.value } as never)}
                  className="input"
                />
                <textarea
                  value={JSON.stringify(block.steps, null, 2)}
                  onChange={(event) => {
                    try {
                      updateBlock(block.id, { steps: JSON.parse(event.target.value) } as never);
                    } catch {
                      // Keep editing until JSON is valid.
                    }
                  }}
                  className="input min-h-[160px] font-mono text-xs"
                />
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}

function normalizeBlocksForCanvasEditor(
  section: EditableLessonSection
): LessonContentBlock[] {
  if (
    Array.isArray(section.contentBlocks) &&
    section.contentBlocks.some(isTeachingCanvasBlock)
  ) {
    return section.contentBlocks.map((block) =>
      isTeachingCanvasBlock(block) ? normalizeTeachingCanvasBlock(block) : block
    );
  }

  const canvases = buildTeachingCanvases({
    id: section.id,
    title: section.title || "Nội dung",
    content: section.content || "",
    contentBlocks: Array.isArray(section.contentBlocks)
      ? section.contentBlocks
      : null,
  });

  if (canvases.length > 0 && canvases.some((canvas) => canvas.html || canvas.steps.length > 0)) {
    return canvases.map((canvas, index): LessonTeachingCanvasBlock => ({
      id: canvas.id || `canvas-${section.id}-${index + 1}`,
      type: "teaching_canvas",
      title: canvas.title || `Canvas ${index + 1}`,
      layout:
        canvas.kind === "code"
          ? "code"
          : canvas.kind === "media"
            ? "media"
            : canvas.html && canvas.steps.length > 0
              ? "split"
              : "text",
      mainHtml: canvas.html || "<p>Nội dung chính của canvas...</p>",
      code: "",
      mediaId: "",
      notesHtml: canvas.notesHtml || "",
      steps: canvas.steps.map((step, stepIndex) => ({
        id: step.id || `${canvas.id}-step-${stepIndex + 1}`,
        text: step.text || stripHtmlForEditor(step.html),
        html: step.html || step.text,
      })),
      reveal: canvas.steps.length > 0,
    }));
  }

  return [createTeachingCanvasBlock(section.title || "Canvas 1")];
}

function normalizeTeachingCanvasBlock(
  block: LessonTeachingCanvasBlock
): LessonTeachingCanvasBlock {
  return {
    ...block,
    title: block.title || "Canvas",
    layout: block.layout || "split",
    mainHtml: block.mainHtml || "<p>Nội dung chính của canvas...</p>",
    code: block.code || "",
    mediaId: block.mediaId || "",
    notesHtml: block.notesHtml || "",
    steps: Array.isArray(block.steps)
      ? block.steps.map((step, index) => ({
          id: step.id || `${block.id}-step-${index + 1}`,
          text: step.text || stripHtmlForEditor(step.html || ""),
          html: step.html || step.text || "",
        }))
      : [],
    reveal: block.reveal !== false,
  };
}

function stripHtmlForEditor(value: string) {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function htmlToBlocks(html: string): LessonContentBlock[] {
  if (!html.trim() || typeof DOMParser === "undefined") {
    return [];
  }

  const parser = new DOMParser();
  const document = parser.parseFromString(`<div>${html}</div>`, "text/html");
  const root = document.body.firstElementChild;
  if (!root) {
    return [];
  }

  return Array.from(root.childNodes)
    .map((node, index): LessonContentBlock | null => {
      if (node.nodeType === Node.TEXT_NODE && !node.textContent?.trim()) {
        return null;
      }

      if (node.nodeType !== Node.ELEMENT_NODE) {
        return {
          id: `block-${index}`,
          type: "rich_text",
          html: node.textContent || "",
        };
      }

      const element = node as HTMLElement;
      if (element.matches("figure.lesson-media[data-media-id]")) {
        return {
          id: `block-${index}`,
          type: "image",
          mediaId: element.dataset.mediaId || "",
        };
      }

      if (element.matches(".code-block")) {
        return {
          id: `block-${index}`,
          type: "code",
          language: "python",
          code: element.textContent || "",
        };
      }

      if (element.matches("section.lesson-step-guide")) {
        const steps = Array.from(element.querySelectorAll("ol > li")).map(
          (step, stepIndex): StepGuideItem => ({
            id: step.getAttribute("data-step-id") || `step-${stepIndex + 1}`,
            title: step.querySelector("h4")?.textContent?.trim() || `Buoc ${stepIndex + 1}`,
            html: step.querySelector(".step-content")?.innerHTML || "",
          })
        );

        return {
          id: `block-${index}`,
          type: "step_guide",
          title: element.querySelector("h3")?.textContent?.trim() || "Huong dan tung buoc",
          steps,
        };
      }

      return {
        id: `block-${index}`,
        type: "rich_text",
        html: element.outerHTML,
      };
    })
    .filter((block): block is LessonContentBlock => block !== null);
}

function blocksToHtml(
  blocks: LessonContentBlock[],
  mediaById: Map<string, LessonMediaView>
) {
  return blocks
    .map((block) => {
      if (block.type === "teaching_canvas") {
        return lessonContentBlocksToHtml([block]);
      }

      if (block.type === "rich_text") {
        return block.html;
      }

      if (block.type === "image") {
        const media = mediaById.get(block.mediaId);
        if (!media) {
          return "";
        }

        return buildMediaFigureHtml(media, media.caption || "", media.altText || "");
      }

      if (block.type === "step_guide") {
        return buildStepGuideHtml(block.title, block.steps, mediaById);
      }

      if (block.type === "code") {
        return `<div class="code-block">\n${escapeHtml(block.code)}\n</div>`;
      }

      const toneClass = `lesson-callout lesson-callout-${block.tone}`;
      return `<div class="${toneClass}">${block.html}</div>`;
    })
    .filter(Boolean)
    .join("\n\n");
}

function buildMediaFigureHtml(
  media: LessonMediaView,
  caption: string,
  altText: string
) {
  const safeCaption = caption.trim();
  return `<figure class="lesson-media" data-media-id="${escapeAttribute(media.id)}">
  <img src="${escapeAttribute(media.publicUrl)}" alt="${escapeAttribute(altText || safeCaption || media.fileName)}" />
  ${safeCaption ? `<figcaption>${escapeHtml(safeCaption)}</figcaption>` : ""}
</figure>`;
}

function buildStepGuideHtml(
  title: string,
  steps: StepGuideItem[],
  mediaById: Map<string, LessonMediaView>
) {
  const renderedSteps = steps
    .map((step) => {
      const media = step.mediaId ? mediaById.get(step.mediaId) : null;
      const figure = media
        ? buildMediaFigureHtml(media, step.caption || media.caption || "", media.altText || "")
        : "";

      return `<li data-step-id="${escapeAttribute(step.id)}">
  <h4>${escapeHtml(step.title || "Buoc")}</h4>
  <div class="step-content">${step.html || ""}</div>
  ${figure}
</li>`;
    })
    .join("\n");

  return `<section class="lesson-step-guide" data-block-type="step-guide">
  <h3>${escapeHtml(title || "Huong dan tung buoc")}</h3>
  <ol>
${renderedSteps}
  </ol>
</section>`;
}

function replacePlaceholderWithFigure(
  html: string,
  placeholderId: string,
  figureHtml: string
) {
  if (typeof DOMParser === "undefined" || !placeholderId) {
    return html + (html ? "\n\n" : "") + figureHtml;
  }

  const parser = new DOMParser();
  const document = parser.parseFromString(`<div>${html}</div>`, "text/html");
  const root = document.body.firstElementChild;
  const placeholder = root?.querySelector(
    `.lesson-media-placeholder[data-placeholder-id="${cssEscape(placeholderId)}"]`
  );

  if (!root || !placeholder) {
    return html + (html ? "\n\n" : "") + figureHtml;
  }

  const fragmentDocument = parser.parseFromString(figureHtml, "text/html");
  const figure = fragmentDocument.body.firstElementChild;
  if (!figure) {
    return html;
  }

  placeholder.replaceWith(document.importNode(figure, true));
  return root.innerHTML;
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

function cssEscape(value: string) {
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
    return CSS.escape(value);
  }

  return value.replace(/["\\]/g, "\\$&");
}

function clamp(value: number) {
  return Math.min(Math.max(value, 0), 100);
}

function CanvasPlaceholderPanel({
  mainHtml,
  canvasId,
  onPickMedia,
}: {
  mainHtml: string;
  canvasId: string;
  onPickMedia: (canvasBlockId: string, placeholderInfo?: { id: string; suggestedCaption: string }) => void;
}) {
  const placeholders = useMemo(() => extractMainHtmlPlaceholders(mainHtml), [mainHtml]);

  if (placeholders.length === 0) return null;

  return (
    <div className="mt-2 space-y-1.5">
      {placeholders.map((p) => (
        <div
          key={p.id}
          className="flex items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2"
        >
          <i className="fa-solid fa-image shrink-0 text-sky-500"></i>
          <span className="flex-1 truncate text-xs text-sky-800">
            {p.suggestedCaption || p.id}
          </span>
          <button
            type="button"
            onClick={() => onPickMedia(canvasId, p)}
            className="shrink-0 rounded-md bg-sky-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-sky-700"
          >
            Chèn ảnh
          </button>
        </div>
      ))}
    </div>
  );
}

function extractMainHtmlPlaceholders(
  html: string
): Array<{ id: string; suggestedCaption: string }> {
  if (!html?.trim() || typeof document === "undefined") return [];
  try {
    const div = document.createElement("div");
    div.innerHTML = html;
    return Array.from(
      div.querySelectorAll<HTMLElement>(".lesson-media-placeholder[data-placeholder-id]")
    )
      .map((el) => ({
        id: el.dataset.placeholderId || "",
        suggestedCaption: el.dataset.suggestedCaption || "",
      }))
      .filter((p) => Boolean(p.id));
  } catch {
    return [];
  }
}
