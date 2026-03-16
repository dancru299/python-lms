"use client";

import { useMemo, useState } from "react";
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

interface Props {
  classroomId: string;
  students: ClassroomStudentItem[];
  lessons: ClassroomLessonOption[];
  initialAssignments: ClassroomAssignmentItem[];
}

export default function ClassroomDetailClient({
  classroomId,
  students,
  lessons,
  initialAssignments,
}: Props) {
  const [assignments, setAssignments] = useState(initialAssignments);
  const [loadingHomework, setLoadingHomework] = useState(false);
  const [loadingTest, setLoadingTest] = useState(false);

  const [homeworkForm, setHomeworkForm] = useState({
    lessonId: "",
    exerciseId: "",
    title: "",
    description: "",
    maxScore: 10,
  });

  const [testForm, setTestForm] = useState({
    lessonId: "",
    title: "",
    description: "",
    durationMinutes: 45,
    maxScore: 10,
    file: null as File | null,
  });

  const selectedLesson = useMemo(
    () => lessons.find((lesson) => lesson.id === homeworkForm.lessonId),
    [lessons, homeworkForm.lessonId]
  );

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
    if (!homeworkForm.lessonId) {
      alert("Vui lòng chọn bài giảng cho BTVN");
      return;
    }
    if (!homeworkForm.exerciseId) {
      alert("Vui lòng chọn bài tập về nhà có sẵn để giao cho lớp");
      return;
    }

    setLoadingHomework(true);
    try {
      const formData = new FormData();
      formData.set("type", "homework");
      formData.set("lessonId", homeworkForm.lessonId);
      formData.set("exerciseId", homeworkForm.exerciseId);
      formData.set("title", homeworkForm.title);
      formData.set("description", homeworkForm.description);
      formData.set("maxScore", String(homeworkForm.maxScore || 10));

      const res = await fetch(`/api/admin/classrooms/${classroomId}/assignments`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Không thể giao BTVN");
        return;
      }

      appendAssignment(data.assignment);
      setHomeworkForm({
        lessonId: "",
        exerciseId: "",
        title: "",
        description: "",
        maxScore: 10,
      });
      alert("Đã giao BTVN thành công");
    } catch {
      alert("Đã xảy ra lỗi khi giao bài");
    } finally {
      setLoadingHomework(false);
    }
  };

  const createTest = async () => {
    if (!testForm.lessonId) {
      alert("Vui lòng chọn bài giảng liên quan");
      return;
    }
    if (!testForm.file) {
      alert("Vui lòng tải lên file đề .docx");
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
        alert(data.error || "Không thể tạo bài kiểm tra");
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
      alert("Đã giao bài kiểm tra thành công");
    } catch {
      alert("Đã xảy ra lỗi khi tạo bài kiểm tra");
    } finally {
      setLoadingTest(false);
    }
  };

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1 space-y-6">
        <div className="card p-5">
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            <i className="fa-solid fa-user-graduate mr-2 text-indigo-600"></i>
            Danh sách học sinh ({students.length})
          </h2>
          <div className="space-y-2 max-h-[520px] overflow-y-auto">
            {students.map((student) => (
              <Link
                key={student.id}
                href={`/admin/students/${student.id}`}
                className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
              >
                <div>
                  <div className="font-medium text-gray-900">{student.name}</div>
                  <div className="text-sm text-gray-500">{student.email}</div>
                </div>
                <i className="fa-solid fa-chevron-right text-gray-400"></i>
              </Link>
            ))}
            {students.length === 0 && <p className="text-sm text-gray-500">Chưa có học sinh trong lớp này.</p>}
          </div>
        </div>
      </div>

      <div className="lg:col-span-2 space-y-6">
        <div className="card p-5">
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            <i className="fa-solid fa-house-laptop mr-2 text-green-600"></i>
            Giao bài tập về nhà
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bài giảng liên quan</label>
              <select
                className="input"
                value={homeworkForm.lessonId}
                onChange={(e) => setHomeworkForm((prev) => ({ ...prev, lessonId: e.target.value, exerciseId: "" }))}
              >
                <option value="">-- Chọn bài giảng --</option>
                {lessons.map((lesson) => (
                  <option key={lesson.id} value={lesson.id}>
                    {lesson.chapterTitle} - {lesson.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bài tập có sẵn</label>
              <select
                className="input"
                value={homeworkForm.exerciseId}
                onChange={(e) => setHomeworkForm((prev) => ({ ...prev, exerciseId: e.target.value }))}
                disabled={!selectedLesson}
              >
                <option value="">-- Chọn bài tập --</option>
                {selectedLesson?.exercises.map((exercise) => (
                  <option key={exercise.id} value={exercise.id}>
                    {exercise.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tiêu đề BTVN</label>
              <input
                className="input"
                value={homeworkForm.title}
                onChange={(e) => setHomeworkForm((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="VD: BTVN Hàm và Vòng lặp"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Điểm tối đa</label>
              <input
                type="number"
                min={1}
                className="input"
                value={homeworkForm.maxScore}
                onChange={(e) => setHomeworkForm((prev) => ({ ...prev, maxScore: Number(e.target.value) }))}
              />
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả ngắn</label>
            <textarea
              className="input min-h-[80px]"
              value={homeworkForm.description}
              onChange={(e) => setHomeworkForm((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Ghi chú thêm cho học sinh..."
            />
          </div>
          <div className="mt-4 flex justify-end">
            <button onClick={createHomework} disabled={loadingHomework} className="btn btn-success">
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
        </div>

        <div className="card p-5">
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            <i className="fa-solid fa-file-word mr-2 text-orange-600"></i>
            Giao bài kiểm tra
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bài giảng liên quan</label>
              <select
                className="input"
                value={testForm.lessonId}
                onChange={(e) => setTestForm((prev) => ({ ...prev, lessonId: e.target.value }))}
              >
                <option value="">-- Chọn bài giảng --</option>
                {lessons.map((lesson) => (
                  <option key={lesson.id} value={lesson.id}>
                    {lesson.chapterTitle} - {lesson.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Thời gian</label>
              <select
                className="input"
                value={testForm.durationMinutes}
                onChange={(e) => setTestForm((prev) => ({ ...prev, durationMinutes: Number(e.target.value) }))}
              >
                <option value={15}>15 phút</option>
                <option value={45}>45 phút</option>
                <option value={60}>60 phút</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tiêu đề bài kiểm tra</label>
              <input
                className="input"
                value={testForm.title}
                onChange={(e) => setTestForm((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="VD: Kiểm tra chương 2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Điểm tối đa</label>
              <input
                type="number"
                min={1}
                className="input"
                value={testForm.maxScore}
                onChange={(e) => setTestForm((prev) => ({ ...prev, maxScore: Number(e.target.value) }))}
              />
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Đề kiểm tra (.docx)</label>
            <input
              type="file"
              accept=".docx"
              className="input"
              onChange={(e) => setTestForm((prev) => ({ ...prev, file: e.target.files?.[0] || null }))}
            />
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả ngắn</label>
            <textarea
              className="input min-h-[80px]"
              value={testForm.description}
              onChange={(e) => setTestForm((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Ghi chú thêm cho học sinh..."
            />
          </div>
          <div className="mt-4 flex justify-end">
            <button onClick={createTest} disabled={loadingTest} className="btn btn-primary">
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
        </div>

        <div className="card p-5">
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            <i className="fa-solid fa-clock-rotate-left mr-2 text-indigo-600"></i>
            Xem lại bài đã giao
          </h2>

          <div className="space-y-3">
            {assignments.map((assignment) => (
              <Link
                key={assignment.id}
                href={`/admin/classrooms/${classroomId}/assignments/${assignment.id}`}
                className="block p-4 rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`badge ${assignment.type === "test" ? "badge-warning" : "badge-success"}`}>
                        {assignment.type === "test" ? "Kiểm tra" : "BTVN"}
                      </span>
                      <span className="text-sm text-gray-500">{assignment.lesson?.title || "Không rõ bài giảng"}</span>
                    </div>
                    <h3 className="font-semibold text-gray-900">{assignment.title}</h3>
                    <p className="text-sm text-gray-500">
                      {assignment.type === "test" && assignment.durationMinutes ? `${assignment.durationMinutes} phút - ` : ""}
                      {assignment.maxScore} điểm - {assignment.createdAtLabel}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-indigo-600 font-semibold">{assignment.submissionsCount}</div>
                    <div className="text-xs text-gray-500">bài nộp</div>
                  </div>
                </div>
              </Link>
            ))}
            {assignments.length === 0 && (
              <div className="p-8 rounded-lg border border-dashed border-gray-300 text-center text-gray-500">
                Chưa có bài tập hoặc bài kiểm tra nào được giao.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
