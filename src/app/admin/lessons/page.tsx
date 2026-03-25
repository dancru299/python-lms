import prisma from "@/lib/prisma";
import { requireTeacher } from "@/lib/session";
import AdminLessonsClientPage from "./AdminLessonsClientPage";

export default async function AdminLessonsPage() {
  await requireTeacher();

  const chapters = await prisma.chapter.findMany({
    include: {
      lessons: {
        orderBy: { sortOrder: "asc" },
        include: {
          _count: { select: { exercises: true } },
        },
      },
    },
    orderBy: { sortOrder: "asc" },
  });

  return <AdminLessonsClientPage initialChapters={chapters} />;
}
