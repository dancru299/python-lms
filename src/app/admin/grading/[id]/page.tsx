import { notFound, redirect } from "next/navigation";
import { requireTeacher } from "@/lib/session";
import prisma from "@/lib/prisma";
import Link from "next/link";
import GradingForm from "./GradingForm";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function GradingDetailPage({ params }: PageProps) {
  const { id } = await params;
  const session = await requireTeacher();

  // Fetch submission
  const submission = await prisma.submission.findUnique({
    where: { id },
    include: {
      exercise: {
        include: {
          lesson: { include: { chapter: true } },
        },
      },
      user: { select: { id: true, name: true, email: true } },
    },
  });

  if (!submission) {
    notFound();
  }

  // If already graded, redirect to grading list
  if (submission.status === "graded") {
    redirect("/admin/grading");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 h-16">
            <Link href="/admin/grading" className="text-gray-600 hover:text-gray-900">
              <i className="fa-solid fa-arrow-left"></i>
            </Link>
            <div className="flex-1">
              <div className="text-sm text-gray-500">Chấm bài</div>
              <h1 className="font-bold text-gray-900 truncate">{submission.exercise.title}</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Student Info */}
        <div className="card p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
              <i className="fa-solid fa-user text-xl text-indigo-600"></i>
            </div>
            <div>
              <div className="font-bold text-gray-900">{submission.user.name}</div>
              <div className="text-sm text-gray-500">{submission.user.email}</div>
            </div>
            <div className="ml-auto text-right">
              <div className="text-sm text-gray-500">Nộp lúc</div>
              <div className="font-medium text-gray-900">
                {new Date(submission.createdAt).toLocaleString("vi-VN")}
              </div>
            </div>
          </div>
        </div>

        {/* Exercise Info */}
        <div className="card p-6 mb-6">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <span>{submission.exercise.lesson.chapter.title}</span>
            <i className="fa-solid fa-chevron-right text-xs"></i>
            <span>{submission.exercise.lesson.title}</span>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">{submission.exercise.title}</h2>

          {submission.exercise.question && (
            <div
              className="prose prose-sm max-w-none mb-4 p-4 bg-gray-50 rounded-lg"
              dangerouslySetInnerHTML={{ __html: submission.exercise.question }}
            />
          )}

          <div className="flex items-center gap-4 text-sm">
            <span className="badge badge-primary">{submission.exercise.difficulty}</span>
            <span className="text-gray-500">Điểm tối đa: {submission.maxScore}</span>
          </div>
        </div>

        {/* Student's Submission */}
        <div className="card p-6 mb-6">
          <h3 className="font-bold text-gray-900 mb-4">
            <i className="fa-solid fa-file-code mr-2 text-indigo-600"></i>
            Bài làm của học sinh
          </h3>
          <pre className="code-block whitespace-pre-wrap">{submission.content}</pre>
        </div>

        {/* Model Answer (if available) */}
        {submission.exercise.answer && (
          <div className="card p-6 mb-6">
            <h3 className="font-bold text-gray-900 mb-4">
              <i className="fa-solid fa-lightbulb mr-2 text-yellow-500"></i>
              Đáp án mẫu
            </h3>
            <pre className="code-block whitespace-pre-wrap">{submission.exercise.answer}</pre>
          </div>
        )}

        {/* Grading Form */}
        <div className="card p-6">
          <h3 className="font-bold text-gray-900 mb-4">
            <i className="fa-solid fa-pen-to-square mr-2 text-green-600"></i>
            Chấm điểm
          </h3>
          <GradingForm
            submissionId={submission.id}
            maxScore={submission.maxScore || submission.exercise.points}
            graderId={session.userId}
          />
        </div>
      </main>
    </div>
  );
}
