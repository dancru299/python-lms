"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent,
} from "react";
import LessonContentRenderer from "@/components/lessons/LessonContentRenderer";
import type {
  LessonContentBlock,
  LessonImageAnnotation,
  LessonMediaView,
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

type EditorMode = "html" | "blocks";
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
  } | null>(null);
  const [stepModalOpen, setStepModalOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<EditorMode>(
    section.contentFormat === "blocks" ? "blocks" : "html"
  );
  const [blocks, setBlocks] = useState<LessonContentBlock[]>(
    Array.isArray(section.contentBlocks) && section.contentBlocks.length > 0
      ? section.contentBlocks
      : []
  );

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

  const updateContent = (
    content: string,
    nextBlocks: LessonContentBlock[] | null = section.contentBlocks || null,
    nextFormat: string = editorMode === "blocks" ? "blocks" : "html"
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
    const nextBlocks = htmlToBlocks(section.content);
    setBlocks(nextBlocks);
    updateContent(blocksToHtml(nextBlocks, mediaById), nextBlocks, "blocks");
    setEditorMode("blocks");
  };

  const updateBlocks = (nextBlocks: LessonContentBlock[]) => {
    setBlocks(nextBlocks);
    updateContent(blocksToHtml(nextBlocks, mediaById), nextBlocks, "blocks");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 pb-3">
        <span className="mr-2 text-xs text-gray-500">Chen nhanh:</span>
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
          onClick={() =>
            insertContent(`<table>\n  <thead>\n    <tr>\n      <th>Cot 1</th>\n      <th>Cot 2</th>\n    </tr>\n  </thead>\n  <tbody>\n    <tr>\n      <td>Du lieu</td>\n      <td>Du lieu</td>\n    </tr>\n  </tbody>\n</table>`)
          }
          className="rounded bg-gray-100 px-2 py-1 text-xs hover:bg-gray-200"
        >
          <i className="fa-solid fa-table mr-1"></i>
          Bang
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
          onClick={() => insertContent(`<h2>Tieu de lon</h2>`)}
          className="rounded bg-gray-100 px-2 py-1 text-xs hover:bg-gray-200"
        >
          <i className="fa-solid fa-heading mr-1"></i>
          H2
        </button>
        <button
          type="button"
          onClick={() => insertContent(`<h3>Tieu de phu</h3>`)}
          className="rounded bg-gray-100 px-2 py-1 text-xs hover:bg-gray-200"
        >
          H3
        </button>
        <div className="ml-auto flex rounded-lg bg-gray-100 p-1 text-xs">
          <button
            type="button"
            onClick={() => {
              setEditorMode("html");
              updateContent(section.content, null, "html");
            }}
            className={`rounded-md px-2 py-1 font-semibold ${
              editorMode === "html" ? "bg-white text-indigo-700 shadow-sm" : "text-gray-500"
            }`}
          >
            HTML
          </button>
          <button
            type="button"
            onClick={switchToBlocks}
            className={`rounded-md px-2 py-1 font-semibold ${
              editorMode === "blocks" ? "bg-white text-indigo-700 shadow-sm" : "text-gray-500"
            }`}
          >
            Blocks
          </button>
        </div>
      </div>

      {loadingMedia && (
        <div className="rounded-lg border border-sky-100 bg-sky-50 px-3 py-2 text-xs font-medium text-sky-700">
          Dang tai thu vien anh...
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.9fr)]">
        <div className="min-w-0">
          {editorMode === "blocks" ? (
            <LessonBlockBuilder
              blocks={blocks}
              media={media}
              onChange={updateBlocks}
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

      {mediaModal && (
        <LessonMediaModal
          lessonId={lessonId}
          draftId={draftId}
          media={media}
          suggestedCaption={mediaModal.suggestedCaption}
          onClose={() => setMediaModal(null)}
          onMediaChange={setMedia}
          onInsert={(selectedMedia, caption, altText) => {
            insertMediaFigure(
              selectedMedia,
              caption,
              altText,
              mediaModal.placeholderId
            );
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
  const selectedMedia = media.find((item) => item.id === selectedId) || null;

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
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedId(item.id)}
                      className={`flex w-full items-center gap-3 rounded-lg border p-2 text-left transition ${
                        selectedId === item.id
                          ? "border-indigo-500 bg-indigo-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <img
                        src={item.publicUrl}
                        alt={item.altText || item.fileName}
                        className="h-14 w-20 rounded-md object-cover"
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
