"use client";

import { useDeferredValue, useState } from "react";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  _count: { submissions: number };
}

interface AdminUsersClientPageProps {
  initialUsers: User[];
}

export default function AdminUsersClientPage({ initialUsers }: AdminUsersClientPageProps) {
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [filter, setFilter] = useState<"all" | "admin" | "teacher" | "student">("all");
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const deferredSearch = useDeferredValue(search);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "student",
  });

  async function loadUsers() {
    try {
      const res = await fetch("/api/admin/users/list");
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (error) {
      console.error("Failed to load:", error);
    }
  }

  const openCreateModal = () => {
    setEditingUser(null);
    setFormData({ name: "", email: "", password: "", role: "student" });
    setShowModal(true);
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setFormData({ name: user.name, email: user.email, password: "", role: user.role });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.email.trim()) {
      alert("Vui lòng nhập đầy đủ thông tin!");
      return;
    }
    if (!editingUser && !formData.password) {
      alert("Vui lòng nhập mật khẩu!");
      return;
    }

    setSaving(true);
    try {
      const url = editingUser
        ? `/api/admin/users/${editingUser.id}`
        : "/api/admin/users/create";

      const res = await fetch(url, {
        method: editingUser ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setShowModal(false);
        loadUsers();
      } else {
        const data = await res.json();
        alert(data.error || "Lỗi!");
      }
    } catch {
      alert("Đã xảy ra lỗi!");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (user: User) => {
    if (
      !confirm(
        `Bạn có chắc muốn xóa tài khoản "${user.name}" (${user.email})?\n\nTất cả dữ liệu liên quan sẽ bị xóa vĩnh viễn!`
      )
    ) {
      return;
    }

    setDeletingId(user.id);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, { method: "DELETE" });
      if (res.ok) {
        setUsers((prev) => prev.filter((u) => u.id !== user.id));
      } else {
        const data = await res.json();
        alert(data.error || "Lỗi khi xóa!");
      }
    } catch {
      alert("Đã xảy ra lỗi!");
    } finally {
      setDeletingId(null);
    }
  };

  const normalizedSearch = deferredSearch.trim().toLowerCase();
  const filteredUsers = users.filter((user) => {
    const matchesFilter = filter === "all" || user.role === filter;
    const matchesSearch =
      normalizedSearch.length === 0 ||
      user.name.toLowerCase().includes(normalizedSearch) ||
      user.email.toLowerCase().includes(normalizedSearch);
    return matchesFilter && matchesSearch;
  });

  const stats = {
    total: users.length,
    admin: users.filter((u) => u.role === "admin").length,
    teacher: users.filter((u) => u.role === "teacher").length,
    student: users.filter((u) => u.role === "student").length,
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return (
          <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-medium">
            Admin
          </span>
        );
      case "teacher":
        return (
          <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
            Giáo viên
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
            Học sinh
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm kiếm theo tên hoặc email..."
          className="input max-w-sm"
        />
        <button onClick={openCreateModal} className="btn btn-primary shrink-0">
          <i className="fa-solid fa-plus"></i>
          Thêm người dùng
        </button>
      </div>

      {/* Stats filter */}
      <div className="grid grid-cols-4 gap-4">
        <button
          onClick={() => setFilter("all")}
          className={`card p-4 text-left transition-all ${filter === "all" ? "ring-2 ring-indigo-500" : ""}`}
        >
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          <div className="text-sm text-gray-500">Tổng cộng</div>
        </button>
        <button
          onClick={() => setFilter("admin")}
          className={`card p-4 text-left transition-all ${filter === "admin" ? "ring-2 ring-red-500" : ""}`}
        >
          <div className="text-2xl font-bold text-red-600">{stats.admin}</div>
          <div className="text-sm text-gray-500">Admin</div>
        </button>
        <button
          onClick={() => setFilter("teacher")}
          className={`card p-4 text-left transition-all ${filter === "teacher" ? "ring-2 ring-purple-500" : ""}`}
        >
          <div className="text-2xl font-bold text-purple-600">{stats.teacher}</div>
          <div className="text-sm text-gray-500">Giáo viên</div>
        </button>
        <button
          onClick={() => setFilter("student")}
          className={`card p-4 text-left transition-all ${filter === "student" ? "ring-2 ring-blue-500" : ""}`}
        >
          <div className="text-2xl font-bold text-blue-600">{stats.student}</div>
          <div className="text-sm text-gray-500">Học sinh</div>
        </button>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left p-4 font-semibold text-gray-700">Người dùng</th>
              <th className="text-left p-4 font-semibold text-gray-700">Vai trò</th>
              <th className="text-left p-4 font-semibold text-gray-700">Bài nộp</th>
              <th className="text-left p-4 font-semibold text-gray-700">Ngày tạo</th>
              <th className="text-right p-4 font-semibold text-gray-700">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredUsers.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white font-medium">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{user.name}</div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </div>
                  </div>
                </td>
                <td className="p-4">{getRoleBadge(user.role)}</td>
                <td className="p-4">
                  <span className="text-gray-600">{user._count.submissions}</span>
                </td>
                <td className="p-4">
                  <span className="text-sm text-gray-500">
                    {new Date(user.createdAt).toLocaleDateString("vi-VN")}
                  </span>
                </td>
                <td className="p-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => openEditModal(user)}
                      className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                    >
                      <i className="fa-solid fa-pen"></i>
                    </button>
                    <button
                      onClick={() => handleDelete(user)}
                      disabled={deletingId === user.id}
                      className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      {deletingId === user.id ? (
                        <i className="fa-solid fa-spinner fa-spin"></i>
                      ) : (
                        <i className="fa-solid fa-trash"></i>
                      )}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredUsers.length === 0 && (
          <div className="p-12 text-center text-gray-500">
            <i className="fa-solid fa-users-slash text-4xl mb-4"></i>
            <p>Không tìm thấy người dùng nào</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                {editingUser ? "Sửa người dùng" : "Thêm người dùng mới"}
              </h2>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Họ và tên <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mật khẩu{" "}
                  {!editingUser && <span className="text-red-500">*</span>}
                  {editingUser && (
                    <span className="text-gray-400 text-xs ml-1">(để trống nếu không đổi)</span>
                  )}
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder={editingUser ? "••••••" : ""}
                  className="input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Vai trò</label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: "student", label: "Học sinh", emoji: "🎓", active: "border-blue-500 bg-blue-50" },
                    { value: "teacher", label: "Giáo viên", emoji: "👨‍🏫", active: "border-purple-500 bg-purple-50" },
                    { value: "admin", label: "Admin", emoji: "👑", active: "border-red-500 bg-red-50" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, role: opt.value })}
                      className={`p-3 rounded-xl border-2 transition-all text-center ${
                        formData.role === opt.value ? opt.active : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="text-xl mb-1">{opt.emoji}</div>
                      <div className="text-sm font-medium">{opt.label}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex items-center justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="btn btn-secondary">
                Hủy
              </button>
              <button onClick={handleSave} disabled={saving} className="btn btn-primary">
                {saving ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin"></i> Đang lưu...
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-save"></i>{" "}
                    {editingUser ? "Cập nhật" : "Tạo mới"}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
