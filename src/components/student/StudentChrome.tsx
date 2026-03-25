"use client";

import type { ReactNode } from "react";
import StudentPageFrame from "./StudentPageFrame";
import StudentShell from "./StudentShell";
import type { ActionLink, SectionLink, StudentNavKey, SummaryPill } from "./student-shell-shared";

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
    <StudentShell active={active} userName={userName}>
      <StudentPageFrame
        title={title}
        subtitle={subtitle}
        summaryPills={summaryPills}
        sectionLinks={sectionLinks}
        primaryAction={primaryAction}
        secondaryAction={secondaryAction}
      >
        {children}
      </StudentPageFrame>
    </StudentShell>
  );
}
