"use client";

import { useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import type {
  CurriculumDraft,
  EbookOutlineItem,
} from "@/lib/programs/ebook-curriculum";
import {
  evaluateCurriculumDraft,
  type CurriculumQualityIssue,
  type CurriculumQualitySeverity,
} from "@/lib/programs/curriculum-quality";

export interface AppliedProgram {
  id: string;
  title: string;
  description: string | null;
  isActive: boolean;
  sortOrder: number;
  milestones: unknown[];
  skills: unknown[];
}

interface EbookCurriculumBuilderProps {
  selectedProgramId?: string;
  selectedProgramTitle?: string;
  onApplied: (program: AppliedProgram) => void;
}

type SourceMode = "paste" | "pdf";
type StatusTone = "success" | "error" | "info";

interface StatusMessage {
  tone: StatusTone;
  text: string;
}

type DraftMilestone = CurriculumDraft["milestones"][number];
type DraftOutcome = CurriculumDraft["outcomes"][number];
type DraftSkill = CurriculumDraft["skills"][number];

const sampleToc = [
  "Chương 1 GIỚI THIỆU VÀ CÀI ĐẶT PYTHON 9",
  "1.1 Đôi nét về ngôn ngữ lập trình Python 9",
  "1.2 Lịch sử phát triển Python 10",
  "1.3 Cài đặt Python 11",
  "Chương 2 PHÉP TOÁN CƠ BẢN, BIẾN VÀ NHẬP XUẤT TRONG PYTHON 18",
  "2.1 Sử dụng VS Code như một máy tính cầm tay 18",
  "2.2 Các phép toán 19",
  "Bài tập thực hành 33",
].join("\n");

function statusClass(tone: StatusTone) {
  if (tone === "error") return "border-red-200 bg-red-50 text-red-700";
  if (tone === "success") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  return "border-indigo-200 bg-indigo-50 text-indigo-700";
}

function qualitySeverityLabel(severity: CurriculumQualitySeverity) {
  if (severity === "critical") return "Bắt buộc sửa";
  if (severity === "warning") return "Nên sửa";
  return "Gợi ý";
}

function qualitySeverityClass(severity: CurriculumQualitySeverity) {
  if (severity === "critical") return "bg-red-50 text-red-700 border-red-100";
  if (severity === "warning") return "bg-amber-50 text-amber-700 border-amber-100";
  return "bg-slate-50 text-slate-600 border-slate-200";
}

function qualitySeverityIcon(severity: CurriculumQualitySeverity) {
  if (severity === "critical") return "fa-circle-exclamation";
  if (severity === "warning") return "fa-triangle-exclamation";
  return "fa-circle-info";
}

function issueToneClass(issue: CurriculumQualityIssue) {
  if (issue.severity === "critical") return "border-red-100 bg-red-50";
  if (issue.severity === "warning") return "border-amber-100 bg-amber-50";
  return "border-slate-200 bg-slate-50";
}

function getOutlineStats(items: EbookOutlineItem[]) {
  let chapters = 0;
  let lessons = 0;
  let exercises = 0;

  function walk(nodes: EbookOutlineItem[]) {
    nodes.forEach((item) => {
      if (item.type === "chapter") chapters += 1;
      if (item.type === "section") lessons += 1;
      if (item.type === "exercise") exercises += 1;
      walk(item.children);
    });
  }

  walk(items);
  return { chapters, lessons, exercises };
}

function itemTypeLabel(type: EbookOutlineItem["type"]) {
  if (type === "chapter") return "Chương";
  if (type === "section") return "Mục";
  if (type === "exercise") return "Bài tập";
  return "Phụ lục";
}

function itemTypeClass(type: EbookOutlineItem["type"]) {
  if (type === "chapter") return "bg-indigo-50 text-indigo-700";
  if (type === "section") return "bg-slate-100 text-slate-600";
  if (type === "exercise") return "bg-amber-50 text-amber-700";
  return "bg-slate-50 text-slate-500";
}

function OutlineTree({ items, depth = 0 }: { items: EbookOutlineItem[]; depth?: number }) {
  return (
    <div className={depth === 0 ? "space-y-2" : "mt-2 space-y-2"}>
      {items.map((item) => (
        <div key={item.id} className={depth > 0 ? "ml-4 border-l border-slate-200 pl-3" : ""}>
          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-slate-800">
                  {item.number ? `${item.number} ` : ""}
                  {item.title}
                </div>
                {item.page && <div className="mt-0.5 text-xs text-slate-400">Trang {item.page}</div>}
              </div>
              <span className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-bold ${itemTypeClass(item.type)}`}>
                {itemTypeLabel(item.type)}
              </span>
            </div>
          </div>
          {item.children.length > 0 && <OutlineTree items={item.children} depth={depth + 1} />}
        </div>
      ))}
    </div>
  );
}

function LessonChips({
  lessonKeys,
  lessonTitleByKey,
}: {
  lessonKeys: string[];
  lessonTitleByKey: Map<string, string>;
}) {
  if (lessonKeys.length === 0) {
    return <div className="text-xs font-medium text-amber-600">Chưa gắn bài học</div>;
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {lessonKeys.map((key) => (
        <span key={key} className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600">
          {lessonTitleByKey.get(key) ?? key}
        </span>
      ))}
    </div>
  );
}

function SkillTreePreview({
  skills,
  outcomeTitleByKey,
}: {
  skills: DraftSkill[];
  outcomeTitleByKey: Map<string, string>;
}) {
  const childrenByParent = new Map<string, DraftSkill[]>();
  const roots: DraftSkill[] = [];

  skills.forEach((skill) => {
    if (!skill.parentKey) {
      roots.push(skill);
      return;
    }
    childrenByParent.set(skill.parentKey, [...(childrenByParent.get(skill.parentKey) ?? []), skill]);
  });

  if (skills.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500">
        Chưa có skill tree.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {roots.map((skill) => (
        <div key={skill.key} className="rounded-lg border border-indigo-100 bg-indigo-50 p-3">
          <div className="font-semibold text-slate-900">{skill.title}</div>
          {skill.outcomeKeys.length > 0 && (
            <div className="mt-1 text-xs text-indigo-700">
              {skill.outcomeKeys.map((key) => outcomeTitleByKey.get(key) ?? key).join(", ")}
            </div>
          )}
          <div className="mt-2 space-y-1">
            {(childrenByParent.get(skill.key) ?? []).map((child) => (
              <div key={child.key} className="rounded-md bg-white px-3 py-2">
                <div className="text-sm font-medium text-slate-800">{child.title}</div>
                {child.outcomeKeys.length > 0 && (
                  <div className="mt-1 text-[11px] text-slate-500">
                    {child.outcomeKeys.map((key) => outcomeTitleByKey.get(key) ?? key).join(", ")}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function EbookCurriculumBuilder({
  selectedProgramId,
  selectedProgramTitle,
  onApplied,
}: EbookCurriculumBuilderProps) {
  const [sourceMode, setSourceMode] = useState<SourceMode>("paste");
  const [tocText, setTocText] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [outline, setOutline] = useState<EbookOutlineItem[]>([]);
  const [draft, setDraft] = useState<CurriculumDraft | null>(null);
  const [status, setStatus] = useState<StatusMessage | null>(null);
  const [parsing, setParsing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [applying, setApplying] = useState(false);

  const lessonTitleByKey = useMemo(() => {
    const map = new Map<string, string>();
    draft?.lessons.forEach((lesson) => map.set(lesson.key, lesson.title));
    return map;
  }, [draft]);

  const outcomeTitleByKey = useMemo(() => {
    const map = new Map<string, string>();
    draft?.outcomes.forEach((outcome) => map.set(outcome.key, outcome.title));
    return map;
  }, [draft]);

  const qualityReport = useMemo(() => evaluateCurriculumDraft(draft), [draft]);

  const outlineStats = useMemo(() => getOutlineStats(outline), [outline]);

  function updateDraftField<Key extends keyof CurriculumDraft>(key: Key, value: CurriculumDraft[Key]) {
    setDraft((current) => (current ? { ...current, [key]: value } : current));
  }

  function updateMilestone(index: number, next: Partial<DraftMilestone>) {
    setDraft((current) => {
      if (!current) return current;
      return {
        ...current,
        milestones: current.milestones.map((milestone, milestoneIndex) =>
          milestoneIndex === index ? { ...milestone, ...next } : milestone
        ),
      };
    });
  }

  function updateOutcome(index: number, next: Partial<DraftOutcome>) {
    setDraft((current) => {
      if (!current) return current;
      return {
        ...current,
        outcomes: current.outcomes.map((outcome, outcomeIndex) =>
          outcomeIndex === index ? { ...outcome, ...next } : outcome
        ),
      };
    });
  }

  function updateSkill(index: number, next: Partial<DraftSkill>) {
    setDraft((current) => {
      if (!current) return current;
      return {
        ...current,
        skills: current.skills.map((skill, skillIndex) =>
          skillIndex === index ? { ...skill, ...next } : skill
        ),
      };
    });
  }

  function moveMilestone(index: number, direction: -1 | 1) {
    setDraft((current) => {
      if (!current) return current;
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= current.milestones.length) return current;
      const milestones = [...current.milestones];
      const [item] = milestones.splice(index, 1);
      milestones.splice(nextIndex, 0, item);
      return { ...current, milestones };
    });
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    setPdfFile(event.target.files?.[0] ?? null);
  }

  async function parseOutline() {
    setParsing(true);
    setStatus(null);
    try {
      let response: Response;
      if (sourceMode === "pdf") {
        if (!pdfFile) {
          throw new Error("Hãy chọn file PDF trước khi parse.");
        }
        const formData = new FormData();
        formData.append("file", pdfFile);
        response = await fetch("/api/admin/programs/ebook-outline/parse", {
          method: "POST",
          body: formData,
        });
      } else {
        response = await fetch("/api/admin/programs/ebook-outline/parse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: tocText }),
        });
      }

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Không thể parse mục lục.");
      }

      const parsedOutline = Array.isArray(data.outline) ? data.outline : [];
      const parsedStats = getOutlineStats(parsedOutline);
      setOutline(parsedOutline);
      setDraft(null);
      setStatus({
        tone: "success",
        text: `Đã nhận diện ${parsedStats.chapters} chương, ${parsedStats.lessons} mục, ${parsedStats.exercises} bài tập. Tiếp theo hãy tạo gợi ý roadmap.`,
      });
    } catch (error) {
      setStatus({
        tone: "error",
        text: error instanceof Error ? error.message : "Không thể parse mục lục.",
      });
    } finally {
      setParsing(false);
    }
  }

  async function generateDraft() {
    if (outline.length === 0) {
      setStatus({ tone: "error", text: "Hãy parse mục lục trước." });
      return;
    }

    setGenerating(true);
    setStatus(null);
    try {
      const response = await fetch("/api/admin/programs/ebook-outline/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outline,
          programTitle: selectedProgramTitle || "Chương trình Python từ ebook",
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Không thể tạo gợi ý roadmap.");
      }

      setDraft(data.draft);
      setStatus({
        tone: data.meta?.source === "fallback" ? "info" : "success",
        text:
          data.meta?.source === "fallback"
            ? `Đã tạo bản nháp mặc định. ${data.meta?.warning ?? ""}`
            : "AI đã tạo bản nháp roadmap, outcome và skill tree.",
      });
    } catch (error) {
      setStatus({
        tone: "error",
        text: error instanceof Error ? error.message : "Không thể tạo gợi ý roadmap.",
      });
    } finally {
      setGenerating(false);
    }
  }

  async function applyDraft(mode: "new" | "selected") {
    if (!draft) {
      setStatus({ tone: "error", text: "Chưa có bản nháp để áp dụng." });
      return;
    }

    setApplying(true);
    setStatus(null);
    try {
      const response = await fetch("/api/admin/programs/ebook-outline/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          draft,
          programId: mode === "selected" ? selectedProgramId : undefined,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Không thể áp dụng bản nháp.");
      }

      if (data.program) {
        onApplied(data.program);
      }

      setStatus({
        tone: "success",
        text: `Đã tạo ${data.created?.chapters ?? 0} chương, ${data.created?.lessons ?? 0} bài nháp, ${data.created?.milestones ?? 0} milestone.`,
      });
    } catch (error) {
      setStatus({
        tone: "error",
        text: error instanceof Error ? error.message : "Không thể áp dụng bản nháp.",
      });
    } finally {
      setApplying(false);
    }
  }

  return (
    <section className="card overflow-hidden">
      <div className="border-b border-slate-100 p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Dựng chương trình từ ebook/PDF</h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
              Paste mục lục hoặc upload PDF để hệ thống dựng nháp milestone, outcome và skill tree. Bài học tạo ra sẽ ở
              trạng thái đang soạn, học sinh chưa nhìn thấy cho đến khi giáo viên publish.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setTocText(sampleToc)}
            className="btn btn-secondary shrink-0 text-sm"
          >
            <i className="fa-solid fa-wand-magic-sparkles"></i>
            Dùng mẫu mục lục
          </button>
        </div>
      </div>

      <div className="grid gap-0 xl:grid-cols-[0.85fr,1.15fr] 2xl:grid-cols-[0.9fr,1.15fr,0.85fr]">
        <div className="border-b border-slate-100 p-5 xl:border-b-0 xl:border-r">
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
            {[
              { key: "paste" as const, label: "Paste mục lục", icon: "fa-align-left" },
              { key: "pdf" as const, label: "Upload PDF", icon: "fa-file-pdf" },
            ].map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setSourceMode(item.key)}
                className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold ${
                  sourceMode === item.key ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <i className={`fa-solid ${item.icon}`}></i>
                {item.label}
              </button>
            ))}
          </div>

          <div className="mt-4">
            {sourceMode === "paste" ? (
              <textarea
                value={tocText}
                onChange={(event) => setTocText(event.target.value)}
                className="input min-h-[280px] font-mono text-sm leading-6"
                placeholder="Dán mục lục ebook tại đây..."
              />
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-red-500 shadow-sm">
                  <i className="fa-solid fa-file-pdf text-xl"></i>
                </div>
                <div className="mt-4 text-sm font-semibold text-slate-800">PDF mục lục hoặc ebook text</div>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  V1 chỉ extract text, chưa OCR PDF scan ảnh. File tối đa 100MB.
                </p>
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={onFileChange}
                  className="mt-4 block w-full text-sm text-slate-600"
                />
                {pdfFile && <div className="mt-3 text-xs font-semibold text-slate-500">{pdfFile.name}</div>}
              </div>
            )}
          </div>

          <button
            type="button"
            disabled={parsing}
            onClick={parseOutline}
            className="btn btn-primary mt-4 w-full justify-center"
          >
            <i className="fa-solid fa-list-check"></i>
            {parsing ? "Đang parse..." : "Parse mục lục"}
          </button>

          {status && <div className={`mt-4 rounded-lg border px-3 py-2 text-sm ${statusClass(status.tone)}`}>{status.text}</div>}

          {outline.length > 0 && (
            <div className="mt-5">
              <div className="mb-3 grid grid-cols-3 gap-2">
                <div className="rounded-lg bg-slate-50 p-3 text-center">
                  <div className="text-xl font-bold text-slate-900">{outlineStats.chapters}</div>
                  <div className="text-[11px] font-semibold uppercase text-slate-400">Chương</div>
                </div>
                <div className="rounded-lg bg-slate-50 p-3 text-center">
                  <div className="text-xl font-bold text-slate-900">{outlineStats.lessons}</div>
                  <div className="text-[11px] font-semibold uppercase text-slate-400">Mục</div>
                </div>
                <div className="rounded-lg bg-slate-50 p-3 text-center">
                  <div className="text-xl font-bold text-slate-900">{outlineStats.exercises}</div>
                  <div className="text-[11px] font-semibold uppercase text-slate-400">Bài tập</div>
                </div>
              </div>
              <OutlineTree items={outline} />
            </div>
          )}
        </div>

        <div className="border-b border-slate-100 p-5 xl:border-b-0 2xl:border-r">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-bold text-slate-900">Roadmap builder</h3>
              <p className="text-sm text-slate-500">Milestone là chặng học, outcome là điều học sinh làm được.</p>
            </div>
            <button
              type="button"
              disabled={generating || outline.length === 0}
              onClick={generateDraft}
              className="btn btn-secondary shrink-0 text-sm"
            >
              <i className="fa-solid fa-sparkles"></i>
              {generating ? "Đang tạo..." : "Tạo gợi ý roadmap"}
            </button>
          </div>

          {!draft ? (
            <div className="mt-5 rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
              Sau khi parse mục lục, bấm tạo gợi ý để có bản nháp milestone, outcome và skill tree.
            </div>
          ) : (
            <div className="mt-5 space-y-5">
              <div className="grid gap-3 md:grid-cols-[1fr,1fr]">
                <input
                  value={draft.programTitle}
                  onChange={(event) => updateDraftField("programTitle", event.target.value)}
                  className="input"
                  placeholder="Tên chương trình"
                />
                <input
                  value={draft.programDescription ?? ""}
                  onChange={(event) => updateDraftField("programDescription", event.target.value)}
                  className="input"
                  placeholder="Mô tả chương trình"
                />
              </div>

              <div className="rounded-xl border border-slate-200">
                <div className="border-b border-slate-100 px-4 py-3">
                  <h4 className="font-bold text-slate-900">Milestone và bài học</h4>
                </div>
                <div className="divide-y divide-slate-100">
                  {draft.milestones.map((milestone, index) => (
                    <div key={milestone.key} className="p-4">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-sm font-bold text-indigo-700">
                          {index + 1}
                        </div>
                        <div className="min-w-0 flex-1 space-y-2">
                          <input
                            value={milestone.title}
                            onChange={(event) => updateMilestone(index, { title: event.target.value })}
                            className="input h-10 text-sm font-semibold"
                          />
                          <textarea
                            value={milestone.description ?? ""}
                            onChange={(event) => updateMilestone(index, { description: event.target.value })}
                            className="input min-h-[68px] text-sm"
                            placeholder="Mô tả milestone"
                          />
                          <LessonChips lessonKeys={milestone.lessonKeys} lessonTitleByKey={lessonTitleByKey} />
                        </div>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            disabled={index === 0}
                            onClick={() => moveMilestone(index, -1)}
                            className="btn btn-secondary px-3"
                            title="Đưa lên"
                          >
                            <i className="fa-solid fa-arrow-up"></i>
                          </button>
                          <button
                            type="button"
                            disabled={index === draft.milestones.length - 1}
                            onClick={() => moveMilestone(index, 1)}
                            className="btn btn-secondary px-3"
                            title="Đưa xuống"
                          >
                            <i className="fa-solid fa-arrow-down"></i>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200">
                <div className="border-b border-slate-100 px-4 py-3">
                  <h4 className="font-bold text-slate-900">Learning outcome</h4>
                </div>
                <div className="divide-y divide-slate-100">
                  {draft.outcomes.map((outcome, index) => (
                    <div key={outcome.key} className="p-4">
                      <input
                        value={outcome.title}
                        onChange={(event) => updateOutcome(index, { title: event.target.value })}
                        className="input h-10 text-sm font-semibold"
                      />
                      <textarea
                        value={outcome.description ?? ""}
                        onChange={(event) => updateOutcome(index, { description: event.target.value })}
                        className="input mt-2 min-h-[64px] text-sm"
                        placeholder="Mô tả outcome"
                      />
                      <div className="mt-2">
                        <LessonChips lessonKeys={outcome.lessonKeys} lessonTitleByKey={lessonTitleByKey} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200">
                <div className="border-b border-slate-100 px-4 py-3">
                  <h4 className="font-bold text-slate-900">Skill tree</h4>
                </div>
                <div className="divide-y divide-slate-100">
                  {draft.skills.map((skill, index) => (
                    <div key={skill.key} className="p-4">
                      <input
                        value={skill.title}
                        onChange={(event) => updateSkill(index, { title: event.target.value })}
                        className="input h-10 text-sm font-semibold"
                      />
                      <textarea
                        value={skill.description ?? ""}
                        onChange={(event) => updateSkill(index, { description: event.target.value })}
                        className="input mt-2 min-h-[60px] text-sm"
                        placeholder="Mô tả kỹ năng"
                      />
                      <div className="mt-2 text-xs text-slate-500">
                        {skill.parentKey ? `Skill con của ${skill.parentKey}` : "Skill gốc"} · {skill.outcomeKeys.length} outcome
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <aside className="bg-slate-50 p-5 xl:col-span-2 2xl:col-span-1">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900">Preview học sinh</h3>
              <span
                className={`rounded-full px-3 py-1 text-xs font-bold ${
                  qualityReport.passed ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                }`}
              >
                {qualityReport.score}%
              </span>
            </div>

            {draft ? (
              <div className="mt-4 space-y-3">
                <div className="rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 p-4 text-white">
                  <div className="text-[11px] font-semibold uppercase tracking-widest text-indigo-100">
                    Hôm nay học gì
                  </div>
                  <div className="mt-1 font-bold">{draft.lessons[0]?.title ?? "Chưa có bài học"}</div>
                  <div className="mt-1 text-xs text-indigo-50">Bài mới tạo sẽ là bản nháp chưa publish.</div>
                </div>

                <div className="space-y-3">
                  {draft.milestones.map((milestone, index) => (
                    <div key={milestone.key} className="rounded-lg border border-slate-200 p-3">
                      <div className="flex items-start gap-3">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
                          {index + 1}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-900">{milestone.title}</div>
                          <div className="mt-1 text-xs text-slate-500">{milestone.lessonKeys.length} bài nháp</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mt-4 rounded-lg border border-dashed border-slate-300 p-5 text-sm text-slate-500">
                Preview sẽ xuất hiện sau khi tạo gợi ý roadmap.
              </div>
            )}
          </div>

          <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-bold text-slate-900">Bộ lọc duyệt giáo trình</h3>
                <p className="mt-1 text-sm leading-6 text-slate-500">{qualityReport.summary}</p>
              </div>
              <span
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${
                  qualityReport.passed ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                }`}
              >
                {qualityReport.statusLabel}
              </span>
            </div>

            <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-4">
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Expert score</div>
                  <div className="mt-1 text-3xl font-bold text-slate-900">{qualityReport.score}</div>
                </div>
                <div className="text-right text-xs font-semibold text-slate-500">
                  Chuẩn duyệt: {qualityReport.passScore}/100
                </div>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
                <div
                  className={`h-full rounded-full ${qualityReport.passed ? "bg-emerald-500" : "bg-amber-500"}`}
                  style={{ width: `${qualityReport.score}%` }}
                />
              </div>
            </div>

            <div className="mt-4 space-y-2">
              {qualityReport.dimensions.map((dimension) => (
                <div key={dimension.key} className="rounded-lg border border-slate-100 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold text-slate-800">{dimension.label}</div>
                    <div className="text-xs font-bold text-slate-500">
                      {dimension.score}/{dimension.maxScore}
                    </div>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${
                        dimension.status === "good"
                          ? "bg-emerald-500"
                          : dimension.status === "needs-work"
                            ? "bg-amber-500"
                            : "bg-red-500"
                      }`}
                      style={{ width: `${Math.round((dimension.score / dimension.maxScore) * 100)}%` }}
                    />
                  </div>
                  <div className="mt-2 text-xs text-slate-500">{dimension.notes[0]}</div>
                </div>
              ))}
            </div>

            <div className="mt-4 space-y-2">
              {qualityReport.issues.length > 0 ? (
                qualityReport.issues.slice(0, 5).map((issue) => (
                  <div key={issue.id} className={`rounded-lg border p-3 ${issueToneClass(issue)}`}>
                    <div className="flex items-start gap-2">
                      <i className={`fa-solid ${qualitySeverityIcon(issue.severity)} mt-0.5 text-xs`}></i>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="text-sm font-bold text-slate-900">{issue.title}</div>
                          <span className={`rounded-full border px-2 py-0.5 text-[11px] font-bold ${qualitySeverityClass(issue.severity)}`}>
                            {qualitySeverityLabel(issue.severity)}
                          </span>
                        </div>
                        <div className="mt-1 text-xs leading-5 text-slate-600">{issue.detail}</div>
                        {issue.relatedItems && issue.relatedItems.length > 0 && (
                          <ul className="mt-2 space-y-1 text-xs leading-5 text-slate-700">
                            {issue.relatedItems.slice(0, 5).map((item) => (
                              <li key={item} className="flex gap-2">
                                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-current" />
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                        <div className="mt-1 text-xs font-semibold leading-5 text-slate-700">{issue.fixHint}</div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-3 text-sm font-medium text-emerald-700">
                  Không có lỗi duyệt trọng yếu.
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="font-bold text-slate-900">Skill tree preview</h3>
            <div className="mt-3">
              {draft ? <SkillTreePreview skills={draft.skills} outcomeTitleByKey={outcomeTitleByKey} /> : null}
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="font-bold text-slate-900">Áp dụng bản nháp</h3>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Apply sẽ tạo chương, bài học nháp, milestone, outcome và skill. Không xóa dữ liệu cũ.
            </p>
            {draft && !qualityReport.passed && (
              <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-800">
                Bản nháp này chưa đạt chuẩn duyệt. Bạn vẫn có thể tạo để biên soạn, nhưng chưa nên publish/đặt active
                cho học sinh cho đến khi xử lý các mục bắt buộc sửa.
              </div>
            )}
            <div className="mt-4 space-y-2">
              <button
                type="button"
                disabled={!draft || applying}
                onClick={() => applyDraft("new")}
                className="btn btn-primary w-full justify-center"
              >
                <i className="fa-solid fa-plus"></i>
                Tạo chương trình mới
              </button>
              <button
                type="button"
                disabled={!draft || applying || !selectedProgramId}
                onClick={() => applyDraft("selected")}
                className="btn btn-secondary w-full justify-center"
              >
                <i className="fa-solid fa-layer-group"></i>
                Áp dụng vào chương trình đang chọn
              </button>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
