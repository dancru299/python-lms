import Link from "next/link";
import prisma from "@/lib/prisma";
import { requireTeacher } from "@/lib/session";
import TeacherPageFrame from "@/components/teacher/TeacherPageFrame";

export default async function GradingPage() {
  const session = await requireTeacher();

  const submissions = await prisma.submission.findMany({
    where: { status: "pending" },
    include: {
      exercise: { include: { lesson: { include: { chapter: true } } } },
      user: { select: { name: true, email: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return (
    <TeacherPageFrame
      title="Khu chấm bài"
      subtitle="Hàng chờ được tách thành khu làm việc riêng để giáo viên nhìn rõ thứ tự ưu tiên, học sinh nộp bài và số điểm tối đa trước khi mở từng bài."
      summaryPills={[
        { label: "Bài chờ chấm", value: submissions.length, tone: "amber" },
        {
          label: "Ưu tiên hiện tại",
          value: submissions.length > 0 ? "Xử lý hàng chờ" : "Hết hàng chờ",
          tone: "indigo",
        },
        {
          label: "Điểm nhìn giao diện",
          value: "Theo danh sách",
          tone: "emerald",
        },
      ]}
      primaryAction={{
        href: "/admin",
        label: "Về tổng quan",
        icon: "fa-house",
      }}
      secondaryAction={{
        href: "/admin/classrooms",
        label: "Mở lớp học",
        icon: "fa-users-rectangle",
      }}
      sectionLinks={[
        { href: "#hang-cho", label: "Danh sách chờ chấm" },
        { href: "#quy-trinh", label: "Quy trình xử lý" },
      ]}
    >
      <section className="grid gap-4 md:grid-cols-3">
        {[
          {
            label: "Tổng bài chờ chấm",
            value: submissions.length,
            description: "Danh sách được sắp từ bài nộp sớm nhất để tránh bỏ sót.",
            icon: "fa-hourglass-half",
            iconClass: "bg-amber-100 text-amber-600",
          },
          {
            label: "Mục tiêu thao tác",
            value: submissions.length > 0 ? "Mở bài và chấm ngay" : "Không còn bài tồn",
            description: "Từ đây có thể đi thẳng vào form chấm chi tiết cho từng bài.",
            icon: "fa-bullseye",
            iconClass: "bg-sky-100 text-sky-600",
          },
          {
            label: "Điều hướng hỗ trợ",
            value: "Tổng quan / Lớp học",
            description: "Hai điểm quay lại chính được giữ sẵn trên đầu trang.",
            icon: "fa-signs-post",
            iconClass: "bg-emerald-100 text-emerald-600",
          },
        ].map((item) => (
          <div key={item.label} className="card rounded-[1.5rem] p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-medium text-slate-500">{item.label}</div>
                <div className="mt-3 text-2xl font-bold text-slate-900">{item.value}</div>
              </div>
              <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${item.iconClass}`}>
                <i className={`fa-solid ${item.icon}`}></i>
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-500">{item.description}</p>
          </div>
        ))}
      </section>

      <div className="mt-8 grid gap-8 xl:grid-cols-[1.7fr,1fr]">
        <section id="hang-cho" className="space-y-5">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Danh sách chờ chấm</h2>
            <p className="text-sm text-slate-500">
              Mỗi hàng hiển thị đầy đủ bài tập, bài giảng, học sinh và thời gian nộp để bạn ra quyết định nhanh hơn.
            </p>
          </div>

          {submissions.length > 0 ? (
            <div className="space-y-4">
              {submissions.map((submission) => (
                <Link
                  key={submission.id}
                  href={`/admin/grading/${submission.id}`}
                  className="card block rounded-[1.5rem] p-5 transition hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="badge badge-primary">
                          {submission.exercise.lesson.chapter.title}
                        </span>
                        <span className="text-sm text-slate-500">{submission.exercise.lesson.title}</span>
                      </div>

                      <h3 className="mt-3 text-lg font-semibold text-slate-900">
                        {submission.exercise.title}
                      </h3>

                      <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-500">
                        <span>
                          Học sinh: <span className="font-medium text-slate-900">{submission.user.name}</span>
                        </span>
                        <span>•</span>
                        <span>{submission.user.email}</span>
                      </div>

                      <div className="mt-2 text-sm text-slate-500">
                        Nộp lúc: {new Date(submission.createdAt).toLocaleString("vi-VN")}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="badge badge-warning">Chờ chấm</span>
                      <span className="badge badge-primary">{submission.maxScore} điểm</span>
                      <i className="fa-solid fa-chevron-right text-slate-300"></i>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="card rounded-[1.5rem] p-10 text-center text-slate-500">
              <i className="fa-solid fa-circle-check text-4xl text-emerald-500"></i>
              <p className="mt-4">Tuyệt vời, hiện không có bài nào đang chờ chấm.</p>
            </div>
          )}
        </section>

        <section id="quy-trinh" className="space-y-5">
          <div className="card rounded-[1.5rem] p-5">
            <h2 className="text-lg font-bold text-slate-900">Quy trình xử lý gợi ý</h2>
            <div className="mt-4 space-y-3">
              {[
                "Mở bài lâu nhất trong hàng chờ để giảm tồn đọng.",
                "Xem nhanh tên bài, học sinh và điểm tối đa trước khi vào form chấm.",
                "Sau khi chấm xong, quay lại đây để tiếp tục xử lý bài tiếp theo.",
              ].map((text, index) => (
                <div key={text} className="flex gap-3 rounded-2xl bg-slate-50 p-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-sm font-semibold text-white">
                    {index + 1}
                  </div>
                  <p className="text-sm leading-6 text-slate-600">{text}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="card rounded-[1.5rem] p-5">
            <h2 className="text-lg font-bold text-slate-900">Điều hướng liên quan</h2>
            <div className="mt-4 grid gap-3">
              <Link href="/admin" className="rounded-2xl border border-slate-200 p-4 transition hover:border-sky-200 hover:bg-slate-50">
                <div className="font-semibold text-slate-900">Trang tổng quan</div>
                <p className="mt-1 text-sm text-slate-500">Quay lại xem chỉ số và việc cần làm khác.</p>
              </Link>
              <Link href="/admin/classrooms" className="rounded-2xl border border-slate-200 p-4 transition hover:border-sky-200 hover:bg-slate-50">
                <div className="font-semibold text-slate-900">Quản lý lớp học</div>
                <p className="mt-1 text-sm text-slate-500">Đối chiếu lớp học khi cần theo dõi bối cảnh nộp bài.</p>
              </Link>
            </div>
          </div>
        </section>
      </div>
    </TeacherPageFrame>
  );
}
