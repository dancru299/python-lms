import { cookies } from "next/headers";
import { verifySession, type SessionPayload } from "@/lib/session-token";

export type CookieSessionUser = SessionPayload;

export async function getCookieSessionUser(): Promise<CookieSessionUser | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("session");
  if (!sessionCookie) return null;

  return verifySession(sessionCookie.value);
}
