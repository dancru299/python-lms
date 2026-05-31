"use client";

import { useState } from "react";
import Link from "next/link";

interface Lesson {
  id: string;
  title: string;
  duration: number;
  difficulty: string;
  isPublished: boolean;
  isPublicPreview: boolean;
  _count: { exercises: number };
}

interface Chapter {
  id: string;
  title: string;
  icon: string;
  color: string;
  lessons: Lesson[];
}

interface AdminLessonsClientPageProps {
  initialChapters: Chapter[];
}

export default function AdminLessonsClientPage({
  initialChapters,
}: AdminLessonsClientPageProps) {
  const [chapters, setChapters] = useState<Chapter[]>(initialChapters);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [previewingId, setPreviewingId] = useState<string | null>(null);

  const handleTogglePublish = async (lessonId: string, nextPublished: boolean) => {
    setPublishingId(lessonId);
    try {
      const res = await fetch(`/api/admin/lessons/${lessonId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublished: nextPublished }),
      });
      if (res.ok) {
        setChapters((prev) =>
          prev.map((chapter) => ({
            ...chapter,
            lessons: chapter.lessons.map((l) =>
              l.id === lessonId ? { ...l, isPublished: nextPublished } : l
            ),
          }))
        );
      } else {
        const data = await res.json();
        alert(data.error || "Lỗi khi cập nhật trạng thái bài giảng!");
      }
    } catch {
      alert("Đã xảy ra lỗi khi cập nhật trạng thái!");
    } finally {
      setPublishingId(null);
    }
  };

  const handleTogglePreview = async (lessonId: string, nextPreview: boolean) => {
    setPreviewingId(lessonId);
    try {
      const res = await fetch(`/api/admin/lessons/${lessonId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublicPreview: nextPreview }),
      });
      if (res.ok) {
        setChapters((prev) =>
          prev.map((chapter) => ({
            ...chapter,
            lessons: chapter.lessons.map((l) =>
              l.id === lessonId ? { ...l, isPublicPreview: nextPreview } : l
            ),
          }))
        );
      } else {
        const data = await res.json();
        alert(data.error || "Lỗi khi cập nhật chế độ đọc thử!");
      }
    } catch {
      alert("Đã xảy ra lỗi khi cập nhật chế độ đọc thử!");
    } finally {
      setPreviewingId(null);
    }
  };

  const handleDelete = async (lessonId: string, lessonTitle: string) => {
    if (
      !confirm(
        `Bạn có chắc muốn xóa bài giảng "${lessonTitle}"?\n\nTất cả sections, bài tập và bài nộp liên quan sẽ bị xóa vĩnh viễn!`
      )
    ) {
      return;
    }

    setDeletingId(lessonId);
    try {
      const res = await fetch(`/api/admin/lessons/${lessonId}`, { method: "DELETE" });
      if (res.ok) {
        setChapters((prev) =>
          prev.map((chapter) => ({
            ...chapter,
            lessons: chapter.lessons.filter((l) => l.id !== lessonId),
          }))
        );
      } else {
        const data = await res.json();
        alert(data.error || "Lỗi khi xóa bài giảng!");
      }
    } catch {
      alert("Đã xảy ra lỗi khi xóa!");
    } finally {
      setDeletingId(null);
    }
  };

  if (chapters.length === 0) {
    return (
      <div className="card p-12 text-center">
        <i className="fa-solid fa-book-open text-6xl text-gray-300 mb-4"></i>
        <h2 className="text-xl font-bold text-gray-700 mb-2">Chưa có chương học nào</h2>
        <p className="text-gray-500 mb-6">Bắt đầu bằng cách tạo chương học và bài giảng mới</p>
        <Link href="/admin/lessons/new" className="btn btn-primary">
          <i className="fa-solid fa-plus"></i>
          Tạo bài giảng đầu tiên
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {chapters.map((chapter) => (
        <div key={chapter.id} className="card overflow-hidden">
          <div
            className="p-4 border-b"
            style={{ background: `linear-gradient(135deg, ${chapter.color}15, transparent)` }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: chapter.color + "30", color: chapter.color }}
                >
                  <i className={`fa-solid ${chapter.icon}`}></i>
                </div>
                <div>
                  <h2 className="font-bold text-gray-900">{chapter.title}</h2>
                  <p className="text-sm text-gray-500">{chapter.lessons.length} bài giảng</p>
                </div>
              </div>
              <Link
                href={`/admin/lessons/new?chapterId=${chapter.id}`}
                className="btn btn-secondary text-sm"
              >
                <i className="fa-solid fa-plus"></i>
                Thêm bài
              </Link>
            </div>
          </div>

          {chapter.lessons.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p>Chưa có bài giảng nào trong chương này</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {chapter.lessons.map((lesson, index) => (
                <div
                  key={lesson.id}
                  className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-sm font-medium text-gray-600">
                      {index + 1}
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{lesson.title}</h3>
                      <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                        <span>
                          <i className="fa-regular fa-clock mr-1"></i>
                          {lesson.duration} phút
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs ${
                            lesson.difficulty === "advanced"
                              ? "bg-red-100 text-red-600"
                              : lesson.difficulty === "intermediate"
                                ? "bg-yellow-100 text-yellow-600"
                                : "bg-green-100 text-green-600"
                          }`}
                        >
                          {lesson.difficulty === "advanced"
                            ? "Nâng cao"
                            : lesson.difficulty === "intermediate"
                              ? "Trung bình"
                              : "Cơ bản"}
                        </span>
                        <span>
                          <i className="fa-solid fa-code mr-1"></i>
                          {lesson._count.exercises} bài tập
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            lesson.isPublished
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          <i
                            className={`fa-solid ${
                              lesson.isPublished ? "fa-circle-check" : "fa-pen-ruler"
                            } mr-1`}
                          ></i>
                          {lesson.isPublished ? "Đã công bố" : "Đang soạn"}
                        </span>
                        {lesson.isPublicPreview && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-sky-100 text-sky-700">
                            <i className="fa-solid fa-globe mr-1"></i>
                            Đọc thử công khai
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleTogglePublish(lesson.id, !lesson.isPublished)}
                      disabled={publishingId === lesson.id}
                      className={`btn text-sm ${lesson.isPublished ? "btn-secondary" : "btn-primary"}`}
                      title={
                        lesson.isPublished
                          ? "Gỡ công bố (ẩn khỏi học viên và AI sắp xếp)"
                          : "Công bố bài giảng cho học viên và AI sắp xếp"
                      }
                    >
                      {publishingId === lesson.id ? (
                        <i className="fa-solid fa-spinner fa-spin"></i>
                      ) : (
                        <i
                          className={`fa-solid ${
                            lesson.isPublished ? "fa-eye-slash" : "fa-paper-plane"
                          }`}
                        ></i>
                      )}
                      {lesson.isPublished ? "Gỡ công bố" : "Công bố"}
                    </button>
                    <button
                      onClick={() => handleTogglePreview(lesson.id, !lesson.isPublicPreview)}
                      disabled={previewingId === lesson.id}
                      className={`btn text-sm ${lesson.isPublicPreview ? "btn-primary" : "btn-secondary"}`}
                      title={
                        lesson.isPublicPreview
                          ? "Tắt đọc thử — bài này sẽ chỉ dành cho học viên trong lớp"
                          : "Bật đọc thử — khách và học sinh chưa vào lớp có thể đọc bài này"
                      }
                    >
                      {previewingId === lesson.id ? (
                        <i className="fa-solid fa-spinner fa-spin"></i>
                      ) : (
                        <i className="fa-solid fa-globe"></i>
                      )}
                      {lesson.isPublicPreview ? "Tắt đọc thử" : "Đọc thử"}
                    </button>
                    <Link
                      href={`/lessons/${lesson.id}`}
                      target="_blank"
                      className="btn btn-secondary text-sm"
                    >
                      <i className="fa-solid fa-eye"></i>
                      Xem
                    </Link>
                    <Link
                      href={`/admin/lessons/${lesson.id}/edit`}
                      className="btn btn-secondary text-sm"
                    >
                      <i className="fa-solid fa-pen"></i>
                      Sửa
                    </Link>
                    <button
                      onClick={() => handleDelete(lesson.id, lesson.title)}
                      disabled={deletingId === lesson.id}
                      className="btn btn-danger text-sm"
                    >
                      {deletingId === lesson.id ? (
                        <i className="fa-solid fa-spinner fa-spin"></i>
                      ) : (
                        <i className="fa-solid fa-trash"></i>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
