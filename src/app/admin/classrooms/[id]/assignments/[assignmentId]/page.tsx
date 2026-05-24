import { requireTeacher } from "@/lib/session";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import TeacherPageFrame from "@/components/teacher/TeacherPageFrame";
import AssignmentQuestionPreview from "@/components/AssignmentQuestionPreview";
import GradeClassroomSubmissionForm from "./GradeClassroomSubmissionForm";

interface PageProps {
  params: Promise<{ id: string; assignmentId: string }>;
}

export default async function ClassroomAssignmentDetailPage({
  params,
}: PageProps) {
  const [session, { id: classroomId, assignmentId }] = await Promise.all([
    requireTeacher(),
    params,
  ]);

  const assignment = await prisma.classroomAssignment.findUnique({
    where: { id: assignmentId },
    include: {
      classroom: {
        select: {
          id: true,
          name: true,
          teacherId: true,
        },
      },
      lesson: { select: { id: true, title: true } },
      submissions: {
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
          grader: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!assignment || assignment.classroomId !== classroomId) {
    redirect(`/admin/classrooms/${classroomId}`);
  }

  if (
    session.role !== "admin" &&
    assignment.classroom.teacherId !== session.userId
  ) {
    redirect(`/admin/classrooms/${classroomId}`);
  }

  return (
    <>
        <nav className="mb-4 flex items-center gap-2 text-sm text-slate-500">
          <Link href="/admin" className="flex items-center gap-1.5 rounded-lg px-2 py-1 transition hover:bg-slate-100 hover:text-slate-700">
            <i className="fa-solid fa-chart-line text-xs"></i>
            Tổng quan
          </Link>
          <i className="fa-solid fa-chevron-right text-[10px] text-slate-300"></i>
          <Link href="/admin/classrooms" className="flex items-center gap-1.5 rounded-lg px-2 py-1 transition hover:bg-slate-100 hover:text-slate-700">
            Lớp học
          </Link>
          <i className="fa-solid fa-chevron-right text-[10px] text-slate-300"></i>
          <Link href={`/admin/classrooms/${classroomId}`} className="flex items-center gap-1.5 rounded-lg px-2 py-1 transition hover:bg-slate-100 hover:text-slate-700">
            {assignment.classroom.name}
          </Link>
          <i className="fa-solid fa-chevron-right text-[10px] text-slate-300"></i>
          <span className="font-medium text-slate-700 max-w-xs truncate">{assignment.title}</span>
        </nav>

        <TeacherPageFrame
          title={assignment.title}
          subtitle={`${assignment.type === "test" ? "Bài kiểm tra" : "Bài tập về nhà"} · ${assignment.classroom.name} · ${assignment.maxScore} điểm`}
        >
        <div className="space-y-6">
        <div className="card p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-3">Đề bài</h2>
          <div className="assignment-rich text-gray-800">
            <AssignmentQuestionPreview
              docxBase64={assignment.questionDocx}
              html={assignment.questionHtml}
            />
          </div>
          {assignment.answerTemplate && assignment.type === "homework" && (
            <div className="mt-4 p-4 rounded-lg bg-green-50 border border-green-200">
              <h3 className="font-semibold text-green-700 mb-2">
                Đáp án mẫu đã setup
              </h3>
              <pre className="code-block">{assignment.answerTemplate}</pre>
            </div>
          )}
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">
              Bài nộp học sinh ({assignment.submissions.length})
            </h2>
            <span className="text-sm text-gray-500">
              Bài giảng: {assignment.lesson?.title || "N/A"}
            </span>
          </div>

          <div className="space-y-4">
            {assignment.submissions.map((submission) => (
              <div
                key={submission.id}
                id={`submission-${submission.id}`}
                className="rounded-2xl border border-gray-200 p-5"
              >
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="font-semibold text-gray-900">{submission.student.name}</div>
                    <div className="text-sm text-gray-500">
                      {submission.student.email}
                    </div>
                  </div>
                  <div className="text-left sm:text-right">
                    <div
                      className={`badge ${submission.status === "graded" ? "badge-success" : "badge-warning"}`}
                    >
                      {submission.status === "graded" ? "Đã chấm" : "Đã nộp"}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {new Date(submission.createdAt).toLocaleString("vi-VN")}
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="mb-2 text-sm font-medium text-gray-700">
                    Code bài làm
                  </div>
                  <pre className="code-block">{submission.content}</pre>
                </div>

                <GradeClassroomSubmissionForm
                  classroomId={classroomId}
                  assignmentId={assignment.id}
                  submissionId={submission.id}
                  maxScore={assignment.maxScore}
                  defaultScore={submission.score ?? assignment.maxScore}
                  defaultFeedback={submission.feedback || ""}
                  isGraded={submission.status === "graded"}
                  gradedAtLabel={
                    submission.gradedAt
                      ? new Date(submission.gradedAt).toLocaleString("vi-VN")
                      : null
                  }
                />
              </div>
            ))}

            {assignment.submissions.length === 0 && (
              <div className="text-center text-gray-500 py-10 border border-dashed border-gray-300 rounded-lg">
                Chưa có học sinh nào nộp bài.
              </div>
            )}
          </div>
        </div>
        </div>
        </TeacherPageFrame>
    </>
  );
}
