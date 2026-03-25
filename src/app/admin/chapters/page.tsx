import prisma from "@/lib/prisma";
import { requireTeacher } from "@/lib/session";
import AdminChaptersClientPage from "./AdminChaptersClientPage";

export default async function AdminChaptersPage() {
  await requireTeacher();

  const chapters = await prisma.chapter.findMany({
    include: {
      _count: { select: { lessons: true } },
    },
    orderBy: { sortOrder: "asc" },
  });

  return <AdminChaptersClientPage initialChapters={chapters} />;
}
