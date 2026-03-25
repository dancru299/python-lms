import type { ReactNode } from "react";
import prisma from "@/lib/prisma";
import TeacherShell from "@/components/teacher/TeacherShell";
import { requireTeacher } from "@/lib/session";

export default async function AdminShellLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await requireTeacher();
  const notificationCount = await prisma.notification.count({
    where: { userId: session.userId, isRead: false },
  });

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
