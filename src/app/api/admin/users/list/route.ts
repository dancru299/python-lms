import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { cookies } from "next/headers";

// Verify admin only
async function verifyAdmin() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("session");
  if (!sessionCookie) return null;

  try {
    const sessionData = JSON.parse(
      Buffer.from(sessionCookie.value, "base64").toString()
    );
    if (sessionData.exp < Date.now()) return null;
    if (sessionData.role !== "admin") return null;
    return sessionData;
  } catch {
    return null;
  }
}

// GET - List all users with stats
export async function GET() {
  try {
    const session = await verifyAdmin();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized - Admin only" }, { status: 401 });
    }

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

    return NextResponse.json(users);
  } catch (error) {
    console.error("Get users error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
