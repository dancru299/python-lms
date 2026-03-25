import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import AdminUsersClientPage from "./AdminUsersClientPage";

export default async function AdminUsersPage() {
  await requireAdmin();

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      _count: { select: { submissions: true } },
    },
    orderBy: [
      { role: "asc" },
      { createdAt: "desc" },
    ],
  });

  return (
    <AdminUsersClientPage
      initialUsers={users.map((user) => ({
        ...user,
        createdAt: user.createdAt.toISOString(),
      }))}
    />
  );
}
