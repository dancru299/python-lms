import type { ReactNode } from "react";
import TeacherShell from "@/components/teacher/TeacherShell";
import { getUnreadNotificationCount } from "@/lib/notifications";
import { requireTeacher } from "@/lib/session";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await requireTeacher();
  const notificationCount = await getUnreadNotificationCount(session.userId);

  return (
    <TeacherShell
      userName={session.name}
      role={session.role as "teacher" | "admin"}
      notificationCount={notificationCount}
    >
      {children}
    </TeacherShell>
  );
}
