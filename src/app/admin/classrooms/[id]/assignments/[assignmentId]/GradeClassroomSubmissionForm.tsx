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
  const [locked, setLocked] = useState(isGraded);

  const handleGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (locked) {
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

      setLocked(true);
      router.refresh();
    } catch (error) {
      alert("Đã xảy ra lỗi khi chấm bài");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleGrade} className="border-t border-gray-200 pt-4">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Biểu mẫu chấm điểm</h3>
          <p className="mt-1 text-sm text-gray-500">
            {locked
              ? `Bài này đã được chấm${gradedAtLabel ? ` lúc ${gradedAtLabel}` : ""}.`
              : "Điền điểm và nhận xét rồi lưu một lần để hoàn tất chấm bài."}
          </p>
        </div>
        <span className={`badge ${locked ? "badge-success" : "badge-warning"}`}>
          {locked ? "Đã khóa sau khi chấm" : "Chưa chấm"}
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
            value={score}
            disabled={locked || loading}
            onChange={(e) => setScore(Number(e.target.value))}
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
            disabled={locked || loading}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Nhập nhận xét cho học sinh..."
          />
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-gray-500">
          {locked
            ? "Muốn chấm lại, cần mở lại luồng riêng thay vì bấm lưu nhiều lần."
            : "Sau khi lưu, biểu mẫu sẽ tự khóa để tránh chấm trùng."}
        </p>
        <button className="btn btn-success sm:min-w-[180px]" disabled={locked || loading}>
          {loading ? (
            <>
              <i className="fa-solid fa-spinner fa-spin"></i> Đang lưu...
            </>
          ) : locked ? (
            <>
              <i className="fa-solid fa-lock"></i> Đã chấm điểm
            </>
          ) : (
            <>
              <i className="fa-solid fa-check"></i> Lưu chấm điểm
            </>
          )}
        </button>
      </div>
    </form>
  );
}
