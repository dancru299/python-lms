"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Chapter {
  id: string;
  title: string;
  description: string | null;
  icon: string;
  color: string;
  sortOrder: number;
  isLocked: boolean;
  _count: { lessons: number };
}

export default function AdminChaptersPage() {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingChapter, setEditingChapter] = useState<Chapter | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    icon: "fa-book",
    color: "#3B82F6",
  });

  const iconOptions = [
    "fa-book", "fa-code", "fa-layer-group", "fa-database", "fa-server",
    "fa-laptop-code", "fa-terminal", "fa-file-code", "fa-sitemap", "fa-gears",
    "fa-puzzle-piece", "fa-lightbulb", "fa-graduation-cap", "fa-rocket", "fa-star"
  ];

  const colorOptions = [
    "#3B82F6", "#8B5CF6", "#EC4899", "#EF4444", "#F97316",
    "#EAB308", "#22C55E", "#14B8A6", "#06B6D4", "#6366F1"
  ];

  useEffect(() => {
    loadChapters();
  }, []);

  async function loadChapters() {
    try {
      const res = await fetch("/api/admin/chapters");
      if (res.ok) {
        const data = await res.json();
        setChapters(data);
      }
    } catch (error) {
      console.error("Failed to load:", error);
    } finally {
      setLoading(false);
    }
  }

  const openCreateModal = () => {
    setEditingChapter(null);
    setFormData({ title: "", description: "", icon: "fa-book", color: "#3B82F6" });
    setShowModal(true);
  };

  const openEditModal = (chapter: Chapter) => {
    setEditingChapter(chapter);
    setFormData({
      title: chapter.title,
      description: chapter.description || "",
      icon: chapter.icon,
      color: chapter.color,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      alert("Vui lòng nhập tên chương!");
      return;
    }

    setSaving(true);
    try {
      const url = editingChapter 
        ? `/api/admin/chapters/${editingChapter.id}` 
        : "/api/admin/chapters";
      
      const res = await fetch(url, {
        method: editingChapter ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setShowModal(false);
        loadChapters();
      } else {
        const data = await res.json();
        alert(data.error || "Lỗi!");
      }
    } catch (error) {
      alert("Đã xảy ra lỗi!");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (chapter: Chapter) => {
    if (chapter._count.lessons > 0) {
      alert(`Không thể xóa chương "${chapter.title}" vì vẫn còn ${chapter._count.lessons} bài giảng!\n\nVui lòng xóa hết bài giảng trong chương trước.`);
      return;
    }

    if (!confirm(`Bạn có chắc muốn xóa chương "${chapter.title}"?`)) {
      return;
    }

    setDeletingId(chapter.id);
    try {
      const res = await fetch(`/api/admin/chapters/${chapter.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setChapters(prev => prev.filter(c => c.id !== chapter.id));
      } else {
        const data = await res.json();
        alert(data.error || "Lỗi khi xóa!");
      }
    } catch (error) {
      alert("Đã xảy ra lỗi!");
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/admin" className="text-gray-600 hover:text-gray-900">
                <i className="fa-solid fa-arrow-left"></i>
              </Link>
              <h1 className="text-xl font-bold text-gray-900">📚 Quản lý Chương học</h1>
            </div>
            <button onClick={openCreateModal} className="btn btn-primary">
              <i className="fa-solid fa-plus"></i>
              Tạo chương mới
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {chapters.length === 0 ? (
          <div className="card p-12 text-center">
            <i className="fa-solid fa-folder-open text-6xl text-gray-300 mb-4"></i>
            <h2 className="text-xl font-bold text-gray-700 mb-2">Chưa có chương học nào</h2>
            <p className="text-gray-500 mb-6">Tạo chương học để bắt đầu thêm bài giảng</p>
            <button onClick={openCreateModal} className="btn btn-primary">
              <i className="fa-solid fa-plus"></i>
              Tạo chương học đầu tiên
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {chapters.map((chapter) => (
              <div key={chapter.id} className="card overflow-hidden group">
                <div 
                  className="p-4"
                  style={{ background: `linear-gradient(135deg, ${chapter.color}20, ${chapter.color}05)` }}
                >
                  <div className="flex items-center justify-between">
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: chapter.color + "30", color: chapter.color }}
                    >
                      <i className={`fa-solid ${chapter.icon} text-xl`}></i>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => openEditModal(chapter)}
                        className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-white rounded-lg"
                      >
                        <i className="fa-solid fa-pen"></i>
                      </button>
                      <button 
                        onClick={() => handleDelete(chapter)}
                        disabled={deletingId === chapter.id}
                        className="p-2 text-gray-500 hover:text-red-600 hover:bg-white rounded-lg"
                      >
                        {deletingId === chapter.id ? (
                          <i className="fa-solid fa-spinner fa-spin"></i>
                        ) : (
                          <i className="fa-solid fa-trash"></i>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="p-4">
                  <h3 className="font-bold text-gray-900 mb-1">{chapter.title}</h3>
                  {chapter.description && (
                    <p className="text-sm text-gray-500 mb-3 line-clamp-2">{chapter.description}</p>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">
                      <i className="fa-solid fa-file-lines mr-1"></i>
                      {chapter._count.lessons} bài giảng
                    </span>
                    {chapter.isLocked && (
                      <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                        <i className="fa-solid fa-lock mr-1"></i>Đã khóa
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                {editingChapter ? "Sửa chương học" : "Tạo chương học mới"}
              </h2>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tên chương <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Ví dụ: Cấu trúc dữ liệu cơ bản"
                  className="input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Mô tả ngắn về chương học..."
                  className="input min-h-[80px]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Icon</label>
                <div className="flex flex-wrap gap-2">
                  {iconOptions.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setFormData({ ...formData, icon })}
                      className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
                        formData.icon === icon
                          ? "bg-indigo-100 text-indigo-600 ring-2 ring-indigo-500"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      <i className={`fa-solid ${icon}`}></i>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Màu sắc</label>
                <div className="flex flex-wrap gap-2">
                  {colorOptions.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData({ ...formData, color })}
                      className={`w-10 h-10 rounded-lg transition-all ${
                        formData.color === color ? "ring-2 ring-offset-2 ring-gray-400" : ""
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 mb-2">Xem trước:</p>
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: formData.color + "30", color: formData.color }}
                  >
                    <i className={`fa-solid ${formData.icon}`}></i>
                  </div>
                  <span className="font-medium text-gray-900">
                    {formData.title || "Tên chương"}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex items-center justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="btn btn-secondary">
                Hủy
              </button>
              <button onClick={handleSave} disabled={saving} className="btn btn-primary">
                {saving ? (
                  <><i className="fa-solid fa-spinner fa-spin"></i> Đang lưu...</>
                ) : (
                  <><i className="fa-solid fa-save"></i> {editingChapter ? "Cập nhật" : "Tạo mới"}</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
