"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import RouteFeedbackLink from "@/components/navigation/RouteFeedbackLink";
import LogoutButton from "@/components/LogoutButton";
import type { ActionLink, SectionLink, TeacherNavKey } from "./teacher-shell-shared";

interface TeacherShellProps {
  userName: string;
  role: "teacher" | "admin";
  notificationCount?: number;
  active?: TeacherNavKey;
  children: ReactNode;
}

interface TeacherShellPageChrome {
  sectionLinks: SectionLink[];
  primaryAction?: ActionLink;
  secondaryAction?: ActionLink;
}

interface TeacherShellPageChromeContextValue {
  setPageChrome: Dispatch<SetStateAction<TeacherShellPageChrome>>;
}

const defaultPageChrome: TeacherShellPageChrome = {
  sectionLinks: [],
};

const TeacherShellPageChromeContext = createContext<TeacherShellPageChromeContextValue | null>(null);

function resolveActiveTeacherNav(pathname: string): TeacherNavKey {
  if (pathname.startsWith("/admin/grading")) {
    return "grading";
  }

  if (pathname.startsWith("/admin/submissions")) {
    return "submissions";
  }

  if (pathname.startsWith("/admin/lessons")) {
    return "lessons";
  }

  if (pathname.startsWith("/admin/chapters")) {
    return "chapters";
  }

  if (pathname.startsWith("/admin/classrooms")) {
    return "classrooms";
  }

  if (pathname.startsWith("/admin/users")) {
    return "users";
  }

  return "overview";
}

function DrawerActionButton({
  action,
  onClick,
}: {
  action: ActionLink;
  onClick: () => void;
}) {
  return (
    <RouteFeedbackLink
      href={action.href}
      onClick={onClick}
      className={action.variant === "secondary" ? "btn btn-secondary justify-center" : "btn btn-primary justify-center"}
      pendingClassName="opacity-90"
      spinnerClassName="ml-1"
    >
      <i className={`fa-solid ${action.icon}`}></i>
      {action.label}
    </RouteFeedbackLink>
  );
}

export function useTeacherShellPageChrome() {
  const context = useContext(TeacherShellPageChromeContext);

  if (!context) {
    throw new Error("useTeacherShellPageChrome must be used inside TeacherShell");
  }

  return context;
}

