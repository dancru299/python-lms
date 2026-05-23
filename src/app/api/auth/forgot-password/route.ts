import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sendPasswordResetOtp } from "@/lib/mailer";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email là bắt buộc" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    // Always return success to prevent email enumeration
    if (!user) {
      return NextResponse.json({ message: "Nếu email tồn tại, mã xác nhận sẽ được gửi đi." });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 15 * 60 * 1000);

    await (prisma as any).passwordReset.deleteMany({ where: { email } });
    await (prisma as any).passwordReset.create({ data: { email, otp, expires } });

    if (process.env.SMTP_HOST) {
      await sendPasswordResetOtp(email, otp);
    } else {
      // Dev fallback — log to console when SMTP is not configured
      console.log("=== OTP (no SMTP configured) ===");
      console.log(`Email: ${email}  |  OTP: ${otp}`);
      console.log("================================");
    }

    return NextResponse.json({ message: "Mã xác nhận đã được gửi đến email của bạn." });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json({ error: "Đã xảy ra lỗi, vui lòng thử lại sau." }, { status: 500 });
  }
}
