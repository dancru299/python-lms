import Link from "next/link";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import LogoutButton from "@/components/LogoutButton";

export default async function HomePage() {
  const session = await getSession();
  
  // Guest: Show Landing Page
  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        {/* Header */}
        <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🐍</span>
                <span className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  Python LMS
                </span>
              </div>
              <div className="flex items-center gap-4">
                <Link href="/login" className="text-gray-600 hover:text-gray-900 font-medium">
                  Đăng nhập
                </Link>
                <Link href="/register" className="btn btn-primary">
                  Bắt đầu học
                </Link>
              </div>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <main className="pt-32 pb-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-4xl mx-auto">
              <h1 className="text-5xl md:text-6xl font-bold text-gray-900 leading-tight">
                Học <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Python</span> <br />
                Hiệu quả & Thực tế
              </h1>
              <p className="mt-6 text-xl text-gray-600 max-w-2xl mx-auto">
                Hệ thống học tập trực tuyến với bài giảng tương tác, bài tập thực hành và hệ thống chấm điểm chuyên nghiệp.
              </p>
              <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/register" className="btn btn-primary text-lg px-8 py-3">
                  <i className="fa-solid fa-rocket"></i>
                  Đăng ký miễn phí
                </Link>
                <Link href="/login" className="btn btn-secondary text-lg px-8 py-3">
                  <i className="fa-solid fa-right-to-bracket"></i>
                  Đã có tài khoản
                </Link>
              </div>
            </div>

            {/* Features */}
            <div className="mt-32 grid md:grid-cols-3 gap-8">
              <div className="card p-8 text-center hover:shadow-lg transition-shadow">
                <div className="w-16 h-16 mx-auto bg-indigo-100 rounded-2xl flex items-center justify-center mb-6">
                  <i className="fa-solid fa-book-open text-2xl text-indigo-600"></i>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Bài giảng tương tác</h3>
                <p className="text-gray-600">
                  Nội dung được thiết kế dễ hiểu với ví dụ thực tế và code mẫu
                </p>
              </div>

              <div className="card p-8 text-center hover:shadow-lg transition-shadow">
                <div className="w-16 h-16 mx-auto bg-green-100 rounded-2xl flex items-center justify-center mb-6">
                  <i className="fa-solid fa-code text-2xl text-green-600"></i>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Bài tập thực hành</h3>
                <p className="text-gray-600">
                  Luyện tập với các bài tập từ cơ bản đến nâng cao, nộp bài online
                </p>
              </div>

              <div className="card p-8 text-center hover:shadow-lg transition-shadow">
                <div className="w-16 h-16 mx-auto bg-purple-100 rounded-2xl flex items-center justify-center mb-6">
                  <i className="fa-solid fa-chart-line text-2xl text-purple-600"></i>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Theo dõi tiến độ</h3>
                <p className="text-gray-600">
                  Xem điểm số, nhận xét từ giảng viên và theo dõi quá trình học tập
                </p>
              </div>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="bg-gray-900 text-gray-400 py-12">
          <div className="max-w-7xl mx-auto px-4 text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <span className="text-2xl">🐍</span>
              <span className="text-xl font-bold text-white">Python LMS</span>
            </div>
            <p>© 2024 Python LMS. Made with ❤️ by AnhDuc Team</p>
          </div>
        </footer>
      </div>
    );
  }

  // Teacher/Admin: Redirect to /admin
  if (session.role === "teacher" || session.role === "admin") {
    redirect("/admin");
  }

  // Student: Show Student Dashboard
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

  const totalLessons = chapters.reduce((sum, ch) => sum + ch.lessons.length, 0);
  const completedLessons = userProgress.filter((p) => p.completed).length;
  const progressPercent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
  const pendingSubmissions = submissions.filter((s) => s.status === "pending").length;
  const gradedSubmissions = submissions.filter((s) => s.status === "graded");

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🐍</span>
              <span className="text-xl font-bold text-gray-900">Python LMS</span>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/classrooms" className="text-gray-600 hover:text-gray-900 font-medium">
                Lớp học
              </Link>
              <Link href="/profile" className="text-gray-600 hover:text-gray-900 font-medium">
                Hồ sơ
              </Link>
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
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-8 text-white mb-8">
          <h1 className="text-3xl font-bold mb-2">👋 Chào mừng trở lại!</h1>
          <p className="text-indigo-100 text-lg">Tiếp tục hành trình học Python của bạn</p>
        </div>

        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="card p-6">
            <div className="text-3xl font-bold text-indigo-600">{progressPercent}%</div>
            <div className="text-gray-600 mt-1">Tiến độ học tập</div>
            <div className="mt-3 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-600 rounded-full transition-all" style={{ width: `${progressPercent}%` }} />
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
                ? Math.round(gradedSubmissions.reduce((sum, s) => sum + (s.score || 0), 0) / gradedSubmissions.length)
                : "-"}
            </div>
            <div className="text-gray-600 mt-1">Điểm trung bình</div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-xl font-bold text-gray-900">📚 Khóa học</h2>
            {chapters.map((chapter) => (
              <div key={chapter.id} className="card">
                <div className="p-4 border-b border-gray-200" style={{ backgroundImage: `linear-gradient(135deg, ${chapter.color}15, transparent)` }}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: chapter.color + "20", color: chapter.color }}>
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
                      <Link key={lesson.id} href={`/lessons/${lesson.id}`} className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${isCompleted ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-600"}`}>
                          {isCompleted ? <i className="fa-solid fa-check"></i> : index + 1}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{lesson.title}</div>
                          <div className="text-sm text-gray-500">{lesson.duration} phút • {lesson.difficulty}</div>
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

          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-6">📝 Bài nộp gần đây</h2>
            <div className="card divide-y divide-gray-100">
              {submissions.map((submission) => (
                <Link key={submission.id} href={`/lessons/${submission.exercise.lessonId}?tab=bai-tap`} className="block p-4 hover:bg-gray-50 transition-colors">
                  <div className="text-sm text-gray-500 mb-1">{submission.exercise.lesson.title}</div>
                  <div className="font-medium text-gray-900 mb-2">{submission.exercise.title}</div>
                  <div className="flex items-center justify-between">
                    <span className={`badge ${submission.status === "graded" ? "badge-success" : submission.status === "pending" ? "badge-warning" : "badge-primary"}`}>
                      {submission.status === "graded" ? `✓ ${submission.score}/${submission.maxScore}` : submission.status === "pending" ? "⏳ Chờ chấm" : "Đã trả lại"}
                    </span>
                    <span className="text-xs text-gray-500">{new Date(submission.createdAt).toLocaleDateString("vi-VN")}</span>
                  </div>
                  {submission.status === "graded" && submission.feedback && (
                    <div className="mt-2 text-sm text-blue-600">
                      <i className="fa-solid fa-comment mr-1"></i> Có nhận xét từ giáo viên
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
