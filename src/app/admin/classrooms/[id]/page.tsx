import { requireTeacher } from "@/lib/session";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import ClassroomDetailClient from "./ClassroomDetailClient";
import type {
  ClassroomAssignmentItem,
  ClassroomLessonOption,
  ClassroomStudentItem,
} from "./ClassroomDetailClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ClassroomDetailPage({ params }: PageProps) {
  const session = await requireTeacher();
  const { id } = await params;
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
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin/classrooms" className="text-gray-600 hover:text-gray-900">
              <i className="fa-solid fa-arrow-left"></i>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{classroom.name}</h1>
              <p className="text-sm text-gray-500">
                Mã lớp: <span className="font-mono">{classroom.code}</span> • Giáo viên: {classroom.teacher.name}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href={`/admin/classrooms/${classroom.id}/edit`} className="btn btn-secondary">
              <i className="fa-solid fa-pen"></i> Sửa lớp
            </Link>
            <span className="badge badge-primary">{session.role === "admin" ? "Admin" : "Giáo viên"}</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ClassroomDetailClient
          classroomId={classroom.id}
          students={studentItems}
          lessons={lessonItems}
          initialAssignments={assignmentItems}
        />
      </main>
    </div>
  );
}
