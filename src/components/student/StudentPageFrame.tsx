"use client";

import { useEffect, type ReactNode } from "react";
import RouteFeedbackLink from "@/components/navigation/RouteFeedbackLink";
import { useStudentShellPageChrome } from "./StudentShell";
import type { ActionLink, SectionLink, SummaryPill } from "./student-shell-shared";
import { studentToneClasses } from "./student-shell-shared";

interface StudentPageFrameProps {
  title: string;
  subtitle?: string;
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
    setPageChrome({ sectionLinks, primaryAction, secondaryAction });
  }, [primaryAction, secondaryAction, sectionLinks, setPageChrome]);

  return (
    <>
      {/* Page header — clean, no card */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
            {subtitle && (
              <p className="mt-1 max-w-xl text-sm text-slate-500">{subtitle}</p>
            )}
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

        {/* Pills — small inline chips, not full cards */}
        {summaryPills.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {summaryPills.map((pill) => (
              <div
                key={pill.label}
                className={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${studentToneClasses[pill.tone || "slate"]}`}
              >
                <span className="opacity-60">{pill.label}</span>
                <span className="font-bold">{pill.value}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {children}
    </>
  );
}
