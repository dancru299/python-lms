"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

interface PanelLesson {
  id: string;
  title: string;
  chapterTitle?: string;
}

interface PanelOutcome {
  id: string;
  title: string;
}

interface PanelMilestone {
  id: string;
  title: string;
  color?: string;
  icon?: string;
  outcomes: PanelOutcome[];
}

interface SuggestionOutcome {
  outcomeId: string;
  lessonIds: string[];
}

interface SuggestionMilestone {
  milestoneId: string;
  lessonIds: string[];
  outcomes: SuggestionOutcome[];
}

interface Suggestion {
  milestones: SuggestionMilestone[];
  unassignedLessonIds: string[];
}

interface AutoArrangePanelProps {
  programId: string;
  milestones: PanelMilestone[];
  lessons: PanelLesson[];
  onApplied: (program: unknown) => void;
  onClose: () => void;
}

function lessonLabel(lesson: PanelLesson | undefined): string {
  if (!lesson) return "(bài học không xác định)";
  return lesson.chapterTitle ? `${lesson.chapterTitle} · ${lesson.title}` : lesson.title;
}

export default function AutoArrangePanel({
  programId,
  milestones,
  lessons,
  onApplied,
  onClose,
}: AutoArrangePanelProps) {
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<{ provider: string; model: string } | null>(null);
  const [draft, setDraft] = useState<Suggestion | null>(null);

  const lessonById = useMemo(() => new Map(lessons.map((lesson) => [lesson.id, lesson])), [lessons]);

  const generate = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/programs/${programId}/auto-arrange`, { method: "POST" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Không tạo được gợi ý");
      setDraft(data.suggestion as Suggestion);
      setMeta(data.meta ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tạo được gợi ý");
      setDraft(null);
    } finally {
      setLoading(false);
    }
  }, [programId]);

  useEffect(() => {
    generate();
  }, [generate]);

  const milestoneDraft = useCallback(
    (milestoneId: string): SuggestionMilestone =>
      draft?.milestones.find((item) => item.milestoneId === milestoneId) ?? {
        milestoneId,
        lessonIds: [],
        outcomes: [],
      },
    [draft]
  );

  function updateMilestone(milestoneId: string, updater: (current: SuggestionMilestone) => SuggestionMilestone) {
    setDraft((current) => {
      if (!current) return current;
      const exists = current.milestones.some((item) => item.milestoneId === milestoneId);
      const milestones = exists
        ? current.milestones.map((item) => (item.milestoneId === milestoneId ? updater(item) : item))
        : [...current.milestones, updater({ milestoneId, lessonIds: [], outcomes: [] })];
      return { ...current, milestones };
    });
  }

  function removeLesson(milestoneId: string, lessonId: string) {
    setDraft((current) => {
      if (!current) return current;
      const milestones = current.milestones.map((item) => {
        if (item.milestoneId !== milestoneId) return item;
        return {
          ...item,
          lessonIds: item.lessonIds.filter((id) => id !== lessonId),
          outcomes: item.outcomes.map((outcome) => ({
            ...outcome,
            lessonIds: outcome.lessonIds.filter((id) => id !== lessonId),
          })),
        };
      });
      const unassignedLessonIds = current.unassignedLessonIds.includes(lessonId)
        ? current.unassignedLessonIds
        : [...current.unassignedLessonIds, lessonId];
      return { ...current, milestones, unassignedLessonIds };
    });
  }

  function addLesson(milestoneId: string, lessonId: string) {
    if (!lessonId) return;
    setDraft((current) => {
      if (!current) return current;
      const milestones = current.milestones.map((item) => {
        // Ensure the lesson lives in only one milestone.
        const withoutLesson = {
          ...item,
          lessonIds: item.lessonIds.filter((id) => id !== lessonId),
          outcomes: item.outcomes.map((outcome) => ({
            ...outcome,
            lessonIds: outcome.lessonIds.filter((id) => id !== lessonId),
          })),
        };
        if (item.milestoneId !== milestoneId) return withoutLesson;
        return { ...withoutLesson, lessonIds: [...withoutLesson.lessonIds, lessonId] };
      });
      return {
        ...current,
        milestones,
        unassignedLessonIds: current.unassignedLessonIds.filter((id) => id !== lessonId),
      };
    });
  }

  function moveLesson(milestoneId: string, lessonId: string, direction: -1 | 1) {
    updateMilestone(milestoneId, (item) => {
      const index = item.lessonIds.indexOf(lessonId);
      const target = index + direction;
      if (index === -1 || target < 0 || target >= item.lessonIds.length) return item;
      const lessonIds = [...item.lessonIds];
      [lessonIds[index], lessonIds[target]] = [lessonIds[target], lessonIds[index]];
      return { ...item, lessonIds };
    });
  }

  function toggleOutcomeLesson(milestoneId: string, outcomeId: string, lessonId: string) {
    updateMilestone(milestoneId, (item) => {
      const existing = item.outcomes.find((outcome) => outcome.outcomeId === outcomeId);
      const has = existing?.lessonIds.includes(lessonId);
      const outcomes = (() => {
        if (!existing) {
          return [...item.outcomes, { outcomeId, lessonIds: [lessonId] }];
        }
        return item.outcomes.map((outcome) =>
          outcome.outcomeId === outcomeId
            ? {
                ...outcome,
                lessonIds: has
                  ? outcome.lessonIds.filter((id) => id !== lessonId)
                  : [...outcome.lessonIds, lessonId],
              }
            : outcome
        );
      })();
      return { ...item, outcomes };
    });
  }

  async function apply() {
    if (!draft) return;
    setApplying(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/programs/${programId}/auto-arrange/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ milestones: draft.milestones }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Không áp dụng được gợi ý");
      onApplied(data.program);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không áp dụng được gợi ý");
    } finally {
      setApplying(false);
    }
  }

  const totalAssigned = draft?.milestones.reduce((sum, item) => sum + item.lessonIds.length, 0) ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-center bg-slate-900/40 p-0 sm:items-center sm:p-6">
      <div className="flex h-full w-full max-w-4xl flex-col overflow-hidden bg-white shadow-2xl sm:rounded-2xl">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Gợi ý sắp xếp bài học (AI)</h2>
            <p className="text-sm text-slate-500">
              Xem và chỉnh sửa gợi ý bên dưới, sau đó bấm “Xác nhận áp dụng”. Việc này ghi đè danh sách bài học hiện tại
              của các mốc.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Đóng"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
              <p className="mt-4 text-sm text-slate-500">AI đang phân tích bài học và các mốc…</p>
            </div>
          ) : error && !draft ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
              <i className="fa-solid fa-triangle-exclamation text-2xl text-red-500"></i>
              <p className="mt-3 text-sm text-red-700">{error}</p>
              <button type="button" onClick={generate} className="btn btn-secondary mt-4">
                Thử lại
              </button>
            </div>
          ) : draft ? (
            <div className="space-y-5">
              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
              )}

              {milestones.map((milestone, index) => {
                const data = milestoneDraft(milestone.id);
                const unassignedOptions = draft.unassignedLessonIds;

                return (
                  <div key={milestone.id} className="rounded-xl border border-slate-200">
                    <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-3">
                      <span
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-xs"
                        style={{ backgroundColor: `${milestone.color ?? "#6366F1"}20`, color: milestone.color ?? "#6366F1" }}
                      >
                        <i className={`fa-solid ${milestone.icon ?? "fa-flag-checkered"}`}></i>
                      </span>
                      <h3 className="text-sm font-bold text-slate-900">
                        Mốc {index + 1}: {milestone.title}
                      </h3>
                      <span className="ml-auto text-xs font-semibold text-slate-400">{data.lessonIds.length} bài</span>
                    </div>

                    <div className="space-y-3 p-4">
                      {/* Assigned lessons */}
                      {data.lessonIds.length > 0 ? (
                        <ul className="space-y-1.5">
                          {data.lessonIds.map((lessonId, lessonIndex) => (
                            <li
                              key={lessonId}
                              className="flex items-center gap-2 rounded-lg border border-slate-100 bg-white px-3 py-2"
                            >
                              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-slate-100 text-xs font-bold text-slate-500">
                                {lessonIndex + 1}
                              </span>
                              <span className="min-w-0 flex-1 truncate text-sm text-slate-700">
                                {lessonLabel(lessonById.get(lessonId))}
                              </span>
                              <div className="flex shrink-0 items-center gap-1 text-slate-400">
                                <button
                                  type="button"
                                  onClick={() => moveLesson(milestone.id, lessonId, -1)}
                                  disabled={lessonIndex === 0}
                                  className="rounded p-1 hover:bg-slate-100 disabled:opacity-30"
                                  aria-label="Lên"
                                >
                                  <i className="fa-solid fa-chevron-up text-xs"></i>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => moveLesson(milestone.id, lessonId, 1)}
                                  disabled={lessonIndex === data.lessonIds.length - 1}
                                  className="rounded p-1 hover:bg-slate-100 disabled:opacity-30"
                                  aria-label="Xuống"
                                >
                                  <i className="fa-solid fa-chevron-down text-xs"></i>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removeLesson(milestone.id, lessonId)}
                                  className="rounded p-1 text-red-400 hover:bg-red-50 hover:text-red-600"
                                  aria-label="Bỏ"
                                >
                                  <i className="fa-solid fa-xmark text-xs"></i>
                                </button>
                              </div>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="rounded-lg border border-dashed border-slate-200 px-3 py-2 text-xs text-slate-400">
                          Chưa có bài học nào trong mốc này.
                        </p>
                      )}

                      {/* Add lesson */}
                      {unassignedOptions.length > 0 && (
                        <select
                          value=""
                          onChange={(event) => addLesson(milestone.id, event.target.value)}
                          className="input text-sm"
                        >
                          <option value="">+ Thêm bài chưa xếp vào mốc này…</option>
                          {unassignedOptions.map((lessonId) => (
                            <option key={lessonId} value={lessonId}>
                              {lessonLabel(lessonById.get(lessonId))}
                            </option>
                          ))}
                        </select>
                      )}

                      {/* Outcome mapping */}
                      {milestone.outcomes.length > 0 && data.lessonIds.length > 0 && (
                        <div className="space-y-2 rounded-lg bg-slate-50 p-3">
                          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                            Gắn bài cho outcome (cho skill tree)
                          </div>
                          {milestone.outcomes.map((outcome) => {
                            const outcomeDraft = data.outcomes.find((item) => item.outcomeId === outcome.id);
                            const selected = new Set(outcomeDraft?.lessonIds ?? []);
                            return (
                              <div key={outcome.id}>
                                <div className="text-xs font-medium text-slate-600">{outcome.title}</div>
                                <div className="mt-1 flex flex-wrap gap-1.5">
                                  {data.lessonIds.map((lessonId) => {
                                    const active = selected.has(lessonId);
                                    return (
                                      <button
                                        key={lessonId}
                                        type="button"
                                        onClick={() => toggleOutcomeLesson(milestone.id, outcome.id, lessonId)}
                                        className={`rounded-full border px-2 py-0.5 text-[11px] transition ${
                                          active
                                            ? "border-indigo-200 bg-indigo-100 text-indigo-700"
                                            : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                                        }`}
                                      >
                                        {lessonById.get(lessonId)?.title ?? lessonId}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Unassigned */}
              {draft.unassignedLessonIds.length > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <div className="text-sm font-semibold text-amber-800">
                    Bài chưa được xếp ({draft.unassignedLessonIds.length})
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {draft.unassignedLessonIds.map((lessonId) => (
                      <span
                        key={lessonId}
                        className="rounded-full border border-amber-200 bg-white px-2 py-0.5 text-[11px] text-amber-700"
                      >
                        {lessonLabel(lessonById.get(lessonId))}
                      </span>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-amber-600">
                    Dùng ô “Thêm bài chưa xếp” ở mỗi mốc để đưa các bài này vào lộ trình nếu cần.
                  </p>
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 border-t border-slate-200 px-5 py-4">
          <div className="text-xs text-slate-400">
            {meta ? `Gợi ý bởi ${meta.provider} · ${meta.model} · ` : ""}
            {draft ? `${totalAssigned} bài đã xếp` : ""}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={generate}
              disabled={loading || applying}
              className="btn btn-secondary text-sm"
            >
              <i className="fa-solid fa-rotate"></i>
              Tạo lại gợi ý
            </button>
            <button
              type="button"
              onClick={apply}
              disabled={!draft || loading || applying}
              className="btn btn-primary text-sm"
            >
              {applying ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin"></i> Đang áp dụng…
                </>
              ) : (
                <>
                  <i className="fa-solid fa-check"></i> Xác nhận áp dụng
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
