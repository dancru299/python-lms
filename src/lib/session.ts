import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

export interface SessionUser {
  userId: string;
  email: string;
  name: string;
  role: string;
  exp: number;
}

export const getSession = cache(async (): Promise<SessionUser | null> => {
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
});

export const requireAuth = cache(async () => {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  return session;
});

export const requireTeacher = cache(async () => {
  const session = await requireAuth();
  if (session.role !== "teacher" && session.role !== "admin") {
    redirect("/");
  }
  return session;
});

export const requireAdmin = cache(async () => {
  const session = await requireAuth();
  if (session.role !== "admin") {
    redirect("/");
  }
  return session;
});
