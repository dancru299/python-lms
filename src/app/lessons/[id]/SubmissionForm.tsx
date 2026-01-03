"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface SubmissionFormProps {
  exerciseId: string;
  maxScore: number;
  hasSubmission: boolean;
}

export default function SubmissionForm({ exerciseId, maxScore, hasSubmission }: SubmissionFormProps) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim()) {
      setError("Vui lòng nhập nội dung bài làm");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exerciseId,
          content,
          maxScore,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Nộp bài thất bại");
        return;
      }

      setSuccess(true);
      setContent("");
      router.refresh();
    } catch (err) {
      setError("Đã xảy ra lỗi, vui lòng thử lại");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
        <i className="fa-solid fa-check-circle mr-2"></i>
        Đã nộp bài thành công! Bài của bạn đang chờ giảng viên chấm điểm.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <i className="fa-solid fa-circle-exclamation mr-2"></i>
          {error}
        </div>
      )}

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {hasSubmission ? "Nộp lại bài" : "Bài làm của bạn"}
        </label>
        <textarea
          className="input min-h-[200px] font-mono text-sm"
          placeholder="Viết code hoặc câu trả lời của bạn ở đây..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          required
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <>
            <i className="fa-solid fa-spinner fa-spin"></i>
            Đang nộp...
          </>
        ) : (
          <>
            <i className="fa-solid fa-paper-plane"></i>
            {hasSubmission ? "Nộp lại" : "Nộp bài"}
          </>
        )}
      </button>
    </form>
  );
}
