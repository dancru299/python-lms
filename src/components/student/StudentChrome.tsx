"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import LogoutButton from "@/components/LogoutButton";

type StudentNavKey = "home" | "classrooms" | "profile";
type PillTone = "indigo" | "emerald" | "amber" | "slate";

interface SummaryPill {
  label: string;
  value: string | number;
  tone?: PillTone;
}

interface SectionLink {
  href: string;
  label: string;
}

interface ActionLink {
  href: string;
  label: string;
  icon: string;
  variant?: "primary" | "secondary";
}

interface StudentChromeProps {
  active: StudentNavKey;
  userName: string;
  title: string;
  subtitle: string;
  summaryPills?: SummaryPill[];
  sectionLinks?: SectionLink[];
  primaryAction?: ActionLink;
  secondaryAction?: ActionLink;
  children: ReactNode;
}

const navItems: Array<{ key: StudentNavKey; href: string; label: string; icon: string }> = [
  { key: "home", href: "/", label: "T\u1ed5ng quan", icon: "fa-chart-pie" },
  { key: "classrooms", href: "/classrooms", label: "L\u1edbp h\u1ecdc", icon: "fa-users" },
  { key: "profile", href: "/profile", label: "H\u1ed3 s\u01a1", icon: "fa-id-card" },
];

const toneClasses: Record<PillTone, string> = {
  indigo: "border-indigo-100 bg-indigo-50 text-indigo-700",
  emerald: "border-emerald-100 bg-emerald-50 text-emerald-700",
  amber: "border-amber-100 bg-amber-50 text-amber-700",
  slate: "border-slate-200 bg-slate-50 text-slate-700",
};

function ActionButton({ action }: { action: ActionLink }) {
  return (
    <Link href={action.href} className={action.variant === "secondary" ? "btn btn-secondary" : "btn btn-primary"}>
      <i className={`fa-solid ${action.icon}`}></i>
      {action.label}
    </Link>
  );
}

function DrawerActionButton({
  action,
  onClick,
}: {
  action: ActionLink;
  onClick: () => void;
}) {
  return (
    <Link
      href={action.href}
      onClick={onClick}
      className={action.variant === "secondary" ? "btn btn-secondary justify-center" : "btn btn-primary justify-center"}
    >
      <i className={`fa-solid ${action.icon}`}></i>
      {action.label}
    </Link>
  );
}

export default function StudentChrome({
  active,
  userName,
  title,
  subtitle,
  summaryPills = [],
  sectionLinks = [],
  primaryAction,
  secondaryAction,
  children,
}: StudentChromeProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
                <i className="fa-solid fa-graduation-cap"></i>
              </div>
              <div>
                <div className="text-lg font-bold text-gray-900">Python LMS</div>
                <div className="text-sm text-gray-500">Kh\u00f4ng gian h\u1ecdc t\u1eadp</div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-gray-200 bg-white text-gray-700 shadow-sm transition hover:border-indigo-200 hover:text-indigo-600 lg:hidden"
              aria-label="M\u1edf menu"
              aria-expanded={mobileMenuOpen}
            >
              <i className="fa-solid fa-bars text-base"></i>
            </button>

            <div className="hidden lg:flex lg:flex-col lg:gap-3 xl:flex-row xl:items-center">
              <div className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-600">
                Xin chào, <span className="font-semibold text-gray-900">{userName}</span>
              </div>
              <LogoutButton />
            </div>
          </div>

          <div className="mt-4 hidden flex-wrap gap-2 lg:flex">
            {navItems.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
                  active === item.key
                    ? "bg-indigo-600 text-white"
                    : "border border-gray-200 bg-white text-gray-600 hover:border-indigo-200 hover:text-indigo-600"
                }`}
              >
                <i className={`fa-solid ${item.icon} text-xs`}></i>
                {item.label}
              </Link>
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
          aria-label="\u0110\u00f3ng menu"
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
                  <i className="fa-solid fa-graduation-cap"></i>
                </div>
                <div>
                  <div className="text-lg font-bold text-slate-900">Python LMS</div>
                  <div className="text-sm text-slate-500">Menu h\u1ecdc t\u1eadp</div>
                </div>
              </div>

              <button
                type="button"
                onClick={closeMobileMenu}
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 transition hover:border-indigo-200 hover:text-indigo-600"
                aria-label="\u0110\u00f3ng menu"
              >
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>

            <div className="mt-4 rounded-2xl border border-white/70 bg-white/80 px-4 py-3 text-sm text-slate-600 shadow-sm backdrop-blur">
              Xin chào, <span className="font-semibold text-slate-900">{userName}</span>
            </div>

            <div className="mt-3">
              <LogoutButton />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-5">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">\u0110i\u1ec1u h\u01b0\u1edbng</div>
              <div className="mt-3 space-y-2">
                {navItems.map((item) => (
                  <Link
                    key={item.key}
                    href={item.href}
                    onClick={closeMobileMenu}
                    className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-sm font-medium transition ${
                      active === item.key
                        ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                        : "border-slate-200 bg-white text-slate-700 hover:border-indigo-200 hover:text-indigo-600"
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <i className={`fa-solid ${item.icon} text-sm`}></i>
                      {item.label}
                    </span>
                    <i className="fa-solid fa-chevron-right text-xs text-slate-300"></i>
                  </Link>
                ))}
              </div>
            </div>

            {sectionLinks.length > 0 ? (
              <div className="mt-6">
                <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Trong trang</div>
                <div className="mt-3 space-y-2">
                  {sectionLinks.map((item) => (
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

            {(primaryAction || secondaryAction) ? (
              <div className="mt-6">
                <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Thao t\u00e1c nhanh</div>
                <div className="mt-3 grid gap-3">
                  {primaryAction ? <DrawerActionButton action={primaryAction} onClick={closeMobileMenu} /> : null}
                  {secondaryAction ? (
                    <DrawerActionButton
                      action={{ ...secondaryAction, variant: "secondary" }}
                      onClick={closeMobileMenu}
                    />
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        </aside>
      </div>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <section className="overflow-hidden rounded-[1.5rem] border border-gray-200 bg-white shadow-sm">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-6 text-white sm:px-6 lg:px-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
                <p className="mt-3 text-sm leading-6 text-indigo-50 sm:text-base">{subtitle}</p>
              </div>

              {(primaryAction || secondaryAction) && (
                <div className="hidden flex-wrap gap-3 sm:flex">
                  {primaryAction ? <ActionButton action={primaryAction} /> : null}
                  {secondaryAction ? <ActionButton action={{ ...secondaryAction, variant: "secondary" }} /> : null}
                </div>
              )}
            </div>
          </div>

          {(summaryPills.length > 0 || sectionLinks.length > 0) && (
            <div className="space-y-4 px-5 py-4 sm:px-6 lg:px-8">
              {summaryPills.length > 0 ? (
                <div className="grid gap-3 md:grid-cols-3">
                  {summaryPills.map((pill) => (
                    <div key={pill.label} className={`rounded-2xl border px-4 py-3 ${toneClasses[pill.tone || "slate"]}`}>
                      <div className="text-xs font-medium uppercase tracking-[0.12em]">{pill.label}</div>
                      <div className="mt-1 text-xl font-semibold text-gray-900">{pill.value}</div>
                    </div>
                  ))}
                </div>
              ) : null}

              {sectionLinks.length > 0 ? (
                <div className="hidden flex-wrap gap-2 sm:flex">
                  {sectionLinks.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 transition hover:border-indigo-200 hover:text-indigo-600"
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
          )}
        </section>

        <div className="mt-8">{children}</div>
      </main>
    </div>
  );
}
