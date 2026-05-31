import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { cookies } from "next/headers";
import { hashPassword } from "@/lib/auth";
import { verifySession } from "@/lib/session-token";

// Verify admin only
async function verifyAdmin() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("session");
  if (!sessionCookie) return null;

  try {
    const sessionData = verifySession(sessionCookie.value);
    if (!sessionData) return null;
    if (sessionData.role !== "admin") return null;
    return sessionData;
  } catch {
    return null;
  }
}

// POST - Create new user (admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await verifyAdmin();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized - Admin only" }, { status: 401 });
    }

    const body = await request.json();
    const { name, email, password, role } = body;

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Tên, email và mật khẩu là bắt buộc" },
        { status: 400 }
      );
    }

    // Check if email exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return NextResponse.json({ error: "Email đã được sử dụng" }, { status: 400 });
    }

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        password: await hashPassword(password),
        role: role || "student",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Tạo tài khoản thành công!",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Create user error:", error);
    return NextResponse.json({ error: "Đã xảy ra lỗi" }, { status: 500 });
  }
}
