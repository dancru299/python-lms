"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  assignmentId: string;
  answerTemplate: string | null;
  dueAt: string | null;
  existingSubmission: {
    status: string;
    content: string;
    score: number | null;
    feedback: string | null;
    isLate: boolean;
  } | null;
}

export default function StudentAssignmentSubmitForm({
  assignmentId,
  answerTemplate,
  dueAt,
  existingSubmission,
}: Props) {
  const router = useRouter();
  const [content, setContent] = useState(existingSubmission?.content || "");
  const [loading, setLoading] = useState(false);

  const isGraded = existingSubmission?.status === "graded";
  const dueDate = dueAt ? new Date(dueAt) : null;
  const isOverdue = dueDate ? new Date() > dueDate : false;
  const dueLabel = dueDate
    ? dueDate.toLocaleString("vi-VN", {
        timeZone: "Asia/Ho_Chi_Minh",
        dateStyle: "medium",
        timeStyle: "short",
      })
    : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isGraded) {
      return;
    }

    if (!content.trim()) {
      alert("Vui lòng dán code bài làm trước khi nộp");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/classrooms/assignments/${assignmentId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Không thể nộp bài");
        return;
      }

      alert("Nộp bài thành công");
      router.refresh();
    } catch (error) {
      alert("Đã xảy ra lỗi khi nộp bài");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {dueLabel && (
        <div
          className={`mb-4 rounded-lg border p-3 text-sm ${
            isOverdue
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-blue-200 bg-blue-50 text-blue-700"
          }`}
        >
          <i className="fa-regular fa-clock mr-1"></i>
          <strong>Hạn nộp:</strong> {dueLabel}
          {isOverdue && !isGraded && " — đã quá hạn, bài nộp sẽ bị đánh dấu nộp muộn."}
        </div>
      )}

      <label className="block text-2xl font-semibold text-gray-900 mb-2">Code bài làm:</label>
      <textarea
        className="w-full min-h-[420px] rounded-md border border-gray-300 bg-gray-900 px-5 py-4 font-mono text-[15px] leading-8 text-gray-100 disabled:opacity-70"
        placeholder="// Dán code của bạn vào đây..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        spellCheck={false}
        disabled={isGraded || loading}
      />

      <button
        type="submit"
        disabled={loading || isGraded}
        className="w-full mt-4 py-3 rounded-md bg-orange-500 hover:bg-orange-600 text-white text-2xl font-bold transition-colors disabled:opacity-60"
      >
        {isGraded ? "ĐÃ CHẤM - KHÔNG THỂ NỘP LẠI" : loading ? "ĐANG NỘP..." : "NỘP BÀI"}
      </button>

      {existingSubmission && (
        <div className="mt-4 p-4 rounded-lg border border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-700">
            <strong>Trạng thái:</strong> {existingSubmission.status === "graded" ? "Đã chấm" : "Đã nộp"}
            {existingSubmission.isLate && (
              <span className="ml-2 inline-block rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                Nộp muộn
              </span>
            )}
          </div>
          {existingSubmission.status === "graded" && (
            <>
              <div className="text-sm text-gray-700 mt-1">
                <strong>Điểm:</strong> {existingSubmission.score ?? 0}
              </div>
              {existingSubmission.feedback && (
                <div className="mt-3 rounded-lg border border-blue-100 bg-white p-3">
                  <div className="text-sm font-semibold text-gray-700">Nhận xét</div>
                  <div className="feedback-block mt-2">{existingSubmission.feedback}</div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {answerTemplate && existingSubmission && (
        <div className="mt-4 p-4 rounded-lg border border-green-200 bg-green-50">
          <div className="text-sm font-semibold text-green-700 mb-2">Đáp án mẫu</div>
          <pre className="code-block">{answerTemplate}</pre>
        </div>
      )}
    </form>
  );
}
