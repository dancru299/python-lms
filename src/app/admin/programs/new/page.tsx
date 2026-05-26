import Link from "next/link";
import TeacherPageFrame from "@/components/teacher/TeacherPageFrame";
import NewProgramClientPage from "./NewProgramClientPage";

export default function NewProgramPage() {
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
        <Link
          href="/admin/programs"
          className="flex items-center gap-1.5 rounded-lg px-2 py-1 transition hover:bg-slate-100 hover:text-slate-700"
        >
          Chương trình
        </Link>
        <i className="fa-solid fa-chevron-right text-[10px] text-slate-300"></i>
        <span className="font-medium text-slate-700">Thêm chương trình</span>
      </nav>

      <TeacherPageFrame
        title="Thêm chương trình"
        subtitle="Tạo chương trình đào tạo mới, sau đó vào trang chi tiết để dựng roadmap, outcome và skill tree."
        secondaryAction={{ href: "/admin/programs", label: "Quay lại danh sách", icon: "fa-arrow-left" }}
      >
        <NewProgramClientPage />
      </TeacherPageFrame>
    </>
  );
}
