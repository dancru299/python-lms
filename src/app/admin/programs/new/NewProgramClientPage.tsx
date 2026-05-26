"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const initialForm = {
  title: "",
  description: "",
  isActive: true,
  sortOrder: 0,
};

export default function NewProgramClientPage() {
  const router = useRouter();
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function createProgram() {
    if (!form.title.trim()) {
      setError("Tên chương trình là bắt buộc.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/admin/programs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "Không thể tạo chương trình.");
      }

      const programId = data.program?.id;
      router.push(programId ? `/admin/programs/${programId}` : "/admin/programs");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tạo chương trình.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1.1fr,0.9fr]">
      <section className="card p-5">
        <h2 className="text-lg font-bold text-slate-900">Thông tin chương trình</h2>
        <p className="mt-1 text-sm leading-6 text-slate-500">
          Tạo khung chương trình trước, sau đó vào trang chi tiết để dựng roadmap từ ebook hoặc biên soạn milestone thủ công.
        </p>

        <div className="mt-5 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Tên chương trình</label>
            <input
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              className="input"
              placeholder="VD: Lộ trình Python nền tảng"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Mô tả</label>
            <textarea
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              className="input min-h-[120px]"
              placeholder="Mô tả ngắn về đối tượng học, phạm vi kiến thức và đầu ra mong muốn."
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-[1fr,160px]">
            <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))}
              />
              Đặt làm chương trình active
            </label>
            <input
              type="number"
              value={form.sortOrder}
              onChange={(event) => setForm((current) => ({ ...current, sortOrder: Number(event.target.value) }))}
              className="input"
              placeholder="Thứ tự"
            />
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <button disabled={saving} onClick={createProgram} className="btn btn-primary">
              <i className={`fa-solid ${saving ? "fa-spinner fa-spin" : "fa-plus"}`}></i>
              {saving ? "Đang tạo..." : "Tạo chương trình"}
            </button>
            <button type="button" onClick={() => router.push("/admin/programs")} className="btn btn-secondary">
              Hủy
            </button>
          </div>
        </div>
      </section>

      <aside className="card p-5">
        <h2 className="text-lg font-bold text-slate-900">Luồng làm việc</h2>
        <div className="mt-4 space-y-3">
          {[
            ["1", "Tạo chương trình", "Đặt tên và mô tả phạm vi đào tạo."],
            ["2", "Dựng roadmap", "Paste mục lục hoặc upload PDF trong trang chi tiết."],
            ["3", "Duyệt khung", "Kiểm tra milestone, outcome, skill tree và các cảnh báo thiếu."],
            ["4", "Biên soạn bài", "Hoàn thiện từng bài nháp rồi publish cho học sinh."],
          ].map(([step, title, detail]) => (
            <div key={step} className="flex gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-sm font-bold text-indigo-700">
                {step}
              </div>
              <div>
                <div className="font-semibold text-slate-900">{title}</div>
                <div className="mt-1 text-sm leading-5 text-slate-500">{detail}</div>
              </div>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}
