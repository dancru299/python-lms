import { requireTeacher } from "@/lib/session";
import prisma from "@/lib/prisma";
import Link from "next/link";
import LogoutButton from "@/components/LogoutButton";

export default async function ClassroomsPage() {
  const session = await requireTeacher();

  // Get classrooms for this teacher (or all if admin)
  const classrooms = await prisma.classroom.findMany({
    where: session.role === "admin" ? {} : { teacherId: session.userId },
    include: {
      teacher: { select: { name: true } },
      students: { 
        include: { 
          student: { select: { name: true, email: true } } 
        } 
      },
    },
    orderBy: { createdAt: "desc" },
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
              <span className="text-gray-600 font-medium">{session.name}</span>
              <LogoutButton />
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-6 overflow-x-auto">
            <Link href="/admin" className="py-4 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 font-medium text-sm">
              Tổng quan
            </Link>
            <Link href="/admin/grading" className="py-4 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 font-medium text-sm">
              Chấm bài
            </Link>
            <Link href="/admin/lessons" className="py-4 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 font-medium text-sm">
              Bài giảng
            </Link>
            <Link href="/admin/classrooms" className="py-4 px-1 border-b-2 border-indigo-600 text-indigo-600 font-medium text-sm">
              Lớp học
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">🏫 Quản lý Lớp học</h1>
          <Link href="/admin/classrooms/new" className="btn btn-primary">
            <i className="fa-solid fa-plus mr-2"></i>
            Tạo lớp mới
          </Link>
        </div>

        {classrooms.length === 0 ? (
          <div className="card p-12 text-center">
            <i className="fa-solid fa-users-rectangle text-5xl text-gray-300 mb-4"></i>
            <h2 className="text-xl font-semibold text-gray-600 mb-2">Chưa có lớp học nào</h2>
            <p className="text-gray-500 mb-4">Tạo lớp học để quản lý học sinh và bài tập</p>
            <Link href="/admin/classrooms/new" className="btn btn-primary inline-flex">
              <i className="fa-solid fa-plus mr-2"></i>
              Tạo lớp học đầu tiên
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {classrooms.map((classroom) => (
              <Link
                key={classroom.id}
                href={`/admin/classrooms/${classroom.id}`}
                className="card p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
                    <i className="fa-solid fa-users text-xl text-indigo-600"></i>
                  </div>
                  <span className="text-sm px-2 py-1 bg-gray-100 text-gray-600 rounded-full font-mono">
                    {classroom.code}
                  </span>
                </div>
                
                <h3 className="text-lg font-bold text-gray-900 mb-1">{classroom.name}</h3>
                {classroom.description && (
                  <p className="text-sm text-gray-500 mb-3 line-clamp-2">{classroom.description}</p>
                )}
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">
                    <i className="fa-solid fa-user-graduate mr-1"></i>
                    {classroom.students.length} học sinh
                  </span>
                  <span className="text-gray-400">
                    GV: {classroom.teacher.name}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
