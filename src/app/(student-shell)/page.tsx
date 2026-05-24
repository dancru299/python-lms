import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { getUnreadNotificationCount } from "@/lib/notifications";
import NotificationInbox from "@/components/notifications/NotificationInbox";
import StudentPageFrame from "@/components/student/StudentPageFrame";
import LandingPage from "./LandingPage";
import { getStudentProgramDashboard, type SkillStatus } from "@/lib/programs/student-program-dashboard";

function getDifficultyLabel(level: string) {
  if (level === "beginner" || level === "easy") return "Cơ bản";
  if (level === "intermediate" || level === "medium") return "Trung bình";
  if (level === "advanced" || level === "hard") return "Nâng cao";
  return level;
}

function getSkillStatusMeta(status: SkillStatus) {
  if (status === "achieved") {
    return { label: "Đã đạt", className: "bg-emerald-50 text-emerald-700 border-emerald-100" };
  }
  if (status === "learning") {
    return { label: "Đang học", className: "bg-amber-50 text-amber-700 border-amber-100" };
  }
  return { label: "Chưa bắt đầu", className: "bg-slate-50 text-slate-500 border-slate-200" };
}

function NotificationsFallback() {
  return (
    <section className="card rounded-[1.5rem] p-5">
      <div className="h-6 w-40 animate-pulse rounded-xl bg-slate-200" />
      <div className="mt-4 space-y-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="h-16 animate-pulse rounded-2xl bg-slate-100" />
        ))}
      </div>
    </section>
  );
}

function ClassroomsFallback() {
  return (
    <section className="card rounded-[1.5rem] p-5">
      <div className="h-6 w-40 animate-pulse rounded-xl bg-slate-200" />
      <div className="mt-4 space-y-3">
        {Array.from({ length: 2 }).map((_, index) => (
          <div key={index} className="h-20 animate-pulse rounded-2xl bg-slate-100" />
        ))}
      </div>
    </section>
  );
}

