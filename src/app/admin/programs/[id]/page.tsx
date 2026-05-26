import Link from "next/link";
import { notFound } from "next/navigation";
import TeacherPageFrame from "@/components/teacher/TeacherPageFrame";
import { getAllLessonsForProgramAdmin, getProgramDetail } from "@/lib/programs/program-admin";
import ProgramsClientPage from "../ProgramsClientPage";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProgramDetailPage({ params }: PageProps) {
  const { id } = await params;
  const program = await getProgramDetail(id);

  if (!program) {
    notFound();
  }

  const lessonsByChapter = await getAllLessonsForProgramAdmin();

  const outcomeCount = program.milestones.reduce(
    (sum, milestone) => sum + milestone.outcomes.length,
    0
  );

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
        <Link
          href="/admin/programs"
          className="flex items-center gap-1.5 rounded-lg px-2 py-1 transition hover:bg-slate-100 hover:text-slate-700"
        >
          Chương trình
        </Link>
        <i className="fa-solid fa-chevron-right text-[10px] text-slate-300"></i>
        <span className="font-medium text-slate-700">{program.title}</span>
      </nav>

      <TeacherPageFrame
        title={program.title}
        subtitle="Xem preview chương trình, dựng roadmap từ ebook/PDF và biên soạn milestone, outcome, skill tree trong một workspace riêng."
        secondaryAction={{ href: "/admin/programs", label: "Danh sách chương trình", icon: "fa-arrow-left" }}
        summaryPills={[
          { label: "Milestone", value: program.milestones.length, tone: "indigo" },
          { label: "Outcome", value: outcomeCount, tone: "slate" },
          { label: "Kỹ năng", value: program.skills.length, tone: "amber" },
        ]}
      >
        <ProgramsClientPage
          initialPrograms={[program]}
          lessonsByChapter={lessonsByChapter}
          detailMode
          initialWorkspaceView="manual"
        />
      </TeacherPageFrame>
    </>
  );
}
