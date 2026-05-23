"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

const PythonCodeEditor = dynamic(() => import("@/components/PythonCodeEditor"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[340px] items-center justify-center rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-500">
      <i className="fa-solid fa-spinner fa-spin mr-2"></i>
      Đang tải trình soạn thảo…
    </div>
  ),
});

interface SubmissionFormProps {
  exerciseId: string;
  maxScore: number;
  hasSubmission: boolean;
  previousContent?: string;
}

export default function SubmissionForm({
  exerciseId,
  maxScore,
  hasSubmission,
  previousContent,
}: SubmissionFormProps) {
  const router = useRouter();
  const [content, setContent] = useState(previousContent ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!content.trim()) {
      setError("Vui lòng viết code trước khi nộp bài");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exerciseId, content, maxScore }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Nộp bài thất bại");
        return;
      }

      setSuccess(true);
      router.refresh();
    } catch {
      setError("Đã xảy ra lỗi, vui lòng thử lại");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-700">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100">
            <i className="fa-solid fa-check text-emerald-600"></i>
          </div>
          <div>
            <p className="font-semibold">Nộp bài thành công!</p>
            <p className="text-sm text-emerald-600">Bài của bạn đang chờ giảng viên chấm điểm.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <i className="fa-solid fa-circle-exclamation shrink-0"></i>
          {error}
        </div>
      )}

      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">
            {hasSubmission ? "Nộp lại bài" : "Bài làm của bạn"}
          </label>
          <span className="text-xs text-gray-400">
            Nhấn <kbd className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs text-gray-600">▶ Chạy</kbd> để kiểm tra trước khi nộp
          </span>
        </div>
        <PythonCodeEditor
          defaultValue={content}
          onChange={setContent}
        />
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400">
          <i className="fa-solid fa-circle-info mr-1"></i>
          Code sẽ được gửi đến giảng viên để chấm điểm
        </p>
        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? (
            <>
              <i className="fa-solid fa-spinner fa-spin"></i>
              Đang nộp…
            </>
          ) : (
            <>
              <i className="fa-solid fa-paper-plane"></i>
              {hasSubmission ? "Nộp lại" : "Nộp bài"}
            </>
          )}
        </button>
      </div>
    </form>
  );
}
