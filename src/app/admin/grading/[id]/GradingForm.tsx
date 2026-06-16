"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface GradingFormProps {
  submissionId: string;
  maxScore: number;
  graderId: string;
  isGraded?: boolean;
  initialScore?: number;
  initialFeedback?: string;
}

export default function GradingForm({
  submissionId,
  maxScore,
  graderId,
  isGraded = false,
  initialScore,
  initialFeedback = "",
}: GradingFormProps) {
  const router = useRouter();
  const [score, setScore] = useState<number>(initialScore ?? maxScore);
  const [feedback, setFeedback] = useState(initialFeedback);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/submissions/${submissionId}/grade`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          score,
          maxScore,
          feedback,
          graderId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Chấm điểm thất bại");
        return;
      }

      router.push("/admin/grading");
      router.refresh();
    } catch (err) {
      setError("Đã xảy ra lỗi, vui lòng thử lại");
    } finally {
      setLoading(false);
    }
  };

  const quickScores = [0, Math.floor(maxScore * 0.25), Math.floor(maxScore * 0.5), Math.floor(maxScore * 0.75), maxScore];

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <i className="fa-solid fa-circle-exclamation mr-2"></i>
          {error}
        </div>
      )}

      {/* Score Input */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Điểm số (0 - {maxScore})
        </label>
        <div className="flex items-center gap-4">
          <input
            type="number"
            min={0}
            max={maxScore}
            step="0.01"
            inputMode="decimal"
            value={score}
            onChange={(e) => setScore(parseFloat(e.target.value))}
            className="input w-32 text-center text-xl font-bold"
            required
          />
          <span className="text-gray-500">/ {maxScore}</span>
        </div>

        {/* Quick score buttons */}
        <div className="flex gap-2 mt-3">
          {quickScores.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setScore(s)}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                score === s
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Feedback */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Nhận xét cho học sinh
        </label>
        <textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          className="input min-h-[120px]"
          placeholder="Viết nhận xét, gợi ý cải thiện cho học sinh..."
        />
      </div>

      {/* Submit */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.back()}
          className="btn btn-secondary"
        >
          Quay lại
        </button>
        <button
          type="submit"
          disabled={loading}
          className="btn btn-success disabled:opacity-50"
        >
          {loading ? (
            <>
              <i className="fa-solid fa-spinner fa-spin"></i>
              Đang lưu...
            </>
          ) : (
            <>
              <i className="fa-solid fa-check"></i>
              {isGraded ? "Cập nhật điểm" : "Hoàn thành chấm điểm"}
            </>
          )}
        </button>
      </div>
    </form>
  );
}
