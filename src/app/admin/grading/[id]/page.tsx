import { notFound } from "next/navigation";
import { requireTeacher } from "@/lib/session";
import prisma from "@/lib/prisma";
import Link from "next/link";
import TeacherPageFrame from "@/components/teacher/TeacherPageFrame";
import GradingForm from "./GradingForm";
import ReadOnlyPythonCodeEditor from "./ReadOnlyPythonCodeEditor";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function GradingDetailPage({ params }: PageProps) {
  const [{ id }, session] = await Promise.all([params, requireTeacher()]);

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

  const isGraded = submission.status === "graded";

  // All of this student's submissions for the same lesson — both pending and
  // already graded — so the teacher can chấm lần lượt và xem lại bài đã chấm
  // without losing the lesson context.
  const siblings = await prisma.submission.findMany({
    where: {
      userId: submission.userId,
      exercise: { lessonId: submission.exercise.lessonId },
    },
    include: { exercise: { select: { title: true } } },
    orderBy: { createdAt: "asc" },
  });

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
            href="/admin/grading"
            className="flex items-center gap-1.5 rounded-lg px-2 py-1 transition hover:bg-slate-100 hover:text-slate-700"
          >
            Chấm bài
          </Link>
          <i className="fa-solid fa-chevron-right text-[10px] text-slate-300"></i>
          <span className="font-medium text-slate-700 max-w-xs truncate">
            {submission.exercise.title}
          </span>
        </nav>

        <TeacherPageFrame
          title="Chấm bài làm"
          subtitle={`${submission.user.name} · ${submission.exercise.lesson.chapter.title} › ${submission.exercise.lesson.title}`}
        >
          <div className="space-y-6">
            {/* Student Info */}
            <div className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100">
                <i className="fa-solid fa-user text-xl text-indigo-600"></i>
              </div>
              <div className="flex-1">
                <div className="font-bold text-gray-900">{submission.user.name}</div>
                <div className="text-sm text-gray-500">{submission.user.email}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-400">Nộp lúc</div>
                <div className="text-sm font-medium text-gray-700">
                  {new Date(submission.createdAt).toLocaleString("vi-VN")}
                </div>
              </div>
            </div>

            {/* Sibling submissions — chuyển nhanh giữa các bài của học sinh
                trong cùng bài học, và mở lại bài đã chấm để xem điểm/nhận xét. */}
            {siblings.length > 1 && (
              <div className="rounded-xl border border-gray-200 bg-white p-5">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">
                    <i className="fa-solid fa-list-check mr-2 text-indigo-500"></i>
                    Bài tập của học sinh trong bài học này
                  </h3>
                  <span className="text-sm text-gray-500">
                    {siblings.filter((s) => s.status === "graded").length}/
                    {siblings.length} đã chấm
                  </span>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {siblings.map((sib, index) => {
                    const isCurrent = sib.id === submission.id;
                    const sibGraded = sib.status === "graded";
                    return (
                      <Link
                        key={sib.id}
                        href={`/admin/grading/${sib.id}`}
                        className={`flex items-center justify-between gap-3 rounded-lg border p-3 text-sm transition ${
                          isCurrent
                            ? "border-indigo-300 bg-indigo-50"
                            : "border-gray-200 bg-white hover:border-indigo-200 hover:bg-slate-50"
                        }`}
                      >
                        <span className="min-w-0 flex items-center gap-2">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-slate-100 text-xs font-semibold text-slate-600">
                            {index + 1}
                          </span>
                          <span className="truncate font-medium text-slate-800">
                            {sib.exercise.title}
                          </span>
                        </span>
                        {sibGraded ? (
                          <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                            {sib.score}/{sib.maxScore}
                          </span>
                        ) : (
                          <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                            Chờ chấm
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Exercise Info */}
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="mb-3 flex items-center gap-2 text-xs text-gray-400">
                <span>{submission.exercise.lesson.chapter.title}</span>
                <i className="fa-solid fa-chevron-right text-[9px]"></i>
                <span>{submission.exercise.lesson.title}</span>
              </div>
              <h2 className="mb-4 text-lg font-bold text-gray-900">{submission.exercise.title}</h2>
              {submission.exercise.question && (
                <div
                  className="prose prose-sm mb-4 max-w-none rounded-lg bg-gray-50 p-4"
                  dangerouslySetInnerHTML={{ __html: submission.exercise.question }}
                />
              )}
              <div className="flex items-center gap-3 text-sm">
                <span className="rounded-full bg-indigo-100 px-3 py-1 text-indigo-700">
                  {submission.exercise.difficulty}
                </span>
                <span className="text-gray-500">Điểm tối đa: <strong>{submission.maxScore}</strong></span>
              </div>
            </div>

            {/* Student submission */}
            <div>
              <p className="mb-2 font-semibold text-gray-700">
                <i className="fa-solid fa-code mr-2 text-indigo-500"></i>
                Bài làm của học sinh
              </p>
              <ReadOnlyPythonCodeEditor defaultValue={submission.content} />
            </div>

            {/* Model answer */}
            {submission.exercise.answer && (
              <div>
                <p className="mb-2 font-semibold text-gray-700">
                  <i className="fa-solid fa-lightbulb mr-2 text-yellow-500"></i>
                  Đáp án mẫu
                </p>
                <ReadOnlyPythonCodeEditor defaultValue={submission.exercise.answer} />
              </div>
            )}

            {/* Grading form */}
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h3 className="font-bold text-gray-900">
                  <i className="fa-solid fa-pen-to-square mr-2 text-green-600"></i>
                  {isGraded ? "Xem lại & sửa điểm" : "Chấm điểm"}
                </h3>
                {isGraded && (
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-700">
                    Đã chấm: {submission.score}/{submission.maxScore}
                    {submission.gradedAt
                      ? ` · ${new Date(submission.gradedAt).toLocaleString("vi-VN")}`
                      : ""}
                  </span>
                )}
              </div>
              <GradingForm
                submissionId={submission.id}
                maxScore={submission.maxScore || submission.exercise.points}
                graderId={session.userId}
                isGraded={isGraded}
                initialScore={submission.score ?? undefined}
                initialFeedback={submission.feedback ?? ""}
              />
            </div>
          </div>
        </TeacherPageFrame>
    </>
  );
}
