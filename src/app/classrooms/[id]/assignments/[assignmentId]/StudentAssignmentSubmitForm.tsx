"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PythonCodeEditor from "@/components/PythonCodeEditor";

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

  // Đã nộp (dù chưa chấm) là khóa luôn — không cho nộp lại.
  const isLocked = !!existingSubmission;
  const isGraded = existingSubmission?.status === "graded";

  // Nháp bài làm được lưu vào localStorage để nếu nộp lỗi / tải lại trang vẫn không mất.
  const draftKey = `assignment-draft:${assignmentId}`;

  const [content, setContent] = useState(existingSubmission?.content || "");
  // null = chưa sẵn sàng (đang đọc nháp); chỉ render editor khi đã biết giá trị khởi tạo.
  const [initialCode, setInitialCode] = useState<string | null>(
    isLocked ? existingSubmission?.content || "" : null,
  );
  const [draftRestored, setDraftRestored] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isLocked) return;
    let draft: string | null = null;
    try {
      draft = localStorage.getItem(draftKey);
    } catch {
      draft = null;
    }
    const initial = draft ?? "";
    setInitialCode(initial);
    setContent(initial);
    if (draft) setDraftRestored(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignmentId]);

  const handleEditorChange = (code: string) => {
    setContent(code);
    if (!isLocked) {
      try {
        localStorage.setItem(draftKey, code);
      } catch {
        // Bỏ qua nếu localStorage không khả dụng (chế độ riêng tư, hết dung lượng...).
      }
    }
  };

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

    if (isLocked) {
      return;
    }

    if (!content.trim()) {
      alert("Vui lòng nhập code bài làm trước khi nộp");
      return;
    }

    if (!confirm("Bạn chỉ được nộp MỘT lần. Xác nhận nộp bài?")) {
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
        // Nộp lỗi: KHÔNG xóa nháp, bài làm vẫn còn nguyên trong editor và localStorage.
        alert(data.error || "Không thể nộp bài");
        return;
      }

      // Nộp thành công => dọn nháp.
      try {
        localStorage.removeItem(draftKey);
      } catch {
        // bỏ qua
      }
      alert("Nộp bài thành công");
      router.refresh();
    } catch {
      // Lỗi mạng / timeout: giữ nguyên nháp để học sinh thử lại mà không mất bài.
      alert("Đã xảy ra lỗi khi nộp bài. Bài làm của bạn vẫn được giữ, hãy thử nộp lại.");
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
          {isOverdue && !isLocked && " — đã quá hạn, bài nộp sẽ bị đánh dấu nộp muộn."}
        </div>
      )}

      <label className="block text-2xl font-semibold text-gray-900 mb-2">Code bài làm:</label>
      <p className="mb-2 text-sm text-gray-500">
        Viết và chạy thử code Python ngay trên trang (nhấn “Chạy” để xem kết quả), sau đó nhấn Nộp bài.
        {!isLocked && " Bài làm được tự động lưu nháp trên trình duyệt, tải lại trang sẽ không mất."}
      </p>

      {draftRestored && !isLocked && (
        <div className="mb-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
          <i className="fa-solid fa-rotate-left mr-1"></i>
          Đã khôi phục bài làm nháp bạn viết dở trước đó.
        </div>
      )}

      {initialCode !== null ? (
        <PythonCodeEditor
          defaultValue={initialCode}
          onChange={handleEditorChange}
          readOnly={isLocked || loading}
        />
      ) : (
        <div className="flex min-h-[280px] items-center justify-center rounded-xl border border-gray-300 bg-gray-50 text-sm text-gray-500">
          Đang tải trình soạn thảo…
        </div>
      )}

      <button
        type="submit"
        disabled={loading || isLocked}
        className="w-full mt-4 py-3 rounded-md bg-orange-500 hover:bg-orange-600 text-white text-2xl font-bold transition-colors disabled:opacity-60"
      >
        {isLocked
          ? isGraded
            ? "ĐÃ CHẤM - KHÔNG THỂ NỘP LẠI"
            : "ĐÃ NỘP - KHÔNG THỂ NỘP LẠI"
          : loading
            ? "ĐANG NỘP..."
            : "NỘP BÀI"}
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
