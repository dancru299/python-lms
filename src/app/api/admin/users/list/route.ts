import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdminSessionJson } from "@/lib/api-auth";

// GET - List all users with stats
export async function GET() {
  try {
    const { response } = await requireAdminSessionJson();
    if (response) return response;

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
