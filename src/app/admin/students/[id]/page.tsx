import { requireTeacher } from "@/lib/session";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminStudentProfilePage({ params }: PageProps) {
  const session = await requireTeacher();
  const { id } = await params;

  const student = await prisma.user.findUnique({
    where: { id },
    include: {
      profile: true,
      studentClassrooms: {
        include: {
          classroom: {
            select: {
              id: true,
              name: true,
              teacherId: true,
            },
          },
        },
      },
    },
  });

  if (!student || student.role !== "student") {
    redirect("/admin/classrooms");
  }

  if (session.role !== "admin") {
    const canView = student.studentClassrooms.some(
      (item) => item.classroom.teacherId === session.userId
    );

    if (!canView) {
      redirect("/admin/classrooms");
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center gap-4">
          <Link href="/admin/classrooms" className="text-gray-600 hover:text-gray-900">
            <i className="fa-solid fa-arrow-left"></i>
          </Link>
          <h1 className="text-xl font-bold text-gray-900">Hồ sơ học sinh</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="card p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Họ và tên
            </label>
            <div className="input bg-gray-50">{student.name}</div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Độ tuổi
              </label>
              <div className="input bg-gray-50">
                {student.profile?.age ?? "Chưa cập nhật"}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Giới tính
              </label>
              <div className="input bg-gray-50">
                {student.profile?.gender || "Chưa cập nhật"}
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Lớp / Khối
              </label>
              <div className="input bg-gray-50">
                {student.profile?.gradeLevel || "Chưa cập nhật"}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Trường
              </label>
              <div className="input bg-gray-50">
                {student.profile?.school || "Chưa cập nhật"}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Số điện thoại
            </label>
            <div className="input bg-gray-50">
              {student.profile?.phone || "Chưa cập nhật"}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <div className="input bg-gray-50">{student.email}</div>
          </div>
        </div>
      </main>
    </div>
  );
}
