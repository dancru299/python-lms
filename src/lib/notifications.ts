import prisma from "@/lib/prisma";

export async function getUnreadNotificationCount(userId: string) {
  try {
    return await prisma.notification.count({
      where: { userId, isRead: false },
    });
  } catch {
    return 0;
  }
}
