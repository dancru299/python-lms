"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

function useScrollReveal() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add("is-visible");
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -40px 0px" }
    );
    document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
}

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);
  useScrollReveal();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen overflow-x-hidden bg-white">

      {/* ── Navbar ── */}
      <header
        className={`sticky top-0 z-50 border-b border-slate-100 bg-white/95 backdrop-blur transition-shadow duration-300 ${
          scrolled ? "shadow-md shadow-slate-100" : ""
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600">
              <i className="fa-solid fa-graduation-cap text-[11px] text-white"></i>
            </div>
            <span className="text-base font-bold text-slate-900">Python LMS</span>
          </div>

          <nav className="hidden items-center gap-7 md:flex">
            <a href="#tinh-nang" className="text-sm text-slate-500 transition hover:text-slate-900">
              Tính năng
            </a>
            <a href="#cach-hoat-dong" className="text-sm text-slate-500 transition hover:text-slate-900">
              Cách hoạt động
            </a>
            <Link href="/giao-trinh" className="text-sm font-semibold text-indigo-600 transition hover:text-indigo-700">
              <i className="fa-solid fa-route mr-1.5 text-xs"></i>
              Giáo trình
            </Link>
          </nav>

          {/* Desktop auth buttons */}
          <div className="hidden items-center gap-2 md:flex">
            <Link href="/login" className="btn btn-secondary text-sm">Đăng nhập</Link>
            <Link href="/register" className="btn btn-primary text-sm">Bắt đầu miễn phí</Link>
          </div>

          {/* Mobile hamburger */}
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? "Đóng menu" : "Mở menu"}
            aria-expanded={menuOpen}
            aria-controls="landing-mobile-menu"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100 md:hidden"
          >
            <i className={`fa-solid ${menuOpen ? "fa-xmark" : "fa-bars"} text-lg`}></i>
          </button>
        </div>

        {/* Mobile dropdown menu */}
        {menuOpen && (
          <div id="landing-mobile-menu" className="border-t border-slate-100 bg-white md:hidden">
            <nav className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-3">
              <a
                href="#tinh-nang"
                onClick={closeMenu}
                className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                <i className="fa-solid fa-wand-magic-sparkles w-4 text-center text-slate-400"></i>
                Tính năng
              </a>
              <a
                href="#cach-hoat-dong"
                onClick={closeMenu}
                className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                <i className="fa-solid fa-list-check w-4 text-center text-slate-400"></i>
                Cách hoạt động
              </a>
              <Link
                href="/giao-trinh"
                onClick={closeMenu}
                className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-semibold text-indigo-600 transition hover:bg-indigo-50"
              >
                <i className="fa-solid fa-route w-4 text-center text-indigo-500"></i>
                Giáo trình
              </Link>
              <div className="mt-2 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3">
                <Link href="/login" onClick={closeMenu} className="btn btn-secondary w-full text-sm">
                  Đăng nhập
                </Link>
                <Link href="/register" onClick={closeMenu} className="btn btn-primary w-full text-sm">
                  Bắt đầu miễn phí
                </Link>
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-50 via-indigo-50/30 to-white px-4 pb-24 pt-20 sm:px-6 lg:px-8 lg:pt-28">
        {/* Animated background blobs */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="animate-blob absolute -left-16 -top-16 h-72 w-72 rounded-full bg-indigo-200/40 blur-3xl" />
          <div className="animate-blob absolute right-0 top-20 h-64 w-64 rounded-full bg-purple-200/35 blur-3xl" style={{ animationDelay: "3s" }} />
          <div className="animate-blob absolute bottom-0 left-1/3 h-48 w-48 rounded-full bg-cyan-200/30 blur-3xl" style={{ animationDelay: "6s" }} />
        </div>

        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col items-center gap-14 lg:flex-row lg:items-center lg:gap-16">

            {/* Text */}
            <div className="max-w-xl text-center lg:flex-1 lg:text-left">
              <div
                className="animate-fade-up mb-5 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-100"
                style={{ animationDelay: "0s" }}
              >
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-indigo-500" />
                Nền tảng học Python chuyên biệt
              </div>

              <h1
                className="animate-fade-up text-4xl font-extrabold leading-[1.1] tracking-tight text-slate-900 sm:text-5xl lg:text-[3.5rem]"
                style={{ animationDelay: "0.1s" }}
              >
                Học Python
                <br />
                <span className="animate-gradient-text bg-gradient-to-r from-indigo-600 via-purple-500 to-indigo-600 bg-clip-text text-transparent">
                  có lộ trình rõ ràng
                </span>
              </h1>

              <p
                className="animate-fade-up mt-5 text-base leading-7 text-slate-500 sm:text-lg"
                style={{ animationDelay: "0.2s" }}
              >
                Theo dõi tiến độ từng bài, nộp bài và nhận phản hồi từ giáo viên, quản lý lớp học — mọi thứ trong một nơi được thiết kế riêng cho Python.
              </p>

              <div
                className="animate-fade-up mt-8 flex flex-wrap justify-center gap-3 lg:justify-start"
                style={{ animationDelay: "0.3s" }}
              >
                <Link href="/register" className="btn btn-primary px-6 py-2.5 text-sm transition-transform hover:scale-[1.03]">
                  <i className="fa-solid fa-rocket"></i>
                  Bắt đầu miễn phí
                </Link>
                <Link href="/login" className="btn btn-secondary px-6 py-2.5 text-sm transition-transform hover:scale-[1.03]">
                  <i className="fa-solid fa-right-to-bracket"></i>
                  Đăng nhập
                </Link>
              </div>

            </div>

            {/* App mockup — floats */}
            <div
              className="animate-fade-up w-full max-w-lg lg:flex-1"
              style={{ animationDelay: "0.25s" }}
            >
              <div className="animate-float drop-shadow-2xl">
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-indigo-100/80">
                  {/* Browser bar */}
                  <div className="flex items-center gap-1.5 border-b border-slate-100 bg-slate-50 px-4 py-2.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-red-400 transition-opacity hover:opacity-70" />
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                    <div className="ml-3 flex-1 rounded-md border border-slate-200 bg-white px-3 py-1 text-[11px] text-slate-400">
                      python-lms.dancru
                    </div>
                  </div>

                  {/* UI chrome */}
                  <div className="flex h-[290px]">
                    {/* Sidebar */}
                    <div className="flex w-36 shrink-0 flex-col border-r border-slate-100 bg-white px-2 py-3">
                      <div className="mb-3 flex items-center gap-1.5 px-1">
                        <div className="h-5 w-5 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500" />
                        <div className="h-2 w-14 rounded bg-slate-200" />
                      </div>
                      <div className="mb-1 px-2 text-[8px] font-bold uppercase tracking-widest text-slate-400">Menu</div>
                      <div className="flex items-center gap-1.5 rounded-xl bg-indigo-50 px-2 py-1.5">
                        <div className="h-2.5 w-2.5 rounded bg-indigo-400" />
                        <div className="h-2 w-12 rounded bg-indigo-300" />
                        <div className="ml-auto h-1.5 w-1.5 rounded-full bg-indigo-500" />
                      </div>
                      {["w-14", "w-10"].map((w, i) => (
                        <div key={i} className="mt-0.5 flex items-center gap-1.5 rounded-xl px-2 py-1.5">
                          <div className="h-2.5 w-2.5 rounded bg-slate-200" />
                          <div className={`h-2 ${w} rounded bg-slate-200`} />
                        </div>
                      ))}
                      <div className="mt-auto flex items-center gap-1.5 rounded-xl px-2 py-1.5">
                        <div className="h-4 w-4 rounded-full bg-indigo-100" />
                        <div className="h-2 w-12 rounded bg-slate-200" />
                      </div>
                    </div>

                    {/* Content area */}
                    <div className="flex-1 overflow-hidden bg-slate-50 p-4">
                      <div className="mb-0.5 h-3 w-28 rounded bg-slate-800" />
                      <div className="mb-4 h-2 w-40 rounded bg-slate-300" />

                      {/* Continue learning banner */}
                      <div className="mb-3 flex items-center justify-between rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 px-3 py-2.5">
                        <div>
                          <div className="mb-1 h-1.5 w-12 rounded bg-white/50" />
                          <div className="h-2.5 w-32 rounded bg-white/90" />
                        </div>
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20">
                          <div className="ml-0.5 h-2 w-1.5 rounded-sm bg-white" />
                        </div>
                      </div>

                      {/* Chapter card */}
                      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                        <div className="flex items-center gap-2 border-b border-slate-100 bg-blue-50/50 px-3 py-2.5">
                          <div className="h-4 w-4 rounded-lg bg-blue-200" />
                          <div>
                            <div className="mb-1 h-2 w-24 rounded bg-slate-300" />
                            <div className="h-1.5 w-14 rounded bg-slate-200" />
                          </div>
                          <div className="ml-auto">
                            <div className="h-2 w-6 rounded-full bg-slate-200" />
                          </div>
                        </div>
                        {[{ done: true }, { done: false }, { done: false }].map((item, i) => (
                          <div key={i} className="flex items-center gap-2 border-b border-slate-50 px-3 py-2 last:border-0">
                            <div
                              className={`flex h-5 w-5 items-center justify-center rounded-lg text-[8px] font-bold ${
                                item.done ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400"
                              }`}
                            >
                              {item.done ? "✓" : i + 1}
                            </div>
                            <div className={`h-2 rounded bg-slate-${item.done ? "200" : "300"}`} style={{ width: item.done ? "6rem" : "7rem" }} />
                            <div className="ml-auto h-1.5 w-2 rounded text-slate-200">›</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="border-y border-slate-100 bg-white py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-8 text-center md:grid-cols-4">
            {[
              { value: "10+", label: "Bài giảng" },
              { value: "3+",  label: "Chương học" },
              { value: "100%", label: "Hoàn toàn miễn phí" },
              { value: "24/7", label: "Truy cập mọi lúc" },
            ].map((stat, i) => (
              <div key={stat.label} className="reveal" style={{ transitionDelay: `${i * 0.08}s` }}>
                <div className="text-3xl font-extrabold text-slate-900">{stat.value}</div>
                <div className="mt-1 text-sm text-slate-500">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="tinh-nang" className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="reveal mb-14 text-center">
            <h2 className="text-3xl font-bold text-slate-900">Mọi thứ bạn cần để học Python</h2>
            <p className="mx-auto mt-3 max-w-lg text-slate-500">
              Từ bài giảng đến chấm bài, mọi thứ được thiết kế để học sinh tiến bộ và giáo viên quản lý dễ dàng.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                icon: "fa-route",
                iconBg: "bg-indigo-50",
                iconColor: "text-indigo-600",
                borderHover: "hover:border-indigo-200",
                title: "Lộ trình học có cấu trúc",
                description: "Bài học được tổ chức theo chương với tiến độ rõ ràng. Bạn luôn biết mình đang ở đâu và nên học gì tiếp theo.",
              },
              {
                icon: "fa-pen-ruler",
                iconBg: "bg-purple-50",
                iconColor: "text-purple-600",
                borderHover: "hover:border-purple-200",
                title: "Nộp bài & nhận phản hồi",
                description: "Nộp bài tập trực tiếp trên hệ thống. Giáo viên chấm và phản hồi ngay, giúp bạn cải thiện nhanh hơn.",
              },
              {
                icon: "fa-users-rectangle",
                iconBg: "bg-sky-50",
                iconColor: "text-sky-600",
                borderHover: "hover:border-sky-200",
                title: "Lớp học trực tuyến",
                description: "Tham gia lớp học, xem bài được giao và theo dõi deadline — tất cả trong một nơi duy nhất.",
              },
            ].map((feature, i) => (
              <div
                key={feature.title}
                className={`reveal rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${feature.borderHover}`}
                style={{ transitionDelay: `${i * 0.1}s` }}
              >
                <div className={`mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl ${feature.iconBg}`}>
                  <i className={`fa-solid ${feature.icon} ${feature.iconColor}`}></i>
                </div>
                <h3 className="text-base font-semibold text-slate-900">{feature.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="cach-hoat-dong" className="bg-slate-50 px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="reveal mb-14 text-center">
            <h2 className="text-3xl font-bold text-slate-900">Bắt đầu chỉ trong 3 bước</h2>
            <p className="mt-3 text-slate-500">Không cần cài đặt — học ngay từ trình duyệt.</p>
          </div>

          <div className="grid gap-10 md:grid-cols-3">
            {[
              {
                icon: "fa-user-plus",
                title: "Tạo tài khoản",
                description: "Đăng ký miễn phí với email của bạn. Chỉ mất 30 giây để hoàn thành.",
              },
              {
                icon: "fa-users",
                title: "Tham gia lớp học",
                description: "Nhận mã lớp từ giáo viên, nhập vào hệ thống và truy cập nội dung ngay.",
              },
              {
                icon: "fa-graduation-cap",
                title: "Học và nộp bài",
                description: "Đọc bài giảng, làm bài tập và nhận điểm phản hồi trực tiếp từ giáo viên.",
              },
            ].map((step, i) => (
              <div
                key={step.title}
                className="reveal flex flex-col items-center text-center"
                style={{ transitionDelay: `${i * 0.12}s` }}
              >
                <div className="relative mb-5">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-200 transition-transform duration-300 hover:scale-110">
                    <i className={`fa-solid ${step.icon}`}></i>
                  </div>
                  <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-indigo-100 bg-white text-[10px] font-bold text-indigo-600">
                    {i + 1}
                  </span>
                </div>
                <h3 className="text-base font-semibold text-slate-900">{step.title}</h3>
                <p className="mt-2 max-w-xs text-sm text-slate-500">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="reveal bg-gradient-to-br from-indigo-600 via-indigo-600 to-purple-700 px-4 py-24 text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold">Sẵn sàng bắt đầu chưa?</h2>
          <p className="mt-4 text-indigo-100">
            Tạo tài khoản miễn phí và bắt đầu hành trình học Python ngay hôm nay.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/register"
              className="btn bg-white px-6 py-2.5 text-sm font-semibold text-indigo-600 shadow-sm transition-transform hover:scale-[1.04] hover:bg-indigo-50"
            >
              <i className="fa-solid fa-rocket"></i>
              Tạo tài khoản miễn phí
            </Link>
            <Link
              href="/login"
              className="btn border border-white/30 bg-white/10 px-6 py-2.5 text-sm font-semibold text-white transition-transform hover:scale-[1.04] hover:bg-white/20"
            >
              Đăng nhập
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-slate-900 px-4 pt-14 pb-8 text-slate-400 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {/* Brand */}
            <div className="lg:col-span-2">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-400 to-purple-500">
                  <i className="fa-solid fa-graduation-cap text-[11px] text-white"></i>
                </div>
                <span className="text-base font-bold text-white">Python LMS</span>
              </div>
              <p className="mt-3 max-w-xs text-sm leading-6">
                Nền tảng học Python trực tuyến với lộ trình rõ ràng, bài giảng chuyên sâu và hệ thống chấm bài trực tiếp.
              </p>
            </div>

            {/* Links */}
            <div>
              <div className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-500">
                Sản phẩm
              </div>
              <ul className="space-y-2.5 text-sm">
                <li><a href="#tinh-nang" className="transition hover:text-white">Tính năng</a></li>
                <li><a href="#cach-hoat-dong" className="transition hover:text-white">Cách hoạt động</a></li>
                <li><Link href="/giao-trinh" className="transition hover:text-white">Giáo trình đào tạo</Link></li>
              </ul>
            </div>

            <div>
              <div className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-500">
                Tài khoản
              </div>
              <ul className="space-y-2.5 text-sm">
                <li>
                  <Link href="/login" className="transition hover:text-white">Đăng nhập</Link>
                </li>
                <li>
                  <Link href="/register" className="transition hover:text-white">Đăng ký miễn phí</Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-slate-800 pt-8 sm:flex-row">
            <p className="text-xs">© {new Date().getFullYear()} Python LMS. Nền tảng học tập trực tuyến.</p>
            <p className="text-xs">Được xây dựng với Next.js &amp; Tailwind CSS</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
