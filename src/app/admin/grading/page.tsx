import { requireTeacher } from "@/lib/session";
import prisma from "@/lib/prisma";
import Link from "next/link";

export default async function GradingPage() {
  await requireTeacher();

  // Fetch all pending submissions
  const submissions = await prisma.submission.findMany({
    where: { status: "pending" },
    include: {
      exercise: { include: { lesson: { include: { chapter: true } } } },
      user: { select: { name: true, email: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 h-16">
            <Link href="/admin" className="text-gray-600 hover:text-gray-900">
              <i className="fa-solid fa-arrow-left"></i>
            </Link>
            <h1 className="text-xl font-bold text-gray-900">Chấm bài</h1>
            <span className="badge badge-warning">{submissions.length} bài chờ chấm</span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {submissions.length > 0 ? (
          <div className="card divide-y divide-gray-100">
            {submissions.map((submission) => (
              <Link
                key={submission.id}
                href={`/admin/grading/${submission.id}`}
                className="flex items-center justify-between p-6 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                    <i className="fa-solid fa-file-code text-xl text-orange-600"></i>
                  </div>
                  <div>
                    <div className="font-bold text-gray-900">{submission.exercise.title}</div>
                    <div className="text-sm text-gray-500">
                      <span className="font-medium">{submission.user.name}</span>
                      {" • "}
                      {submission.exercise.lesson.title}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      Nộp lúc: {new Date(submission.createdAt).toLocaleString("vi-VN")}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <span className="badge badge-primary">{submission.maxScore} điểm</span>
                  <i className="fa-solid fa-chevron-right text-gray-400"></i>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="card p-12 text-center">
            <i className="fa-solid fa-check-circle text-6xl text-green-500 mb-4"></i>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Tuyệt vời!</h2>
            <p className="text-gray-500">Không có bài nào đang chờ chấm</p>
            <Link href="/admin" className="btn btn-primary mt-6">
              <i className="fa-solid fa-arrow-left"></i>
              Quay lại Dashboard
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
