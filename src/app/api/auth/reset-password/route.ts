import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import crypto from "crypto";

function hashPassword(password: string): string {
  return crypto
    .createHash("sha256")
    .update(password + "python-lms-2024-secret") // Using the same secret as in seed.ts
    .digest("hex");
}

export async function POST(request: Request) {
  try {
    const { email, otp, newPassword } = await request.json();

    if (!email || !otp || !newPassword) {
      return NextResponse.json(
        { error: "Vui lòng cung cấp đầy đủ email, mã OTP và mật khẩu mới." },
        { status: 400 }
      );
    }

    // 1. Validate OTP
    const resetRequest = await (prisma as any).passwordReset.findFirst({
      where: {
        email,
        otp,
        expires: { gt: new Date() },
      },
    });

    if (!resetRequest) {
      return NextResponse.json(
        { error: "Mã xác nhận không chính xác hoặc đã hết hạn." },
        { status: 400 }
      );
    }

    // 2. Update Password
    const hashedPassword = hashPassword(newPassword);

    await prisma.user.update({
      where: { email },
      data: { password: hashedPassword },
    });

    // 3. Cleanup
    await (prisma as any).passwordReset.deleteMany({
      where: { email },
    });

    return NextResponse.json({
      message: "Mật khẩu của bạn đã được cập nhật thành công.",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json(
      { error: "Đã xảy ra lỗi, vui lòng thử lại sau." },
      { status: 500 }
    );
  }
}
