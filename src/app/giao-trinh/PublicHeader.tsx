import Link from "next/link";

// Lightweight public top bar for the parent-facing curriculum pages.
export default function PublicHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600">
            <i className="fa-solid fa-graduation-cap text-[11px] text-white"></i>
          </div>
          <span className="text-base font-bold text-slate-900">Python LMS</span>
        </Link>

        <nav className="flex items-center gap-2">
          <Link
            href="/giao-trinh"
            className="hidden rounded-lg px-3 py-1.5 text-sm font-semibold text-indigo-600 transition hover:bg-indigo-50 sm:inline-flex"
          >
            <i className="fa-solid fa-route mr-1.5 text-xs"></i>
            Giáo trình
          </Link>
          <Link href="/login" className="btn btn-secondary text-sm">
            Đăng nhập
          </Link>
          <Link href="/register" className="btn btn-primary text-sm">
            Bắt đầu miễn phí
          </Link>
        </nav>
      </div>
    </header>
  );
}
