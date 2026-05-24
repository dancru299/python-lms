import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

export async function requireTeacherSessionJson() {
  const session = await getSession();

  if (!session || (session.role !== "teacher" && session.role !== "admin")) {
    return {
      session: null,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  return { session, response: null };
}
