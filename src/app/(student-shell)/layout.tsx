import type { ReactNode } from "react";
import StudentShell from "@/components/student/StudentShell";
import { getSession } from "@/lib/session";
import { getUnreadNotificationCount } from "@/lib/notifications";

export default async function StudentShellLayout({ children }: { children: ReactNode }) {
  const session = await getSession();

  if (!session || session.role !== "student") {
    return children;
  }

  const notificationCount = await getUnreadNotificationCount(session.userId).catch(() => 0);

  return (
    <StudentShell userName={session.name} notificationCount={notificationCount}>
      {children}
    </StudentShell>
  );
}
