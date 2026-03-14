import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email là bắt buộc" },
        { status: 400 }
      );
    }

    // 1. Check if user exists
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // For security, don't reveal if user exists.
      // But in this internal app, maybe it's fine.
      // I'll return success to prevent email enumeration.
      return NextResponse.json({
        message: "Nếu email tồn tại, mã xác nhận sẽ được gửi đi.",
      });
    }

    // 2. Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // 3. Save to DB (Delete old ones first)
    await (prisma as any).passwordReset.deleteMany({
      where: { email },
    });

    await (prisma as any).passwordReset.create({
      data: {
        email,
        otp,
        expires,
      },
    });

    // 4. (SIMULATED) Send Email
    console.log("==========================================");
    console.log(`EMail sent to: ${email}`);
    console.log(`OTP Code: ${otp}`);
    console.log("==========================================");

    return NextResponse.json({
      message: "Mã xác nhận đã được gửi đến email của bạn.",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error: "Đã xảy ra lỗi, vui lòng thử lại sau." },
      { status: 500 }
    );
  }
}
