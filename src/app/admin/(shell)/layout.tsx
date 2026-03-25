import type { ReactNode } from "react";
import TeacherShell from "@/components/teacher/TeacherShell";
import { requireTeacher } from "@/lib/session";

export default async function AdminShellLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await requireTeacher();

  return (
    <TeacherShell
      userName={session.name}
      role={session.role as "teacher" | "admin"}
    >
      {children}
    </TeacherShell>
  );
}
