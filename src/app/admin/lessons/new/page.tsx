import prisma from "@/lib/prisma";
import { requireTeacher } from "@/lib/session";
import { getLessonGenerationClientConfig } from "@/lib/ai/lesson-generation";
import TeacherShell from "@/components/teacher/TeacherShell";
import NewLessonClientPage from "./NewLessonClientPage";

interface PageProps {
  searchParams: Promise<{ chapterId?: string }>;
}

export default async function NewLessonPage({ searchParams }: PageProps) {
  const session = await requireTeacher();
  const aiConfig = getLessonGenerationClientConfig();

  const [{ chapterId }, chapters] = await Promise.all([
    searchParams,
    prisma.chapter.findMany({
      select: { id: true, title: true },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  return (
    <TeacherShell userName={session.name} role={session.role as "teacher" | "admin"}>
      <NewLessonClientPage
        initialChapters={chapters}
        initialChapterId={chapterId ?? ""}
        initialAiConfig={aiConfig}
      />
    </TeacherShell>
  );
}
