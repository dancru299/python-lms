"use client";

import Link from "next/link";
import type { ReactNode } from "react";
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
  { key: "home", href: "/", label: "Tổng quan", icon: "fa-chart-pie" },
  { key: "classrooms", href: "/classrooms", label: "Lớp học", icon: "fa-users" },
  { key: "profile", href: "/profile", label: "Hồ sơ", icon: "fa-id-card" },
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
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
                <i className="fa-solid fa-graduation-cap"></i>
              </div>
              <div>
                <div className="text-lg font-bold text-gray-900">Python LMS</div>
                <div className="text-sm text-gray-500">Không gian học tập</div>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-600">
                Xin chào, <span className="font-semibold text-gray-900">{userName}</span>
              </div>
              <LogoutButton />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
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

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-[1.5rem] border border-gray-200 bg-white shadow-sm">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-6 text-white lg:px-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
                <p className="mt-3 text-sm leading-6 text-indigo-50 sm:text-base">{subtitle}</p>
              </div>

              {(primaryAction || secondaryAction) && (
                <div className="flex flex-wrap gap-3">
                  {primaryAction ? <ActionButton action={primaryAction} /> : null}
                  {secondaryAction ? <ActionButton action={{ ...secondaryAction, variant: "secondary" }} /> : null}
                </div>
              )}
            </div>
          </div>

          {(summaryPills.length > 0 || sectionLinks.length > 0) && (
            <div className="space-y-4 px-6 py-4 lg:px-8">
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
                <div className="flex flex-wrap gap-2">
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
