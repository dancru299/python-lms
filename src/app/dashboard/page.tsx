import { requireAuth } from "@/lib/session";
import prisma from "@/lib/prisma";
import Link from "next/link";
import LogoutButton from "@/components/LogoutButton";

export default async function DashboardPage() {
  const session = await requireAuth();

  // Fetch user's data with lesson info for submissions
  const [chapters, userProgress, submissions, notifications] = await Promise.all([
    prisma.chapter.findMany({
      where: { isLocked: false },
      include: {
        lessons: {
          where: { isLocked: false, isPublished: true },
          orderBy: { sortOrder: "asc" },
        },
      },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.userProgress.findMany({
      where: { userId: session.userId },
    }),
    prisma.submission.findMany({
      where: { userId: session.userId },
      include: { 
        exercise: {
          include: {
            lesson: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.notification.findMany({
      where: { userId: session.userId, isRead: false },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  // Calculate progress
  const totalLessons = chapters.reduce((sum, ch) => sum + ch.lessons.length, 0);
  const completedLessons = userProgress.filter((p) => p.completed).length;
  const progressPercent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  // Pending submissions
  const pendingSubmissions = submissions.filter((s) => s.status === "pending").length;
  const gradedSubmissions = submissions.filter((s) => s.status === "graded");

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🐍</span>
              <span className="text-xl font-bold text-gray-900">Python LMS</span>
            </div>
            <div className="flex items-center gap-4">
              {/* Notifications Bell */}
              {notifications.length > 0 && (
                <div className="relative">
                  <i className="fa-solid fa-bell text-gray-600"></i>
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {notifications.length}
                  </span>
                </div>
              )}
              <span className="text-gray-600">
                Xin chào, <span className="font-medium text-gray-900">{session.name}</span>
              </span>
              <LogoutButton />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-8 text-white mb-8">
          <h1 className="text-3xl font-bold mb-2">👋 Chào mừng trở lại!</h1>
          <p className="text-indigo-100 text-lg">Tiếp tục hành trình học Python của bạn</p>
        </div>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="card p-6">
            <div className="text-3xl font-bold text-indigo-600">{progressPercent}%</div>
            <div className="text-gray-600 mt-1">Tiến độ học tập</div>
            <div className="mt-3 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-600 rounded-full transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <div className="card p-6">
            <div className="text-3xl font-bold text-green-600">{completedLessons}</div>
            <div className="text-gray-600 mt-1">Bài đã hoàn thành</div>
          </div>

          <div className="card p-6">
            <div className="text-3xl font-bold text-orange-600">{pendingSubmissions}</div>
            <div className="text-gray-600 mt-1">Bài đang chờ chấm</div>
          </div>

          <div className="card p-6">
            <div className="text-3xl font-bold text-purple-600">
              {gradedSubmissions.length > 0
                ? Math.round(
                    gradedSubmissions.reduce((sum, s) => sum + (s.score || 0), 0) /
                      gradedSubmissions.length
                  )
                : "-"}
            </div>
            <div className="text-gray-600 mt-1">Điểm trung bình</div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Courses */}
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-xl font-bold text-gray-900">📚 Khóa học</h2>

            {chapters.map((chapter) => (
              <div key={chapter.id} className="card">
                <div
                  className="p-4 border-b border-gray-200"
                  style={{ backgroundImage: `linear-gradient(135deg, ${chapter.color}15, transparent)` }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: chapter.color + "20", color: chapter.color }}
                    >
                      <i className={`fa-solid ${chapter.icon}`}></i>
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">{chapter.title}</h3>
                      <p className="text-sm text-gray-500">{chapter.lessons.length} bài học</p>
                    </div>
                  </div>
                </div>

                <div className="divide-y divide-gray-100">
                  {chapter.lessons.map((lesson, index) => {
                    const progress = userProgress.find((p) => p.lessonId === lesson.id);
                    const isCompleted = progress?.completed;

                    return (
                      <Link
                        key={lesson.id}
                        href={`/lessons/${lesson.id}`}
                        className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors"
                      >
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                            isCompleted
                              ? "bg-green-100 text-green-600"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {isCompleted ? <i className="fa-solid fa-check"></i> : index + 1}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{lesson.title}</div>
                          <div className="text-sm text-gray-500">
                            {lesson.duration} phút • {lesson.difficulty}
                          </div>
                        </div>
                        <i className="fa-solid fa-chevron-right text-gray-400"></i>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}

            {chapters.length === 0 && (
              <div className="card p-8 text-center text-gray-500">
                <i className="fa-solid fa-book-open text-4xl mb-4"></i>
                <p>Chưa có khóa học nào</p>
              </div>
            )}
          </div>

          {/* Recent Submissions */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-6">📝 Bài nộp gần đây</h2>

            <div className="card divide-y divide-gray-100">
              {submissions.map((submission) => (
                <Link 
                  key={submission.id} 
                  href={`/lessons/${submission.exercise.lessonId}?tab=bai-tap`}
                  className="block p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="text-sm text-gray-500 mb-1">{submission.exercise.lesson.title}</div>
                  <div className="font-medium text-gray-900 mb-2">{submission.exercise.title}</div>
                  <div className="flex items-center justify-between">
                    <span
                      className={`badge ${
                        submission.status === "graded"
                          ? "badge-success"
                          : submission.status === "pending"
                          ? "badge-warning"
                          : "badge-primary"
                      }`}
                    >
                      {submission.status === "graded"
                        ? `✓ ${submission.score}/${submission.maxScore}`
                        : submission.status === "pending"
                        ? "⏳ Chờ chấm"
                        : "Đã trả lại"}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(submission.createdAt).toLocaleDateString("vi-VN")}
                    </span>
                  </div>
                  {submission.status === "graded" && submission.feedback && (
                    <div className="mt-2 text-sm text-blue-600">
                      <i className="fa-solid fa-comment mr-1"></i>
                      Có nhận xét từ giáo viên
                    </div>
                  )}
                </Link>
              ))}

              {submissions.length === 0 && (
                <div className="p-8 text-center text-gray-500">
                  <p>Chưa có bài nộp nào</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
