import { requireTeacher } from "@/lib/session";
import prisma from "@/lib/prisma";
import Link from "next/link";

export default async function AdminSubmissionsPage() {
  await requireTeacher();

  // Fetch all graded submissions
  const submissions = await (prisma as any).submission.findMany({
    where: { status: "graded" },
    include: {
      exercise: { include: { lesson: { include: { chapter: true } } } },
      user: { select: { name: true, email: true } },
    },
    orderBy: { updatedAt: "desc" },
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
            <h1 className="text-xl font-bold text-gray-900">Bài tập đã chấm</h1>
            <span className="badge badge-success">{submissions.length} bài đã chấm</span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {submissions.length > 0 ? (
          <div className="card divide-y divide-gray-100">
            {submissions.map((submission: any) => (
              <div
                key={submission.id}
                className="p-6 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mt-1">
                      <i className="fa-solid fa-check-double text-xl text-green-600"></i>
                    </div>
                    <div>
                      <div className="font-bold text-gray-900 text-lg">{submission.exercise.title}</div>
                      <div className="text-sm text-gray-600 mb-2">
                        <span className="font-semibold text-gray-900">{submission.user.name}</span>
                        {" • "}
                        {submission.exercise.lesson.title}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span><i className="fa-solid fa-calendar mr-1"></i> {new Date(submission.updatedAt).toLocaleString("vi-VN")}</span>
                        <span><i className="fa-solid fa-star mr-1"></i> {submission.score}/{submission.maxScore} điểm</span>
                      </div>
                      {submission.feedback && (
                        <div className="mt-3 p-3 bg-blue-50 rounded-lg text-sm text-blue-700 border border-blue-100">
                          <i className="fa-solid fa-comment mr-2"></i>
                          {submission.feedback}
                        </div>
                      )}
                    </div>
                  </div>
                  <Link 
                    href={`/admin/grading/${submission.id}`}
                    className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                  >
                    Xem chi tiết →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card p-12 text-center text-gray-500">
            <i className="fa-solid fa-folder-open text-6xl mb-4 text-gray-200"></i>
            <p>Chưa có bài tập nào đã chấm</p>
          </div>
        )}
      </main>
    </div>
  );
}
