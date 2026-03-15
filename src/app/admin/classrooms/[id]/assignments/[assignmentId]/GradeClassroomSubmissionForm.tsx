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
        }
      );

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Không th? ch?m bài");
        return;
      }

      router.refresh();
    } catch (error) {
      alert("Ðã x?y ra l?i khi ch?m bài");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleGrade} className="border-t border-gray-200 pt-3">
      <div className="grid md:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Ði?m (0 - {maxScore})</label>
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
          <label className="block text-sm font-medium text-gray-700 mb-1">Nh?n xét</label>
          <textarea
            className="input min-h-[90px]"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Nh?p nh?n xét cho h?c sinh..."
          />
        </div>
      </div>
      <div className="mt-3 flex justify-end">
        <button className="btn btn-success" disabled={loading}>
          {loading ? <><i className="fa-solid fa-spinner fa-spin"></i> Ðang luu...</> : <><i className="fa-solid fa-check"></i> Luu ch?m di?m</>}
        </button>
      </div>
    </form>
  );
}

