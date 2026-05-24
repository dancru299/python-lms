import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { requireTeacher } from "@/lib/session";
import ClassroomForm from "../../ClassroomForm";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditClassroomPage({ params }: PageProps) {
  const [session, { id }] = await Promise.all([requireTeacher(), params]);

  const classroom = await prisma.classroom.findUnique({
    where: { id },
    select: { id: true, teacherId: true },
  });

  if (!classroom) {
    redirect("/admin/classrooms");
  }

  if (session.role !== "admin" && classroom.teacherId !== session.userId) {
    redirect("/admin/classrooms");
  }

  return (
    <ClassroomForm
      mode="edit"
      classroomId={id}
      canChangeTeacher={session.role === "admin"}
      canDelete={session.role === "admin"}
    />
  );
}
