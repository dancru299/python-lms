import { redirect } from "next/navigation";
import LandingPage from "@/app/(student-shell)/LandingPage";
import { getSession } from "@/lib/session";

export default async function HomePage() {
  const session = await getSession();

  if (session) {
    redirect(session.role === "admin" || session.role === "teacher" ? "/admin" : "/dashboard");
  }

  return <LandingPage />;
}
