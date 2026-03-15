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
        lesson: created.lesson,
        submissionsCount: created._count?.submissions || 0,
      },
      ...prev,
    ]);
  };

  const createHomework = async () => {
    if (!homeworkForm.lessonId) {
      alert("Vui long chon bai giang cho BTVN");
      return;
    }
    if (!homeworkForm.exerciseId) {
      alert("Vui long chon bai tap ve nha co san de giao cho lop");
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
        alert(data.error || "Khong the giao BTVN");
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
      alert("Da giao BTVN thanh cong");
    } catch {
      alert("Da xay ra loi khi giao bai");
    } finally {
      setLoadingHomework(false);
    }
  };

  const createTest = async () => {
    if (!testForm.lessonId) {
      alert("Vui long chon bai giang lien quan");
      return;
    }
    if (!testForm.file) {
      alert("Vui long tai len file de .docx");
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
        alert(data.error || "Khong the tao bai kiem tra");
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
      alert("Da giao bai kiem tra thanh cong");
    } catch {
      alert("Da xay ra loi khi tao bai kiem tra");
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
            Danh sach hoc sinh ({students.length})
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
            {students.length === 0 && <p className="text-sm text-gray-500">Chua co hoc sinh trong lop nay.</p>}
          </div>
        </div>
      </div>

      <div className="lg:col-span-2 space-y-6">
        <div className="card p-5">
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            <i className="fa-solid fa-house-laptop mr-2 text-green-600"></i>
            Giao bai tap ve nha
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bai giang lien quan</label>
              <select
                className="input"
                value={homeworkForm.lessonId}
                onChange={(e) => setHomeworkForm((prev) => ({ ...prev, lessonId: e.target.value, exerciseId: "" }))}
              >
                <option value="">-- Chon bai giang --</option>
                {lessons.map((lesson) => (
                  <option key={lesson.id} value={lesson.id}>
                    {lesson.chapterTitle} - {lesson.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bai tap co san</label>
              <select
                className="input"
                value={homeworkForm.exerciseId}
                onChange={(e) => setHomeworkForm((prev) => ({ ...prev, exerciseId: e.target.value }))}
                disabled={!selectedLesson}
              >
                <option value="">-- Chon bai tap --</option>
                {selectedLesson?.exercises.map((exercise) => (
                  <option key={exercise.id} value={exercise.id}>
                    {exercise.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tieu de BTVN</label>
              <input
                className="input"
                value={homeworkForm.title}
                onChange={(e) => setHomeworkForm((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="VD: BTVN Ham va Vong lap"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Diem toi da</label>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Mo ta ngan</label>
            <textarea
              className="input min-h-[80px]"
              value={homeworkForm.description}
              onChange={(e) => setHomeworkForm((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Ghi chu them cho hoc sinh..."
            />
          </div>
          <div className="mt-4 flex justify-end">
            <button onClick={createHomework} disabled={loadingHomework} className="btn btn-success">
              {loadingHomework ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin"></i> Dang giao...
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
            Giao bai kiem tra
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bai giang lien quan</label>
              <select
                className="input"
                value={testForm.lessonId}
                onChange={(e) => setTestForm((prev) => ({ ...prev, lessonId: e.target.value }))}
              >
                <option value="">-- Chon bai giang --</option>
                {lessons.map((lesson) => (
                  <option key={lesson.id} value={lesson.id}>
                    {lesson.chapterTitle} - {lesson.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Thoi gian</label>
              <select
                className="input"
                value={testForm.durationMinutes}
                onChange={(e) => setTestForm((prev) => ({ ...prev, durationMinutes: Number(e.target.value) }))}
              >
                <option value={15}>15 phut</option>
                <option value={45}>45 phut</option>
                <option value={60}>60 phut</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tieu de bai kiem tra</label>
              <input
                className="input"
                value={testForm.title}
                onChange={(e) => setTestForm((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="VD: Kiem tra chuong 2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Diem toi da</label>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">De kiem tra (.docx)</label>
            <input
              type="file"
              accept=".docx"
              className="input"
              onChange={(e) => setTestForm((prev) => ({ ...prev, file: e.target.files?.[0] || null }))}
            />
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Mo ta ngan</label>
            <textarea
              className="input min-h-[80px]"
              value={testForm.description}
              onChange={(e) => setTestForm((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Ghi chu them cho hoc sinh..."
            />
          </div>
          <div className="mt-4 flex justify-end">
            <button onClick={createTest} disabled={loadingTest} className="btn btn-primary">
              {loadingTest ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin"></i> Dang tao...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-paper-plane"></i> Giao bai kiem tra
                </>
              )}
            </button>
          </div>
        </div>

        <div className="card p-5">
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            <i className="fa-solid fa-clock-rotate-left mr-2 text-indigo-600"></i>
            Xem lai bai da giao
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
                        {assignment.type === "test" ? "Kiem tra" : "BTVN"}
                      </span>
                      <span className="text-sm text-gray-500">{assignment.lesson?.title || "Khong ro bai giang"}</span>
                    </div>
                    <h3 className="font-semibold text-gray-900">{assignment.title}</h3>
                    <p className="text-sm text-gray-500">
                      {assignment.type === "test" && assignment.durationMinutes ? `${assignment.durationMinutes} phut - ` : ""}
                      {assignment.maxScore} diem - {new Date(assignment.createdAt).toLocaleString("vi-VN")}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-indigo-600 font-semibold">{assignment.submissionsCount}</div>
                    <div className="text-xs text-gray-500">bai nop</div>
                  </div>
                </div>
              </Link>
            ))}
            {assignments.length === 0 && (
              <div className="p-8 rounded-lg border border-dashed border-gray-300 text-center text-gray-500">
                Chua co bai tap hoac bai kiem tra nao duoc giao.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
