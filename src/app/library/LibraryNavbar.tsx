"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function LibraryNavbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 border-b border-slate-100 bg-white/95 backdrop-blur transition-shadow duration-300 ${
        scrolled ? "shadow-md shadow-slate-100" : ""
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600">
              <i className="fa-solid fa-graduation-cap text-[11px] text-white"></i>
            </div>
            <span className="text-base font-bold text-slate-900">Python LMS</span>
          </Link>

          <div className="mx-1 hidden h-5 w-px bg-slate-200 sm:block" />

          <div className="hidden items-center gap-1.5 sm:flex">
            <i className="fa-solid fa-book-open text-xs text-indigo-500"></i>
            <span className="text-sm font-semibold text-slate-700">Thư viện</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/login" className="btn btn-secondary text-sm">
            Đăng nhập
          </Link>
          <Link href="/register" className="btn btn-primary text-sm">
            Bắt đầu miễn phí
          </Link>
        </div>
      </div>
    </header>
  );
}
