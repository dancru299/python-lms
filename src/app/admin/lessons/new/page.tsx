import prisma from "@/lib/prisma";
import { getLessonGenerationClientConfig } from "@/lib/ai/lesson-generation";
import NewLessonClientPage from "./NewLessonClientPage";

interface PageProps {
  searchParams: Promise<{ chapterId?: string }>;
}

export default async function NewLessonPage({ searchParams }: PageProps) {
  const aiConfig = getLessonGenerationClientConfig();

  const [{ chapterId }, chapters] = await Promise.all([
    searchParams,
    prisma.chapter.findMany({
      select: { id: true, title: true },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  return (
    <NewLessonClientPage
      initialChapters={chapters}
      initialChapterId={chapterId ?? ""}
      initialAiConfig={aiConfig}
    />
  );
}
