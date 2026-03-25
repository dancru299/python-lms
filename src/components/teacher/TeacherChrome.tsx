"use client";

import type { ReactNode } from "react";
import TeacherPageFrame from "./TeacherPageFrame";
import TeacherShell from "./TeacherShell";
import type { ActionLink, SectionLink, SummaryPill, TeacherNavKey } from "./teacher-shell-shared";

interface TeacherChromeProps {
  active: TeacherNavKey;
  userName: string;
  role: "teacher" | "admin";
  title: string;
  subtitle: string;
  notificationCount?: number;
  summaryPills?: SummaryPill[];
  sectionLinks?: SectionLink[];
  primaryAction?: ActionLink;
  secondaryAction?: ActionLink;
  children: ReactNode;
}

export default function TeacherChrome({
  active,
  userName,
  role,
  title,
  subtitle,
  notificationCount = 0,
  summaryPills = [],
  sectionLinks = [],
  primaryAction,
  secondaryAction,
  children,
}: TeacherChromeProps) {
  return (
    <TeacherShell active={active} userName={userName} role={role} notificationCount={notificationCount}>
      <TeacherPageFrame
        title={title}
        subtitle={subtitle}
        summaryPills={summaryPills}
        sectionLinks={sectionLinks}
        primaryAction={primaryAction}
        secondaryAction={secondaryAction}
      >
        {children}
      </TeacherPageFrame>
    </TeacherShell>
  );
}
