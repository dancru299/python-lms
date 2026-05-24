"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

interface LessonOption {
  id: string;
  title: string;
  duration?: number;
  difficulty?: string;
  objectiveKnowledge?: string | null;
  objectiveSkills?: string | null;
  objectiveAttitude?: string | null;
  chapterId?: string;
  chapter?: { title: string; color?: string | null; icon?: string | null };
}

interface ChapterOption {
  id: string;
  title: string;
  color: string;
  icon: string;
  lessons: LessonOption[];
}

interface MilestoneLessonLink {
  id: string;
  lessonId: string;
  sortOrder: number;
  lesson: LessonOption;
}

interface OutcomeLessonLink {
  id: string;
  lessonId: string;
  lesson: LessonOption;
}

interface OutcomeSkillLink {
  id: string;
  skillId: string;
  skill: { id: string; title: string; parentSkillId: string | null };
}

interface LearningOutcome {
  id: string;
  milestoneId: string;
  title: string;
  description: string | null;
  sortOrder: number;
  lessons: OutcomeLessonLink[];
  skills: OutcomeSkillLink[];
}

interface Milestone {
  id: string;
  title: string;
  description: string | null;
  icon: string;
  color: string;
  sortOrder: number;
  lessons: MilestoneLessonLink[];
  outcomes: LearningOutcome[];
}

interface Skill {
  id: string;
  title: string;
  description: string | null;
  parentSkillId: string | null;
  sortOrder: number;
  parentSkill?: { id: string; title: string } | null;
  outcomeLinks?: Array<{ outcome: { id: string; title: string; milestoneId: string } }>;
}

interface Program {
  id: string;
  title: string;
  description: string | null;
  isActive: boolean;
  sortOrder: number;
  milestones: Milestone[];
  skills: Skill[];
}

interface ProgramsClientPageProps {
  initialPrograms: Program[];
  lessonsByChapter: ChapterOption[];
}

const emptyProgramForm = {
  title: "",
  description: "",
  isActive: true,
  sortOrder: 0,
};

const emptyMilestoneForm = {
  title: "",
  description: "",
  icon: "fa-flag-checkered",
  color: "#3B82F6",
  sortOrder: 0,
};

const emptyOutcomeForm = {
  title: "",
  description: "",
  sortOrder: 0,
};

const emptySkillForm = {
  title: "",
  description: "",
  parentSkillId: "",
  sortOrder: 0,
};

async function mutateProgram(url: string, method: string, body?: unknown) {
  const response = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "Không thể lưu thay đổi.");
  }

  return data as { success: boolean; program?: Program };
}

function difficultyLabel(difficulty?: string) {
  if (difficulty === "advanced" || difficulty === "hard") return "Nâng cao";
  if (difficulty === "intermediate" || difficulty === "medium") return "Trung bình";
  return "Cơ bản";
}

function LessonSelect({
  value,
  onChange,
  lessons,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  lessons: Array<LessonOption & { chapterTitle?: string }>;
  placeholder: string;
}) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value)} className="input text-sm">
      <option value="">{placeholder}</option>
      {lessons.map((lesson) => (
        <option key={lesson.id} value={lesson.id}>
          {lesson.chapterTitle ? `${lesson.chapterTitle} - ` : ""}
          {lesson.title}
        </option>
      ))}
    </select>
  );
}

