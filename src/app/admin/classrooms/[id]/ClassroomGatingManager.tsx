"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ClassroomGatingStudent } from "@/lib/programs/lesson-gating";

interface ClassroomGatingManagerProps {
  hasProgram: boolean;
  students: ClassroomGatingStudent[];
}

export default function ClassroomGatingManager({ hasProgram, students }: ClassroomGatingManagerProps) {
  const router = useRouter();
  const [openStudentId, setOpenStudentId] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  if (!hasProgram) {
    return null;
  }

  async function toggle(studentId: string, lessonId: string, currentlyUnlocked: boolean) {
    const key = `${studentId}|${lessonId}`;
    setBusyKey(key);
    try {
      const res = await fetch("/api/admin/lesson-unlocks", {
        method: currentlyUnlocked ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, lessonId }),
      });
      if (res.ok) {
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Không cập nhật được trạng thái mở khóa.");
      }
    } catch {
      alert("Lỗi mạng, vui lòng thử lại.");
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <section className="card mt-6 overflow-hidden rounded-2xl">
      <div className="border-b border-slate-100 px-5 py-4">
        <h2 className="text-base font-semibold text-slate-900">
          <i className="fa-solid fa-lock-open mr-2 text-indigo-500"></i>
          Mở khóa bài học theo học sinh
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Bài học mở tuần tự: phải hoàn thành bài trước (xem hết tab + nộp đủ BTVN) mới mở bài kế.
          Cần cho học bù, bạn có thể mở khóa một bài cụ thể cho từng học sinh ở đây.
        </p>
      </div>

      {students.length === 0 ? (
        <div className="px-5 py-8 text-center text-sm text-slate-400">Lớp chưa có học sinh nào.</div>
      ) : (
        <div className="divide-y divide-slate-100">
          {students.map((student) => {
            const lockedCount = student.lessons.filter((lesson) => lesson.locked).length;
            const unlockedManually = student.lessons.filter((lesson) => lesson.manuallyUnlocked).length;
            const isOpen = openStudentId === student.studentId;

            return (
              <div key={student.studentId}>
                <button
                  type="button"
                  onClick={() => setOpenStudentId(isOpen ? null : student.studentId)}
                  className="flex w-full items-center justify-between px-5 py-3 text-left transition hover:bg-slate-50"
                >
                  <div className="flex items-center gap-3">
                    <i className={`fa-solid fa-chevron-${isOpen ? "down" : "right"} text-xs text-slate-400`}></i>
                    <span className="font-medium text-slate-800">{student.studentName}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    {lockedCount > 0 && (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-500">
                        {lockedCount} khóa
                      </span>
                    )}
                    {unlockedManually > 0 && (
                      <span className="rounded-full bg-indigo-50 px-2 py-0.5 font-semibold text-indigo-600">
                        {unlockedManually} mở tay
                      </span>
                    )}
                  </div>
                </button>

                {isOpen && (
                  <div className="divide-y divide-slate-50 border-t border-slate-100 bg-slate-50/40">
                    {student.lessons.map((lesson, index) => {
                      const key = `${student.studentId}|${lesson.lessonId}`;
                      const busy = busyKey === key;

                      return (
                        <div key={lesson.lessonId} className="flex items-center gap-3 px-5 py-2.5">
                          <span className="w-6 shrink-0 text-center text-xs font-semibold text-slate-400">
                            {index + 1}
                          </span>
                          <span className="min-w-0 flex-1 truncate text-sm text-slate-700">{lesson.title}</span>

                          {lesson.manuallyUnlocked ? (
                            <span className="shrink-0 rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-600">
                              Đã mở (thủ công)
                            </span>
                          ) : lesson.locked ? (
                            <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
                              Đang khóa
                            </span>
                          ) : (
                            <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-600">
                              Đang mở
                            </span>
                          )}

                          {lesson.manuallyUnlocked ? (
                            <button
                              type="button"
                              onClick={() => toggle(student.studentId, lesson.lessonId, true)}
                              disabled={busy}
                              className="btn btn-secondary shrink-0 px-2.5 py-1 text-xs disabled:opacity-50"
                            >
                              {busy ? <i className="fa-solid fa-spinner fa-spin"></i> : "Thu hồi"}
                            </button>
                          ) : lesson.locked ? (
                            <button
                              type="button"
                              onClick={() => toggle(student.studentId, lesson.lessonId, false)}
                              disabled={busy}
                              className="btn btn-primary shrink-0 px-2.5 py-1 text-xs disabled:opacity-50"
                            >
                              {busy ? <i className="fa-solid fa-spinner fa-spin"></i> : "Mở khóa"}
                            </button>
                          ) : (
                            <span className="w-[68px] shrink-0" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
