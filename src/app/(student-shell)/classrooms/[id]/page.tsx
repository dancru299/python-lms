import { requireAuth } from "@/lib/session";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { redirect } from "next/navigation";
import StudentPageFrame from "@/components/student/StudentPageFrame";

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

  const pendingCount = assignments.filter((a) => a.submissions.length === 0).length;

  // Lộ trình học của lớp (chỉ khi lớp được gắn một chương trình đào tạo).
  const program = membership.classroom.programId
    ? await prisma.program.findUnique({
        where: { id: membership.classroom.programId },
        select: {
          id: true,
          title: true,
          milestones: {
            orderBy: { sortOrder: "asc" },
            select: {
              id: true,
              title: true,
              icon: true,
              color: true,
              lessons: {
                where: { lesson: { isPublished: true } },
                orderBy: { sortOrder: "asc" },
                select: {
                  lessonId: true,
                  lesson: { select: { id: true, title: true, duration: true } },
                },
              },
            },
          },
        },
      })
    : null;

  const programMilestones = (program?.milestones ?? []).filter((m) => m.lessons.length > 0);
  const programLessonIds = programMilestones.flatMap((m) => m.lessons.map((l) => l.lessonId));
  const completedLessonIds = programLessonIds.length
    ? new Set(
        (
          await prisma.userProgress.findMany({
            where: { userId: session.userId, lessonId: { in: programLessonIds }, completed: true },
            select: { lessonId: true },
          })
        ).map((p) => p.lessonId)
      )
    : new Set<string>();
  const totalLessons = programLessonIds.length;
  const completedCount = programLessonIds.filter((lid) => completedLessonIds.has(lid)).length;
  const progressPercent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;
  // Bài kế tiếp chưa hoàn thành — dùng cho nút "Tiếp tục học".
  const nextLesson = programMilestones
    .flatMap((m) => m.lessons)
    .find((l) => !completedLessonIds.has(l.lessonId));

  return (
    <StudentPageFrame
      title={membership.classroom.name}
      subtitle={`Giáo viên: ${membership.classroom.teacher.name}`}
      summaryPills={[
        ...(totalLessons > 0
          ? [{ label: "Tiến độ bài học", value: `${progressPercent}%`, tone: "indigo" as const }]
          : []),
        { label: "Bài đã giao", value: assignments.length, tone: "slate" as const },
        { label: "Cần làm", value: pendingCount, tone: "amber" as const },
      ]}
      secondaryAction={{ href: "/classrooms", label: "Lớp học của tôi", icon: "fa-arrow-left" }}
      sectionLinks={[
        { href: "#lich-hoc", label: "Lịch học" },
        ...(programMilestones.length > 0 ? [{ href: "#lo-trinh", label: "Lộ trình" }] : []),
        { href: "#bai-giao", label: "Bài tập & kiểm tra" },
      ]}
    >
      <div className="space-y-6">
        {(scheduleSummary || upcomingSessions.length > 0) && (
          <section id="lich-hoc" className="card rounded-[1.5rem] p-5">
            <div className="flex items-center gap-2 text-slate-900">
              <i className="fa-regular fa-calendar-days text-indigo-500"></i>
              <h2 className="font-semibold">Lịch học</h2>
            </div>
            {scheduleSummary && (
              <p className="mt-2 text-sm text-slate-600">
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
          </section>
        )}

        {programMilestones.length > 0 && (
          <section id="lo-trinh" className="card rounded-[1.5rem] p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-slate-900">
                <i className="fa-solid fa-route text-indigo-500"></i>
                <h2 className="font-semibold">
                  Lộ trình học{program?.title ? `: ${program.title}` : ""}
                </h2>
              </div>
              {nextLesson && (
                <Link href={`/lessons/${nextLesson.lesson.id}`} className="btn btn-primary">
                  <i className="fa-solid fa-play"></i>
                  Tiếp tục học
                </Link>
              )}
            </div>

            <div className="mt-4">
              <div className="flex items-center justify-between text-sm text-slate-600">
                <span>Tiến độ</span>
                <span className="font-semibold">
                  {completedCount}/{totalLessons} bài • {progressPercent}%
                </span>
              </div>
              <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-indigo-500 transition-all"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            <div className="mt-5 space-y-5">
              {programMilestones.map((milestone) => (
                <div key={milestone.id}>
                  <div className="flex items-center gap-2">
                    <span
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-xs"
                      style={{
                        backgroundColor: `${milestone.color || "#6366F1"}20`,
                        color: milestone.color || "#6366F1",
                      }}
                    >
                      <i className={`fa-solid ${milestone.icon || "fa-flag-checkered"}`}></i>
                    </span>
                    <h3 className="text-sm font-semibold text-slate-800">{milestone.title}</h3>
                  </div>
                  <div className="mt-2 space-y-2 sm:pl-9">
                    {milestone.lessons.map((link) => {
                      const done = completedLessonIds.has(link.lessonId);
                      return (
                        <Link
                          key={link.lessonId}
                          href={`/lessons/${link.lesson.id}`}
                          className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 px-3 py-2 text-sm transition hover:bg-slate-50"
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            <i
                              className={`fa-${done ? "solid" : "regular"} fa-circle-check ${
                                done ? "text-emerald-500" : "text-slate-300"
                              }`}
                            ></i>
                            <span className="truncate text-slate-700">{link.lesson.title}</span>
                          </span>
                          <span className="shrink-0 text-xs text-slate-400">
                            {link.lesson.duration} phút
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section id="bai-giao" className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900">Bài tập &amp; kiểm tra</h2>

          {assignments.map((assignment) => {
            const mySubmission = assignment.submissions[0];
            return (
              <Link
                key={assignment.id}
                href={`/classrooms/${id}/assignments/${assignment.id}`}
                className="block card rounded-[1.5rem] p-5 transition hover:shadow-md"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="mb-1 flex items-center gap-2">
                      <span
                        className={`badge ${assignment.type === "test" ? "badge-warning" : "badge-success"}`}
                      >
                        {assignment.type === "test" ? "Kiểm tra" : "BTVN"}
                      </span>
                      <span className="truncate text-sm text-slate-500">
                        {assignment.lesson?.title || "Không rõ bài giảng"}
                      </span>
                    </div>
                    <h3 className="font-semibold text-slate-900">{assignment.title}</h3>
                    <p className="text-sm text-slate-500">
                      {assignment.type === "test" && assignment.durationMinutes
                        ? `${assignment.durationMinutes} phút • `
                        : ""}
                      {assignment.maxScore} điểm
                    </p>
                    {assignment.dueAt && (
                      <p className="mt-1 text-sm text-slate-500">
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
                    {mySubmission?.isLate && <span className="badge badge-danger">Nộp muộn</span>}
                  </div>
                </div>
              </Link>
            );
          })}

          {assignments.length === 0 && (
            <div className="card rounded-[1.5rem] p-10 text-center text-slate-500">
              <i className="fa-solid fa-clipboard-list text-4xl text-slate-300"></i>
              <p className="mt-4">Hiện chưa có bài tập hoặc bài kiểm tra nào.</p>
            </div>
          )}
        </section>
      </div>
    </StudentPageFrame>
  );
}
