"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  classroomId: string;
  assignmentId: string;
  submissionId: string;
  maxScore: number;
  defaultScore: number;
  defaultFeedback: string;
  isGraded: boolean;
  gradedAtLabel?: string | null;
}

export default function GradeClassroomSubmissionForm({
  classroomId,
  assignmentId,
  submissionId,
  maxScore,
  defaultScore,
  defaultFeedback,
  isGraded,
  gradedAtLabel,
}: Props) {
  const router = useRouter();
  const [score, setScore] = useState(defaultScore);
  const [feedback, setFeedback] = useState(defaultFeedback);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(!isGraded);

  const fieldsDisabled = !editing || loading;

  const handleGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) {
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(
        `/api/admin/classrooms/${classroomId}/assignments/${assignmentId}/submissions/${submissionId}/grade`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ score, feedback }),
        },
      );

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Không thể chấm bài");
        return;
      }

      setEditing(false);
      router.refresh();
    } catch (error) {
      alert("Đã xảy ra lỗi khi chấm bài");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setScore(defaultScore);
    setFeedback(defaultFeedback);
    setEditing(false);
  };

  return (
    <form onSubmit={handleGrade} className="border-t border-gray-200 pt-4">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Biểu mẫu chấm điểm</h3>
          <p className="mt-1 text-sm text-gray-500">
            {isGraded && !editing
              ? `Bài này đã được chấm${gradedAtLabel ? ` lúc ${gradedAtLabel}` : ""}. Bấm "Sửa điểm" nếu muốn chỉnh lại.`
              : "Điền điểm và nhận xét rồi lưu để hoàn tất chấm bài."}
          </p>
        </div>
        <span className={`badge ${isGraded ? "badge-success" : "badge-warning"}`}>
          {isGraded ? "Đã chấm" : "Chưa chấm"}
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-[220px,1fr]">
        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Điểm (0 - {maxScore})
          </label>
          <input
            type="number"
            min={0}
            max={maxScore}
            step="0.01"
            inputMode="decimal"
            value={score}
            disabled={fieldsDisabled}
            onChange={(e) => setScore(parseFloat(e.target.value))}
            className="input bg-white text-lg font-semibold"
          />
        </div>

        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Nhận xét
          </label>
          <textarea
            className="input min-h-[132px] resize-y bg-white"
            value={feedback}
            disabled={fieldsDisabled}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Nhập nhận xét cho học sinh..."
          />
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        {isGraded && !editing ? (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="btn btn-secondary sm:min-w-[160px]"
          >
            <i className="fa-solid fa-pen"></i> Sửa điểm
          </button>
        ) : (
          <>
            {isGraded && (
              <button
                type="button"
                onClick={handleCancelEdit}
                disabled={loading}
                className="btn btn-ghost sm:min-w-[120px]"
              >
                Hủy
              </button>
            )}
            <button className="btn btn-success sm:min-w-[180px]" disabled={loading}>
              {loading ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin"></i> Đang lưu...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-check"></i>{" "}
                  {isGraded ? "Lưu thay đổi" : "Lưu chấm điểm"}
                </>
              )}
            </button>
          </>
        )}
      </div>
    </form>
  );
}
