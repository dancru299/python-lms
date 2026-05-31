import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { verifySession, type SessionPayload } from "@/lib/session-token";

export type SessionUser = SessionPayload;

export const getSession = cache(async (): Promise<SessionUser | null> => {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("session");

  if (!sessionCookie) {
    return null;
  }

  return verifySession(sessionCookie.value);
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
