"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface User {
  id: string;
  name: string;
  email: string;
}

export default function NewClassroomPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [searchStudent, setSearchStudent] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    teacherId: "",
  });

  // Load teachers and students
  useEffect(() => {
    async function loadUsers() {
      try {
        const res = await fetch("/api/admin/users");
        if (res.ok) {
          const data = await res.json();
          setTeachers(data.teachers);
          setStudents(data.students);
        }
      } catch (error) {
        console.error("Failed to load users:", error);
      }
    }
    loadUsers();
  }, []);

  const toggleStudent = (studentId: string) => {
    setSelectedStudents((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    );
  };

  const filteredStudents = students.filter(
    (s) =>
      s.name.toLowerCase().includes(searchStudent.toLowerCase()) ||
      s.email.toLowerCase().includes(searchStudent.toLowerCase())
  );

  const handleSave = async () => {
    if (!formData.name.trim()) {
      alert("Vui lòng nhập tên lớp!");
      return;
    }
    if (!formData.teacherId) {
      alert("Vui lòng chọn giáo viên chủ nhiệm!");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/classrooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          studentIds: selectedStudents,
        }),
      });

      if (res.ok) {
        router.push("/admin/classrooms");
      } else {
        const data = await res.json();
        alert(data.error || "Lỗi khi tạo lớp học!");
      }
    } catch (error) {
      alert("Đã xảy ra lỗi!");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/admin/classrooms" className="text-gray-600 hover:text-gray-900">
                <i className="fa-solid fa-arrow-left text-lg"></i>
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-900">🏫 Tạo Lớp Học Mới</h1>
                <p className="text-sm text-gray-500">Thiết lập lớp học và thêm học sinh</p>
              </div>
            </div>
            <button onClick={handleSave} disabled={saving} className="btn btn-success">
              {saving ? (
                <><i className="fa-solid fa-spinner fa-spin"></i> Đang lưu...</>
              ) : (
                <><i className="fa-solid fa-save"></i> Tạo lớp</>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Basic Info */}
        <div className="card p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            <i className="fa-solid fa-info-circle mr-2 text-indigo-600"></i>
            Thông tin lớp học
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tên lớp <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ví dụ: Python Cơ Bản K1"
                className="input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mô tả (tùy chọn)
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Mô tả ngắn về lớp học..."
                className="input min-h-[80px]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Giáo viên chủ nhiệm <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.teacherId}
                onChange={(e) => setFormData({ ...formData, teacherId: e.target.value })}
                className="input"
              >
                <option value="">-- Chọn giáo viên --</option>
                {teachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.name} ({teacher.email})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Select Students */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">
              <i className="fa-solid fa-user-graduate mr-2 text-green-600"></i>
              Thêm học sinh ({selectedStudents.length} đã chọn)
            </h2>
          </div>

          <div className="mb-4">
            <input
              type="text"
              value={searchStudent}
              onChange={(e) => setSearchStudent(e.target.value)}
              placeholder="Tìm kiếm học sinh theo tên hoặc email..."
              className="input"
            />
          </div>

          <div className="max-h-[400px] overflow-y-auto border border-gray-200 rounded-lg">
            {filteredStudents.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <i className="fa-solid fa-users-slash text-3xl mb-2"></i>
                <p>Không tìm thấy học sinh nào</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredStudents.map((student) => (
                  <label
                    key={student.id}
                    className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50 ${
                      selectedStudents.includes(student.id) ? "bg-green-50" : ""
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedStudents.includes(student.id)}
                      onChange={() => toggleStudent(student.id)}
                      className="w-5 h-5 text-green-600 rounded"
                    />
                    <div className="w-9 h-9 bg-gray-200 rounded-full flex items-center justify-center text-sm font-medium text-gray-600">
                      {student.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{student.name}</div>
                      <div className="text-sm text-gray-500">{student.email}</div>
                    </div>
                    {selectedStudents.includes(student.id) && (
                      <span className="text-green-600">
                        <i className="fa-solid fa-check-circle"></i>
                      </span>
                    )}
                  </label>
                ))}
              </div>
            )}
          </div>

          {selectedStudents.length > 0 && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-green-700">
                  <i className="fa-solid fa-check mr-2"></i>
                  Đã chọn {selectedStudents.length} học sinh
                </span>
                <button
                  onClick={() => setSelectedStudents([])}
                  className="text-sm text-red-600 hover:text-red-700"
                >
                  Bỏ chọn tất cả
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between py-4">
          <Link href="/admin/classrooms" className="btn btn-secondary">
            <i className="fa-solid fa-times"></i> Hủy bỏ
          </Link>
          <button onClick={handleSave} disabled={saving} className="btn btn-success btn-lg">
            {saving ? (
              <><i className="fa-solid fa-spinner fa-spin"></i> Đang lưu...</>
            ) : (
              <><i className="fa-solid fa-save"></i> Tạo lớp học</>
            )}
          </button>
        </div>
      </main>
    </div>
  );
}
