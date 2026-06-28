import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sendPasswordResetOtp } from "@/lib/mailer";
import {
  peekRateLimit,
  recordRateLimitHit,
  getClientIp,
} from "@/lib/rate-limit";

// Chống spam gửi OTP / "email bombing": giới hạn theo IP và theo email.
const WINDOW_MS = 15 * 60 * 1000;
const PER_IP_MAX = 10; // tối đa 10 yêu cầu/15 phút từ một IP
const PER_EMAIL_MAX = 5; // tối đa 5 yêu cầu/15 phút cho một email

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email là bắt buộc" }, { status: 400 });
    }

    const ipKey = `forgot:ip:${getClientIp(request)}`;
    const emailKey = `forgot:email:${String(email).toLowerCase()}`;
    const ipLimit = peekRateLimit(ipKey, PER_IP_MAX, WINDOW_MS);
    const emailLimit = peekRateLimit(emailKey, PER_EMAIL_MAX, WINDOW_MS);
    if (!ipLimit.allowed || !emailLimit.allowed) {
      const retryAfterSec = Math.max(ipLimit.retryAfterSec, emailLimit.retryAfterSec);
      return NextResponse.json(
        { error: "Bạn đã yêu cầu mã quá nhiều lần. Vui lòng thử lại sau ít phút." },
        { status: 429, headers: { "Retry-After": String(retryAfterSec) } }
      );
    }
    recordRateLimitHit(ipKey, WINDOW_MS);
    recordRateLimitHit(emailKey, WINDOW_MS);

    const user = await prisma.user.findUnique({ where: { email } });

    // Always return success to prevent email enumeration
    if (!user) {
      return NextResponse.json({ message: "Nếu email tồn tại, mã xác nhận sẽ được gửi đi." });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 15 * 60 * 1000);

    await prisma.passwordReset.deleteMany({ where: { email } });
    await prisma.passwordReset.create({ data: { email, otp, expires } });

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
