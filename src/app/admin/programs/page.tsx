import TeacherPageFrame from "@/components/teacher/TeacherPageFrame";
import prisma from "@/lib/prisma";
import { getAllLessonsForProgramAdmin, programDetailInclude } from "@/lib/programs/program-admin";
import ProgramsClientPage from "./ProgramsClientPage";

export default async function AdminProgramsPage() {
  const [programs, lessonsByChapter] = await Promise.all([
    prisma.program.findMany({
      include: programDetailInclude,
      orderBy: [{ isActive: "desc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
    }),
    getAllLessonsForProgramAdmin(),
  ]);

  return (
    <TeacherPageFrame
      title="Chương trình đào tạo"
      subtitle="Tổ chức roadmap, milestone, outcome và cây kỹ năng phía trên nội dung bài học"
      summaryPills={[
        { label: "Chương trình", value: programs.length, tone: "indigo" },
        {
          label: "Milestone",
          value: programs.reduce((sum, program) => sum + program.milestones.length, 0),
          tone: "emerald",
        },
        {
          label: "Kỹ năng",
          value: programs.reduce((sum, program) => sum + program.skills.length, 0),
          tone: "amber",
        },
      ]}
    >
      <ProgramsClientPage initialPrograms={programs} lessonsByChapter={lessonsByChapter} />
    </TeacherPageFrame>
  );
}
