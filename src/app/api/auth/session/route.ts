import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export interface SessionUser {
  userId: string;
  email: string;
  name: string;
  role: string;
  exp: number;
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("session");

    if (!sessionCookie) {
      return NextResponse.json({ authenticated: false });
    }

    const sessionData: SessionUser = JSON.parse(
      Buffer.from(sessionCookie.value, "base64").toString()
    );

    // Check if expired
    if (sessionData.exp < Date.now()) {
      cookieStore.delete("session");
      return NextResponse.json({ authenticated: false });
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: sessionData.userId,
        email: sessionData.email,
        name: sessionData.name,
        role: sessionData.role,
      },
    });
  } catch (error) {
    console.error("Session check error:", error);
    return NextResponse.json({ authenticated: false });
  }
}
