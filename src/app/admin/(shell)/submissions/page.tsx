import Link from "next/link";
import prisma from "@/lib/prisma";
import TeacherPageFrame from "@/components/teacher/TeacherPageFrame";
import { requireTeacher } from "@/lib/session";

export default async function AdminSubmissionsPage() {
  await requireTeacher();

  const submissions = await (prisma as any).submission.findMany({
    where: { status: "graded" },
    include: {
      exercise: { include: { lesson: { include: { chapter: true } } } },
      user: { select: { name: true, email: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <TeacherPageFrame
      title="Bài tập đã chấm"
      subtitle="Danh sách bài đã được phản hồi được gom về một nơi để bạn rà nhanh kết quả, nhận xét và mở lại bài chấm khi cần đối chiếu."
      summaryPills={[
        { label: "Bài đã chấm", value: submissions.length, tone: "emerald" },
        {
          label: "Trạng thái",
          value: submissions.length > 0 ? "Sẵn sàng tra cứu" : "Chưa có dữ liệu",
          tone: "indigo",
        },
        { label: "Điểm nhìn", value: "Theo danh sách", tone: "slate" },
      ]}
      primaryAction={{
        href: "/admin/grading",
        label: "Mở khu chấm bài",
        icon: "fa-pen-ruler",
      }}
      secondaryAction={{
        href: "/admin",
        label: "Về tổng quan",
        icon: "fa-house",
      }}
      sectionLinks={[{ href: "#danh-sach", label: "Danh sách bài đã chấm" }]}
    >
      <section id="danh-sach" className="max-w-4xl">
        {submissions.length > 0 ? (
          <div className="card divide-y divide-gray-100">
            {submissions.map((submission: any) => (
              <div key={submission.id} className="p-6 transition-colors hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="mt-1 flex h-12 w-12 items-center justify-center rounded-xl bg-green-100">
                      <i className="fa-solid fa-check-double text-xl text-green-600"></i>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-gray-900">{submission.exercise.title}</div>
                      <div className="mb-2 text-sm text-gray-600">
                        <span className="font-semibold text-gray-900">{submission.user.name}</span>
                        {" • "}
                        {submission.exercise.lesson.title}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>
                          <i className="fa-solid fa-calendar mr-1"></i>
                          {new Date(submission.updatedAt).toLocaleString("vi-VN")}
                        </span>
                        <span>
                          <i className="fa-solid fa-star mr-1"></i>
                          {submission.score}/{submission.maxScore} điểm
                        </span>
                      </div>
                      {submission.feedback && (
                        <div className="mt-3 rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm text-blue-700">
                          <i className="fa-solid fa-comment mr-2"></i>
                          {submission.feedback}
                        </div>
                      )}
                    </div>
                  </div>
                  <Link
                    href={`/admin/grading/${submission.id}`}
                    className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
                  >
                    Xem chi tiết →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card p-12 text-center text-gray-500">
            <i className="fa-solid fa-folder-open mb-4 text-6xl text-gray-200"></i>
            <p>Chưa có bài tập nào đã chấm</p>
          </div>
        )}
      </section>
    </TeacherPageFrame>
  );
}
