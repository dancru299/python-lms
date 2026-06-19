"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  classroomId: string;
  assignmentId: string;
  type: string;
  title: string;
  maxScore: number;
  durationMinutes: number | null;
  dueAt: string | null; // ISO string hoặc null
}

function toLocalInputValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

export default function EditAssignmentForm({
  classroomId,
  assignmentId,
  type,
  title,
  maxScore,
  durationMinutes,
  dueAt,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<
    { tone: "success" | "error"; message: string } | null
  >(null);

  const [form, setForm] = useState({
    title,
    maxScore,
    durationMinutes: (durationMinutes ?? "none") as number | "none",
    dueAt: toLocalInputValue(dueAt),
    noDeadline: !dueAt,
    file: null as File | null,
  });
  const [fileKey, setFileKey] = useState(0);

  const submit = async () => {
    setNotice(null);
    setLoading(true);
    try {
      const formData = new FormData();
      formData.set("title", form.title);
      formData.set("maxScore", String(form.maxScore || ""));
      if (type === "test") {
        formData.set("durationMinutes", String(form.durationMinutes));
      }
      // Hạn nộp: tick "Không có hạn nộp" => none; có ngày => ngày đó; còn lại => giữ nguyên.
      if (form.noDeadline) {
        formData.set("dueAt", "none");
      } else if (form.dueAt) {
        formData.set("dueAt", form.dueAt);
      }
      if (form.file) {
        formData.set("questionDocx", form.file);
      }

      const res = await fetch(
        `/api/admin/classrooms/${classroomId}/assignments/${assignmentId}`,
        { method: "PATCH", body: formData },
      );
      const data = await res.json();
      if (!res.ok) {
        setNotice({ tone: "error", message: data.error || "Không thể cập nhật bài." });
        return;
      }

      setForm((prev) => ({ ...prev, file: null }));
      setFileKey((prev) => prev + 1);
      setNotice({
        tone: "success",
        message: "Đã cập nhật bài kiểm tra. Học sinh tải lại trang sẽ thấy đề mới.",
      });
      router.refresh();
    } catch {
      setNotice({ tone: "error", message: "Đã xảy ra lỗi khi cập nhật bài." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-5 border-t border-gray-200 pt-5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-700"
      >
        <i className={`fa-solid ${open ? "fa-chevron-down" : "fa-pen-to-square"}`}></i>
        {open ? "Đóng chỉnh sửa" : "Sửa đề / cập nhật bài kiểm tra"}
      </button>

      {open && (
        <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-5">
          {notice && (
            <div
              className={`mb-4 rounded-xl border px-4 py-3 text-sm ${
                notice.tone === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-rose-200 bg-rose-50 text-rose-700"
              }`}
            >
              {notice.message}
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Tiêu đề</label>
              <input
                className="input bg-white"
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Điểm tối đa</label>
              <input
                type="number"
                min={1}
                className="input bg-white"
                value={form.maxScore}
                onChange={(e) => setForm((p) => ({ ...p, maxScore: Number(e.target.value) }))}
              />
            </div>

            {type === "test" && (
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Thời gian làm bài
                </label>
                <select
                  className="input bg-white"
                  value={form.durationMinutes}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      durationMinutes:
                        e.target.value === "none" ? "none" : Number(e.target.value),
                    }))
                  }
                >
                  <option value={15}>15 phút</option>
                  <option value={45}>45 phút</option>
                  <option value={60}>60 phút</option>
                  <option value="none">Không có thời gian</option>
                </select>
              </div>
            )}

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Hạn nộp</label>
              <input
                type="datetime-local"
                className="input bg-white disabled:opacity-60"
                value={form.dueAt}
                disabled={form.noDeadline}
                onChange={(e) => setForm((p) => ({ ...p, dueAt: e.target.value }))}
              />
              <label className="mt-2 flex items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300"
                  checked={form.noDeadline}
                  onChange={(e) => setForm((p) => ({ ...p, noDeadline: e.target.checked }))}
                />
                Không có hạn nộp
              </label>
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Upload đè đề mới (.docx) — để trống nếu giữ nguyên đề
              </label>
              <input
                key={fileKey}
                type="file"
                accept=".docx"
                className="input bg-white file:mr-4 file:rounded-lg file:border-0 file:bg-indigo-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-indigo-700"
                onChange={(e) => setForm((p) => ({ ...p, file: e.target.files?.[0] || null }))}
              />
            </div>
          </div>

          <div className="mt-5 flex justify-end">
            <button
              type="button"
              onClick={submit}
              disabled={loading}
              className="btn btn-primary rounded-xl disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin"></i> Đang lưu...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-floppy-disk"></i> Lưu thay đổi
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
