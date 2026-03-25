import type { ReactNode } from "react";
import StudentShell from "@/components/student/StudentShell";
import { getSession } from "@/lib/session";

export default async function StudentShellLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getSession();

  if (!session || session.role !== "student") {
    return children;
  }

  return <StudentShell userName={session.name}>{children}</StudentShell>;
}
