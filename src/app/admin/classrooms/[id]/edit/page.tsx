import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { requireTeacher } from "@/lib/session";
import TeacherShell from "@/components/teacher/TeacherShell";
import ClassroomForm from "../../ClassroomForm";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditClassroomPage({ params }: PageProps) {
  const session = await requireTeacher();
  const { id } = await params;

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
    <TeacherShell userName={session.name} role={session.role as "teacher" | "admin"}>
      <ClassroomForm
        mode="edit"
        classroomId={id}
        canChangeTeacher={session.role === "admin"}
        canDelete={session.role === "admin"}
      />
    </TeacherShell>
  );
}
