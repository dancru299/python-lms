import { requireAuth } from "@/lib/session";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function StudentClassroomDetailPage({ params }: PageProps) {
  const session = await requireAuth();
  const { id } = await params;

  if (session.role !== "student") {
    redirect("/");
  }

  const membership = await prisma.classroomStudent.findFirst({
    where: {
      classroomId: id,
      studentId: session.userId,
    },
    include: {
      classroom: {
        include: {
          teacher: { select: { name: true } },
        },
      },
    },
  });

  if (!membership) {
    redirect("/classrooms");
  }

  const assignments = await prisma.classroomAssignment.findMany({
    where: {
      classroomId: id,
      isPublished: true,
    },
    include: {
      lesson: { select: { id: true, title: true } },
      submissions: {
        where: { studentId: session.userId },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center gap-4">
          <Link href="/classrooms" className="text-gray-600 hover:text-gray-900">
            <i className="fa-solid fa-arrow-left"></i>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{membership.classroom.name}</h1>
            <p className="text-sm text-gray-500">Giáo viên: {membership.classroom.teacher.name}</p>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-3">
          {assignments.map((assignment) => {
            const mySubmission = assignment.submissions[0];
            return (
              <Link
                key={assignment.id}
                href={`/classrooms/${id}/assignments/${assignment.id}`}
                className="block card p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`badge ${assignment.type === "test" ? "badge-warning" : "badge-success"}`}>
                        {assignment.type === "test" ? "Ki?m tra" : "BTVN"}
                      </span>
                      <span className="text-sm text-gray-500">{assignment.lesson?.title || "Không rõ bài gi?ng"}</span>
                    </div>
                    <h2 className="font-semibold text-gray-900">{assignment.title}</h2>
                    <p className="text-sm text-gray-500">
                      {assignment.type === "test" && assignment.durationMinutes
                        ? `${assignment.durationMinutes} phút • `
                        : ""}
                      {assignment.maxScore} di?m
                    </p>
                  </div>
                  <div>
                    {mySubmission ? (
                      <span className={`badge ${mySubmission.status === "graded" ? "badge-success" : "badge-warning"}`}>
                        {mySubmission.status === "graded"
                          ? `Ðã ch?m ${mySubmission.score ?? 0}/${assignment.maxScore}`
                          : "Ðã n?p"}
                      </span>
                    ) : (
                      <span className="badge badge-primary">Chua n?p</span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}

          {assignments.length === 0 && (
            <div className="card p-10 text-center text-gray-500">
              Hi?n chua có bài t?p ho?c bài ki?m tra nào.
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

