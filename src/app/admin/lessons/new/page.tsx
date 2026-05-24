import prisma from "@/lib/prisma";
import { requireTeacher } from "@/lib/session";
import { getLessonGenerationClientConfig } from "@/lib/ai/lesson-generation";
import NewLessonClientPage from "./NewLessonClientPage";

interface PageProps {
  searchParams: Promise<{ chapterId?: string }>;
}

export default async function NewLessonPage({ searchParams }: PageProps) {
  await requireTeacher();

  const [{ chapterId }, chapters, aiConfig] = await Promise.all([
    searchParams,
    prisma.chapter.findMany({
      select: {
        id: true,
        title: true,
      },
      orderBy: { sortOrder: "asc" },
    }),
    Promise.resolve(getLessonGenerationClientConfig()),
  ]);

  return (
    <NewLessonClientPage
      initialChapters={chapters}
      initialChapterId={chapterId ?? ""}
      initialAiConfig={aiConfig}
    />
  );
}
