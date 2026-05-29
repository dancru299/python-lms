"use client";

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
import NotificationBell from "@/components/notifications/NotificationBell";
import type { ActionLink, SectionLink, StudentNavKey } from "./student-shell-shared";

const navItems: Array<{ key: StudentNavKey; href: string; label: string; icon: string }> = [
  { key: "home", href: "/dashboard", label: "Tổng quan", icon: "fa-house" },
  { key: "classrooms", href: "/classrooms", label: "Lớp học", icon: "fa-users" },
  { key: "library", href: "/library", label: "Thư viện", icon: "fa-book-open" },
  { key: "profile", href: "/profile", label: "Hồ sơ", icon: "fa-id-card" },
];

interface StudentShellProps {
  userName: string;
  notificationCount?: number;
  active?: StudentNavKey;
  children: ReactNode;
}

interface StudentShellPageChrome {
  sectionLinks: SectionLink[];
  primaryAction?: ActionLink;
  secondaryAction?: ActionLink;
}

interface StudentShellPageChromeContextValue {
  setPageChrome: Dispatch<SetStateAction<StudentShellPageChrome>>;
}

const defaultPageChrome: StudentShellPageChrome = { sectionLinks: [] };

const StudentShellPageChromeContext = createContext<StudentShellPageChromeContextValue | null>(null);

function resolveActiveStudentNav(pathname: string): StudentNavKey {
  if (pathname.startsWith("/classrooms")) return "classrooms";
  if (pathname.startsWith("/profile")) return "profile";
  if (pathname.startsWith("/library")) return "library";
  return "home";
}

export function useStudentShellPageChrome() {
  const context = useContext(StudentShellPageChromeContext);
  if (!context) throw new Error("useStudentShellPageChrome must be used inside StudentShell");
  return context;
}

function Sidebar({
  userName,
  notificationCount,
  resolvedActive,
  onNavClick,
}: {
  userName: string;
  notificationCount: number;
  resolvedActive: StudentNavKey;
  onNavClick?: () => void;
}) {
  return (
    <div className="flex h-full flex-col border-r border-slate-100 bg-white">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-slate-100 px-5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 shadow-sm">
          <i className="fa-solid fa-graduation-cap text-[11px] text-white"></i>
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-bold text-slate-900">Python LMS</div>
          <div className="text-[11px] text-slate-400">Không gian học tập</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          Menu
        </div>
        <div className="mt-1 space-y-0.5">
          {navItems.map((item) => {
            const isActive = resolvedActive === item.key;
            return (
              <RouteFeedbackLink
                key={item.key}
                href={item.href}
                onClick={onNavClick}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                }`}
                pendingClassName="opacity-75"
                spinnerClassName="ml-auto"
              >
                <i
                  className={`fa-solid ${item.icon} w-4 shrink-0 text-center text-[13px] ${
                    isActive ? "text-indigo-500" : "text-slate-400"
                  }`}
                ></i>
                <span className="flex-1">{item.label}</span>
                {isActive && (
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-500"></span>
                )}
              </RouteFeedbackLink>
            );
          })}
        </div>
      </nav>

      {/* Notifications + User + Logout */}
      <div className="border-t border-slate-100 px-3 py-3 space-y-0.5">
        <NotificationBell initialCount={notificationCount} theme="light" />
        <div className="mt-1 flex items-center gap-2.5 rounded-xl px-2 py-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100">
            <i className="fa-solid fa-user text-[10px] text-indigo-500"></i>
          </div>
          <span className="truncate text-sm font-medium text-slate-700">{userName}</span>
        </div>
        <LogoutButton className="btn btn-secondary w-full justify-start text-sm text-slate-500" />
      </div>
    </div>
  );
}

export default function StudentShell({ userName, notificationCount = 0, active, children }: StudentShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pageChrome, setPageChrome] = useState<StudentShellPageChrome>(defaultPageChrome);
  const resolvedActive = active ?? resolveActiveStudentNav(pathname);

  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [mobileOpen]);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const contextValue = useMemo(() => ({ setPageChrome }), []);

  return (
    <StudentShellPageChromeContext.Provider value={contextValue}>
      <div className="flex min-h-screen bg-slate-50">

        {/* Desktop sidebar */}
        <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 lg:block">
          <Sidebar userName={userName} notificationCount={notificationCount} resolvedActive={resolvedActive} />
        </aside>

        {/* Mobile overlay */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm"
              aria-label="Đóng menu"
            />
            <aside className="absolute inset-y-0 left-0 w-60 shadow-xl">
              <Sidebar
                userName={userName}
                notificationCount={notificationCount}
                resolvedActive={resolvedActive}
                onNavClick={() => setMobileOpen(false)}
              />
            </aside>
          </div>
        )}

        {/* Main area */}
        <div className="flex min-w-0 flex-1 flex-col lg:pl-60">
          {/* Mobile top bar */}
          <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-100 bg-white px-4 lg:hidden">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50"
              aria-label="Mở menu"
            >
              <i className="fa-solid fa-bars text-sm"></i>
            </button>
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500">
                <i className="fa-solid fa-graduation-cap text-[10px] text-white"></i>
              </div>
              <span className="text-sm font-bold text-slate-900">Python LMS</span>
            </div>
            <div className="w-9" />
          </header>

          <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
        </div>
      </div>
    </StudentShellPageChromeContext.Provider>
  );
}
