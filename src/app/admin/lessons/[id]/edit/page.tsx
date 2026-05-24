import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { getLessonGenerationClientConfig } from "@/lib/ai/lesson-generation";
import EditLessonClientPage from "./EditLessonClientPage";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditLessonPage({ params }: PageProps) {
  const { id } = await params;
  const aiConfig = getLessonGenerationClientConfig();

  const [chapters, lesson] = await Promise.all([
    prisma.chapter.findMany({
      select: { id: true, title: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.lesson.findUnique({
      where: { id },
      include: {
        sections: { orderBy: { sortOrder: "asc" } },
        exercises: { orderBy: { sortOrder: "asc" } },
      },
    }),
  ]);

  if (!lesson) {
    notFound();
  }

  return (
    <EditLessonClientPage
      initialChapters={chapters}
      initialAiConfig={aiConfig}
      initialLesson={{
        ...lesson,
        exercises: lesson.exercises.map((exercise) => ({
          ...exercise,
          type: exercise.type as "practice" | "homework",
          difficulty: exercise.difficulty as "easy" | "medium" | "hard",
        })),
      }}
    />
  );
}
