import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export interface SessionUser {
  userId: string;
  email: string;
  name: string;
  role: string;
  exp: number;
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("session");

  if (!sessionCookie) {
    return null;
  }

  try {
    const sessionData: SessionUser = JSON.parse(
      Buffer.from(sessionCookie.value, "base64").toString()
    );

    // Check if expired
    if (sessionData.exp < Date.now()) {
      return null;
    }

    return sessionData;
  } catch {
    return null;
  }
}

export async function requireAuth() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  return session;
}

export async function requireTeacher() {
  const session = await requireAuth();
  if (session.role !== "teacher" && session.role !== "admin") {
    redirect("/dashboard");
  }
  return session;
}

export async function requireAdmin() {
  const session = await requireAuth();
  if (session.role !== "admin") {
    redirect("/dashboard");
  }
  return session;
}
