"use client";

import { useState } from "react";
import Link from "next/link";

interface Lesson {
  id: string;
  title: string;
  duration: number;
  difficulty: string;
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
  const loading = false;

  // Delete lesson
  const handleDelete = async (lessonId: string, lessonTitle: string) => {
    if (!confirm(`Bạn có chắc muốn xóa bài giảng "${lessonTitle}"?\n\nTất cả sections, bài tập và bài nộp liên quan sẽ bị xóa vĩnh viễn!`)) {
      return;
    }

    setDeletingId(lessonId);
    try {
      const res = await fetch(`/api/admin/lessons/${lessonId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        // Update local state
        setChapters(prev =>
          prev.map(chapter => ({
            ...chapter,
            lessons: chapter.lessons.filter(l => l.id !== lessonId),
          }))
        );
      } else {
        const data = await res.json();
        alert(data.error || "Lỗi khi xóa bài giảng!");
      }
    } catch (error) {
      alert("Đã xảy ra lỗi khi xóa!");
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Đang tải...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/admin" className="text-gray-600 hover:text-gray-900">
                <i className="fa-solid fa-arrow-left"></i>
              </Link>
              <h1 className="text-xl font-bold text-gray-900">📚 Quản lý Bài giảng</h1>
            </div>
            <Link href="/admin/lessons/new" className="btn btn-primary">
              <i className="fa-solid fa-plus"></i>
              Tạo bài giảng mới
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {chapters.length === 0 ? (
          <div className="card p-12 text-center">
            <i className="fa-solid fa-book-open text-6xl text-gray-300 mb-4"></i>
            <h2 className="text-xl font-bold text-gray-700 mb-2">Chưa có chương học nào</h2>
            <p className="text-gray-500 mb-6">Bắt đầu bằng cách tạo chương học và bài giảng mới</p>
            <Link href="/admin/lessons/new" className="btn btn-primary">
              <i className="fa-solid fa-plus"></i>
              Tạo bài giảng đầu tiên
            </Link>
          </div>
        ) : (
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
                              <span className={`px-2 py-0.5 rounded-full text-xs ${
                                lesson.difficulty === "advanced" ? "bg-red-100 text-red-600" :
                                lesson.difficulty === "intermediate" ? "bg-yellow-100 text-yellow-600" :
                                "bg-green-100 text-green-600"
                              }`}>
                                {lesson.difficulty === "advanced" ? "Nâng cao" :
                                 lesson.difficulty === "intermediate" ? "Trung bình" : "Cơ bản"}
                              </span>
                              <span>
                                <i className="fa-solid fa-code mr-1"></i>
                                {lesson._count.exercises} bài tập
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
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
        )}
      </main>
    </div>
  );
}
