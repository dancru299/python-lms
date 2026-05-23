import Link from "next/link";
import prisma from "@/lib/prisma";
import LibraryNavbar from "./LibraryNavbar";

export const metadata = {
  title: "Thư viện Bài Giảng Python | Python LMS",
  description: "Toàn bộ bài giảng Python được công bố công khai. Đọc miễn phí, không cần đăng nhập.",
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

export default async function LibraryPage() {
  const chapters = await prisma.chapter
    .findMany({
      where: { isLocked: false },
      select: {
        id: true,
        title: true,
        icon: true,
        color: true,
        lessons: {
          where: { isLocked: false, isPublished: true },
          orderBy: { sortOrder: "asc" },
          select: {
            id: true,
            title: true,
            duration: true,
            difficulty: true,
          },
        },
      },
      orderBy: { sortOrder: "asc" },
    })
    .catch(() => []);

  let totalLessons = 0;
  for (const ch of chapters) totalLessons += ch.lessons.length;

  return (
    <div className="min-h-screen bg-slate-50">
      <LibraryNavbar />

      {/* Hero */}
      <section className="border-b border-slate-200 bg-white px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
              <i className="fa-solid fa-book-open text-sm"></i>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Thư viện Bài Giảng Python</h1>
              <p className="mt-1 text-sm text-slate-500">
                Đọc miễn phí, không cần đăng nhập — đăng nhập để nộp bài và theo dõi tiến độ học của bạn.
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm">
              <i className="fa-solid fa-layer-group text-xs text-indigo-500"></i>
              <span className="font-semibold text-slate-900">{chapters.length}</span>
              <span className="text-slate-500">chương</span>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm">
              <i className="fa-solid fa-file-lines text-xs text-indigo-500"></i>
              <span className="font-semibold text-slate-900">{totalLessons}</span>
              <span className="text-slate-500">bài giảng</span>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm">
              <i className="fa-solid fa-unlock text-xs text-emerald-500"></i>
              <span className="text-emerald-700 font-medium">Hoàn toàn miễn phí</span>
            </div>
          </div>
        </div>
      </section>

      {/* Chapter + Lesson listing */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {chapters.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
            <i className="fa-solid fa-book-open text-3xl text-slate-200"></i>
            <p className="mt-3 text-sm text-slate-400">Chưa có bài giảng nào được công bố.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {chapters.map((chapter, chapterIndex) => (
              <article
                key={chapter.id}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
              >
                {/* Chapter header */}
                <div
                  className="border-b border-slate-100 px-6 py-5"
                  style={{
                    backgroundImage: `linear-gradient(135deg, ${chapter.color}14, rgba(255,255,255,1))`,
                  }}
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

                {/* Lessons */}
                {chapter.lessons.length === 0 ? (
                  <div className="px-6 py-4 text-sm text-slate-400">
                    Chưa có bài giảng trong chương này.
                  </div>
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
        )}

        {/* Sign-up CTA */}
        <div className="mt-10 rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100">
            <i className="fa-solid fa-graduation-cap text-indigo-600"></i>
          </div>
          <h3 className="text-lg font-bold text-slate-900">Muốn theo dõi tiến độ và nộp bài?</h3>
          <p className="mt-2 text-sm text-slate-500">
            Tạo tài khoản miễn phí để lưu tiến độ, nộp bài tập và nhận phản hồi từ giáo viên.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link href="/register" className="btn btn-primary">
              <i className="fa-solid fa-rocket"></i>
              Tạo tài khoản miễn phí
            </Link>
            <Link href="/login" className="btn btn-secondary">
              Đăng nhập
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-4 border-t border-slate-200 bg-white px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 sm:flex-row">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600">
              <i className="fa-solid fa-graduation-cap text-[10px] text-white"></i>
            </div>
            <span className="text-sm font-bold text-slate-700">Python LMS</span>
          </Link>
          <p className="text-xs text-slate-400">Đọc bài giảng miễn phí — không cần đăng nhập</p>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
              Đăng nhập
            </Link>
            <Link href="/register" className="btn btn-primary py-1.5 text-sm">
              Đăng ký miễn phí
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
