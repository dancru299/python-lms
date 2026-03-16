import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/session";
import ClassroomForm from "../ClassroomForm";

export default async function NewClassroomPage() {
  const session = await requireAdmin();

  if (!session) {
    redirect("/admin/classrooms");
  }

  return <ClassroomForm mode="create" canChangeTeacher canDelete={false} />;
}
