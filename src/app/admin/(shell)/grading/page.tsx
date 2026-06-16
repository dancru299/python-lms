import Link from "next/link";
import { requireTeacher } from "@/lib/session";
import TeacherPageFrame from "@/components/teacher/TeacherPageFrame";
import { getPendingGradingGroups } from "@/lib/grading-queue";

export default async function GradingPage() {
  await requireTeacher();

  const groups = await getPendingGradingGroups();
  const pendingTotal = groups.reduce((sum, g) => sum + g.pendingCount, 0);

  return (
    <TeacherPageFrame
      title="Khu chấm bài"
      subtitle="Mỗi học sinh chỉ hiện một mục cho từng bài học, gộp toàn bộ bài tập đang chờ chấm để giáo viên nhìn rõ tiến độ trước khi mở từng bài."
      summaryPills={[
        { label: "Bài chờ chấm", value: pendingTotal, tone: "amber" },
        {
          label: "Ưu tiên hiện tại",
          value: groups.length > 0 ? "Xử lý hàng chờ" : "Hết hàng chờ",
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
            value: pendingTotal,
            description: "Gộp theo từng học sinh, sắp từ bài nộp sớm nhất để tránh bỏ sót.",
            icon: "fa-hourglass-half",
            iconClass: "bg-amber-100 text-amber-600",
          },
          {
            label: "Mục tiêu thao tác",
            value: pendingTotal > 0 ? "Mở bài và chấm ngay" : "Không còn bài tồn",
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
              Mỗi học sinh hiện một mục cho từng bài học, gộp toàn bộ bài tập đang chờ chấm. Mở mục để chấm lần lượt và xem lại các bài đã chấm.
            </p>
          </div>

          {groups.length > 0 ? (
            <div className="space-y-4">
              {groups.map((group) => (
                <Link
                  key={group.key}
                  href={`/admin/grading/${group.firstPendingSubmissionId}`}
                  className="card block rounded-[1.5rem] p-5 transition hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="badge badge-primary">{group.chapterTitle}</span>
                        <span className="text-sm text-slate-500">{group.lessonTitle}</span>
                      </div>

                      <h3 className="mt-3 text-lg font-semibold text-slate-900">
                        {group.studentName}
                      </h3>

                      <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-500">
                        <span>{group.studentEmail}</span>
                        <span>•</span>
                        <span>
                          Nộp sớm nhất: {new Date(group.earliestSubmittedAt).toLocaleString("vi-VN")}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="badge badge-warning">
                        {group.pendingCount}/{group.totalExercises} bài chờ chấm
                      </span>
                      <span className="badge badge-primary">{group.maxScore} điểm</span>
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
