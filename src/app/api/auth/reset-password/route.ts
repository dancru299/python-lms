import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";

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
    const resetRequest = await prisma.passwordReset.findFirst({
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
    const hashedPassword = await hashPassword(newPassword);

    await prisma.user.update({
      where: { email },
      data: { password: hashedPassword },
    });

    // 3. Cleanup
    await prisma.passwordReset.deleteMany({
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
