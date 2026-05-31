import { requireTeacher } from "@/lib/session";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import TeacherPageFrame from "@/components/teacher/TeacherPageFrame";
import ClassroomDetailClient from "./ClassroomDetailClient";
import ClassroomGatingManager from "./ClassroomGatingManager";
import { getClassroomGatingOverview } from "@/lib/programs/lesson-gating";
import type {
  ClassroomAssignmentItem,
  ClassroomLessonOption,
  ClassroomStudentItem,
} from "./ClassroomDetailClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ClassroomDetailPage({ params }: PageProps) {
  const [session, { id }] = await Promise.all([requireTeacher(), params]);
  const dateFormatter = new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Asia/Saigon",
  });

  const classroom = await prisma.classroom.findUnique({
    where: { id },
    include: {
      teacher: { select: { id: true, name: true, email: true } },
      students: {
        include: {
          student: {
            select: {
              id: true,
              name: true,
              email: true,
              profile: {
                select: {
                  age: true,
                  gender: true,
                  gradeLevel: true,
                  school: true,
                  phone: true,
                },
              },
            },
          },
        },
        orderBy: { joinedAt: "asc" },
      },
      assignments: {
        include: {
          lesson: { select: { id: true, title: true } },
          _count: { select: { submissions: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!classroom) {
    redirect("/admin/classrooms");
  }

  if (session.role !== "admin" && classroom.teacherId !== session.userId) {
    redirect("/admin/classrooms");
  }

  const lessons = await prisma.lesson.findMany({
    where: { isPublished: true },
    select: {
      id: true,
      title: true,
      chapter: { select: { title: true } },
      exercises: {
        where: { type: "homework" },
        select: {
          id: true,
          title: true,
        },
        orderBy: { sortOrder: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const studentItems: ClassroomStudentItem[] = classroom.students.map((item) => ({
    id: item.student.id,
    name: item.student.name,
    email: item.student.email,
    profile: {
      age: item.student.profile?.age ?? null,
      gender: item.student.profile?.gender ?? null,
      gradeLevel: item.student.profile?.gradeLevel ?? null,
      school: item.student.profile?.school ?? null,
      phone: item.student.profile?.phone ?? null,
    },
  }));

  const lessonItems: ClassroomLessonOption[] = lessons.map((lesson) => ({
    id: lesson.id,
    title: lesson.title,
    chapterTitle: lesson.chapter.title,
    exercises: lesson.exercises.map((exercise) => ({
      id: exercise.id,
      title: exercise.title,
    })),
  }));

  const gating = await getClassroomGatingOverview(id);

  const assignmentItems: ClassroomAssignmentItem[] = classroom.assignments.map((assignment) => ({
    id: assignment.id,
    title: assignment.title,
    type: assignment.type,
    durationMinutes: assignment.durationMinutes,
    maxScore: assignment.maxScore,
    createdAt: assignment.createdAt.toISOString(),
    createdAtLabel: dateFormatter.format(assignment.createdAt),
    lesson: assignment.lesson,
    submissionsCount: assignment._count.submissions,
  }));

  return (
    <>
        <nav className="mb-4 flex items-center gap-2 text-sm text-slate-500">
          <Link
            href="/admin"
            className="flex items-center gap-1.5 rounded-lg px-2 py-1 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <i className="fa-solid fa-chart-line text-xs"></i>
            Tổng quan
          </Link>
          <i className="fa-solid fa-chevron-right text-[10px] text-slate-300"></i>
          <Link
            href="/admin/classrooms"
            className="flex items-center gap-1.5 rounded-lg px-2 py-1 transition hover:bg-slate-100 hover:text-slate-700"
          >
            Lớp học
          </Link>
          <i className="fa-solid fa-chevron-right text-[10px] text-slate-300"></i>
          <span className="font-medium text-slate-700">{classroom.name}</span>
        </nav>

        <TeacherPageFrame
          title={classroom.name}
          subtitle={`Mã lớp: ${classroom.code} · Giáo viên: ${classroom.teacher.name} · ${classroom.students.length} học sinh`}
          primaryAction={{ href: `/admin/classrooms/${classroom.id}/edit`, label: "Sửa lớp", icon: "fa-pen" }}
        >
          <ClassroomDetailClient
            classroomId={classroom.id}
            students={studentItems}
            lessons={lessonItems}
            initialAssignments={assignmentItems}
          />
          <ClassroomGatingManager hasProgram={gating.hasProgram} students={gating.students} />
        </TeacherPageFrame>
    </>
  );
}
