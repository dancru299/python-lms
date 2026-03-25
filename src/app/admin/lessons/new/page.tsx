import prisma from "@/lib/prisma";
import { requireTeacher } from "@/lib/session";
import NewLessonClientPage from "./NewLessonClientPage";

interface PageProps {
  searchParams: Promise<{ chapterId?: string }>;
}

export default async function NewLessonPage({ searchParams }: PageProps) {
  await requireTeacher();

  const [{ chapterId }, chapters] = await Promise.all([
    searchParams,
    prisma.chapter.findMany({
      select: {
        id: true,
        title: true,
      },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  return (
    <NewLessonClientPage
      initialChapters={chapters}
      initialChapterId={chapterId ?? ""}
    />
  );
}
