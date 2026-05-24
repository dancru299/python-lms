import prisma from "@/lib/prisma";
import { cache } from "react";

export const getUnreadNotificationCount = cache(async (userId: string) => {
  try {
    return await prisma.notification.count({
      where: { userId, isRead: false },
    });
  } catch {
    return 0;
  }
});
