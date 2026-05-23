"use client";

import Link from "next/link";
import { useEffect, type ReactNode } from "react";
import RouteFeedbackLink from "@/components/navigation/RouteFeedbackLink";
import { useTeacherShellPageChrome } from "./TeacherShell";
import type { ActionLink, SectionLink, SummaryPill } from "./teacher-shell-shared";
import { teacherToneClasses } from "./teacher-shell-shared";

interface TeacherPageFrameProps {
  title: string;
  subtitle: string;
  summaryPills?: SummaryPill[];
  sectionLinks?: SectionLink[];
  primaryAction?: ActionLink;
  secondaryAction?: ActionLink;
  children: ReactNode;
}

function ActionButton({ action }: { action: ActionLink }) {
  return (
    <RouteFeedbackLink
      href={action.href}
      className={action.variant === "secondary" ? "btn btn-secondary" : "btn btn-primary"}
      pendingClassName="opacity-90"
      spinnerClassName="ml-1"
    >
      <i className={`fa-solid ${action.icon}`}></i>
      {action.label}
    </RouteFeedbackLink>
  );
}

export default function TeacherPageFrame({
  title,
  subtitle,
  summaryPills = [],
  sectionLinks = [],
  primaryAction,
  secondaryAction,
  children,
}: TeacherPageFrameProps) {
  const { setPageChrome } = useTeacherShellPageChrome();

  useEffect(() => {
    setPageChrome({ sectionLinks, primaryAction, secondaryAction });
  }, [primaryAction, secondaryAction, sectionLinks, setPageChrome]);

  return (
    <>
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* Accent stripe */}
        <div className="h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-400" />

        <div className="px-5 py-6 sm:px-7">
          {/* Title row */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                {title}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{subtitle}</p>
            </div>

            {(primaryAction || secondaryAction) && (
              <div className="flex shrink-0 flex-wrap gap-2">
                {primaryAction && <ActionButton action={primaryAction} />}
                {secondaryAction && (
                  <ActionButton action={{ ...secondaryAction, variant: "secondary" }} />
                )}
              </div>
            )}
          </div>

          {/* Summary pills */}
          {summaryPills.length > 0 && (
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {summaryPills.map((pill) => (
                <div
                  key={pill.label}
                  className={`rounded-xl border px-4 py-3 ${teacherToneClasses[pill.tone || "slate"]}`}
                >
                  <div className="text-[11px] font-semibold uppercase tracking-[0.1em] opacity-70">
                    {pill.label}
                  </div>
                  <div className="mt-1 text-xl font-bold text-slate-900">{pill.value}</div>
                </div>
              ))}
            </div>
          )}

          {/* Section links */}
          {sectionLinks.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {sectionLinks.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-full border border-slate-200 bg-slate-50 px-3.5 py-1.5 text-xs font-medium text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <div className="mt-6">{children}</div>
    </>
  );
}
