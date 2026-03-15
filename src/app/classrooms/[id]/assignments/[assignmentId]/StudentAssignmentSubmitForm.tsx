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
      alert("Vui long dan code bai lam truoc khi nop");
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
        alert(data.error || "Khong the nop bai");
        return;
      }

      alert("Nop bai thanh cong");
      router.refresh();
    } catch (error) {
      alert("Da xay ra loi khi nop bai");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <label className="block text-2xl font-semibold text-gray-900 mb-2">Code bai lam:</label>
      <textarea
        className="w-full min-h-[420px] p-4 rounded-md border border-gray-300 bg-gray-900 text-gray-100 font-mono text-sm"
        placeholder="// Dan code cua ban vao day..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />

      <button
        type="submit"
        disabled={loading}
        className="w-full mt-4 py-3 rounded-md bg-orange-500 hover:bg-orange-600 text-white text-2xl font-bold transition-colors disabled:opacity-60"
      >
        {loading ? "DANG NOP..." : "NOP BAI"}
      </button>

      {existingSubmission && (
        <div className="mt-4 p-4 rounded-lg border border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-700">
            <strong>Trang thai:</strong> {existingSubmission.status === "graded" ? "Da cham" : "Da nop"}
          </div>
          {existingSubmission.status === "graded" && (
            <>
              <div className="text-sm text-gray-700 mt-1">
                <strong>Diem:</strong> {existingSubmission.score ?? 0}
              </div>
              {existingSubmission.feedback && (
                <div className="text-sm text-gray-700 mt-1">
                  <strong>Nhan xet:</strong> {existingSubmission.feedback}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {answerTemplate && existingSubmission && (
        <div className="mt-4 p-4 rounded-lg border border-green-200 bg-green-50">
          <div className="text-sm font-semibold text-green-700 mb-2">Dap an mau</div>
          <pre className="code-block">{answerTemplate}</pre>
        </div>
      )}
    </form>
  );
}
