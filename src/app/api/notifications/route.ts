import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUserSessionJson } from "@/lib/api-auth";

// GET - Get user's notifications
export async function GET(request: NextRequest) {
  const summaryOnly = request.nextUrl.searchParams.get("summaryOnly") === "1";

  try {
    const auth = await requireUserSessionJson();
    if (!auth.session) return auth.response;
    const user = auth.session;

    const unreadCountPromise = prisma.notification.count({
      where: { userId: user.userId, isRead: false },
    });

    if (summaryOnly) {
      const unreadCount = await unreadCountPromise;
      return NextResponse.json({ unreadCount });
    }

    const [unreadCount, notifications] = await Promise.all([
      unreadCountPromise,
      prisma.notification.findMany({
        where: { userId: user.userId },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
    ]);

    return NextResponse.json({ notifications, unreadCount });
  } catch (error) {
    if (summaryOnly) {
      return NextResponse.json({ unreadCount: 0 });
    }

    console.error("Get notifications error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST - Mark notifications as read
export async function POST(request: NextRequest) {
  try {
    const auth = await requireUserSessionJson();
    if (!auth.session) return auth.response;
    const user = auth.session;

    const body = await request.json();
    const { notificationId, markAllRead } = body;

    if (markAllRead) {
      await prisma.notification.updateMany({
        where: { userId: user.userId, isRead: false },
        data: { isRead: true },
      });
    } else if (notificationId) {
      // Scope theo userId để một user KHÔNG thể đánh dấu đã đọc thông báo của người
      // khác (chống IDOR). updateMany cho phép thêm điều kiện ngoài khóa chính.
      await prisma.notification.updateMany({
        where: { id: notificationId, userId: user.userId },
        data: { isRead: true },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update notification error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
