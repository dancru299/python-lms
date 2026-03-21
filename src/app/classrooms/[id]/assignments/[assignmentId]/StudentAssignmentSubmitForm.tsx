"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  assignmentId: string;
  answerTemplate: string | null;
  existingSubmission: {
    status: string;
    content: string;
    score: number | null;
    feedback: string | null;
  } | null;
}

export default function StudentAssignmentSubmitForm({
  assignmentId,
  answerTemplate,
  existingSubmission,
}: Props) {
  const router = useRouter();
  const [content, setContent] = useState(existingSubmission?.content || "");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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
      <label className="block text-2xl font-semibold text-gray-900 mb-2">Code bài làm:</label>
      <textarea
        className="w-full min-h-[420px] rounded-md border border-gray-300 bg-gray-900 px-5 py-4 font-mono text-[15px] leading-8 text-gray-100"
        placeholder="// Dán code của bạn vào đây..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        spellCheck={false}
      />

      <button
        type="submit"
        disabled={loading}
        className="w-full mt-4 py-3 rounded-md bg-orange-500 hover:bg-orange-600 text-white text-2xl font-bold transition-colors disabled:opacity-60"
      >
        {loading ? "ĐANG NỘP..." : "NỘP BÀI"}
      </button>

      {existingSubmission && (
        <div className="mt-4 p-4 rounded-lg border border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-700">
            <strong>Trạng thái:</strong> {existingSubmission.status === "graded" ? "Đã chấm" : "Đã nộp"}
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
