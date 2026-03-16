import { requireAuth } from "@/lib/session";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function StudentClassroomsPage() {
  const session = await requireAuth();

  if (session.role !== "student") {
    redirect(session.role === "admin" || session.role === "teacher" ? "/admin/classrooms" : "/");
  }

  const classroomEnrollments = await prisma.classroomStudent.findMany({
    where: { studentId: session.userId },
    include: {
      classroom: {
        include: {
          teacher: { select: { name: true, email: true } },
          _count: { select: { assignments: true } },
        },
      },
    },
    orderBy: { joinedAt: "desc" },
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-gray-600 hover:text-gray-900">
              <i className="fa-solid fa-arrow-left"></i>
            </Link>
            <h1 className="text-xl font-bold text-gray-900">Lớp học của tôi</h1>
          </div>
          <Link href="/profile" className="btn btn-secondary">
            <i className="fa-solid fa-user"></i>
            Hồ sơ
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {classroomEnrollments.length === 0 ? (
          <div className="card p-10 text-center text-gray-500">
            Bạn chưa được thêm vào lớp học nào.
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {classroomEnrollments.map((item) => (
              <Link
                key={item.id}
                href={`/classrooms/${item.classroom.id}`}
                className="card p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="badge badge-primary font-mono">{item.classroom.code}</span>
                  <span className="text-sm text-gray-500">{item.classroom._count.assignments} bài</span>
                </div>
                <h2 className="text-lg font-bold text-gray-900">{item.classroom.name}</h2>
                <p className="text-sm text-gray-500 mt-1">GV: {item.classroom.teacher.name}</p>
                {item.classroom.description && (
                  <p className="text-sm text-gray-600 mt-3 line-clamp-2">{item.classroom.description}</p>
                )}
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

