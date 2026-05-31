import Link from "next/link";
import prisma from "@/lib/prisma";
import LibraryNavbar from "./LibraryNavbar";
import StudentShell from "@/components/student/StudentShell";
import StudentPageFrame from "@/components/student/StudentPageFrame";
import RecruitmentCta from "@/components/marketing/RecruitmentCta";
import { getSession } from "@/lib/session";
import { getUnreadNotificationCount } from "@/lib/notifications";
import { getRecruitmentInfo, type RecruitmentInfo } from "@/lib/settings";
import {
  getStudentProgramDashboard,
  type StudentDashboardLesson,
  type StudentDashboardResult,
  type StudentProgramDashboard,
} from "@/lib/programs/student-program-dashboard";

export const metadata = {
  title: "Thư viện Bài Giảng Python | Python LMS",
  description: "Lộ trình bài giảng Python theo chương trình của lớp bạn, kèm một số bài đọc thử miễn phí.",
};

function getDifficultyMeta(difficulty: string) {
  switch (difficulty) {
    case "hard":
    case "advanced":
      return { label: "Nâng cao", className: "border-red-200 bg-red-50 text-red-700" };
    case "medium":
    case "intermediate":
      return { label: "Trung bình", className: "border-amber-200 bg-amber-50 text-amber-700" };
    default:
      return { label: "Cơ bản", className: "border-emerald-200 bg-emerald-50 text-emerald-700" };
  }
}

// ─────────────────────────── Chapter listing (all-published or preview-only) ───────────────────────────

type PreviewChapter = {
  id: string;
  title: string;
  icon: string;
  color: string;
  lessons: { id: string; title: string; duration: number; difficulty: string }[];
};

async function getPublishedChapters(previewOnly: boolean): Promise<PreviewChapter[]> {
  const chapters = await prisma.chapter
    .findMany({
      where: { isLocked: false },
      select: {
        id: true,
        title: true,
        icon: true,
        color: true,
        lessons: {
          where: {
            isLocked: false,
            isPublished: true,
            ...(previewOnly ? { isPublicPreview: true } : {}),
          },
          orderBy: { sortOrder: "asc" },
          select: { id: true, title: true, duration: true, difficulty: true },
        },
      },
      orderBy: { sortOrder: "asc" },
    })
    .catch(() => []);

  // For the preview listing, drop chapters that have no preview lessons.
  return previewOnly ? chapters.filter((chapter) => chapter.lessons.length > 0) : chapters;
}