async function StudentNotificationsSection({ userId }: { userId: string }) {
  const notifications = await prisma.notification
    .findMany({
      where: { userId, isRead: false },
      select: {
        id: true,
        type: true,
        title: true,
        message: true,
        link: true,
        isRead: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    })
    .catch(() => []);

  return <NotificationInbox emptyMessage="Hiện chưa có thông báo nào cần xử lý." notifications={notifications} />;
}

async function StudentClassroomsSection({ userId }: { userId: string }) {
  const classroomEnrollments = await prisma.classroomStudent.findMany({
    where: { studentId: userId },
    include: {
      classroom: {
        include: {
          teacher: { select: { name: true } },
          _count: { select: { assignments: true } },
        },
      },
    },
    orderBy: { joinedAt: "desc" },
    take: 4,
  });

  return (
    <section id="lop-hoc" className="card rounded-[1.5rem] p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900">Lớp học nổi bật</h2>
        <Link href="/classrooms" className="text-sm font-semibold text-indigo-600 hover:text-indigo-700">
          Mở danh sách
        </Link>
      </div>

      <div className="mt-4 space-y-3">
        {classroomEnrollments.length > 0 ? (
          classroomEnrollments.map((item) => (
            <Link
              key={item.id}
              href={`/classrooms/${item.classroom.id}`}
              className="block rounded-2xl border border-slate-200 p-4 transition hover:border-indigo-200 hover:bg-slate-50"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-semibold text-slate-900">{item.classroom.name}</div>
                  <div className="mt-1 text-sm text-slate-500">GV: {item.classroom.teacher.name}</div>
                </div>
                <span className="badge badge-primary font-mono">{item.classroom.code}</span>
              </div>
              <div className="mt-3 text-sm text-slate-500">
                {item.classroom._count.assignments} bài tập được giao
              </div>
            </Link>
          ))
        ) : (
          <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
            Chưa có lớp học nào để hiển thị.
          </div>
        )}
      </div>
    </section>
  );
}

export default async function HomePage() {
  const session = await getSession();

  if (!session) {
    return <LandingPage />;
  }

  if (session.role === "teacher" || session.role === "admin") {
    redirect("/admin");
  }

  const [dashboard, notificationCount, classroomCount] = await Promise.all([
    getStudentProgramDashboard(session.userId),
    getUnreadNotificationCount(session.userId),
    prisma.classroomStudent.count({ where: { studentId: session.userId } }),
  ]);

  const rootSkills = dashboard?.skills.filter((skill) => !skill.parentSkillId) ?? [];
  const childSkills = (parentId: string) => dashboard?.skills.filter((skill) => skill.parentSkillId === parentId) ?? [];

  return (
    <StudentPageFrame
      title={`Xin chào, ${session.name.split(" ").pop()}`}
      subtitle={dashboard ? dashboard.program.title : "Không gian học tập"}
      summaryPills={[
        { label: "Tiến độ", value: dashboard ? `${dashboard.percent}%` : "N/A", tone: "indigo" },
        { label: "Lớp học", value: classroomCount, tone: "emerald" },
        { label: "Portfolio", value: dashboard?.portfolio.length ?? 0, tone: "amber" },
        ...(notificationCount > 0
          ? [{ label: "Thông báo", value: notificationCount, tone: "slate" as const }]
          : []),
      ]}
    >
      {!dashboard ? (
        <div className="card rounded-[1.5rem] p-10 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
            <i className="fa-solid fa-route text-2xl"></i>
          </div>
          <h2 className="mt-4 text-xl font-bold text-slate-900">Chưa có chương trình đào tạo active</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
            Giáo viên cần tạo hoặc seed chương trình đào tạo để dashboard hiển thị roadmap, outcome và skill tree.
          </p>
        </div>
      ) : (
        <>
          {dashboard.nextLesson ? (
            <Link
              href={`/lessons/${dashboard.nextLesson.id}`}
              className="mb-6 flex items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-indigo-500 to-cyan-500 px-5 py-4 text-white shadow-md shadow-indigo-200/50 transition hover:shadow-lg hover:shadow-indigo-200/60"
            >
              <div className="min-w-0">
                <div className="text-[11px] font-semibold uppercase tracking-widest text-indigo-100">
                  Hôm nay học gì
                </div>
                <div className="mt-0.5 truncate text-base font-bold">{dashboard.nextLesson.title}</div>
                <div className="mt-1 text-xs text-indigo-50">
                  {dashboard.nextLesson.chapterTitle} · {dashboard.nextLesson.duration} phút ·{" "}
                  {getDifficultyLabel(dashboard.nextLesson.difficulty)}
                </div>
              </div>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20">
                <i className="fa-solid fa-play text-sm"></i>
              </div>
            </Link>
          ) : (
            <div className="mb-6 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                <i className="fa-solid fa-circle-check text-emerald-600"></i>
              </div>
              <div>
                <div className="text-sm font-semibold text-emerald-800">Hoàn thành toàn bộ chương trình!</div>
                <div className="text-xs text-emerald-600">Tất cả bài học trong roadmap active đã hoàn thành.</div>
              </div>
            </div>
          )}

          <div className="grid gap-6 xl:grid-cols-[1.55fr,1fr]">
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">Roadmap chương trình</h2>
                  <p className="text-sm text-slate-400">
                    {dashboard.completedLessons}/{dashboard.totalLessons} bài đã hoàn thành
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="hidden w-32 sm:block">
                    <div className="h-1.5 rounded-full bg-slate-200">
                      <div className="h-1.5 rounded-full bg-indigo-500" style={{ width: `${dashboard.percent}%` }} />
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-slate-500">{dashboard.percent}%</span>
                </div>
              </div>

              {dashboard.milestones.map((milestone, milestoneIndex) => (
                <article key={milestone.id} className="card overflow-hidden rounded-2xl">
                  <div
                    className="border-b border-slate-100 px-5 py-4"
                    style={{
                      backgroundImage: `linear-gradient(135deg, ${milestone.color}14, rgba(255,255,255,1))`,
                    }}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm"
                          style={{ backgroundColor: `${milestone.color}20`, color: milestone.color }}
                        >
                          <i className={`fa-solid ${milestone.icon}`}></i>
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-slate-900">
                            Mốc {milestoneIndex + 1}: {milestone.title}
                          </h3>
                          <p className="text-xs text-slate-400">
                            {milestone.completedLessons}/{milestone.totalLessons} bài · {milestone.outcomes.length} outcome
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="hidden w-24 sm:block">
                          <div className="h-1 rounded-full bg-slate-200">
                            <div
                              className="h-1 rounded-full"
                              style={{ width: `${milestone.percent}%`, backgroundColor: milestone.color }}
                            />
                          </div>
                        </div>
                        <span className="text-xs font-semibold text-slate-400">{milestone.percent}%</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-5 p-5 lg:grid-cols-[1.05fr,0.95fr]">
                    <div>
                      <h4 className="mb-3 text-sm font-semibold text-slate-800">Bài học</h4>
                      <div className="divide-y divide-slate-100 rounded-xl border border-slate-100">
                        {milestone.lessons.map((lesson, index) => (
                          <Link
                            key={lesson.id}
                            href={`/lessons/${lesson.id}`}
                            className="flex items-center gap-3 px-4 py-3 transition hover:bg-slate-50"
                          >
                            <div
                              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                                lesson.completed
                                  ? "bg-emerald-100 text-emerald-600"
                                  : "bg-slate-100 text-slate-400"
                              }`}
                            >
                              {lesson.completed ? <i className="fa-solid fa-check"></i> : index + 1}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm font-medium text-slate-800">{lesson.title}</div>
                              <div className="text-xs text-slate-400">
                                {lesson.duration} phút · {getDifficultyLabel(lesson.difficulty)}
                              </div>
                            </div>
                            <i className="fa-solid fa-chevron-right shrink-0 text-xs text-slate-300"></i>
                          </Link>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="mb-3 text-sm font-semibold text-slate-800">Learning outcome</h4>
                      <div className="space-y-2">
                        {milestone.outcomes.length > 0 ? (
                          milestone.outcomes.map((outcome) => (
                            <div key={outcome.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <div className="text-sm font-semibold text-slate-900">{outcome.title}</div>
                                  <div className="mt-1 text-xs text-slate-500">
                                    {outcome.completedLessons}/{outcome.totalLessons} bài liên quan
                                  </div>
                                </div>
                                <span
                                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                                    outcome.completed
                                      ? "bg-emerald-100 text-emerald-700"
                                      : "bg-white text-slate-500"
                                  }`}
                                >
                                  {outcome.percent}%
                                </span>
                              </div>
                              <div className="mt-2 h-1.5 rounded-full bg-white">
                                <div className="h-1.5 rounded-full bg-emerald-500" style={{ width: `${outcome.percent}%` }} />
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="rounded-xl border border-dashed border-slate-200 p-5 text-center text-sm text-slate-400">
                            Chưa gắn outcome cho milestone này.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </section>

            <aside className="space-y-4">
              <section className="card rounded-[1.5rem] p-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-slate-900">Skill tree</h2>
                  <span className="text-sm font-semibold text-slate-400">{dashboard.skills.length} kỹ năng</span>
                </div>
                <div className="mt-4 space-y-3">
                  {rootSkills.length > 0 ? (
                    rootSkills.map((skill) => {
                      const status = getSkillStatusMeta(skill.status);
                      const children = childSkills(skill.id);

                      return (
                        <div key={skill.id} className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="font-semibold text-slate-900">{skill.title}</div>
                              <div className="mt-2 h-1.5 w-full rounded-full bg-white">
                                <div className="h-1.5 rounded-full bg-indigo-500" style={{ width: `${skill.percent}%` }} />
                              </div>
                            </div>
                            <span className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-semibold ${status.className}`}>
                              {status.label}
                            </span>
                          </div>
                          {children.length > 0 && (
                            <div className="mt-3 space-y-2">
                              {children.map((child) => {
                                const childStatus = getSkillStatusMeta(child.status);
                                return (
                                  <div key={child.id} className="rounded-lg border border-slate-200 bg-white p-2">
                                    <div className="flex items-center justify-between gap-3">
                                      <span className="text-sm font-medium text-slate-700">{child.title}</span>
                                      <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${childStatus.className}`}>
                                        {child.percent}%
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div className="rounded-xl border border-dashed border-slate-200 p-5 text-center text-sm text-slate-400">
                      Chưa có skill tree trong chương trình.
                    </div>
                  )}
                </div>
              </section>

              <section className="card rounded-[1.5rem] p-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-slate-900">Portfolio</h2>
                  <span className="text-sm font-semibold text-slate-400">{dashboard.portfolio.length} bài</span>
                </div>
                <div className="mt-4 space-y-3">
                  {dashboard.portfolio.length > 0 ? (
                    dashboard.portfolio.map((item) => (
                      <Link
                        key={`${item.source}-${item.id}`}
                        href={item.link}
                        className="block rounded-xl border border-slate-200 p-3 transition hover:border-indigo-200 hover:bg-slate-50"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-slate-900">{item.title}</div>
                            <div className="mt-1 text-xs text-slate-400">
                              {item.source === "classroom" ? "Bài lớp học" : "Bài luyện tập"} ·{" "}
                              {item.gradedAt ? new Date(item.gradedAt).toLocaleDateString("vi-VN") : "Đã chấm"}
                            </div>
                          </div>
                          <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700">
                            {item.score ?? "-"}
                            {item.maxScore ? `/${item.maxScore}` : ""}
                          </span>
                        </div>
                        {item.feedback && <p className="mt-2 line-clamp-2 text-xs text-slate-500">{item.feedback}</p>}
                      </Link>
                    ))
                  ) : (
                    <div className="rounded-xl border border-dashed border-slate-200 p-5 text-center text-sm text-slate-400">
                      Chưa có bài đã chấm để đưa vào portfolio.
                    </div>
                  )}
                </div>
              </section>

              <Suspense fallback={<NotificationsFallback />}>
                <StudentNotificationsSection userId={session.userId} />
              </Suspense>

              <Suspense fallback={<ClassroomsFallback />}>
                <StudentClassroomsSection userId={session.userId} />
              </Suspense>
            </aside>
          </div>
        </>
      )}
    </StudentPageFrame>
  );
}
