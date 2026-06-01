"use client";

import Link from "next/link";
import { useState } from "react";

// Mục điều hướng công khai. Thêm mục mới (vd. Thư viện) chỉ cần thêm 1 dòng ở đây —
// cả thanh nav desktop lẫn menu mobile đều tự cập nhật.
const NAV_LINKS: { href: string; label: string; icon: string }[] = [
  { href: "/giao-trinh", label: "Giáo trình", icon: "fa-route" },
  // Sắp có:
  // { href: "/library", label: "Thư viện", icon: "fa-book-open" },
];

// Lightweight public top bar for the parent-facing curriculum pages.
export default function PublicHeader() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" onClick={close} className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600">
            <i className="fa-solid fa-graduation-cap text-[11px] text-white"></i>
          </div>
          <span className="text-base font-bold text-slate-900">Python LMS</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-2 sm:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="inline-flex items-center rounded-lg px-3 py-1.5 text-sm font-semibold text-indigo-600 transition hover:bg-indigo-50"
            >
              <i className={`fa-solid ${link.icon} mr-1.5 text-xs`}></i>
              {link.label}
            </Link>
          ))}
          <Link href="/login" className="btn btn-secondary text-sm">
            Đăng nhập
          </Link>
          <Link href="/register" className="btn btn-primary text-sm">
            Bắt đầu miễn phí
          </Link>
        </nav>

        {/* Mobile hamburger */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Đóng menu" : "Mở menu"}
          aria-expanded={open}
          aria-controls="public-mobile-menu"
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100 sm:hidden"
        >
          <i className={`fa-solid ${open ? "fa-xmark" : "fa-bars"} text-lg`}></i>
        </button>
      </div>

      {/* Mobile dropdown menu */}
      {open && (
        <div id="public-mobile-menu" className="border-t border-slate-100 bg-white sm:hidden">
          <nav className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={close}
                className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <i className={`fa-solid ${link.icon} w-4 text-center text-indigo-500`}></i>
                {link.label}
              </Link>
            ))}
            <div className="mt-2 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3">
              <Link href="/login" onClick={close} className="btn btn-secondary w-full text-sm">
                Đăng nhập
              </Link>
              <Link href="/register" onClick={close} className="btn btn-primary w-full text-sm">
                Bắt đầu miễn phí
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
