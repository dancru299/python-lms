import Link from "next/link";
import type { Metadata } from "next";
import PublicHeader from "./PublicHeader";
import { getPublicPrograms } from "@/lib/programs/public-curriculum";

export const metadata: Metadata = {
  title: "Giáo trình đào tạo · Python LMS",
  description: "Lộ trình học, mục tiêu đầu ra và kỹ năng của các chương trình đào tạo Python.",
};

function formatDuration(minutes: number): string {
  if (minutes <= 0) return "—";
  if (minutes < 60) return `${minutes} phút`;
  const hours = Math.round(minutes / 60);
  return `~${hours} giờ`;
}

const ACCENTS = [
  "from-indigo-500 to-purple-500",
  "from-sky-500 to-cyan-500",
  "from-emerald-500 to-teal-500",
  "from-amber-500 to-orange-500",
  "from-rose-500 to-pink-500",
];

export default async function CurriculumListPage() {
  const programs = await getPublicPrograms();

  return (
    <div className="min-h-screen bg-slate-50">
      <PublicHeader />

      {/* Intro */}
      <section className="bg-gradient-to-b from-indigo-50/60 to-slate-50 px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-100">
            <i className="fa-solid fa-route text-[11px]"></i>
            Giáo trình đào tạo
          </div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            Lộ trình học được thiết kế bài bản
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-500">
            Xem trước toàn bộ lộ trình, mục tiêu đầu ra và kỹ năng mà học viên sẽ đạt được trong từng chương trình —
            minh bạch để phụ huynh nắm rõ hành trình học của con.
          </p>
        </div>
      </section>

      {/* Program grid */}
      <section className="px-4 pb-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          {programs.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <i className="fa-solid fa-folder-open text-2xl"></i>
              </div>
              <h2 className="mt-4 text-lg font-semibold text-slate-700">Chưa có giáo trình nào</h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
                Các chương trình đào tạo sẽ xuất hiện ở đây ngay khi được công bố.
              </p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {programs.map((program, index) => (
                <Link
                  key={program.id}
                  href={`/giao-trinh/${program.id}`}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-lg"
                >
                  <div className={`h-1.5 bg-gradient-to-r ${ACCENTS[index % ACCENTS.length]}`} />
                  <div className="flex flex-1 flex-col p-6">
                    <h2 className="font-display text-lg font-bold text-slate-900 group-hover:text-indigo-700">
                      {program.title}
                    </h2>
                    {program.description && (
                      <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-500">{program.description}</p>
                    )}

                    <div className="mt-5 grid grid-cols-3 gap-2 border-t border-slate-100 pt-4 text-center">
                      <div>
                        <div className="text-lg font-bold text-slate-900">{program.milestoneCount}</div>
                        <div className="text-[11px] text-slate-400">Mốc học</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-slate-900">{program.lessonCount}</div>
                        <div className="text-[11px] text-slate-400">Bài học</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-slate-900">{program.skillCount}</div>
                        <div className="text-[11px] text-slate-400">Kỹ năng</div>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between text-sm">
                      <span className="text-slate-400">
                        <i className="fa-regular fa-clock mr-1.5"></i>
                        {formatDuration(program.totalMinutes)}
                      </span>
                      <span className="font-semibold text-indigo-600 transition group-hover:translate-x-0.5">
                        Xem lộ trình <i className="fa-solid fa-arrow-right ml-1 text-xs"></i>
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
