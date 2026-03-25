"use client";

import { useState } from "react";
import Link from "next/link";

export interface ClassroomStudentItem {
  id: string;
  name: string;
  email: string;
  profile: {
    age: number | null;
    gender: string | null;
    gradeLevel: string | null;
    school: string | null;
    phone: string | null;
  };
}

export interface ClassroomLessonOption {
  id: string;
  title: string;
  chapterTitle: string;
  exercises: { id: string; title: string }[];
}

export interface ClassroomAssignmentItem {
  id: string;
  title: string;
  type: string;
  durationMinutes: number | null;
  maxScore: number;
  createdAt: string;
  createdAtLabel: string;
  lesson: { id: string; title: string } | null;
  submissionsCount: number;
}

type AssignmentFilter = "all" | "homework" | "test";
type FormNotice = { tone: "success" | "error"; message: string } | null;

interface Props {
  classroomId: string;
  students: ClassroomStudentItem[];
  lessons: ClassroomLessonOption[];
  initialAssignments: ClassroomAssignmentItem[];
}

function getAssignmentLabel(type: string) {
  return type === "test" ? "Kiểm tra" : "BTVN";
}

function getAssignmentBadgeClass(type: string) {
  return type === "test" ? "badge-warning" : "badge-success";
}

function getStudentHighlights(student: ClassroomStudentItem) {
  return [student.profile.gradeLevel, student.profile.school, student.profile.phone].filter(Boolean) as string[];
}

function getInitials(name: string) {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length === 0) {
    return "HS";
  }

  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
}

function NoticeBlock({ notice }: { notice: FormNotice }) {
  if (!notice) {
    return null;
  }

  const toneClass =
    notice.tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : "border-rose-200 bg-rose-50 text-rose-700";

  return (
    <div className={`rounded-2xl border px-4 py-3 text-sm ${toneClass}`}>
      <div className="flex items-start gap-3">
        <i
          className={`fa-solid ${notice.tone === "success" ? "fa-circle-check" : "fa-circle-exclamation"} mt-0.5`}
        ></i>
        <p>{notice.message}</p>
      </div>
    </div>
  );
}