function FullChapterListing({ chapters }: { chapters: PreviewChapter[] }) {
  if (chapters.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
        <i className="fa-solid fa-book-open text-3xl text-slate-200"></i>
        <p className="mt-3 text-sm text-slate-400">Chưa có bài giảng nào được công bố.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {chapters.map((chapter, chapterIndex) => (
        <article
          key={chapter.id}
          className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
        >
          <div
            className="border-b border-slate-100 px-6 py-5"
            style={{ backgroundImage: `linear-gradient(135deg, ${chapter.color}14, rgba(255,255,255,1))` }}
          >
            <div className="flex items-center gap-4">
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-base"
                style={{ backgroundColor: `${chapter.color}20`, color: chapter.color }}
              >
                <i className={`fa-solid ${chapter.icon}`}></i>
              </div>
              <div className="min-w-0 flex-1">
                <div
                  className="text-[11px] font-bold uppercase tracking-widest"
                  style={{ color: chapter.color }}
                >
                  Chương {chapterIndex + 1}
                </div>
                <h2 className="mt-0.5 text-base font-bold text-slate-900">{chapter.title}</h2>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-xl font-bold text-slate-900">{chapter.lessons.length}</div>
                <div className="text-xs text-slate-400">bài giảng</div>
              </div>
            </div>
          </div>

          {chapter.lessons.length === 0 ? (
            <div className="px-6 py-4 text-sm text-slate-400">Chưa có bài giảng trong chương này.</div>
          ) : (
            <div className="divide-y divide-slate-50">
              {chapter.lessons.map((lesson, lessonIndex) => {
                const diffMeta = getDifficultyMeta(lesson.difficulty);
                return (
                  <Link
                    key={lesson.id}
                    href={`/lessons/${lesson.id}`}
                    className="group flex items-center gap-4 px-6 py-3.5 transition hover:bg-indigo-50/40"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-500 transition group-hover:bg-indigo-100 group-hover:text-indigo-600">
                      {lessonIndex + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-slate-800 transition group-hover:text-indigo-700">
                        {lesson.title}
                      </div>
                      <div className="mt-0.5 text-xs text-slate-400">{lesson.duration} phút</div>
                    </div>
                    <span
                      className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${diffMeta.className}`}
                    >
                      {diffMeta.label}
                    </span>
                    <i className="fa-solid fa-chevron-right shrink-0 text-xs text-slate-300 transition group-hover:text-indigo-400"></i>
                  </Link>
                );
              })}
            </div>
          )}
        </article>
      ))}
    </div>
  );
}

// ─────────────────────────── Student program-gated library ───────────────────────────

function LibraryBlockedPanel({
  icon,
  tone,
  title,
  message,
}: {
  icon: string;
  tone: "indigo" | "amber";
  title: string;
  message: string;
}) {
  const toneClass = tone === "amber" ? "bg-amber-50 text-amber-600" : "bg-indigo-50 text-indigo-600";
  return (
    <div className="card rounded-[1.5rem] p-10 text-center">
      <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl ${toneClass}`}>
        <i className={`fa-solid ${icon} text-2xl`}></i>
      </div>
      <h2 className="mt-4 text-xl font-bold text-slate-900">{title}</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">{message}</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link href="/classrooms" className="btn btn-primary">
          <i className="fa-solid fa-users"></i>
          Xem lớp học của tôi
        </Link>
        <Link href="/dashboard" className="btn btn-secondary">
          Về tổng quan
        </Link>
      </div>
    </div>
  );
}

function ProgramLessonItem({ lesson, index }: { lesson: StudentDashboardLesson; index: number }) {
  const diffMeta = getDifficultyMeta(lesson.difficulty);

  const badge = (
    <div
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
        lesson.completed ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400"
      }`}
    >
      {lesson.completed ? (
        <i className="fa-solid fa-check"></i>
      ) : lesson.locked ? (
        <i className="fa-solid fa-lock text-[11px]"></i>
      ) : (
        index + 1
      )}
    </div>
  );

  if (lesson.locked) {
    return (
      <div
        className="flex cursor-not-allowed items-center gap-4 px-6 py-3.5 opacity-70"
        title={
          lesson.requiredLessonTitle
            ? `Hoàn thành "${lesson.requiredLessonTitle}" để mở khóa`
            : "Hoàn thành bài trước để mở khóa"
        }
      >
        {badge}
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-slate-500">{lesson.title}</div>
          <div className="mt-0.5 truncate text-xs text-slate-400">
            {lesson.requiredLessonTitle
              ? `🔒 Hoàn thành “${lesson.requiredLessonTitle}” để mở`
              : "🔒 Hoàn thành bài trước để mở"}
          </div>
        </div>
        <span className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-400">
          {diffMeta.label}
        </span>
      </div>
    );
  }

  return (
    <Link
      href={`/lessons/${lesson.id}`}
      className="group flex items-center gap-4 px-6 py-3.5 transition hover:bg-indigo-50/40"
    >
      {badge}
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-slate-800 transition group-hover:text-indigo-700">
          {lesson.title}
        </div>
        <div className="mt-0.5 text-xs text-slate-400">
          {lesson.duration} phút · {lesson.chapterTitle}
        </div>
      </div>
      <span
        className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${diffMeta.className}`}
      >
        {diffMeta.label}
      </span>
      <i className="fa-solid fa-chevron-right shrink-0 text-xs text-slate-300 transition group-hover:text-indigo-400"></i>
    </Link>
  );
}

function StudentProgramLibrary({ dashboard }: { dashboard: StudentProgramDashboard }) {
  if (dashboard.totalLessons === 0) {
    return (
      <LibraryBlockedPanel
        icon="fa-hourglass-half"
        tone="amber"
        title="Chương trình chưa có bài học"
        message="Giáo viên cần gắn bài học vào các mốc của chương trình thì danh sách bài giảng mới bắt đầu."
      />
    );
  }

  return (
    <div className="space-y-6">
      {dashboard.milestones.map((milestone, milestoneIndex) => (
        <article
          key={milestone.id}
          className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
        >
          <div
            className="border-b border-slate-100 px-6 py-5"
            style={{ backgroundImage: `linear-gradient(135deg, ${milestone.color}14, rgba(255,255,255,1))` }}
          >
            <div className="flex items-center gap-4">
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-base"
                style={{ backgroundColor: `${milestone.color}20`, color: milestone.color }}
              >
                <i className={`fa-solid ${milestone.icon}`}></i>
              </div>
              <div className="min-w-0 flex-1">
                <div
                  className="text-[11px] font-bold uppercase tracking-widest"
                  style={{ color: milestone.color }}
                >
                  Mốc {milestoneIndex + 1}
                </div>
                <h2 className="mt-0.5 text-base font-bold text-slate-900">{milestone.title}</h2>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-xl font-bold text-slate-900">
                  {milestone.completedLessons}/{milestone.totalLessons}
                </div>
                <div className="text-xs text-slate-400">hoàn thành</div>
              </div>
            </div>
          </div>

          <div className="divide-y divide-slate-50">
            {milestone.lessons.map((lesson, lessonIndex) => (
              <ProgramLessonItem key={lesson.id} lesson={lesson} index={lessonIndex} />
            ))}
          </div>
        </article>
      ))}
    </div>
  );
}

// Logged-in student who isn't in a program-classroom yet: explain enrollment, then offer the
// free public-preview lessons + a contact-to-enroll CTA.
function NotEnrolledLibrary({
  result,
  previewChapters,
  recruitmentInfo,
}: {
  result: Extract<StudentDashboardResult, { status: "no-class" | "no-program" }>;
  previewChapters: PreviewChapter[];
  recruitmentInfo: RecruitmentInfo;
}) {
  const totalPreview = previewChapters.reduce((sum, chapter) => sum + chapter.lessons.length, 0);

  return (
    <div className="space-y-6">
      {result.status === "no-program" ? (
        <LibraryBlockedPanel
          icon="fa-route"
          tone="amber"
          title="Lớp của bạn chưa có chương trình"
          message={`Lớp “${result.classroomName}” chưa được gắn chương trình đào tạo. Giáo viên cần gắn chương trình thì lộ trình bài giảng đầy đủ mới hiển thị tại đây.`}
        />
      ) : (
        <LibraryBlockedPanel
          icon="fa-user-plus"
          tone="indigo"
          title="Bạn chưa tham gia lớp học nào"
          message="Lộ trình bài giảng đầy đủ sẽ mở khi giáo viên thêm bạn vào một lớp đã gắn chương trình đào tạo. Trong lúc chờ, bạn có thể đọc thử các bài giảng miễn phí bên dưới."
        />
      )}

      {totalPreview > 0 && (
        <div>
          <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-slate-900">
            <i className="fa-solid fa-unlock-keyhole text-sky-500"></i>
            Bài đọc thử miễn phí ({totalPreview})
          </h2>
          <FullChapterListing chapters={previewChapters} />
        </div>
      )}

      <RecruitmentCta info={recruitmentInfo} title="Muốn học đầy đủ lộ trình?" />
    </div>
  );
}

// ─────────────────────────── Page ───────────────────────────

export default async function LibraryPage() {
  const session = await getSession();

  // Students: a program-gated lesson list once enrolled; otherwise free preview lessons + CTA.
  if (session?.role === "student") {
    const [result, notificationCount] = await Promise.all([
      getStudentProgramDashboard(session.userId),
      getUnreadNotificationCount(session.userId).catch(() => 0),
    ]);

    if (result.status === "ok") {
      const { dashboard } = result;
      return (
        <StudentShell userName={session.name} notificationCount={notificationCount}>
          <StudentPageFrame
            title="Thư viện bài giảng"
            subtitle="Lộ trình bài giảng theo chương trình của lớp bạn — hoàn thành bài trước để mở bài tiếp theo."
            summaryPills={[
              { label: "Mốc học", value: dashboard.milestones.length, tone: "indigo" },
              { label: "Bài giảng", value: dashboard.totalLessons, tone: "emerald" },
              { label: "Hoàn thành", value: dashboard.completedLessons, tone: "amber" },
            ]}
          >
            <StudentProgramLibrary dashboard={dashboard} />
          </StudentPageFrame>
        </StudentShell>
      );
    }

    const [previewChapters, recruitmentInfo] = await Promise.all([
      getPublishedChapters(true),
      getRecruitmentInfo(),
    ]);

    return (
      <StudentShell userName={session.name} notificationCount={notificationCount}>
        <StudentPageFrame
          title="Thư viện bài giảng"
          subtitle="Đọc thử một số bài giảng miễn phí. Liên hệ giáo viên để học đầy đủ lộ trình."
        >
          <NotEnrolledLibrary
            result={result}
            previewChapters={previewChapters}
            recruitmentInfo={recruitmentInfo}
          />
        </StudentPageFrame>
      </StudentShell>
    );
  }

  // Teachers/admins: full preview of every published lesson (never gated).
  if (session && (session.role === "teacher" || session.role === "admin")) {
    const chapters = await getPublishedChapters(false);
    const totalLessons = chapters.reduce((sum, chapter) => sum + chapter.lessons.length, 0);

    return (
      <div className="min-h-screen bg-slate-50">
        <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/95 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600">
                <i className="fa-solid fa-graduation-cap text-[11px] text-white"></i>
              </div>
              <span className="text-base font-bold text-slate-900">Python LMS · Thư viện</span>
            </Link>
            <Link href="/admin" className="btn btn-secondary text-sm">
              <i className="fa-solid fa-arrow-left"></i>
              Trang quản trị
            </Link>
          </div>
        </header>

        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-slate-900">Thư viện bài giảng</h1>
            <p className="mt-1 text-sm text-slate-500">
              Bản xem trước toàn bộ {totalLessons} bài giảng đã công bố ({chapters.length} chương).
              Học sinh chỉ thấy các bài thuộc chương trình của lớp; khách chỉ thấy các bài bật “đọc thử công khai”.
            </p>
          </div>
          <FullChapterListing chapters={chapters} />
        </div>
      </div>
    );
  }

  // Guests: only the teacher-marked public-preview lessons, plus a contact-to-enroll CTA.
  const [previewChapters, recruitmentInfo] = await Promise.all([
    getPublishedChapters(true),
    getRecruitmentInfo(),
  ]);
  const totalPreview = previewChapters.reduce((sum, chapter) => sum + chapter.lessons.length, 0);

  return (
    <div className="min-h-screen bg-slate-50">
      <LibraryNavbar />

      <section className="border-b border-slate-200 bg-white px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
              <i className="fa-solid fa-book-open text-sm"></i>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Thư viện Bài Giảng Python</h1>
              <p className="mt-1 text-sm text-slate-500">
                Đọc thử miễn phí một số bài giảng chọn lọc. Để học đầy đủ lộ trình và được chấm bài,
                hãy liên hệ với giáo viên.
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        {totalPreview > 0 ? (
          <>
            <div>
              <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-slate-900">
                <i className="fa-solid fa-unlock-keyhole text-sky-500"></i>
                Bài đọc thử miễn phí ({totalPreview})
              </h2>
              <FullChapterListing chapters={previewChapters} />
            </div>
            <RecruitmentCta info={recruitmentInfo} title="Muốn học đầy đủ lộ trình?" />
          </>
        ) : (
          <RecruitmentCta info={recruitmentInfo} title="Thư viện dành cho học viên" />
        )}
      </div>

      <footer className="mt-4 border-t border-slate-200 bg-white px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 sm:flex-row">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600">
              <i className="fa-solid fa-graduation-cap text-[10px] text-white"></i>
            </div>
            <span className="text-sm font-bold text-slate-700">Python LMS</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
              Đăng nhập
            </Link>
            <Link href="/register" className="btn btn-primary py-1.5 text-sm">
              Đăng ký
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
