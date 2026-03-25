"use client";

import Link from "next/link";
import { useEffect, type ReactNode } from "react";
import RouteFeedbackLink from "@/components/navigation/RouteFeedbackLink";
import { useStudentShellPageChrome } from "./StudentShell";
import type { ActionLink, SectionLink, SummaryPill } from "./student-shell-shared";
import { studentToneClasses } from "./student-shell-shared";

interface StudentPageFrameProps {
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

export default function StudentPageFrame({
  title,
  subtitle,
  summaryPills = [],
  sectionLinks = [],
  primaryAction,
  secondaryAction,
  children,
}: StudentPageFrameProps) {
  const { setPageChrome } = useStudentShellPageChrome();

  useEffect(() => {
    setPageChrome({
      sectionLinks,
      primaryAction,
      secondaryAction,
    });
  }, [primaryAction, secondaryAction, sectionLinks, setPageChrome]);

  return (
    <>
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
                  <div key={pill.label} className={`rounded-2xl border px-4 py-3 ${studentToneClasses[pill.tone || "slate"]}`}>
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
    </>
  );
}
