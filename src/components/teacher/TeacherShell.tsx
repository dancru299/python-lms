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
import { Toaster } from "react-hot-toast";
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

const defaultPageChrome: TeacherShellPageChrome = { sectionLinks: [] };

const TeacherShellPageChromeContext = createContext<TeacherShellPageChromeContextValue | null>(null);

function resolveActiveTeacherNav(pathname: string): TeacherNavKey {
  if (pathname.startsWith("/admin/grading")) return "grading";
  if (pathname.startsWith("/admin/submissions")) return "submissions";
  if (pathname.startsWith("/admin/programs")) return "programs";
  if (pathname.startsWith("/admin/lessons")) return "lessons";
  if (pathname.startsWith("/admin/chapters")) return "chapters";
  if (pathname.startsWith("/admin/classrooms")) return "classrooms";
  if (pathname.startsWith("/admin/users")) return "users";
  if (pathname.startsWith("/admin/settings")) return "settings";
  return "overview";
}

export function useTeacherShellPageChrome() {
  const context = useContext(TeacherShellPageChromeContext);
  if (!context) throw new Error("useTeacherShellPageChrome must be used inside TeacherShell");
  return context;
}

function Sidebar({
  userName,
  role,
  notificationCount,
  resolvedActive,
  onNavClick,
  onCountChange,
}: {
  userName: string;
  role: "teacher" | "admin";
  notificationCount: number;
  resolvedActive: TeacherNavKey;
  onNavClick?: () => void;
  onCountChange?: (count: number) => void;
}) {
  const navItems: Array<{
    key: TeacherNavKey;
    href: string;
    label: string;
    icon: string;
  }> = [
    { key: "overview", href: "/admin", label: "Tổng quan", icon: "fa-chart-line" },
    { key: "grading", href: "/admin/grading", label: "Chấm bài", icon: "fa-pen-ruler" },
    { key: "submissions", href: "/admin/submissions", label: "Bài tập", icon: "fa-file-signature" },
    { key: "programs", href: "/admin/programs", label: "Chương trình", icon: "fa-route" },
    { key: "lessons", href: "/admin/lessons", label: "Bài giảng", icon: "fa-book-open" },
    { key: "chapters", href: "/admin/chapters", label: "Chương học", icon: "fa-layer-group" },
    { key: "classrooms", href: "/admin/classrooms", label: "Lớp học", icon: "fa-users-rectangle" },
    ...(role === "admin"
      ? [
          { key: "users" as TeacherNavKey, href: "/admin/users", label: "Người dùng", icon: "fa-user-gear" },
          { key: "settings" as TeacherNavKey, href: "/admin/settings", label: "Cài đặt", icon: "fa-sliders" },
        ]
      : []),
  ];

  return (
    <div className="flex h-full flex-col bg-slate-900">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-slate-700/60 px-5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-500">
          <i className="fa-solid fa-chalkboard-user text-[11px] text-white"></i>
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-sm font-bold leading-tight text-white">Python LMS</span>
            <span className="shrink-0 rounded-full bg-indigo-500/25 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-indigo-300">
              {role === "admin" ? "Admin" : "GV"}
            </span>
          </div>
          <div className="text-[11px] text-slate-400">Không gian giảng dạy</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
          Menu
        </div>
        <div className="space-y-0.5">
          {navItems.map((item) => (
            <RouteFeedbackLink
              key={item.key}
              href={item.href}
              onClick={onNavClick}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                resolvedActive === item.key
                  ? "bg-indigo-600 text-white"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}
              pendingClassName="opacity-75"
              spinnerClassName="ml-auto"
              prefetch={
                ["overview", "grading", "programs", "lessons", "classrooms"].includes(item.key)
                  ? "viewport"
                  : "intent"
              }
            >
              <i className={`fa-solid ${item.icon} w-4 shrink-0 text-center text-[13px]`}></i>
              <span className="flex-1">{item.label}</span>
              {item.key === "grading" && notificationCount > 0 && (
                <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 text-[10px] font-bold text-white">
                  {notificationCount > 99 ? "99+" : notificationCount}
                </span>
              )}
            </RouteFeedbackLink>
          ))}
        </div>
      </nav>

      {/* Notifications + User + Logout */}
      <div className="border-t border-slate-700/60 px-3 py-3 space-y-0.5">
        <NotificationBell
          initialCount={notificationCount}
          theme="dark"
          onCountChange={onCountChange}
        />
        <div className="mt-2 flex items-center gap-2.5 rounded-lg px-2 py-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-500/20">
            <i className="fa-solid fa-user text-[10px] text-indigo-300"></i>
          </div>
          <span className="truncate text-sm text-slate-300">{userName}</span>
        </div>
        <LogoutButton className="btn btn-ghost-dark w-full justify-start text-sm" />
      </div>
    </div>
  );
}

