import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyPassword, hashPassword, isLegacyHash } from "@/lib/auth";
import { signSession } from "@/lib/session-token";
import { cookies } from "next/headers";
import {
  peekRateLimit,
  recordRateLimitHit,
  clearRateLimit,
  getClientIp,
} from "@/lib/rate-limit";

// Chặn brute-force: tối đa 5 lần đăng nhập THẤT BẠI trong 15 phút cho mỗi (IP + email).
const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;

function tooManyAttempts(retryAfterSec: number) {
  return NextResponse.json(
    {
      error: `Bạn đã thử đăng nhập sai quá nhiều lần. Vui lòng thử lại sau ${Math.ceil(
        retryAfterSec / 60
      )} phút.`,
    },
    { status: 429, headers: { "Retry-After": String(retryAfterSec) } }
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // Validation
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email và mật khẩu là bắt buộc" },
        { status: 400 }
      );
    }

    const rateKey = `login:${getClientIp(request)}:${String(email).toLowerCase()}`;
    const limit = peekRateLimit(rateKey, LOGIN_MAX_ATTEMPTS, LOGIN_WINDOW_MS);
    if (!limit.allowed) {
      return tooManyAttempts(limit.retryAfterSec);
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      recordRateLimitHit(rateKey, LOGIN_WINDOW_MS);
      return NextResponse.json(
        { error: "Email hoặc mật khẩu không đúng" },
        { status: 401 }
      );
    }

    // Verify password
    if (!(await verifyPassword(password, user.password))) {
      recordRateLimitHit(rateKey, LOGIN_WINDOW_MS);
      return NextResponse.json(
        { error: "Email hoặc mật khẩu không đúng" },
        { status: 401 }
      );
    }

    // Đăng nhập thành công: reset bộ đếm để không phạt người dùng hợp lệ.
    clearRateLimit(rateKey);

    // Transparently upgrade legacy SHA-256 hashes to scrypt on successful login.
    if (isLegacyHash(user.password)) {
      try {
        await prisma.user.update({
          where: { id: user.id },
          data: { password: await hashPassword(password) },
        });
      } catch (upgradeError) {
        console.error("Password rehash failed:", upgradeError);
      }
    }

    // Create a signed, tamper-proof session token
    const token = signSession({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      exp: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Set cookie
    const cookieStore = await cookies();
    cookieStore.set("session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return NextResponse.json({
      success: true,
      message: "Đăng nhập thành công!",
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Đã xảy ra lỗi, vui lòng thử lại" },
      { status: 500 }
    );
  }
}
