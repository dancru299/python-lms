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
}

export default function GradeClassroomSubmissionForm({
  classroomId,
  assignmentId,
  submissionId,
  maxScore,
  defaultScore,
  defaultFeedback,
}: Props) {
  const router = useRouter();
  const [score, setScore] = useState(defaultScore);
  const [feedback, setFeedback] = useState(defaultFeedback);
  const [loading, setLoading] = useState(false);

  const handleGrade = async (e: React.FormEvent) => {
    e.preventDefault();
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

      router.refresh();
    } catch (error) {
      alert("Đã xảy ra lỗi khi chấm bài");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleGrade} className="border-t border-gray-200 pt-3">
      <div className="grid md:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Điểm (0 - {maxScore})
          </label>
          <input
            type="number"
            min={0}
            max={maxScore}
            value={score}
            onChange={(e) => setScore(Number(e.target.value))}
            className="input"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nhận xét
          </label>
          <textarea
            className="input min-h-[90px]"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Nhập nhận xét cho học sinh..."
          />
        </div>
      </div>
      <div className="mt-3 flex justify-end">
        <button className="btn btn-success" disabled={loading}>
          {loading ? (
            <>
              <i className="fa-solid fa-spinner fa-spin"></i> Đang lưu...
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
