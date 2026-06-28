import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { requireAdminSessionJson } from "@/lib/api-auth";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// PUT - Update user
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { response } = await requireAdminSessionJson();
    if (response) return response;

    const { id } = await params;
    const body = await request.json();
    const { name, email, password, role } = body;

    if (!name || !email) {
      return NextResponse.json({ error: "Tên và email là bắt buộc" }, { status: 400 });
    }

    // Check if email is taken by another user
    const existingUser = await prisma.user.findFirst({
      where: { 
        email: email.toLowerCase(),
        NOT: { id },
      },
    });

    if (existingUser) {
      return NextResponse.json({ error: "Email đã được sử dụng" }, { status: 400 });
    }

    // Update data
    const updateData: {
      name: string;
      email: string;
      role: string;
      password?: string;
    } = {
      name,
      email: email.toLowerCase(),
      role: role || "student",
    };

    // Only update password if provided
    if (password) {
      updateData.password = await hashPassword(password);
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      message: "Cập nhật thành công!",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Update user error:", error);
    return NextResponse.json({ error: "Đã xảy ra lỗi" }, { status: 500 });
  }
}

// DELETE - Delete user
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await requireAdminSessionJson();
    if (!auth.session) return auth.response;
    const { session } = auth;

    const { id } = await params;

    // Prevent self-deletion
    if (id === session.userId) {
      return NextResponse.json(
        { error: "Không thể xóa tài khoản của chính mình" },
        { status: 400 }
      );
    }

    // Delete related data first
    await prisma.notification.deleteMany({ where: { userId: id } });
    await prisma.submission.deleteMany({ where: { userId: id } });
    await prisma.userLessonTabProgress.deleteMany({ where: { userId: id } });
    await prisma.userProgress.deleteMany({ where: { userId: id } });
    await prisma.classroomStudent.deleteMany({ where: { studentId: id } });
    
    // Delete classrooms where user is teacher
    const teacherClassrooms = await prisma.classroom.findMany({
      where: { teacherId: id },
    });
    for (const classroom of teacherClassrooms) {
      await prisma.classroomStudent.deleteMany({ where: { classroomId: classroom.id } });
      await prisma.classroom.delete({ where: { id: classroom.id } });
    }

    // Delete user
    await prisma.user.delete({ where: { id } });

    return NextResponse.json({
      success: true,
      message: "Xóa tài khoản thành công!",
    });
  } catch (error) {
    console.error("Delete user error:", error);
    return NextResponse.json({ error: "Đã xảy ra lỗi" }, { status: 500 });
  }
}
