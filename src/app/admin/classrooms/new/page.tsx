import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/session";
import TeacherShell from "@/components/teacher/TeacherShell";
import ClassroomForm from "../ClassroomForm";

export default async function NewClassroomPage() {
  const session = await requireAdmin();

  if (!session) {
    redirect("/admin/classrooms");
  }

  return (
    <TeacherShell userName={session.name} role={session.role as "teacher" | "admin"}>
      <ClassroomForm mode="create" canChangeTeacher canDelete={false} />
    </TeacherShell>
  );
}