export default function ProgramsClientPage({ initialPrograms, lessonsByChapter }: ProgramsClientPageProps) {
  const [programs, setPrograms] = useState<Program[]>(initialPrograms);
  const [selectedProgramId, setSelectedProgramId] = useState(initialPrograms[0]?.id ?? "");
  const [saving, setSaving] = useState(false);
  const [programForm, setProgramForm] = useState(emptyProgramForm);
  const [programEdit, setProgramEdit] = useState(emptyProgramForm);
  const [milestoneForm, setMilestoneForm] = useState(emptyMilestoneForm);
  const [editingMilestoneId, setEditingMilestoneId] = useState<string | null>(null);
  const [outcomeForm, setOutcomeForm] = useState(emptyOutcomeForm);
  const [outcomeMilestoneId, setOutcomeMilestoneId] = useState("");
  const [editingOutcomeId, setEditingOutcomeId] = useState<string | null>(null);
  const [skillForm, setSkillForm] = useState(emptySkillForm);
  const [editingSkillId, setEditingSkillId] = useState<string | null>(null);
  const [milestoneLessonSelect, setMilestoneLessonSelect] = useState<Record<string, string>>({});
  const [outcomeLessonSelect, setOutcomeLessonSelect] = useState<Record<string, string>>({});
  const [outcomeSkillSelect, setOutcomeSkillSelect] = useState<Record<string, string>>({});

  const selectedProgram = useMemo(
    () => programs.find((program) => program.id === selectedProgramId) ?? programs[0] ?? null,
    [programs, selectedProgramId]
  );

  const allLessons = useMemo(
    () =>
      lessonsByChapter.flatMap((chapter) =>
        chapter.lessons.map((lesson) => ({
          ...lesson,
          chapterId: chapter.id,
          chapterTitle: chapter.title,
          chapter: { title: chapter.title, color: chapter.color, icon: chapter.icon },
        }))
      ),
    [lessonsByChapter]
  );

  const allOutcomes = useMemo(
    () => selectedProgram?.milestones.flatMap((milestone) => milestone.outcomes) ?? [],
    [selectedProgram]
  );

  useEffect(() => {
    if (!selectedProgram) return;
    setSelectedProgramId(selectedProgram.id);
    setProgramEdit({
      title: selectedProgram.title,
      description: selectedProgram.description ?? "",
      isActive: selectedProgram.isActive,
      sortOrder: selectedProgram.sortOrder,
    });
    setOutcomeMilestoneId(selectedProgram.milestones[0]?.id ?? "");
  }, [selectedProgram?.id]);

  function replaceProgram(nextProgram: Program) {
    setPrograms((current) => {
      const exists = current.some((program) => program.id === nextProgram.id);
      const nextPrograms = exists
        ? current.map((program) => (program.id === nextProgram.id ? nextProgram : program))
        : [nextProgram, ...current];

      return nextPrograms.sort((a, b) => Number(b.isActive) - Number(a.isActive) || a.sortOrder - b.sortOrder);
    });
    setSelectedProgramId(nextProgram.id);
  }

  async function runMutation(task: () => Promise<{ program?: Program }>) {
    setSaving(true);
    try {
      const result = await task();
      if (result.program) replaceProgram(result.program);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Không thể lưu thay đổi.");
    } finally {
      setSaving(false);
    }
  }

  function resetMilestoneForm() {
    setEditingMilestoneId(null);
    setMilestoneForm(emptyMilestoneForm);
  }

  function resetOutcomeForm() {
    setEditingOutcomeId(null);
    setOutcomeForm(emptyOutcomeForm);
  }

  function resetSkillForm() {
    setEditingSkillId(null);
    setSkillForm(emptySkillForm);
  }

  const programId = selectedProgram?.id ?? "";

  return (
    <div className="space-y-6">
      <section className="grid gap-4 lg:grid-cols-[1.2fr,1fr]">
        <div className="card p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Danh sách chương trình</h2>
              <p className="text-sm text-slate-500">V1 ưu tiên một chương trình active cho toàn hệ thống.</p>
            </div>
            {programs.length > 0 && (
              <select
                value={selectedProgram?.id ?? ""}
                onChange={(event) => setSelectedProgramId(event.target.value)}
                className="input max-w-sm text-sm"
              >
                {programs.map((program) => (
                  <option key={program.id} value={program.id}>
                    {program.isActive ? "Active - " : ""}
                    {program.title}
                  </option>
                ))}
              </select>
            )}
          </div>

          {selectedProgram ? (
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-slate-200 p-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Milestone</div>
                <div className="mt-1 text-2xl font-bold text-slate-900">{selectedProgram.milestones.length}</div>
              </div>
              <div className="rounded-lg border border-slate-200 p-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Outcome</div>
                <div className="mt-1 text-2xl font-bold text-slate-900">{allOutcomes.length}</div>
              </div>
              <div className="rounded-lg border border-slate-200 p-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Kỹ năng</div>
                <div className="mt-1 text-2xl font-bold text-slate-900">{selectedProgram.skills.length}</div>
              </div>
            </div>
          ) : (
            <div className="mt-5 rounded-lg border border-dashed border-slate-300 p-8 text-center text-slate-500">
              Chưa có chương trình nào. Tạo chương trình đầu tiên để bắt đầu dựng roadmap.
            </div>
          )}
        </div>

        <div className="card p-5">
          <h2 className="text-lg font-bold text-slate-900">Tạo chương trình</h2>
          <div className="mt-4 space-y-3">
            <input
              value={programForm.title}
              onChange={(event) => setProgramForm((form) => ({ ...form, title: event.target.value }))}
              className="input"
              placeholder="VD: Lộ trình Python nền tảng"
            />
            <textarea
              value={programForm.description}
              onChange={(event) => setProgramForm((form) => ({ ...form, description: event.target.value }))}
              className="input min-h-[84px]"
              placeholder="Mô tả ngắn về chương trình"
            />
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={programForm.isActive}
                onChange={(event) => setProgramForm((form) => ({ ...form, isActive: event.target.checked }))}
              />
              Đặt làm chương trình active
            </label>
            <button
              disabled={saving}
              onClick={() =>
                runMutation(async () => {
                  const result = await mutateProgram("/api/admin/programs", "POST", programForm);
                  setProgramForm(emptyProgramForm);
                  return result;
                })
              }
              className="btn btn-primary w-full justify-center"
            >
              <i className="fa-solid fa-plus"></i>
              Tạo chương trình
            </button>
          </div>
        </div>
      </section>

      {selectedProgram && (
        <>
          <section className="card p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Thông tin chương trình</h2>
                <p className="text-sm text-slate-500">
                  Nội dung bài học vẫn nằm ở Chương/Bài giảng; phần này chỉ tổ chức lộ trình.
                </p>
              </div>
              <button
                disabled={saving || selectedProgram.isActive}
                onClick={() =>
                  runMutation(() =>
                    mutateProgram(`/api/admin/programs/${selectedProgram.id}`, "PUT", {
                      ...programEdit,
                      isActive: true,
                    })
                  )
                }
                className="btn btn-secondary"
              >
                <i className="fa-solid fa-bolt"></i>
                {selectedProgram.isActive ? "Đang active" : "Đặt active"}
              </button>
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-[1fr,1fr,140px]">
              <input
                value={programEdit.title}
                onChange={(event) => setProgramEdit((form) => ({ ...form, title: event.target.value }))}
                className="input"
                placeholder="Tên chương trình"
              />
              <input
                value={programEdit.description}
                onChange={(event) => setProgramEdit((form) => ({ ...form, description: event.target.value }))}
                className="input"
                placeholder="Mô tả"
              />
              <input
                type="number"
                value={programEdit.sortOrder}
                onChange={(event) =>
                  setProgramEdit((form) => ({ ...form, sortOrder: Number(event.target.value) }))
                }
                className="input"
                placeholder="Thứ tự"
              />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                disabled={saving}
                onClick={() =>
                  runMutation(() =>
                    mutateProgram(`/api/admin/programs/${selectedProgram.id}`, "PUT", programEdit)
                  )
                }
                className="btn btn-primary"
              >
                <i className="fa-solid fa-save"></i>
                Lưu chương trình
              </button>
              <button
                disabled={saving}
                onClick={() => {
                  if (!confirm(`Xóa chương trình "${selectedProgram.title}"? Nội dung bài học gốc vẫn được giữ.`)) {
                    return;
                  }
                  runMutation(async () => {
                    await mutateProgram(`/api/admin/programs/${selectedProgram.id}`, "DELETE");
                    setPrograms((current) => current.filter((program) => program.id !== selectedProgram.id));
                    setSelectedProgramId(programs.find((program) => program.id !== selectedProgram.id)?.id ?? "");
                    return {};
                  });
                }}
                className="btn btn-danger"
              >
                <i className="fa-solid fa-trash"></i>
                Xóa meta layer
              </button>
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.25fr,0.75fr]">
            <div className="space-y-4">
              <div className="card p-5">
                <h2 className="text-lg font-bold text-slate-900">
                  {editingMilestoneId ? "Sửa milestone" : "Tạo milestone"}
                </h2>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <input
                    value={milestoneForm.title}
                    onChange={(event) => setMilestoneForm((form) => ({ ...form, title: event.target.value }))}
                    className="input"
                    placeholder="VD: Tư duy lập trình căn bản"
                  />
                  <input
                    value={milestoneForm.description}
                    onChange={(event) =>
                      setMilestoneForm((form) => ({ ...form, description: event.target.value }))
                    }
                    className="input"
                    placeholder="Mô tả"
                  />
                  <input
                    value={milestoneForm.icon}
                    onChange={(event) => setMilestoneForm((form) => ({ ...form, icon: event.target.value }))}
                    className="input"
                    placeholder="fa-route"
                  />
                  <div className="grid grid-cols-[1fr,120px] gap-3">
                    <input
                      type="color"
                      value={milestoneForm.color}
                      onChange={(event) => setMilestoneForm((form) => ({ ...form, color: event.target.value }))}
                      className="h-11 w-full rounded-lg border border-slate-200"
                    />
                    <input
                      type="number"
                      value={milestoneForm.sortOrder}
                      onChange={(event) =>
                        setMilestoneForm((form) => ({ ...form, sortOrder: Number(event.target.value) }))
                      }
                      className="input"
                    />
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <button
                    disabled={saving}
                    onClick={() =>
                      runMutation(async () => {
                        const result = editingMilestoneId
                          ? await mutateProgram(
                              `/api/admin/programs/${programId}/milestones/${editingMilestoneId}`,
                              "PUT",
                              milestoneForm
                            )
                          : await mutateProgram(`/api/admin/programs/${programId}/milestones`, "POST", milestoneForm);
                        resetMilestoneForm();
                        return result;
                      })
                    }
                    className="btn btn-primary"
                  >
                    <i className="fa-solid fa-save"></i>
                    {editingMilestoneId ? "Cập nhật" : "Tạo milestone"}
                  </button>
                  {editingMilestoneId && (
                    <button onClick={resetMilestoneForm} className="btn btn-secondary">
                      Hủy
                    </button>
                  )}
                </div>
              </div>

              {selectedProgram.milestones.length === 0 ? (
                <div className="card p-8 text-center text-slate-500">
                  Chưa có milestone nào trong chương trình này.
                </div>
              ) : (
                selectedProgram.milestones.map((milestone) => (
                  <article key={milestone.id} className="card overflow-hidden">
                    <div
                      className="border-b border-slate-100 p-5"
                      style={{ background: `linear-gradient(135deg, ${milestone.color}20, transparent)` }}
                    >
                      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div className="flex gap-3">
                          <div
                            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg"
                            style={{ backgroundColor: `${milestone.color}25`, color: milestone.color }}
                          >
                            <i className={`fa-solid ${milestone.icon}`}></i>
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-900">{milestone.title}</h3>
                            <p className="mt-1 text-sm text-slate-500">
                              {milestone.description || "Chưa có mô tả"} · {milestone.lessons.length} bài ·{" "}
                              {milestone.outcomes.length} outcome
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setEditingMilestoneId(milestone.id);
                              setMilestoneForm({
                                title: milestone.title,
                                description: milestone.description ?? "",
                                icon: milestone.icon,
                                color: milestone.color,
                                sortOrder: milestone.sortOrder,
                              });
                            }}
                            className="btn btn-secondary text-sm"
                          >
                            <i className="fa-solid fa-pen"></i>
                            Sửa
                          </button>
                          <button
                            onClick={() => {
                              if (!confirm(`Xóa milestone "${milestone.title}"?`)) return;
                              runMutation(() =>
                                mutateProgram(`/api/admin/programs/${programId}/milestones/${milestone.id}`, "DELETE")
                              );
                            }}
                            className="btn btn-danger text-sm"
                          >
                            <i className="fa-solid fa-trash"></i>
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-5 p-5 lg:grid-cols-[1fr,1fr]">
                      <div>
                        <div className="mb-3 flex items-center justify-between">
                          <h4 className="font-semibold text-slate-800">Bài học trong milestone</h4>
                          <span className="text-xs font-semibold text-slate-400">{milestone.lessons.length} bài</span>
                        </div>
                        <div className="flex gap-2">
                          <LessonSelect
                            value={milestoneLessonSelect[milestone.id] ?? ""}
                            onChange={(value) =>
                              setMilestoneLessonSelect((current) => ({ ...current, [milestone.id]: value }))
                            }
                            lessons={allLessons}
                            placeholder="Chọn bài học để gắn"
                          />
                          <button
                            className="btn btn-secondary shrink-0"
                            onClick={() => {
                              const lessonId = milestoneLessonSelect[milestone.id];
                              if (!lessonId) return;
                              runMutation(() =>
                                mutateProgram(
                                  `/api/admin/programs/${programId}/milestones/${milestone.id}/lessons`,
                                  "POST",
                                  { lessonId }
                                )
                              );
                            }}
                          >
                            Gắn
                          </button>
                        </div>
                        <div className="mt-3 space-y-2">
                          {milestone.lessons.map((link) => (
                            <div
                              key={link.id}
                              className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2"
                            >
                              <div className="min-w-0">
                                <Link
                                  href={`/lessons/${link.lessonId}`}
                                  target="_blank"
                                  className="truncate text-sm font-medium text-slate-800 hover:text-indigo-600"
                                >
                                  {link.lesson.title}
                                </Link>
                                <div className="text-xs text-slate-400">
                                  {link.lesson.chapter?.title} · {difficultyLabel(link.lesson.difficulty)}
                                </div>
                              </div>
                              <button
                                onClick={() =>
                                  runMutation(() =>
                                    mutateProgram(
                                      `/api/admin/programs/${programId}/milestones/${milestone.id}/lessons`,
                                      "DELETE",
                                      { lessonId: link.lessonId }
                                    )
                                  )
                                }
                                className="text-sm font-semibold text-red-500 hover:text-red-600"
                              >
                                Bỏ
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <div className="mb-3 flex items-center justify-between">
                          <h4 className="font-semibold text-slate-800">Learning outcome</h4>
                          <button
                            onClick={() => {
                              setOutcomeMilestoneId(milestone.id);
                              resetOutcomeForm();
                            }}
                            className="text-sm font-semibold text-indigo-600"
                          >
                            Tạo tại mốc này
                          </button>
                        </div>
                        <div className="space-y-3">
                          {milestone.outcomes.map((outcome) => (
                            <div key={outcome.id} className="rounded-lg border border-slate-200 p-3">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <div className="font-semibold text-slate-900">{outcome.title}</div>
                                  {outcome.description && (
                                    <div className="mt-1 text-sm text-slate-500">{outcome.description}</div>
                                  )}
                                </div>
                                <div className="flex gap-2 text-sm">
                                  <button
                                    onClick={() => {
                                      setEditingOutcomeId(outcome.id);
                                      setOutcomeMilestoneId(milestone.id);
                                      setOutcomeForm({
                                        title: outcome.title,
                                        description: outcome.description ?? "",
                                        sortOrder: outcome.sortOrder,
                                      });
                                    }}
                                    className="font-semibold text-indigo-600"
                                  >
                                    Sửa
                                  </button>
                                  <button
                                    onClick={() => {
                                      if (!confirm(`Xóa outcome "${outcome.title}"?`)) return;
                                      runMutation(() =>
                                        mutateProgram(
                                          `/api/admin/programs/${programId}/outcomes/${outcome.id}`,
                                          "DELETE"
                                        )
                                      );
                                    }}
                                    className="font-semibold text-red-500"
                                  >
                                    Xóa
                                  </button>
                                </div>
                              </div>

                              <div className="mt-3 grid gap-2 sm:grid-cols-[1fr,auto]">
                                <LessonSelect
                                  value={outcomeLessonSelect[outcome.id] ?? ""}
                                  onChange={(value) =>
                                    setOutcomeLessonSelect((current) => ({ ...current, [outcome.id]: value }))
                                  }
                                  lessons={allLessons}
                                  placeholder="Gắn bài để tính outcome"
                                />
                                <button
                                  className="btn btn-secondary text-sm"
                                  onClick={() => {
                                    const lessonId = outcomeLessonSelect[outcome.id];
                                    if (!lessonId) return;
                                    runMutation(() =>
                                      mutateProgram(
                                        `/api/admin/programs/${programId}/outcomes/${outcome.id}/lessons`,
                                        "POST",
                                        { lessonId }
                                      )
                                    );
                                  }}
                                >
                                  Gắn bài
                                </button>
                              </div>
                              <div className="mt-2 flex flex-wrap gap-2">
                                {outcome.lessons.map((link) => (
                                  <button
                                    key={link.id}
                                    onClick={() =>
                                      runMutation(() =>
                                        mutateProgram(
                                          `/api/admin/programs/${programId}/outcomes/${outcome.id}/lessons`,
                                          "DELETE",
                                          { lessonId: link.lessonId }
                                        )
                                      )
                                    }
                                    className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-red-50 hover:text-red-600"
                                  >
                                    {link.lesson.title} ×
                                  </button>
                                ))}
                              </div>

                              <div className="mt-3 grid gap-2 sm:grid-cols-[1fr,auto]">
                                <select
                                  value={outcomeSkillSelect[outcome.id] ?? ""}
                                  onChange={(event) =>
                                    setOutcomeSkillSelect((current) => ({ ...current, [outcome.id]: event.target.value }))
                                  }
                                  className="input text-sm"
                                >
                                  <option value="">Gắn kỹ năng</option>
                                  {selectedProgram.skills.map((skill) => (
                                    <option key={skill.id} value={skill.id}>
                                      {skill.parentSkill ? `${skill.parentSkill.title} - ` : ""}
                                      {skill.title}
                                    </option>
                                  ))}
                                </select>
                                <button
                                  className="btn btn-secondary text-sm"
                                  onClick={() => {
                                    const skillId = outcomeSkillSelect[outcome.id];
                                    if (!skillId) return;
                                    runMutation(() =>
                                      mutateProgram(
                                        `/api/admin/programs/${programId}/outcomes/${outcome.id}/skills`,
                                        "POST",
                                        { skillId }
                                      )
                                    );
                                  }}
                                >
                                  Gắn skill
                                </button>
                              </div>
                              <div className="mt-2 flex flex-wrap gap-2">
                                {outcome.skills.map((link) => (
                                  <button
                                    key={link.id}
                                    onClick={() =>
                                      runMutation(() =>
                                        mutateProgram(
                                          `/api/admin/programs/${programId}/outcomes/${outcome.id}/skills`,
                                          "DELETE",
                                          { skillId: link.skillId }
                                        )
                                      )
                                    }
                                    className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 hover:bg-red-50 hover:text-red-600"
                                  >
                                    {link.skill.title} ×
                                  </button>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>

            <aside className="space-y-4">
              <div className="card p-5">
                <h2 className="text-lg font-bold text-slate-900">
                  {editingOutcomeId ? "Sửa outcome" : "Tạo outcome"}
                </h2>
                <div className="mt-4 space-y-3">
                  <select
                    value={outcomeMilestoneId}
                    onChange={(event) => setOutcomeMilestoneId(event.target.value)}
                    className="input"
                  >
                    <option value="">Chọn milestone</option>
                    {selectedProgram.milestones.map((milestone) => (
                      <option key={milestone.id} value={milestone.id}>
                        {milestone.title}
                      </option>
                    ))}
                  </select>
                  <input
                    value={outcomeForm.title}
                    onChange={(event) => setOutcomeForm((form) => ({ ...form, title: event.target.value }))}
                    className="input"
                    placeholder="VD: Viết được vòng lặp for"
                  />
                  <textarea
                    value={outcomeForm.description}
                    onChange={(event) => setOutcomeForm((form) => ({ ...form, description: event.target.value }))}
                    className="input min-h-[84px]"
                    placeholder="Mô tả outcome"
                  />
                  <input
                    type="number"
                    value={outcomeForm.sortOrder}
                    onChange={(event) =>
                      setOutcomeForm((form) => ({ ...form, sortOrder: Number(event.target.value) }))
                    }
                    className="input"
                    placeholder="Thứ tự"
                  />
                  <div className="flex gap-2">
                    <button
                      disabled={saving || (!editingOutcomeId && !outcomeMilestoneId)}
                      onClick={() =>
                        runMutation(async () => {
                          const result = editingOutcomeId
                            ? await mutateProgram(
                                `/api/admin/programs/${programId}/outcomes/${editingOutcomeId}`,
                                "PUT",
                                outcomeForm
                              )
                            : await mutateProgram(
                                `/api/admin/programs/${programId}/milestones/${outcomeMilestoneId}/outcomes`,
                                "POST",
                                outcomeForm
                              );
                          resetOutcomeForm();
                          return result;
                        })
                      }
                      className="btn btn-primary"
                    >
                      <i className="fa-solid fa-save"></i>
                      {editingOutcomeId ? "Cập nhật" : "Tạo"}
                    </button>
                    {editingOutcomeId && (
                      <button onClick={resetOutcomeForm} className="btn btn-secondary">
                        Hủy
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="card p-5">
                <h2 className="text-lg font-bold text-slate-900">
                  {editingSkillId ? "Sửa kỹ năng" : "Cây kỹ năng"}
                </h2>
                <div className="mt-4 space-y-3">
                  <input
                    value={skillForm.title}
                    onChange={(event) => setSkillForm((form) => ({ ...form, title: event.target.value }))}
                    className="input"
                    placeholder="VD: Tư duy vòng lặp"
                  />
                  <textarea
                    value={skillForm.description}
                    onChange={(event) => setSkillForm((form) => ({ ...form, description: event.target.value }))}
                    className="input min-h-[72px]"
                    placeholder="Mô tả kỹ năng"
                  />
                  <select
                    value={skillForm.parentSkillId}
                    onChange={(event) => setSkillForm((form) => ({ ...form, parentSkillId: event.target.value }))}
                    className="input"
                  >
                    <option value="">Kỹ năng gốc</option>
                    {selectedProgram.skills
                      .filter((skill) => skill.id !== editingSkillId)
                      .map((skill) => (
                        <option key={skill.id} value={skill.id}>
                          {skill.parentSkill ? `${skill.parentSkill.title} - ` : ""}
                          {skill.title}
                        </option>
                      ))}
                  </select>
                  <input
                    type="number"
                    value={skillForm.sortOrder}
                    onChange={(event) =>
                      setSkillForm((form) => ({ ...form, sortOrder: Number(event.target.value) }))
                    }
                    className="input"
                    placeholder="Thứ tự"
                  />
                  <div className="flex gap-2">
                    <button
                      disabled={saving}
                      onClick={() =>
                        runMutation(async () => {
                          const result = editingSkillId
                            ? await mutateProgram(
                                `/api/admin/programs/${programId}/skills/${editingSkillId}`,
                                "PUT",
                                skillForm
                              )
                            : await mutateProgram(`/api/admin/programs/${programId}/skills`, "POST", skillForm);
                          resetSkillForm();
                          return result;
                        })
                      }
                      className="btn btn-primary"
                    >
                      <i className="fa-solid fa-save"></i>
                      {editingSkillId ? "Cập nhật" : "Tạo skill"}
                    </button>
                    {editingSkillId && (
                      <button onClick={resetSkillForm} className="btn btn-secondary">
                        Hủy
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-5 space-y-2">
                  {selectedProgram.skills.map((skill) => (
                    <div
                      key={skill.id}
                      className={`rounded-lg border px-3 py-2 ${
                        skill.parentSkillId ? "ml-5 border-slate-200 bg-slate-50" : "border-indigo-100 bg-indigo-50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-semibold text-slate-900">{skill.title}</div>
                          <div className="text-xs text-slate-500">
                            {skill.parentSkill ? `Thuộc ${skill.parentSkill.title}` : "Nhóm kỹ năng gốc"} ·{" "}
                            {skill.outcomeLinks?.length ?? 0} outcome
                          </div>
                        </div>
                        <div className="flex gap-2 text-sm">
                          <button
                            onClick={() => {
                              setEditingSkillId(skill.id);
                              setSkillForm({
                                title: skill.title,
                                description: skill.description ?? "",
                                parentSkillId: skill.parentSkillId ?? "",
                                sortOrder: skill.sortOrder,
                              });
                            }}
                            className="font-semibold text-indigo-600"
                          >
                            Sửa
                          </button>
                          <button
                            onClick={() => {
                              if (!confirm(`Xóa kỹ năng "${skill.title}"?`)) return;
                              runMutation(() =>
                                mutateProgram(`/api/admin/programs/${programId}/skills/${skill.id}`, "DELETE")
                              );
                            }}
                            className="font-semibold text-red-500"
                          >
                            Xóa
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {selectedProgram.skills.length === 0 && (
                    <div className="rounded-lg border border-dashed border-slate-300 p-5 text-center text-sm text-slate-500">
                      Chưa có kỹ năng nào.
                    </div>
                  )}
                </div>
              </div>
            </aside>
          </section>
        </>
      )}
    </div>
  );
}
