import type { Prisma } from "@prisma/client";
import Link from "next/link";
import TeacherPageFrame from "@/components/teacher/TeacherPageFrame";
import prisma from "@/lib/prisma";
import { programDetailInclude } from "@/lib/programs/program-admin";

type ProgramWithDetail = Prisma.ProgramGetPayload<{
  include: typeof programDetailInclude;
}>;

function countProgramLessons(program: ProgramWithDetail) {
  return program.milestones.reduce((sum, milestone) => sum + milestone.lessons.length, 0);
}

function countProgramOutcomes(program: ProgramWithDetail) {
  return program.milestones.reduce((sum, milestone) => sum + milestone.outcomes.length, 0);
}

function getProgramReadiness(program: ProgramWithDetail) {
  const checks = [
    program.milestones.length > 0,
    program.milestones.every((milestone) => milestone.lessons.length > 0),
    program.milestones.every((milestone) => milestone.outcomes.length > 0),
    program.milestones.every((milestone) =>
      milestone.outcomes.every((outcome) => outcome.lessons.length > 0)
    ),
    program.milestones.every((milestone) =>
      milestone.outcomes.every((outcome) => outcome.skills.length > 0)
    ),
  ];

  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

function ProgramCard({ program }: { program: ProgramWithDetail }) {
  const lessonCount = countProgramLessons(program);
  const outcomeCount = countProgramOutcomes(program);
  const readiness = getProgramReadiness(program);
  const needsWork = readiness < 100;

  return (
    <article className="card overflow-hidden transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="border-b border-slate-100 p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-lg font-bold text-slate-900">{program.title}</h2>
              {program.isActive && (
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                  Active
                </span>
              )}
            </div>
            <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">
              {program.description || "Chưa có mô tả chương trình."}
            </p>
          </div>
          <div
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${
              needsWork ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"
            }`}
          >
            {readiness}% sẵn sàng
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 divide-x divide-slate-100 border-b border-slate-100">
        {[
          ["Milestone", program.milestones.length],
          ["Bài học", lessonCount],
          ["Outcome", outcomeCount],
          ["Kỹ năng", program.skills.length],
        ].map(([label, value]) => (
          <div key={label} className="px-4 py-3">
            <div className="text-lg font-bold text-slate-900">{value}</div>
            <div className="mt-0.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              {label}
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 p-5">
        <div className="text-sm text-slate-500">
          {needsWork ? "Còn mục cần hoàn thiện trước khi publish." : "Khung chương trình đã đủ để biên soạn."}
        </div>
        <Link href={`/admin/programs/${program.id}`} className="btn btn-primary text-sm">
          <i className="fa-solid fa-arrow-up-right-from-square"></i>
          Chi tiết
        </Link>
      </div>
    </article>
  );
}

export default async function AdminProgramsPage() {
  const programs = await prisma.program.findMany({
    include: programDetailInclude,
    orderBy: [{ isActive: "desc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
  });

  const totalMilestones = programs.reduce((sum, program) => sum + program.milestones.length, 0);
  const totalSkills = programs.reduce((sum, program) => sum + program.skills.length, 0);

  return (
    <>
      <nav className="mb-4 flex items-center gap-2 text-sm text-slate-500">
        <Link
          href="/admin"
          className="flex items-center gap-1.5 rounded-lg px-2 py-1 transition hover:bg-slate-100 hover:text-slate-700"
        >
          <i className="fa-solid fa-chart-line text-xs"></i>
          Tổng quan
        </Link>
        <i className="fa-solid fa-chevron-right text-[10px] text-slate-300"></i>
        <span className="font-medium text-slate-700">Chương trình</span>
      </nav>

      <TeacherPageFrame
        title="Chương trình đào tạo"
        subtitle="Quản lý danh sách chương trình. Mỗi chương trình có trang chi tiết riêng để xem roadmap, dựng từ ebook và biên soạn meta layer."
        primaryAction={{ href: "/admin/programs/new", label: "Thêm chương trình", icon: "fa-plus" }}
        summaryPills={[
          { label: "Chương trình", value: programs.length, tone: "indigo" },
          { label: "Milestone", value: totalMilestones, tone: "emerald" },
          { label: "Kỹ năng", value: totalSkills, tone: "amber" },
        ]}
      >
        {programs.length === 0 ? (
          <div className="card p-12 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
              <i className="fa-solid fa-route text-2xl"></i>
            </div>
            <h2 className="mt-4 text-xl font-bold text-slate-900">Chưa có chương trình nào</h2>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">
              Tạo chương trình đầu tiên, sau đó vào trang chi tiết để dựng roadmap từ ebook hoặc biên soạn milestone thủ công.
            </p>
            <Link href="/admin/programs/new" className="btn btn-primary mt-6">
              <i className="fa-solid fa-plus"></i>
              Thêm chương trình
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {programs.map((program) => (
              <ProgramCard key={program.id} program={program} />
            ))}
          </div>
        )}
      </TeacherPageFrame>
    </>
  );
}
