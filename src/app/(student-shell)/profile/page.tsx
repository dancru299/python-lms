import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/session";
import ProfileClientPage from "./ProfileClientPage";

export default async function ProfilePage() {
  const session = await requireAuth();

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      profile: {
        select: {
          age: true,
          gender: true,
          gradeLevel: true,
          school: true,
          phone: true,
        },
      },
    },
  });

  if (!user) {
    redirect("/login");
  }

  return <ProfileClientPage initialUser={user} />;
}