export default function TeacherShell({
  userName,
  role,
  notificationCount = 0,
  active,
  children,
}: TeacherShellProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [pageChrome, setPageChrome] = useState<TeacherShellPageChrome>(defaultPageChrome);
  const resolvedActive = active ?? resolveActiveTeacherNav(pathname);

  useEffect(() => {
    if (!mobileMenuOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileMenuOpen]);

  const navItems: Array<{ key: TeacherNavKey; href: string; label: string; icon: string }> = [
    { key: "overview", href: "/admin", label: "Tổng quan", icon: "fa-chart-line" },
    { key: "grading", href: "/admin/grading", label: "Chấm bài", icon: "fa-pen-ruler" },
    { key: "submissions", href: "/admin/submissions", label: "Bài tập", icon: "fa-file-signature" },
    { key: "lessons", href: "/admin/lessons", label: "Bài giảng", icon: "fa-book-open" },
    { key: "chapters", href: "/admin/chapters", label: "Chương học", icon: "fa-layer-group" },
    { key: "classrooms", href: "/admin/classrooms", label: "Lớp học", icon: "fa-users-rectangle" },
    ...(role === "admin"
      ? [{ key: "users" as TeacherNavKey, href: "/admin/users", label: "Người dùng", icon: "fa-user-gear" }]
      : []),
  ];

  const closeMobileMenu = () => setMobileMenuOpen(false);

  const contextValue = useMemo(
    () => ({
      setPageChrome,
    }),
    []
  );

  return (
    <TeacherShellPageChromeContext.Provider value={contextValue}>
      <div className="min-h-screen bg-gray-50">
        <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur">
          <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
                  <i className="fa-solid fa-chalkboard-user"></i>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-gray-900">Python LMS</span>
                    <span className="badge badge-primary">{role === "admin" ? "Quản trị" : "Giáo viên"}</span>
                  </div>
                  <div className="text-sm text-gray-500">Không gian giảng dạy</div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-gray-200 bg-white text-gray-700 shadow-sm transition hover:border-indigo-200 hover:text-indigo-600 lg:hidden"
                aria-label="Mở menu"
                aria-expanded={mobileMenuOpen}
              >
                <i className="fa-solid fa-bars text-base"></i>
              </button>

              <div className="hidden lg:flex lg:flex-col lg:gap-3 xl:flex-row xl:items-center">
                <div className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-600">
                  <i className="fa-solid fa-bell mr-2 text-gray-400"></i>
                  {notificationCount > 0 ? `${notificationCount} thông báo mới` : "Không có thông báo mới"}
                  <span className="mx-3 text-gray-300">|</span>
                  Xin chào, <span className="font-semibold text-gray-900">{userName}</span>
                </div>
                <LogoutButton />
              </div>
            </div>

            <div className="mt-4 hidden flex-wrap gap-2 lg:flex">
              {navItems.map((item) => (
                <RouteFeedbackLink
                  key={item.key}
                  href={item.href}
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
                    resolvedActive === item.key
                      ? "bg-indigo-600 text-white"
                      : "border border-gray-200 bg-white text-gray-600 hover:border-indigo-200 hover:text-indigo-600"
                  }`}
                  pendingClassName="scale-[0.98] opacity-95"
                  spinnerClassName="ml-1"
                >
                  <i className={`fa-solid ${item.icon} text-xs`}></i>
                  {item.label}
                </RouteFeedbackLink>
              ))}
            </div>
          </div>
        </header>

        <div
          className={`fixed inset-0 z-[70] lg:hidden ${mobileMenuOpen ? "pointer-events-auto" : "pointer-events-none"}`}
          aria-hidden={!mobileMenuOpen}
        >
          <button
            type="button"
            onClick={closeMobileMenu}
            className={`absolute inset-0 bg-slate-950/35 transition-opacity duration-300 ${
              mobileMenuOpen ? "opacity-100" : "opacity-0"
            }`}
            aria-label="Đóng menu"
          />

          <aside
            className={`absolute inset-y-0 right-0 flex w-full max-w-sm flex-col bg-white shadow-2xl transition-transform duration-300 ${
              mobileMenuOpen ? "translate-x-0" : "translate-x-full"
            }`}
          >
            <div className="border-b border-slate-200 bg-[linear-gradient(135deg,_rgba(79,70,229,0.12),_rgba(255,255,255,0.96)_62%)] px-5 py-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600">
                    <i className="fa-solid fa-chalkboard-user"></i>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-slate-900">Python LMS</span>
                      <span className="badge badge-primary">{role === "admin" ? "Quản trị" : "Giáo viên"}</span>
                    </div>
                    <div className="text-sm text-slate-500">Menu giảng dạy</div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={closeMobileMenu}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 transition hover:border-indigo-200 hover:text-indigo-600"
                  aria-label="Đóng menu"
                >
                  <i className="fa-solid fa-xmark text-lg"></i>
                </button>
              </div>

              <div className="mt-4 rounded-2xl border border-white/70 bg-white/80 px-4 py-3 text-sm text-slate-600 shadow-sm backdrop-blur">
                <div className="flex items-center gap-2">
                  <i className="fa-solid fa-bell text-slate-400"></i>
                  <span>
                    {notificationCount > 0 ? `${notificationCount} thông báo mới` : "Không có thông báo mới"}
                  </span>
                </div>
                <div className="mt-2">
                  Xin chào, <span className="font-semibold text-slate-900">{userName}</span>
                </div>
              </div>

              <div className="mt-3">
                <LogoutButton />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Điều hướng</div>
                <div className="mt-3 space-y-2">
                  {navItems.map((item) => (
                    <RouteFeedbackLink
                      key={item.key}
                      href={item.href}
                      onClick={closeMobileMenu}
                      className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-sm font-medium transition ${
                        resolvedActive === item.key
                          ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                          : "border-slate-200 bg-white text-slate-700 hover:border-indigo-200 hover:text-indigo-600"
                      }`}
                      pendingClassName="opacity-90"
                      spinnerClassName="ml-2"
                    >
                      <span className="flex items-center gap-3">
                        <i className={`fa-solid ${item.icon} text-sm`}></i>
                        {item.label}
                      </span>
                      <i className="fa-solid fa-chevron-right text-xs text-slate-300"></i>
                    </RouteFeedbackLink>
                  ))}
                </div>
              </div>

              {pageChrome.sectionLinks.length > 0 ? (
                <div className="mt-6">
                  <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Trong trang</div>
                  <div className="mt-3 space-y-2">
                    {pageChrome.sectionLinks.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={closeMobileMenu}
                        className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-indigo-200 hover:text-indigo-600"
                      >
                        <span>{item.label}</span>
                        <i className="fa-solid fa-arrow-up-right-from-square text-xs text-slate-300"></i>
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null}

              {(pageChrome.primaryAction || pageChrome.secondaryAction) ? (
                <div className="mt-6">
                  <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Thao tác nhanh</div>
                  <div className="mt-3 grid gap-3">
                    {pageChrome.primaryAction ? (
                      <DrawerActionButton action={pageChrome.primaryAction} onClick={closeMobileMenu} />
                    ) : null}
                    {pageChrome.secondaryAction ? (
                      <DrawerActionButton
                        action={{ ...pageChrome.secondaryAction, variant: "secondary" }}
                        onClick={closeMobileMenu}
                      />
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          </aside>
        </div>

        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">{children}</main>
      </div>
    </TeacherShellPageChromeContext.Provider>
  );
}
