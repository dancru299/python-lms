import { requireTeacher } from "@/lib/session";
import prisma from "@/lib/prisma";
import Link from "next/link";
import LogoutButton from "@/components/LogoutButton";

export default async function AdminPage() {
  const session = await requireTeacher();

  // Fetch stats
  const [chapters, lessons, exercises, pendingSubmissions, users, notifications] = await Promise.all([
    prisma.chapter.count(),
    prisma.lesson.count(),
    prisma.exercise.count(),
    prisma.submission.count({ where: { status: "pending" } }),
    prisma.user.count({ where: { role: "student" } }),
    prisma.notification.count({ where: { userId: session.userId, isRead: false } }),
  ]);

  // Recent pending submissions - grouped by lesson for better display
  const recentSubmissions = await prisma.submission.findMany({
    where: { status: "pending" },
    include: {
      exercise: { include: { lesson: { include: { chapter: true } } } },
      user: { select: { name: true, email: true, avatar: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🐍</span>
              <span className="text-xl font-bold text-gray-900">Python LMS</span>
              <span className="badge badge-primary">{session.role === "admin" ? "Admin" : "Giảng viên"}</span>
            </div>
            <div className="flex items-center gap-4">
              {/* Notifications */}
              {notifications > 0 && (
                <div className="relative cursor-pointer">
                  <i className="fa-solid fa-bell text-gray-600 text-lg"></i>
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {notifications}
                  </span>
                </div>
              )}
              <span className="text-gray-600">
                <span className="font-medium text-gray-900">{session.name}</span>
              </span>
              <LogoutButton />
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-6 overflow-x-auto">
            <Link href="/admin" className="py-4 px-1 border-b-2 border-indigo-600 text-indigo-600 font-medium text-sm whitespace-nowrap">
              Tổng quan
            </Link>
            <Link href="/admin/grading" className="py-4 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 font-medium text-sm whitespace-nowrap flex items-center gap-2">
              Chấm bài
              {pendingSubmissions > 0 && <span className="px-2 py-0.5 bg-orange-100 text-orange-600 rounded-full text-xs">{pendingSubmissions}</span>}
            </Link>
            <Link href="/admin/submissions" className="py-4 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 font-medium text-sm whitespace-nowrap">
              Bài tập
            </Link>
            <Link href="/admin/lessons" className="py-4 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 font-medium text-sm whitespace-nowrap">
              Bài giảng
            </Link>
            <Link href="/admin/chapters" className="py-4 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 font-medium text-sm whitespace-nowrap">
              Chương học
            </Link>
            <Link href="/admin/classrooms" className="py-4 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 font-medium text-sm whitespace-nowrap">
              Lớp học
            </Link>
            {session.role === "admin" && (
              <Link href="/admin/users" className="py-4 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 font-medium text-sm whitespace-nowrap">
                Người dùng
              </Link>
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid md:grid-cols-5 gap-6 mb-8">
          <div className="card p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
                <i className="fa-solid fa-book text-xl text-indigo-600"></i>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{chapters}</div>
                <div className="text-gray-500 text-sm">Chương học</div>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <i className="fa-solid fa-file-lines text-xl text-green-600"></i>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{lessons}</div>
                <div className="text-gray-500 text-sm">Bài giảng</div>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <i className="fa-solid fa-code text-xl text-purple-600"></i>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{exercises}</div>
                <div className="text-gray-500 text-sm">Bài tập</div>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                <i className="fa-solid fa-clock text-xl text-orange-600"></i>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{pendingSubmissions}</div>
                <div className="text-gray-500 text-sm">Chờ chấm</div>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <i className="fa-solid fa-users text-xl text-blue-600"></i>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{users}</div>
                <div className="text-gray-500 text-sm">Học sinh</div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Pending Submissions - Improved UI */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">⏳ Bài chờ chấm</h2>
              <Link href="/admin/grading" className="text-indigo-600 hover:text-indigo-700 text-sm font-medium">
                Xem tất cả →
              </Link>
            </div>

            <div className="space-y-3">
              {recentSubmissions.map((submission) => (
                <Link
                  key={submission.id}
                  href={`/admin/grading/${submission.id}`}
                  className="block bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md hover:border-indigo-300 transition-all"
                >
                  {/* Lesson & Chapter info */}
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs px-2 py-0.5 bg-indigo-100 text-indigo-600 rounded-full">
                      {submission.exercise.lesson.chapter.title}
                    </span>
                    <span className="text-sm text-gray-600">{submission.exercise.lesson.title}</span>
                  </div>
                  
                  {/* Exercise title */}
                  <div className="font-semibold text-gray-900 mb-2">{submission.exercise.title}</div>
                  
                  {/* Student info */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 bg-gray-200 rounded-full flex items-center justify-center text-xs font-medium text-gray-600">
                        {submission.user.name?.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm text-gray-700">{submission.user.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs px-2 py-1 bg-orange-100 text-orange-600 rounded-full">
                        Chờ chấm
                      </span>
                      <div className="text-xs text-gray-400 mt-1">
                        {new Date(submission.createdAt).toLocaleString("vi-VN", { 
                          hour: "2-digit", 
                          minute: "2-digit",
                          day: "2-digit",
                          month: "2-digit"
                        })}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}

              {recentSubmissions.length === 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">
                  <i className="fa-solid fa-check-circle text-4xl text-green-500 mb-4"></i>
                  <p>Không có bài nào đang chờ chấm!</p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">⚡ Thao tác nhanh</h2>

            <div className="grid gap-4">
              <Link href="/admin/lessons/new" className="card p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                    <i className="fa-solid fa-plus text-xl text-green-600"></i>
                  </div>
                  <div>
                    <div className="font-bold text-gray-900">Tạo bài giảng mới</div>
                    <div className="text-sm text-gray-500">Thêm nội dung vào khóa học</div>
                  </div>
                  <i className="fa-solid fa-chevron-right text-gray-400 ml-auto"></i>
                </div>
              </Link>

              <Link href="/admin/classrooms/new" className="card p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                    <i className="fa-solid fa-users-rectangle text-xl text-blue-600"></i>
                  </div>
                  <div>
                    <div className="font-bold text-gray-900">Tạo lớp học mới</div>
                    <div className="text-sm text-gray-500">Phân nhóm học sinh theo lớp</div>
                  </div>
                  <i className="fa-solid fa-chevron-right text-gray-400 ml-auto"></i>
                </div>
              </Link>

              <Link href="/admin/grading" className="card p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                    <i className="fa-solid fa-pen-to-square text-xl text-orange-600"></i>
                  </div>
                  <div>
                    <div className="font-bold text-gray-900">Chấm bài</div>
                    <div className="text-sm text-gray-500">{pendingSubmissions} bài đang chờ</div>
                  </div>
                  <i className="fa-solid fa-chevron-right text-gray-400 ml-auto"></i>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
