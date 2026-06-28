import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error("Get profile error:", error);
    return NextResponse.json(
      { error: "Đã xảy ra lỗi khi tải hồ sơ" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.role !== "student") {
      return NextResponse.json(
        { error: "Chỉ học sinh được phép tự cập nhật hồ sơ" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, age, gender, gradeLevel, school, phone } = body;

    if (!name?.trim()) {
      return NextResponse.json(
        { error: "Tên là bắt buộc" },
        { status: 400 }
      );
    }

    await prisma.user.update({
      where: { id: session.userId },
      data: { name: name.trim() },
    });

    await prisma.studentProfile.upsert({
      where: { userId: session.userId },
      update: {
        age: age ? Number(age) : null,
        gender: gender?.trim() || null,
        gradeLevel: gradeLevel?.trim() || null,
        school: school?.trim() || null,
        phone: phone?.trim() || null,
      },
      create: {
        userId: session.userId,
        age: age ? Number(age) : null,
        gender: gender?.trim() || null,
        gradeLevel: gradeLevel?.trim() || null,
        school: school?.trim() || null,
        phone: phone?.trim() || null,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Cập nhật hồ sơ thành công",
    });
  } catch (error) {
    console.error("Update profile error:", error);
    return NextResponse.json(
      { error: "Đã xảy ra lỗi, vui lòng thử lại" },
      { status: 500 }
    );
  }
}
