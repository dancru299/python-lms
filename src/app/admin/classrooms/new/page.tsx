import { requireAdmin } from "@/lib/session";
import ClassroomForm from "../ClassroomForm";

export default async function NewClassroomPage() {
  await requireAdmin();

  return <ClassroomForm mode="create" canChangeTeacher canDelete={false} />;
}
