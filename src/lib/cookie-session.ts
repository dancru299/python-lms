import { cookies } from "next/headers";

export interface CookieSessionUser {
  userId: string;
  email: string;
  name: string;
  role: string;
  exp: number;
}

export async function getCookieSessionUser(): Promise<CookieSessionUser | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("session");
  if (!sessionCookie) return null;

  try {
    const sessionData: CookieSessionUser = JSON.parse(
      Buffer.from(sessionCookie.value, "base64").toString()
    );

    if (sessionData.exp < Date.now()) {
      return null;
    }

    return sessionData;
  } catch {
    return null;
  }
}

