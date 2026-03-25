export type TeacherNavKey =
  | "overview"
  | "grading"
  | "submissions"
  | "lessons"
  | "chapters"
  | "classrooms"
  | "users";
export type PillTone = "indigo" | "emerald" | "amber" | "slate";

export interface SummaryPill {
  label: string;
  value: string | number;
  tone?: PillTone;
}

export interface SectionLink {
  href: string;
  label: string;
}

export interface ActionLink {
  href: string;
  label: string;
  icon: string;
  variant?: "primary" | "secondary";
}

export const teacherToneClasses: Record<PillTone, string> = {
  indigo: "border-indigo-100 bg-indigo-50 text-indigo-700",
  emerald: "border-emerald-100 bg-emerald-50 text-emerald-700",
  amber: "border-amber-100 bg-amber-50 text-amber-700",
  slate: "border-slate-200 bg-slate-50 text-slate-700",
};