export default function ClassroomDetailClient({
  classroomId,
  students,
  lessons,
  initialAssignments,
}: Props) {
  const [assignments, setAssignments] = useState(initialAssignments);
  const [studentQuery, setStudentQuery] = useState("");
  const [assignmentFilter, setAssignmentFilter] = useState<AssignmentFilter>("all");
  const [loadingHomework, setLoadingHomework] = useState(false);
  const [loadingTest, setLoadingTest] = useState(false);
  const [homeworkNotice, setHomeworkNotice] = useState<FormNotice>(null);
  const [testNotice, setTestNotice] = useState<FormNotice>(null);
  const [homeworkFileKey, setHomeworkFileKey] = useState(0);
  const [testFileKey, setTestFileKey] = useState(0);

  const [homeworkForm, setHomeworkForm] = useState({
    lessonId: "",
    title: "",
    description: "",
    maxScore: 10,
    file: null as File | null,
  });

  const [testForm, setTestForm] = useState({
    lessonId: "",
    title: "",
    description: "",
    durationMinutes: 45,
    maxScore: 10,
    file: null as File | null,
  });

  const homeworkCount = assignments.filter((assignment) => assignment.type === "homework").length;
  const testCount = assignments.filter((assignment) => assignment.type === "test").length;
  const totalSubmissions = assignments.reduce((sum, assignment) => sum + assignment.submissionsCount, 0);
  const normalizedStudentQuery = studentQuery.trim().toLowerCase();
  const filteredStudents = students.filter((student) => {
    if (!normalizedStudentQuery) {
      return true;
    }

    return [
      student.name,
      student.email,
      student.profile.gradeLevel ?? "",
      student.profile.school ?? "",
      student.profile.phone ?? "",
    ]
      .join(" ")
      .toLowerCase()
      .includes(normalizedStudentQuery);
  });

  const filteredAssignments = assignments.filter((assignment) => {
    return assignmentFilter === "all" ? true : assignment.type === assignmentFilter;
  });

  const appendAssignment = (created: {
    id: string;
    title: string;
    type: string;
    durationMinutes: number | null;
    maxScore: number;
    createdAt: string;
    createdAtLabel?: string;
    lesson: { id: string; title: string } | null;
    _count?: { submissions: number };
  }) => {
    setAssignments((prev) => [
      {
        id: created.id,
        title: created.title,
        type: created.type,
        durationMinutes: created.durationMinutes,
        maxScore: created.maxScore,
        createdAt: created.createdAt,
        createdAtLabel: created.createdAtLabel || created.createdAt,
        lesson: created.lesson,
        submissionsCount: created._count?.submissions || 0,
      },
      ...prev,
    ]);
  };

  const createHomework = async () => {
    setHomeworkNotice(null);

    if (!homeworkForm.lessonId) {
      setHomeworkNotice({ tone: "error", message: "Vui lòng chọn bài giảng cho BTVN." });
      return;
    }
    if (!homeworkForm.file) {
      setHomeworkNotice({ tone: "error", message: "Vui lòng tải lên file đề BTVN định dạng .docx." });
      return;
    }

    setLoadingHomework(true);
    try {
      const formData = new FormData();
      formData.set("type", "homework");
      formData.set("lessonId", homeworkForm.lessonId);
      formData.set("title", homeworkForm.title);
      formData.set("description", homeworkForm.description);
      formData.set("maxScore", String(homeworkForm.maxScore || 10));
      formData.set("questionDocx", homeworkForm.file);

      const res = await fetch(`/api/admin/classrooms/${classroomId}/assignments`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        setHomeworkNotice({ tone: "error", message: data.error || "Không thể giao BTVN." });
        return;
      }

      appendAssignment(data.assignment);
      setHomeworkForm({
        lessonId: "",
        title: "",
        description: "",
        maxScore: 10,
        file: null,
      });
      setHomeworkFileKey((prev) => prev + 1);
      setHomeworkNotice({ tone: "success", message: "Đã giao bài tập về nhà thành công." });
    } catch {
      setHomeworkNotice({ tone: "error", message: "Đã xảy ra lỗi khi giao bài tập về nhà." });
    } finally {
      setLoadingHomework(false);
    }
  };

  const createTest = async () => {
    setTestNotice(null);

    if (!testForm.lessonId) {
      setTestNotice({ tone: "error", message: "Vui lòng chọn bài giảng liên quan." });
      return;
    }
    if (!testForm.file) {
      setTestNotice({ tone: "error", message: "Vui lòng tải lên file đề kiểm tra định dạng .docx." });
      return;
    }

    setLoadingTest(true);
    try {
      const formData = new FormData();
      formData.set("type", "test");
      formData.set("lessonId", testForm.lessonId);
      formData.set("title", testForm.title);
      formData.set("description", testForm.description);
      formData.set("durationMinutes", String(testForm.durationMinutes));
      formData.set("maxScore", String(testForm.maxScore || 10));
      formData.set("questionDocx", testForm.file);

      const res = await fetch(`/api/admin/classrooms/${classroomId}/assignments`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        setTestNotice({ tone: "error", message: data.error || "Không thể tạo bài kiểm tra." });
        return;
      }

      appendAssignment(data.assignment);
      setTestForm({
        lessonId: "",
        title: "",
        description: "",
        durationMinutes: 45,
        maxScore: 10,
        file: null,
      });
      setTestFileKey((prev) => prev + 1);
      setTestNotice({ tone: "success", message: "Đã giao bài kiểm tra thành công." });
    } catch {
      setTestNotice({ tone: "error", message: "Đã xảy ra lỗi khi tạo bài kiểm tra." });
    } finally {
      setLoadingTest(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm">
        <div className="grid gap-0 xl:grid-cols-[1.1fr,0.9fr]">
          <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-900 px-6 py-7 text-white sm:px-8">
            <span className="badge border border-white/10 bg-white/10 text-white">Bảng điều hành lớp học</span>
            <h2 className="mt-5 text-2xl font-bold tracking-tight sm:text-3xl">
              Giao bài, theo dõi học sinh và xem tiến độ lớp trên cùng một màn hình
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-200 sm:text-base">
              Giao diện được tổ chức lại theo kiểu quản lý lớp học: phần tổng quan ở trên, roster học sinh bên trái,
              trung tâm giao việc ở giữa và nhật ký đầu việc ở cuối màn hình.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <a href="#giao-viec" className="btn rounded-xl bg-white px-4 py-2 text-slate-900 hover:bg-slate-100">
                <i className="fa-solid fa-bolt"></i>
                Tạo đầu việc mới
              </a>
              <a
                href="#lich-su-bai-giao"
                className="btn rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-white hover:bg-white/15"
              >
                <i className="fa-solid fa-clock-rotate-left"></i>
                Xem nhật ký lớp
              </a>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[1.25rem] border border-white/10 bg-white/10 p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">Học sinh</div>
                <div className="mt-2 text-3xl font-bold text-white">{students.length}</div>
                <div className="mt-2 text-sm text-slate-200">Đang theo dõi trong lớp</div>
              </div>
              <div className="rounded-[1.25rem] border border-white/10 bg-white/10 p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">Đầu việc mới nhất</div>
                <div className="mt-2 text-base font-semibold text-white">
                  {assignments[0]?.title || "Chưa có bài nào được giao"}
                </div>
                <div className="mt-2 text-sm text-slate-200">
                  {assignments[0]?.createdAtLabel || "Bắt đầu bằng một BTVN hoặc bài kiểm tra đầu tiên"}
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 bg-slate-50 px-6 py-7 sm:grid-cols-2 sm:px-8">
            {[
              {
                label: "Bài giảng khả dụng",
                value: lessons.length,
                description: "Sẵn sàng để gắn vào đầu việc",
                icon: "fa-book-open",
                tone: "bg-sky-100 text-sky-600",
              },
              {
                label: "BTVN đã giao",
                value: homeworkCount,
                description: "Luồng luyện tập thường xuyên",
                icon: "fa-house-laptop",
                tone: "bg-emerald-100 text-emerald-600",
              },
              {
                label: "Bài kiểm tra",
                value: testCount,
                description: "Các mốc đánh giá chính thức",
                icon: "fa-file-signature",
                tone: "bg-amber-100 text-amber-600",
              },
              {
                label: "Bài nộp đã nhận",
                value: totalSubmissions,
                description: "Tổng lượt nộp từ học sinh",
                icon: "fa-file-circle-check",
                tone: "bg-indigo-100 text-indigo-600",
              },
            ].map((item) => (
              <div key={item.label} className="rounded-[1.25rem] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-medium text-slate-500">{item.label}</div>
                    <div className="mt-3 text-3xl font-bold tracking-tight text-slate-900">{item.value}</div>
                  </div>
                  <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${item.tone}`}>
                    <i className={`fa-solid ${item.icon}`}></i>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-6 text-slate-500">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[340px,minmax(0,1fr)]">
        <aside className="space-y-6 xl:sticky xl:top-24">
          <section className="card rounded-[1.5rem] p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600">
                  <i className="fa-solid fa-user-graduate"></i>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Danh sách học sinh</h2>
                  <p className="text-sm text-slate-500">Roster của lớp để mở nhanh hồ sơ</p>
                </div>
              </div>
              <span className="badge badge-primary">{students.length}</span>
            </div>

            <div className="mt-5">
              <label className="mb-2 block text-sm font-medium text-slate-700">Tìm nhanh học sinh</label>
              <div className="relative">
                <i className="fa-solid fa-magnifying-glass pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
                <input
                  className="input pl-11"
                  value={studentQuery}
                  onChange={(e) => setStudentQuery(e.target.value)}
                  placeholder="Tên, email, trường hoặc số điện thoại"
                />
              </div>
              <div className="mt-3 text-xs text-slate-500">Hiển thị {filteredStudents.length} học sinh phù hợp.</div>
            </div>

            <div className="mt-5 max-h-[720px] space-y-3 overflow-y-auto pr-1">
              {filteredStudents.map((student) => {
                const highlights = getStudentHighlights(student);

                return (
                  <Link
                    key={student.id}
                    href={`/admin/students/${student.id}`}
                    className="group block rounded-[1.25rem] border border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-sm"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-100 text-sm font-semibold text-indigo-700">
                        {getInitials(student.name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate font-semibold text-slate-900">{student.name}</div>
                            <div className="truncate text-sm text-slate-500">{student.email}</div>
                          </div>
                          <i className="fa-solid fa-chevron-right pt-1 text-slate-300 transition group-hover:text-indigo-500"></i>
                        </div>
                        {highlights.length > 0 ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {highlights.map((item) => (
                              <span
                                key={`${student.id}-${item}`}
                                className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600"
                              >
                                {item}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <div className="mt-3 text-xs text-slate-400">Chưa có thêm thông tin hồ sơ.</div>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}

              {filteredStudents.length === 0 && (
                <div className="rounded-[1.25rem] border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
                  {students.length === 0
                    ? "Chưa có học sinh trong lớp này."
                    : "Không tìm thấy học sinh phù hợp với từ khóa đang nhập."}
                </div>
              )}
            </div>
          </section>

          <section className="rounded-[1.5rem] border border-slate-900 bg-slate-900 p-5 text-white shadow-sm">
            <h3 className="text-base font-semibold">Checklist vận hành</h3>
            <div className="mt-4 space-y-3 text-sm text-slate-200">
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                Gắn đầu việc với đúng bài giảng để xem lại và chấm bài nhanh hơn.
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                Dùng BTVN cho luyện tập thường xuyên, dùng bài kiểm tra khi cần thời lượng rõ ràng.
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                Nhật ký bên dưới là nơi theo dõi toàn bộ đầu việc đã giao cho lớp.
              </div>
            </div>
          </section>
        </aside>

        <div className="space-y-6">
          <section id="giao-viec" className="card rounded-[1.5rem] p-5 sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Trung tâm giao việc</h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                  Hai khối thao tác được tách rõ để nhìn vào là biết đang giao bài luyện tập hay tạo bài kiểm tra.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                  {lessons.length} bài giảng khả dụng
                </span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                  {students.length} học sinh nhận bài
                </span>
              </div>
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-2">
              <article className="rounded-[1.5rem] border border-emerald-100 bg-emerald-50/60 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-emerald-600 ring-1 ring-emerald-100">
                      <i className="fa-solid fa-house-laptop"></i>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">Giao bài tập về nhà</h3>
                      <p className="mt-1 text-sm leading-6 text-slate-500">
                        Phù hợp cho nhịp luyện tập sau buổi học hoặc các đầu việc ôn tập thường xuyên.
                      </p>
                    </div>
                  </div>
                  <span className="badge badge-success">BTVN</span>
                </div>

                {homeworkNotice ? <div className="mt-5"><NoticeBlock notice={homeworkNotice} /></div> : null}

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">Bài giảng liên quan</label>
                    <select
                      className="input bg-white"
                      value={homeworkForm.lessonId}
                      onChange={(e) => setHomeworkForm((prev) => ({ ...prev, lessonId: e.target.value }))}
                      disabled={lessons.length === 0}
                    >
                      <option value="">{lessons.length === 0 ? "Chưa có bài giảng khả dụng" : "-- Chọn bài giảng --"}</option>
                      {lessons.map((lesson) => (
                        <option key={lesson.id} value={lesson.id}>
                          {lesson.chapterTitle} - {lesson.title}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">Điểm tối đa</label>
                    <input
                      type="number"
                      min={1}
                      className="input bg-white"
                      value={homeworkForm.maxScore}
                      onChange={(e) => setHomeworkForm((prev) => ({ ...prev, maxScore: Number(e.target.value) }))}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="mb-2 block text-sm font-medium text-slate-700">Tiêu đề BTVN</label>
                    <input
                      className="input bg-white"
                      value={homeworkForm.title}
                      onChange={(e) => setHomeworkForm((prev) => ({ ...prev, title: e.target.value }))}
                      placeholder="VD: BTVN Hàm và vòng lặp"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="mb-2 block text-sm font-medium text-slate-700">Đề bài BTVN (.docx)</label>
                    <input
                      key={homeworkFileKey}
                      type="file"
                      accept=".docx"
                      className="input bg-white file:mr-4 file:rounded-lg file:border-0 file:bg-emerald-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-emerald-700"
                      onChange={(e) => setHomeworkForm((prev) => ({ ...prev, file: e.target.files?.[0] || null }))}
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <label className="mb-2 block text-sm font-medium text-slate-700">Mô tả ngắn</label>
                  <textarea
                    className="input min-h-[110px] bg-white"
                    value={homeworkForm.description}
                    onChange={(e) => setHomeworkForm((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="Ghi chú thêm cho học sinh..."
                  />
                </div>

                <div className="mt-5 flex justify-end">
                  <button
                    onClick={createHomework}
                    disabled={loadingHomework || lessons.length === 0}
                    className="btn btn-success rounded-xl disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {loadingHomework ? (
                      <>
                        <i className="fa-solid fa-spinner fa-spin"></i> Đang giao...
                      </>
                    ) : (
                      <>
                        <i className="fa-solid fa-paper-plane"></i> Giao BTVN
                      </>
                    )}
                  </button>
                </div>
              </article>

              <article className="rounded-[1.5rem] border border-amber-100 bg-amber-50/60 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-amber-600 ring-1 ring-amber-100">
                      <i className="fa-solid fa-file-signature"></i>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">Giao bài kiểm tra</h3>
                      <p className="mt-1 text-sm leading-6 text-slate-500">
                        Phù hợp cho đầu việc đánh giá có thời lượng và cần theo dõi như một mốc chính thức.
                      </p>
                    </div>
                  </div>
                  <span className="badge badge-warning">Kiểm tra</span>
                </div>

                {testNotice ? <div className="mt-5"><NoticeBlock notice={testNotice} /></div> : null}

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">Bài giảng liên quan</label>
                    <select
                      className="input bg-white"
                      value={testForm.lessonId}
                      onChange={(e) => setTestForm((prev) => ({ ...prev, lessonId: e.target.value }))}
                      disabled={lessons.length === 0}
                    >
                      <option value="">{lessons.length === 0 ? "Chưa có bài giảng khả dụng" : "-- Chọn bài giảng --"}</option>
                      {lessons.map((lesson) => (
                        <option key={lesson.id} value={lesson.id}>
                          {lesson.chapterTitle} - {lesson.title}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">Thời gian</label>
                    <select
                      className="input bg-white"
                      value={testForm.durationMinutes}
                      onChange={(e) => setTestForm((prev) => ({ ...prev, durationMinutes: Number(e.target.value) }))}
                    >
                      <option value={15}>15 phút</option>
                      <option value={45}>45 phút</option>
                      <option value={60}>60 phút</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">Tiêu đề bài kiểm tra</label>
                    <input
                      className="input bg-white"
                      value={testForm.title}
                      onChange={(e) => setTestForm((prev) => ({ ...prev, title: e.target.value }))}
                      placeholder="VD: Kiểm tra chương 2"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">Điểm tối đa</label>
                    <input
                      type="number"
                      min={1}
                      className="input bg-white"
                      value={testForm.maxScore}
                      onChange={(e) => setTestForm((prev) => ({ ...prev, maxScore: Number(e.target.value) }))}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="mb-2 block text-sm font-medium text-slate-700">Đề kiểm tra (.docx)</label>
                    <input
                      key={testFileKey}
                      type="file"
                      accept=".docx"
                      className="input bg-white file:mr-4 file:rounded-lg file:border-0 file:bg-amber-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-amber-700"
                      onChange={(e) => setTestForm((prev) => ({ ...prev, file: e.target.files?.[0] || null }))}
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <label className="mb-2 block text-sm font-medium text-slate-700">Mô tả ngắn</label>
                  <textarea
                    className="input min-h-[110px] bg-white"
                    value={testForm.description}
                    onChange={(e) => setTestForm((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="Ghi chú thêm cho học sinh..."
                  />
                </div>

                <div className="mt-5 flex justify-end">
                  <button
                    onClick={createTest}
                    disabled={loadingTest || lessons.length === 0}
                    className="btn btn-primary rounded-xl disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {loadingTest ? (
                      <>
                        <i className="fa-solid fa-spinner fa-spin"></i> Đang tạo...
                      </>
                    ) : (
                      <>
                        <i className="fa-solid fa-paper-plane"></i> Giao bài kiểm tra
                      </>
                    )}
                  </button>
                </div>
              </article>
            </div>
          </section>

          <section id="lich-su-bai-giao" className="card rounded-[1.5rem] p-5 sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Nhật ký bài đã giao</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Mỗi thẻ là một đầu việc của lớp, có thể mở ngay để xem chi tiết và theo dõi bài nộp.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {[
                  { value: "all" as const, label: "Tất cả" },
                  { value: "homework" as const, label: "BTVN" },
                  { value: "test" as const, label: "Kiểm tra" },
                ].map((filter) => {
                  const isActive = assignmentFilter === filter.value;

                  return (
                    <button
                      key={filter.value}
                      type="button"
                      onClick={() => setAssignmentFilter(filter.value)}
                      className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                        isActive
                          ? "bg-slate-900 text-white"
                          : "border border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:text-indigo-600"
                      }`}
                    >
                      {filter.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-6 space-y-4">
              {filteredAssignments.map((assignment) => (
                <Link
                  key={assignment.id}
                  href={`/admin/classrooms/${classroomId}/assignments/${assignment.id}`}
                  className="group block rounded-[1.25rem] border border-slate-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-sm"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`badge ${getAssignmentBadgeClass(assignment.type)}`}>
                          {getAssignmentLabel(assignment.type)}
                        </span>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                          {assignment.lesson?.title || "Không rõ bài giảng"}
                        </span>
                        <span className="text-xs text-slate-400">{assignment.createdAtLabel}</span>
                      </div>

                      <h3 className="mt-4 text-lg font-semibold text-slate-900 transition group-hover:text-indigo-700">
                        {assignment.title}
                      </h3>

                      <div className="mt-4 grid gap-3 sm:grid-cols-3">
                        <div className="rounded-2xl bg-slate-50 px-4 py-3">
                          <div className="text-xs uppercase tracking-[0.12em] text-slate-400">Điểm tối đa</div>
                          <div className="mt-2 text-lg font-semibold text-slate-900">{assignment.maxScore}</div>
                        </div>
                        <div className="rounded-2xl bg-slate-50 px-4 py-3">
                          <div className="text-xs uppercase tracking-[0.12em] text-slate-400">
                            {assignment.type === "test" ? "Thời gian" : "Loại bài"}
                          </div>
                          <div className="mt-2 text-lg font-semibold text-slate-900">
                            {assignment.type === "test" && assignment.durationMinutes
                              ? `${assignment.durationMinutes} phút`
                              : "BTVN"}
                          </div>
                        </div>
                        <div className="rounded-2xl bg-slate-50 px-4 py-3">
                          <div className="text-xs uppercase tracking-[0.12em] text-slate-400">Bài nộp</div>
                          <div className="mt-2 text-lg font-semibold text-slate-900">{assignment.submissionsCount}</div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-sm font-semibold text-indigo-600">
                      <span>Xem chi tiết</span>
                      <i className="fa-solid fa-arrow-right"></i>
                    </div>
                  </div>
                </Link>
              ))}

              {filteredAssignments.length === 0 && (
                <div className="rounded-[1.25rem] border border-dashed border-slate-300 px-6 py-12 text-center text-slate-500">
                  {assignments.length === 0
                    ? "Chưa có bài tập hoặc bài kiểm tra nào được giao."
                    : "Bộ lọc hiện tại chưa có dữ liệu phù hợp."}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
