import { requireAuth } from "@/lib/session";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function StudentClassroomDetailPage({
  params,
}: PageProps) {
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
          scheduleRules: {
            orderBy: [{ weekday: "asc" }, { startTime: "asc" }],
          },
        },
      },
    },
  });

  if (!membership) {
    redirect("/classrooms");
  }

  const upcomingSessions = await prisma.classroomSession.findMany({
    where: {
      classroomId: id,
      status: "scheduled",
      startsAt: { gte: new Date() },
    },
    orderBy: { startsAt: "asc" },
    take: 3,
    select: { id: true, title: true, startsAt: true, endsAt: true },
  });

  const weekdayLabels = ["CN", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
  const scheduleSummary = membership.classroom.scheduleRules
    .map((rule) => `${weekdayLabels[rule.weekday]} ${rule.startTime}`)
    .join(" · ");

  const assignments = await prisma.classroomAssignment.findMany({
    where: {
      classroomId: id,
      isPublished: true,
      // Chỉ hiện bài giao cho cả lớp hoặc giao trực tiếp cho HS này.
      OR: [
        { targets: { none: {} } },
        { targets: { some: { studentId: session.userId } } },
      ],
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
          <Link
            href="/classrooms"
            className="text-gray-600 hover:text-gray-900"
          >
            <i className="fa-solid fa-arrow-left"></i>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {membership.classroom.name}
            </h1>
            <p className="text-sm text-gray-500">
              Giáo viên: {membership.classroom.teacher.name}
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {(scheduleSummary || upcomingSessions.length > 0) && (
          <div className="card mb-6 p-5">
            <div className="flex items-center gap-2 text-gray-900">
              <i className="fa-regular fa-calendar-days text-indigo-500"></i>
              <h2 className="font-semibold">Lịch học</h2>
            </div>
            {scheduleSummary && (
              <p className="mt-2 text-sm text-gray-600">
                Lịch hàng tuần: <span className="font-medium">{scheduleSummary}</span>
              </p>
            )}
            {upcomingSessions.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {upcomingSessions.map((s) => (
                  <span
                    key={s.id}
                    className="rounded-full bg-indigo-50 px-3 py-1 text-sm text-indigo-700"
                  >
                    {new Date(s.startsAt).toLocaleString("vi-VN", {
                      timeZone: "Asia/Ho_Chi_Minh",
                      weekday: "short",
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

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
                      <span
                        className={`badge ${assignment.type === "test" ? "badge-warning" : "badge-success"}`}
                      >
                        {assignment.type === "test" ? "Kiểm tra" : "BTVN"}
                      </span>
                      <span className="text-sm text-gray-500">
                        {assignment.lesson?.title || "Không rõ bài giảng"}
                      </span>
                    </div>
                    <h2 className="font-semibold text-gray-900">
                      {assignment.title}
                    </h2>
                    <p className="text-sm text-gray-500">
                      {assignment.type === "test" && assignment.durationMinutes
                        ? `${assignment.durationMinutes} phút • `
                        : ""}
                      {assignment.maxScore} điểm
                    </p>
                    {assignment.dueAt && (
                      <p className="mt-1 text-sm text-gray-500">
                        <i className="fa-regular fa-clock mr-1"></i>
                        Hạn nộp:{" "}
                        {new Date(assignment.dueAt).toLocaleString("vi-VN", {
                          timeZone: "Asia/Ho_Chi_Minh",
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {mySubmission ? (
                      <span
                        className={`badge ${mySubmission.status === "graded" ? "badge-success" : "badge-warning"}`}
                      >
                        {mySubmission.status === "graded"
                          ? `Đã chấm ${mySubmission.score ?? 0}/${assignment.maxScore}`
                          : "Đã nộp"}
                      </span>
                    ) : (
                      <span className="badge badge-primary">Chưa nộp</span>
                    )}
                    {mySubmission?.isLate && (
                      <span className="badge badge-danger">Nộp muộn</span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}

          {assignments.length === 0 && (
            <div className="card p-10 text-center text-gray-500">
              Hiện chưa có bài tập hoặc bài kiểm tra nào.
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
