"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface User {
  id: string;
  name: string;
  email: string;
  role?: string;
}

const WEEKDAYS = [
  { value: 1, label: "Thứ 2" },
  { value: 2, label: "Thứ 3" },
  { value: 3, label: "Thứ 4" },
  { value: 4, label: "Thứ 5" },
  { value: 5, label: "Thứ 6" },
  { value: 6, label: "Thứ 7" },
  { value: 0, label: "Chủ nhật" },
];

interface DayConfig {
  enabled: boolean;
  startTime: string;
  endTime: string;
}

type DayConfigMap = Record<number, DayConfig>;

function emptyDayConfigs(): DayConfigMap {
  const map: DayConfigMap = {};
  for (const day of WEEKDAYS) {
    map[day.value] = { enabled: false, startTime: "18:00", endTime: "19:30" };
  }
  return map;
}

function toDateInput(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

interface ClassroomFormProps {
  mode: "create" | "edit";
  classroomId?: string;
  canChangeTeacher: boolean;
  canDelete: boolean;
}

export default function ClassroomForm({
  mode,
  classroomId,
  canChangeTeacher,
  canDelete,
}: ClassroomFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(mode === "edit");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [searchStudent, setSearchStudent] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    teacherId: "",
  });
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [dayConfigs, setDayConfigs] = useState<DayConfigMap>(emptyDayConfigs);

  useEffect(() => {
    async function loadData() {
      try {
        const usersRes = await fetch("/api/admin/users");
        const usersData = usersRes.ok ? await usersRes.json() : null;
        if (usersData) {
          setTeachers(usersData.teachers);
          setStudents(usersData.students);
        }

        if (mode === "edit" && classroomId) {
          const classroomRes = await fetch(`/api/admin/classrooms/${classroomId}`);
          const classroomData = await classroomRes.json();
          if (!classroomRes.ok) {
            alert(classroomData.error || "Không thể tải lớp học");
            router.push("/admin/classrooms");
            return;
          }

          const classroom = classroomData.classroom;
          setFormData({
            name: classroom.name || "",
            description: classroom.description || "",
            teacherId: classroom.teacherId || classroom.teacher?.id || "",
          });
          setStartDate(toDateInput(classroom.startDate));
          setEndDate(toDateInput(classroom.endDate));
          if (Array.isArray(classroom.scheduleRules)) {
            const next = emptyDayConfigs();
            for (const rule of classroom.scheduleRules as Array<{
              weekday: number;
              startTime: string;
              endTime: string | null;
            }>) {
              if (next[rule.weekday]) {
                next[rule.weekday] = {
                  enabled: true,
                  startTime: rule.startTime || "18:00",
                  endTime: rule.endTime || "",
                };
              }
            }
            setDayConfigs(next);
          }
          setSelectedStudents(
            classroom.students.map((item: { student: { id: string } }) => item.student.id)
          );
        }
      } catch {
        alert("Đã xảy ra lỗi khi tải dữ liệu");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [classroomId, mode, router]);

  const updateDay = (weekday: number, patch: Partial<DayConfig>) => {
    setDayConfigs((prev) => ({
      ...prev,
      [weekday]: { ...prev[weekday], ...patch },
    }));
  };

  const toggleStudent = (studentId: string) => {
    setSelectedStudents((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    );
  };

  const filteredStudents = students.filter(
    (student) =>
      student.name.toLowerCase().includes(searchStudent.toLowerCase()) ||
      student.email.toLowerCase().includes(searchStudent.toLowerCase())
  );

  const handleSave = async () => {
    if (!formData.name.trim()) {
      alert("Vui lòng nhập tên lớp");
      return;
    }

    if (!formData.teacherId) {
      alert("Vui lòng chọn giáo viên phụ trách");
      return;
    }

    const scheduleRules = WEEKDAYS.filter((day) => dayConfigs[day.value]?.enabled)
      .map((day) => ({
        weekday: day.value,
        startTime: dayConfigs[day.value].startTime,
        endTime: dayConfigs[day.value].endTime.trim() || null,
      }));

    if (scheduleRules.length > 0 && !startDate) {
      alert("Vui lòng chọn ngày bắt đầu khóa học khi đã thiết lập lịch học");
      return;
    }

    if (startDate && endDate && endDate < startDate) {
      alert("Ngày kết thúc phải sau ngày bắt đầu");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(
        mode === "create" ? "/api/admin/classrooms" : `/api/admin/classrooms/${classroomId}`,
        {
          method: mode === "create" ? "POST" : "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...formData,
            studentIds: selectedStudents,
            startDate: startDate || null,
            endDate: endDate || null,
            scheduleRules,
          }),
        }
      );

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Không thể lưu lớp học");
        return;
      }

      router.push(mode === "create" ? "/admin/classrooms" : `/admin/classrooms/${classroomId}`);
      router.refresh();
    } catch {
      alert("Đã xảy ra lỗi khi lưu lớp học");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!classroomId || !canDelete) {
      return;
    }

    const confirmed = window.confirm("Bạn có chắc muốn xóa lớp học này không?");
    if (!confirmed) {
      return;
    }

    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/classrooms/${classroomId}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Không thể xóa lớp học");
        return;
      }

      router.push("/admin/classrooms");
      router.refresh();
    } catch {
      alert("Đã xảy ra lỗi khi xóa lớp học");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin"></div>
          <p className="mt-4 text-sm text-gray-500">Đang tải dữ liệu lớp học...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-0">
      <header className="sticky top-0 z-30 -mx-4 -mt-4 mb-6 border-b border-gray-200 bg-white sm:-mx-6 sm:-mt-6 lg:-mx-8 lg:-mt-8">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <Link href="/admin/classrooms" className="text-gray-600 hover:text-gray-900">
              <i className="fa-solid fa-arrow-left"></i>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                {mode === "create" ? "Tạo lớp học mới" : "Chỉnh sửa lớp học"}
              </h1>
              <p className="text-sm text-gray-500">
                {mode === "create"
                  ? "Thiết lập lớp học và phân công học sinh"
                  : "Cập nhật thông tin lớp học đang quản lý"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {canDelete && mode === "edit" ? (
              <button onClick={handleDelete} disabled={deleting || saving} className="btn btn-danger">
                {deleting ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin"></i> Đang xóa...
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-trash"></i> Xóa lớp
                  </>
                )}
              </button>
            ) : null}
            <button onClick={handleSave} disabled={saving || deleting} className="btn btn-success">
              {saving ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin"></i> Đang lưu...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-floppy-disk"></i>
                  {mode === "create" ? "Tạo lớp" : "Lưu thay đổi"}
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl space-y-6">
        <div className="card p-6">
          <h2 className="text-lg font-bold text-gray-900">Thông tin lớp học</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Tên lớp <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                className="input"
                placeholder="Ví dụ: Python tối thứ 7"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Giáo viên phụ trách <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.teacherId}
                onChange={(e) => setFormData((prev) => ({ ...prev, teacherId: e.target.value }))}
                className="input"
                disabled={!canChangeTeacher}
              >
                <option value="">-- Chọn giáo viên --</option>
                {teachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.name} ({teacher.email})
                  </option>
                ))}
              </select>
              {!canChangeTeacher ? (
                <p className="mt-2 text-xs text-gray-500">
                  Giáo viên chỉ được sửa lớp mình phụ trách, không được đổi giáo viên quản lý.
                </p>
              ) : null}
            </div>
          </div>

          <div className="mt-4">
            <label className="mb-2 block text-sm font-medium text-gray-700">Mô tả</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              className="input min-h-[100px]"
              placeholder="Mô tả ngắn về lớp học..."
            />
          </div>
        </div>

        <div className="card p-6">
          <h2 className="text-lg font-bold text-gray-900">Lịch học</h2>
          <p className="mt-1 text-sm text-gray-500">
            Chọn các buổi học lặp hàng tuần (vd: thứ 3 &amp; thứ 5). Hệ thống sẽ sinh các
            buổi học cụ thể trong khoảng thời gian khóa học và dùng buổi kế tiếp làm hạn
            nộp mặc định cho bài tập.
          </p>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Ngày bắt đầu khóa học
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Ngày kết thúc{" "}
                <span className="font-normal text-gray-400">
                  (để trống = tự sinh 16 tuần)
                </span>
              </label>
              <input
                type="date"
                value={endDate}
                min={startDate || undefined}
                onChange={(e) => setEndDate(e.target.value)}
                className="input"
              />
            </div>
          </div>

          <div className="mt-5 space-y-2">
            {WEEKDAYS.map((day) => {
              const config = dayConfigs[day.value];
              return (
                <div
                  key={day.value}
                  className={`flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center ${
                    config.enabled ? "border-indigo-200 bg-indigo-50" : "border-gray-200"
                  }`}
                >
                  <label className="flex w-32 cursor-pointer items-center gap-3">
                    <input
                      type="checkbox"
                      checked={config.enabled}
                      onChange={(e) => updateDay(day.value, { enabled: e.target.checked })}
                      className="h-5 w-5 rounded text-indigo-600"
                    />
                    <span className="font-medium text-gray-900">{day.label}</span>
                  </label>

                  {config.enabled ? (
                    <div className="flex flex-wrap items-center gap-3 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">Bắt đầu</span>
                        <input
                          type="time"
                          value={config.startTime}
                          onChange={(e) => updateDay(day.value, { startTime: e.target.value })}
                          className="input w-32"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">Kết thúc</span>
                        <input
                          type="time"
                          value={config.endTime}
                          onChange={(e) => updateDay(day.value, { endTime: e.target.value })}
                          className="input w-32"
                        />
                      </div>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400">Không học</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="card p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-bold text-gray-900">
              Danh sách học sinh ({selectedStudents.length} đã chọn)
            </h2>
            {selectedStudents.length > 0 ? (
              <button
                type="button"
                onClick={() => setSelectedStudents([])}
                className="text-sm font-medium text-red-600 hover:text-red-700"
              >
                Bỏ chọn tất cả
              </button>
            ) : null}
          </div>

          <div className="mt-4">
            <input
              type="text"
              value={searchStudent}
              onChange={(e) => setSearchStudent(e.target.value)}
              placeholder="Tìm học sinh theo tên hoặc email..."
              className="input"
            />
          </div>

          <div className="mt-4 max-h-[420px] overflow-y-auto rounded-2xl border border-gray-200">
            {filteredStudents.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {filteredStudents.map((student) => {
                  const checked = selectedStudents.includes(student.id);

                  return (
                    <label
                      key={student.id}
                      className={`flex cursor-pointer items-center gap-3 p-4 transition ${
                        checked ? "bg-indigo-50" : "hover:bg-gray-50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleStudent(student.id)}
                        className="h-5 w-5 rounded text-indigo-600"
                      />
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 text-sm font-semibold text-gray-600">
                        {student.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-gray-900">{student.name}</div>
                        <div className="text-sm text-gray-500">{student.email}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500">Không tìm thấy học sinh phù hợp.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