export default function TeacherShell({
  userName,
  role,
  notificationCount: initialNotificationCount = 0,
  active,
  children,
}: TeacherShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pageChrome, setPageChrome] = useState<TeacherShellPageChrome>(defaultPageChrome);
  const [notificationCount, setNotificationCount] = useState(initialNotificationCount);
  const resolvedActive = active ?? resolveActiveTeacherNav(pathname);

  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [mobileOpen]);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  useEffect(() => {
    let isMounted = true;
    let controller: AbortController | null = null;

    async function loadNotificationCount() {
      if (document.visibilityState !== "visible") return;
      controller?.abort();
      controller = new AbortController();

      try {
        const response = await fetch("/api/notifications?summaryOnly=1", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) return;
        const data = await response.json();
        if (isMounted && typeof data.unreadCount === "number") {
          setNotificationCount(data.unreadCount);
        }
      } catch {
        // Keep the shell usable even when notifications cannot be refreshed.
      }
    }

    setNotificationCount(initialNotificationCount);
    const intervalId = window.setInterval(loadNotificationCount, 60_000);
    document.addEventListener("visibilitychange", loadNotificationCount);

    return () => {
      isMounted = false;
      controller?.abort();
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", loadNotificationCount);
    };
  }, [initialNotificationCount]);

  const contextValue = useMemo(() => ({ setPageChrome }), []);

  return (
    <TeacherShellPageChromeContext.Provider value={contextValue}>
      <div className="flex min-h-screen bg-slate-50">

        {/* Desktop sidebar */}
        <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 lg:block">
          <Sidebar
            userName={userName}
            role={role}
            notificationCount={notificationCount}
            resolvedActive={resolvedActive}
            onCountChange={setNotificationCount}
          />
        </aside>

        {/* Mobile overlay */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="absolute inset-0 bg-slate-950/50"
              aria-label="Đóng menu"
            />
            <aside className="absolute inset-y-0 left-0 w-60 shadow-2xl">
              <Sidebar
                userName={userName}
                role={role}
                notificationCount={notificationCount}
                resolvedActive={resolvedActive}
                onNavClick={() => setMobileOpen(false)}
                onCountChange={setNotificationCount}
              />
            </aside>
          </div>
        )}

        {/* Main area */}
        <div className="flex min-w-0 flex-1 flex-col lg:pl-60">
          {/* Mobile top bar */}
          <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 lg:hidden">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50"
              aria-label="Mở menu"
            >
              <i className="fa-solid fa-bars text-sm"></i>
              {notificationCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[9px] font-bold text-white">
                  {notificationCount > 9 ? "9+" : notificationCount}
                </span>
              )}
            </button>
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500">
                <i className="fa-solid fa-chalkboard-user text-[10px] text-white"></i>
              </div>
              <span className="text-sm font-bold text-slate-900">Python LMS</span>
            </div>
            <div className="w-9" />
          </header>

          <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
        </div>
      </div>
      <Toaster position="top-right" />
    </TeacherShellPageChromeContext.Provider>
  );
}
