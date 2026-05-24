import Link from "next/link";
import { requireAdmin } from "@/lib/session";
import prisma from "@/lib/prisma";
import TeacherPageFrame from "@/components/teacher/TeacherPageFrame";
import SettingsClientPage from "./SettingsClientPage";

export default async function AdminSettingsPage() {
  await requireAdmin();

  const rawSettings = await (prisma as any).setting
    .findMany({ orderBy: { key: "asc" } })
    .catch(() => []);

  const initialSettings: Record<string, string> = Object.fromEntries(
    rawSettings.map((s: { key: string; value: string }) => [s.key, s.value])
  );

  return (
    <>
        <nav className="mb-4 flex items-center gap-2 text-sm text-slate-500">
          <Link
            href="/admin"
            className="flex items-center gap-1.5 rounded-lg px-2 py-1 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <i className="fa-solid fa-chart-line text-xs"></i>
            Tổng quan
          </Link>
          <i className="fa-solid fa-chevron-right text-[10px] text-slate-300"></i>
          <span className="font-medium text-slate-700">Cài đặt</span>
        </nav>

        <TeacherPageFrame
          title="Cài đặt hệ thống"
          subtitle="Cấu hình tên, tính năng và hành vi toàn hệ thống"
        >
          <SettingsClientPage initialSettings={initialSettings} />
        </TeacherPageFrame>
    </>
  );
}
