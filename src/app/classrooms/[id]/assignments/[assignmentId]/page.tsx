import { requireAuth } from "@/lib/session";
import prisma from "@/lib/prisma";
import AssignmentQuestionPreview from "@/components/AssignmentQuestionPreview";
import Link from "next/link";
import { redirect } from "next/navigation";
import StudentAssignmentSubmitForm from "./StudentAssignmentSubmitForm";

interface PageProps {
  params: Promise<{ id: string; assignmentId: string }>;
}

export default async function StudentAssignmentPage({ params }: PageProps) {
  const session = await requireAuth();
  const { id: classroomId, assignmentId } = await params;

  if (session.role !== "student") {
    redirect("/");
  }

  const assignment = await prisma.classroomAssignment.findUnique({
    where: { id: assignmentId },
    include: {
      classroom: {
        select: {
          id: true,
          name: true,
        },
      },
      lesson: { select: { title: true } },
    },
  });

  if (!assignment || assignment.classroomId !== classroomId) {
    redirect(`/classrooms/${classroomId}`);
  }

  const membership = await prisma.classroomStudent.findFirst({
    where: {
      classroomId,
      studentId: session.userId,
    },
    select: { id: true },
  });

  if (!membership) {
    redirect("/classrooms");
  }

  const profileUser = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      name: true,
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
  });

  const mySubmission = await prisma.classroomAssignmentSubmission.findUnique({
    where: {
      assignmentId_studentId: {
        assignmentId,
        studentId: session.userId,
      },
    },
  });

  return (
    <div className="min-h-screen bg-gray-200">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center gap-4">
          <Link
            href={`/classrooms/${classroomId}`}
            className="text-gray-600 hover:text-gray-900"
          >
            <i className="fa-solid fa-arrow-left"></i>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {assignment.title}
            </h1>
            <p className="text-sm text-gray-500">
              {assignment.type === "test" ? "Bài kiểm tra" : "Bài tập về nhà"}
              {assignment.type === "test" && assignment.durationMinutes
                ? ` • ${assignment.durationMinutes} phút`
                : ""}
              {` • ${assignment.classroom.name}`}
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-4 py-6 grid lg:grid-cols-2 gap-4">
        <section className="bg-white rounded-lg border border-gray-300 p-5">
          <h2 className="text-3xl font-semibold text-gray-900 mb-4 border-b-2 border-orange-500 pb-2">
            Đề Bài
          </h2>
          <div className="assignment-rich min-h-[70vh] text-gray-800">
            <AssignmentQuestionPreview
              docxBase64={assignment.questionDocx}
              html={assignment.questionHtml}
              protectContent
            />
          </div>
        </section>

        <section className="bg-white rounded-lg border border-gray-300 p-5">
          <h2 className="text-3xl font-semibold text-gray-900 mb-4 border-b-2 border-orange-500 pb-2">
            Nộp Bài (Code Editor)
          </h2>

          <div className="mb-4">
            <label className="block text-2xl font-semibold text-gray-900 mb-2">
              Họ và Tên Sinh Viên:
            </label>
            <input
              className="input text-lg"
              value={profileUser?.name || session.name}
              readOnly
            />
          </div>

          <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200 text-sm text-gray-700">
            <div>
              <strong>Lớp:</strong>{" "}
              {profileUser?.profile?.gradeLevel || "Chưa cập nhật"}
            </div>
            <div>
              <strong>Trường:</strong>{" "}
              {profileUser?.profile?.school || "Chưa cập nhật"}
            </div>
            <div>
              <strong>Số điện thoại:</strong>{" "}
              {profileUser?.profile?.phone || "Không có"}
            </div>
          </div>

          <StudentAssignmentSubmitForm
            assignmentId={assignment.id}
            answerTemplate={assignment.answerTemplate || null}
            existingSubmission={
              mySubmission
                ? {
                    status: mySubmission.status,
                    content: mySubmission.content,
                    score: mySubmission.score,
                    feedback: mySubmission.feedback,
                  }
                : null
            }
          />
        </section>
      </main>
    </div>
  );
}
