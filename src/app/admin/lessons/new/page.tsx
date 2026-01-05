"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

interface Section {
  id: string;
  title: string;
  content: string;
}

interface Exercise {
  id: string;
  type: "practice" | "homework";
  title: string;
  question: string;
  answer: string;
  difficulty: "easy" | "medium" | "hard";
  points: number;
}

interface Chapter {
  id: string;
  title: string;
}

// Template definitions
const CONTENT_TEMPLATES = [
  {
    id: "heading-section",
    name: "Tiêu đề + Nội dung",
    icon: "fa-heading",
    description: "Tiêu đề lớn với đoạn văn bản",
    code: `<h2>1. Tiêu đề chính</h2>
<p>Nội dung đoạn văn bản ở đây. Bạn có thể viết nhiều dòng và sử dụng <strong>in đậm</strong> hoặc <code>inline code</code>.</p>

<h3>1.1. Tiêu đề phụ</h3>
<p>Nội dung chi tiết hơn cho phần này...</p>`,
  },
  {
    id: "code-example",
    name: "Ví dụ Code Python",
    icon: "fa-code",
    description: "Block code với giải thích",
    code: `<h3>Ví dụ:</h3>
<p>Đoạn code dưới đây minh họa cách sử dụng...</p>
<div class="code-block">
# Đây là comment
my_variable = "Hello World"
print(my_variable)

# Kết quả: Hello World
</div>
<p><strong>Giải thích:</strong> Dòng 1 tạo biến, dòng 2 in ra màn hình.</p>`,
  },
  {
    id: "table-info",
    name: "Bảng thông tin",
    icon: "fa-table",
    description: "Bảng so sánh hoặc định nghĩa",
    code: `<h3>Bảng tóm tắt:</h3>
<table>
  <thead>
    <tr>
      <th>Thuộc tính</th>
      <th>Mô tả</th>
      <th>Ví dụ</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Tên 1</strong></td>
      <td>Mô tả cho thuộc tính 1</td>
      <td><code>ví dụ code</code></td>
    </tr>
    <tr>
      <td><strong>Tên 2</strong></td>
      <td>Mô tả cho thuộc tính 2</td>
      <td><code>ví dụ code</code></td>
    </tr>
  </tbody>
</table>`,
  },
  {
    id: "list-items",
    name: "Danh sách",
    icon: "fa-list",
    description: "Danh sách có thứ tự hoặc không",
    code: `<h3>Các điểm chính:</h3>
<ul>
  <li><strong>Điểm 1:</strong> Giải thích chi tiết cho điểm này.</li>
  <li><strong>Điểm 2:</strong> Giải thích chi tiết cho điểm này.</li>
  <li><strong>Điểm 3:</strong> Giải thích chi tiết cho điểm này.</li>
</ul>

<h3>Các bước thực hiện:</h3>
<ol>
  <li>Bước đầu tiên cần làm</li>
  <li>Bước thứ hai tiếp theo</li>
  <li>Bước cuối cùng hoàn thành</li>
</ol>`,
  },
  {
    id: "note-tip",
    name: "Ghi chú / Mẹo",
    icon: "fa-lightbulb",
    description: "Hộp ghi chú nổi bật",
    code: `<div style="background: #fef3c7; border: 1px solid #f59e0b; padding: 1rem; border-radius: 0.5rem; margin: 1rem 0;">
  <p style="margin: 0; color: #92400e;">
    <strong>💡 Mẹo:</strong> Đây là một mẹo hữu ích mà học sinh nên ghi nhớ!
  </p>
</div>

<div style="background: #dbeafe; border: 1px solid #3b82f6; padding: 1rem; border-radius: 0.5rem; margin: 1rem 0;">
  <p style="margin: 0; color: #1e40af;">
    <strong>📌 Lưu ý:</strong> Điều quan trọng cần chú ý khi học phần này.
  </p>
</div>`,
  },
  {
    id: "problem-solution",
    name: "Đặt vấn đề + Giải pháp",
    icon: "fa-puzzle-piece",
    description: "Trình bày vấn đề và giải pháp",
    code: `<h2>1. Đặt Vấn Đề</h2>
<p><strong>Tình huống:</strong> Mô tả tình huống thực tế mà học sinh có thể gặp phải...</p>
<ul>
  <li><strong>Khó khăn 1:</strong> Giải thích vấn đề đầu tiên.</li>
  <li><strong>Khó khăn 2:</strong> Giải thích vấn đề thứ hai.</li>
</ul>

<p>➡️ <strong>Giải pháp:</strong> Giới thiệu khái niệm/công cụ sẽ giải quyết vấn đề này!</p>

<h2>2. Cách Giải Quyết</h2>
<div class="code-block">
# Code minh họa giải pháp
solution = "Đây là giải pháp"
print(solution)
</div>`,
  },
  {
    id: "comparison",
    name: "So sánh",
    icon: "fa-arrows-left-right",
    description: "So sánh 2 khái niệm",
    code: `<h3>So sánh A và B:</h3>
<table>
  <thead>
    <tr>
      <th>Tiêu chí</th>
      <th>Khái niệm A</th>
      <th>Khái niệm B</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Định nghĩa</strong></td>
      <td>Mô tả A</td>
      <td>Mô tả B</td>
    </tr>
    <tr>
      <td><strong>Cú pháp</strong></td>
      <td><code>syntax_a</code></td>
      <td><code>syntax_b</code></td>
    </tr>
    <tr>
      <td><strong>Ưu điểm</strong></td>
      <td>Ưu điểm của A</td>
      <td>Ưu điểm của B</td>
    </tr>
  </tbody>
</table>

<p><strong>Kết luận:</strong> Khi nào dùng A, khi nào dùng B...</p>`,
  },
  {
    id: "visual-diagram",
    name: "Sơ đồ trực quan",
    icon: "fa-diagram-project",
    description: "Sơ đồ minh họa bằng HTML",
    code: `<h3>Sơ đồ minh họa:</h3>
<div style="background: #f3f4f6; padding: 1rem; border-radius: 0.5rem; margin: 1rem 0;">
  <div style="display: flex; flex-direction: column; align-items: center; gap: 0.5rem;">
    <!-- Index dương -->
    <div style="display: flex; gap: 0.5rem; font-family: monospace; color: #3b82f6;">
      <span style="width: 2.5rem; text-align: center;">0</span>
      <span style="width: 2.5rem; text-align: center;">1</span>
      <span style="width: 2.5rem; text-align: center;">2</span>
      <span style="width: 2.5rem; text-align: center;">3</span>
      <span style="width: 2.5rem; text-align: center;">4</span>
    </div>
    <!-- Boxes -->
    <div style="display: flex; gap: 0.5rem;">
      <div style="width: 2.5rem; height: 2.5rem; background: #3b82f6; color: white; display: flex; align-items: center; justify-content: center; border-radius: 0.25rem; font-weight: bold;">'A'</div>
      <div style="width: 2.5rem; height: 2.5rem; background: #3b82f6; color: white; display: flex; align-items: center; justify-content: center; border-radius: 0.25rem; font-weight: bold;">'B'</div>
      <div style="width: 2.5rem; height: 2.5rem; background: #3b82f6; color: white; display: flex; align-items: center; justify-content: center; border-radius: 0.25rem; font-weight: bold;">'C'</div>
      <div style="width: 2.5rem; height: 2.5rem; background: #3b82f6; color: white; display: flex; align-items: center; justify-content: center; border-radius: 0.25rem; font-weight: bold;">'D'</div>
      <div style="width: 2.5rem; height: 2.5rem; background: #3b82f6; color: white; display: flex; align-items: center; justify-content: center; border-radius: 0.25rem; font-weight: bold;">'E'</div>
    </div>
    <!-- Index âm -->
    <div style="display: flex; gap: 0.5rem; font-family: monospace; color: #ef4444;">
      <span style="width: 2.5rem; text-align: center;">-5</span>
      <span style="width: 2.5rem; text-align: center;">-4</span>
      <span style="width: 2.5rem; text-align: center;">-3</span>
      <span style="width: 2.5rem; text-align: center;">-2</span>
      <span style="width: 2.5rem; text-align: center;">-1</span>
    </div>
  </div>
</div>`,
  },
];

function NewLessonContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedChapter = searchParams.get("chapterId") || "";

  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templateTargetSection, setTemplateTargetSection] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    chapterId: preselectedChapter,
    title: "",
    duration: 120,
    difficulty: "beginner",
    objectives: {
      knowledge: "",
      skills: "",
      attitude: "",
    },
  });

  const [sections, setSections] = useState<Section[]>([
    { id: "sec-1", title: "Khái niệm", content: "" },
    { id: "sec-2", title: "Ví dụ minh họa", content: "" },
    { id: "sec-3", title: "Thực hành", content: "" },
  ]);

  const [exercises, setExercises] = useState<Exercise[]>([]);

  // Load chapters
  useEffect(() => {
    async function loadChapters() {
      try {
        const res = await fetch("/api/chapters");
        if (res.ok) {
          const data = await res.json();
          setChapters(data);
        }
      } catch (error) {
        console.error("Failed to load chapters:", error);
      }
    }
    loadChapters();
  }, []);

  // Section handlers
  const addSection = () => {
    const newId = `sec-${Date.now()}`;
    setSections([...sections, { id: newId, title: "", content: "" }]);
    setActiveSection(newId);
  };

  const updateSection = (id: string, field: string, value: string) => {
    setSections(sections.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
  };

  const removeSection = (id: string) => {
    if (sections.length > 1) {
      setSections(sections.filter((s) => s.id !== id));
      if (activeSection === id) setActiveSection(null);
    }
  };

  const moveSection = (id: string, direction: "up" | "down") => {
    const index = sections.findIndex((s) => s.id === id);
    if (direction === "up" && index > 0) {
      const newSections = [...sections];
      [newSections[index - 1], newSections[index]] = [newSections[index], newSections[index - 1]];
      setSections(newSections);
    } else if (direction === "down" && index < sections.length - 1) {
      const newSections = [...sections];
      [newSections[index], newSections[index + 1]] = [newSections[index + 1], newSections[index]];
      setSections(newSections);
    }
  };

  // Template handlers
  const openTemplateModal = (sectionId: string) => {
    setTemplateTargetSection(sectionId);
    setShowTemplateModal(true);
  };

  const insertTemplate = (template: typeof CONTENT_TEMPLATES[0]) => {
    if (templateTargetSection) {
      const section = sections.find((s) => s.id === templateTargetSection);
      if (section) {
        const newContent = section.content + (section.content ? "\n\n" : "") + template.code;
        updateSection(templateTargetSection, "content", newContent);
      }
    }
    setShowTemplateModal(false);
    setTemplateTargetSection(null);
  };

  // Exercise handlers
  const addExercise = (type: "practice" | "homework") => {
    const count = exercises.filter((e) => e.type === type).length + 1;
    const newId = `ex-${Date.now()}`;
    setExercises([
      ...exercises,
      {
        id: newId,
        type,
        title: type === "practice" ? `Bài tập ${count}` : `BTVN ${count}`,
        question: "",
        answer: "",
        difficulty: "easy",
        points: type === "homework" ? 20 : 10,
      },
    ]);
  };

  const updateExercise = (id: string, field: string, value: string | number) => {
    setExercises(exercises.map((e) => (e.id === id ? { ...e, [field]: value } : e)));
  };

  const removeExercise = (id: string) => {
    setExercises(exercises.filter((e) => e.id !== id));
  };

  // Quick insert helpers
  const insertContent = (sectionId: string, content: string) => {
    const section = sections.find((s) => s.id === sectionId);
    if (section) {
      updateSection(sectionId, "content", section.content + (section.content ? "\n\n" : "") + content);
    }
  };

  // Save lesson
  const handleSave = async () => {
    if (!formData.chapterId) {
      alert("Vui lòng chọn chương học!");
      return;
    }
    if (!formData.title.trim()) {
      alert("Vui lòng nhập tên bài giảng!");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/lessons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          sections: sections.filter((s) => s.title.trim()),
          exercises: exercises.filter((e) => e.title.trim()),
        }),
      });

      if (res.ok) {
        router.push("/admin/lessons");
      } else {
        const data = await res.json();
        alert(data.error || "Lỗi khi tạo bài giảng!");
      }
    } catch (error) {
      alert("Đã xảy ra lỗi!");
    } finally {
      setSaving(false);
    }
  };

  const practiceExercises = exercises.filter((e) => e.type === "practice");
  const homeworkExercises = exercises.filter((e) => e.type === "homework");

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/admin/lessons" className="text-gray-600 hover:text-gray-900">
                <i className="fa-solid fa-arrow-left text-lg"></i>
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-900">📝 Tạo Bài Giảng Mới</h1>
                <p className="text-sm text-gray-500">Điền thông tin để tạo bài giảng hoàn chỉnh</p>
              </div>
            </div>
            <button onClick={handleSave} disabled={saving} className="btn btn-success">
              {saving ? (
                <><i className="fa-solid fa-spinner fa-spin"></i> Đang lưu...</>
              ) : (
                <><i className="fa-solid fa-save"></i> Lưu bài giảng</>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        
        {/* Section 1: Basic Info */}
        <div className="card p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center">
              <i className="fa-solid fa-info-circle"></i>
            </span>
            Thông tin cơ bản
          </h2>

          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Chương học <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.chapterId}
                onChange={(e) => setFormData({ ...formData, chapterId: e.target.value })}
                className="input"
              >
                <option value="">-- Chọn chương --</option>
                {chapters.map((chapter) => (
                  <option key={chapter.id} value={chapter.id}>
                    {chapter.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Độ khó</label>
              <select
                value={formData.difficulty}
                onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                className="input"
              >
                <option value="beginner">🟢 Cơ bản</option>
                <option value="intermediate">🟡 Trung bình</option>
                <option value="advanced">🔴 Nâng cao</option>
              </select>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tên bài giảng <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Ví dụ: List - Khái Niệm, Tạo và Truy Xuất"
              className="input text-lg font-medium"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Thời lượng (phút)</label>
            <input
              type="number"
              value={formData.duration}
              onChange={(e) => setFormData({ ...formData, duration: Number(e.target.value) })}
              min={15}
              className="input w-32"
            />
          </div>
        </div>

        {/* Section 2: Learning Objectives */}
        <div className="card p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
              <i className="fa-solid fa-bullseye"></i>
            </span>
            Mục tiêu bài giảng
          </h2>
          
          <p className="text-sm text-gray-500 mb-4">
            Định nghĩa những gì học sinh sẽ đạt được sau bài học này. Thông tin sẽ hiển thị ở trang Trang Chủ của bài giảng.
          </p>

          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <i className="fa-solid fa-brain text-blue-500 mr-1"></i>
                Kiến thức
              </label>
              <textarea
                value={formData.objectives.knowledge}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  objectives: { ...formData.objectives, knowledge: e.target.value } 
                })}
                placeholder="Ví dụ: Hiểu khái niệm List trong Python, biết các cách tạo và truy xuất List..."
                className="input min-h-[100px] text-sm"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <i className="fa-solid fa-hands text-green-500 mr-1"></i>
                Kỹ năng
              </label>
              <textarea
                value={formData.objectives.skills}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  objectives: { ...formData.objectives, skills: e.target.value } 
                })}
                placeholder="Ví dụ: Viết code tạo và thao tác với List, sử dụng slicing và index..."
                className="input min-h-[100px] text-sm"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <i className="fa-solid fa-heart text-red-500 mr-1"></i>
                Thái độ
              </label>
              <textarea
                value={formData.objectives.attitude}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  objectives: { ...formData.objectives, attitude: e.target.value } 
                })}
                placeholder="Ví dụ: Tự tin sử dụng List trong các bài toán thực tế, hứng thú tìm hiểu thêm..."
                className="input min-h-[100px] text-sm"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Content Tabs */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <span className="w-8 h-8 bg-green-100 text-green-600 rounded-lg flex items-center justify-center">
                <i className="fa-solid fa-layer-group"></i>
              </span>
              Nội dung bài giảng (Tabs)
            </h2>
            <button onClick={addSection} className="btn btn-secondary text-sm">
              <i className="fa-solid fa-plus"></i> Thêm tab
            </button>
          </div>

          <p className="text-sm text-gray-500 mb-4">
            Mỗi tab sẽ trở thành một phần riêng trong bài giảng. Sử dụng nút <strong>"Mẫu"</strong> để chèn template có sẵn.
          </p>

          <div className="space-y-3">
            {sections.map((section, index) => (
              <div
                key={section.id}
                className={`border rounded-lg overflow-hidden transition-all ${
                  activeSection === section.id ? "border-indigo-500 shadow-md" : "border-gray-200"
                }`}
              >
                {/* Section Header */}
                <div
                  className="flex items-center justify-between p-3 bg-gray-50 cursor-pointer"
                  onClick={() => setActiveSection(activeSection === section.id ? null : section.id)}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold text-sm">
                      {index + 1}
                    </span>
                    <input
                      type="text"
                      value={section.title}
                      onChange={(e) => { e.stopPropagation(); updateSection(section.id, "title", e.target.value); }}
                      onClick={(e) => e.stopPropagation()}
                      placeholder="Tên tab (vd: Khái niệm)"
                      className="font-medium text-gray-800 bg-transparent border-none focus:outline-none focus:ring-0 p-0"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); moveSection(section.id, "up"); }}
                      disabled={index === 0}
                      className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                    >
                      <i className="fa-solid fa-chevron-up"></i>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); moveSection(section.id, "down"); }}
                      disabled={index === sections.length - 1}
                      className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                    >
                      <i className="fa-solid fa-chevron-down"></i>
                    </button>
                    {sections.length > 1 && (
                      <button
                        onClick={(e) => { e.stopPropagation(); removeSection(section.id); }}
                        className="p-1 text-red-400 hover:text-red-600"
                      >
                        <i className="fa-solid fa-trash"></i>
                      </button>
                    )}
                    <i className={`fa-solid fa-chevron-${activeSection === section.id ? "up" : "down"} text-gray-400`}></i>
                  </div>
                </div>

                {/* Section Content Editor */}
                {activeSection === section.id && (
                  <div className="p-4 border-t border-gray-200 bg-white">
                    {/* Toolbar */}
                    <div className="flex flex-wrap items-center gap-2 mb-3 pb-3 border-b border-gray-100">
                      <span className="text-xs text-gray-500 mr-2">Chèn nhanh:</span>
                      
                      {/* Template Button - HIGHLIGHTED */}
                      <button
                        type="button"
                        onClick={() => openTemplateModal(section.id)}
                        className="px-3 py-1.5 text-sm bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg font-medium"
                      >
                        <i className="fa-solid fa-wand-magic-sparkles mr-1"></i> Mẫu
                      </button>
                      
                      <div className="w-px h-6 bg-gray-200"></div>
                      
                      <button
                        type="button"
                        onClick={() => insertContent(section.id, `<div class="code-block">\n# Code ở đây\nprint("Hello")\n</div>`)}
                        className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
                      >
                        <i className="fa-solid fa-code mr-1"></i> Code
                      </button>
                      <button
                        type="button"
                        onClick={() => insertContent(section.id, `<table>\n  <thead>\n    <tr>\n      <th>Cột 1</th>\n      <th>Cột 2</th>\n    </tr>\n  </thead>\n  <tbody>\n    <tr>\n      <td>Dữ liệu</td>\n      <td>Dữ liệu</td>\n    </tr>\n  </tbody>\n</table>`)}
                        className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
                      >
                        <i className="fa-solid fa-table mr-1"></i> Bảng
                      </button>
                      <button
                        type="button"
                        onClick={() => insertContent(section.id, `<ul>\n  <li>Mục 1</li>\n  <li>Mục 2</li>\n  <li>Mục 3</li>\n</ul>`)}
                        className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
                      >
                        <i className="fa-solid fa-list mr-1"></i> List
                      </button>
                      <button
                        type="button"
                        onClick={() => insertContent(section.id, `<h2>Tiêu đề lớn</h2>`)}
                        className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
                      >
                        <i className="fa-solid fa-heading mr-1"></i> H2
                      </button>
                      <button
                        type="button"
                        onClick={() => insertContent(section.id, `<h3>Tiêu đề phụ</h3>`)}
                        className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
                      >
                        H3
                      </button>
                    </div>

                    <textarea
                      value={section.content}
                      onChange={(e) => updateSection(section.id, "content", e.target.value)}
                      placeholder={`Nội dung HTML của tab "${section.title}"...

💡 Nhấn nút "Mẫu" ở trên để chọn template có sẵn!`}
                      className="input min-h-[300px] font-mono text-sm"
                      style={{ whiteSpace: "pre-wrap" }}
                    />

                    <p className="text-xs text-gray-400 mt-2">
                      💡 Code block sẽ hiển thị đúng format xuống dòng như bạn nhập vào
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Section 3: Exercises */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <span className="w-8 h-8 bg-orange-100 text-orange-600 rounded-lg flex items-center justify-center">
                <i className="fa-solid fa-dumbbell"></i>
              </span>
              Bài tập
            </h2>
            <div className="flex gap-2">
              <button onClick={() => addExercise("practice")} className="btn btn-secondary text-sm">
                <i className="fa-solid fa-plus"></i> Luyện tập
              </button>
              <button onClick={() => addExercise("homework")} className="btn btn-secondary text-sm">
                <i className="fa-solid fa-plus"></i> BTVN
              </button>
            </div>
          </div>

          {exercises.length === 0 ? (
            <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
              <i className="fa-solid fa-clipboard-list text-4xl mb-3"></i>
              <p>Chưa có bài tập nào</p>
              <p className="text-sm">Nhấn nút "Luyện tập" hoặc "BTVN" để thêm</p>
            </div>
          ) : (
            <div className="space-y-4">
              {practiceExercises.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-orange-600 uppercase tracking-wide mb-3">
                    <i className="fa-solid fa-dumbbell mr-2"></i>
                    Bài Luyện Tập ({practiceExercises.length})
                  </h3>
                  <div className="space-y-3">
                    {practiceExercises.map((exercise, index) => (
                      <ExerciseEditor key={exercise.id} exercise={exercise} index={index} onUpdate={updateExercise} onRemove={removeExercise} />
                    ))}
                  </div>
                </div>
              )}

              {homeworkExercises.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm font-semibold text-purple-600 uppercase tracking-wide mb-3">
                    <i className="fa-solid fa-house-laptop mr-2"></i>
                    Bài Tập Về Nhà ({homeworkExercises.length})
                  </h3>
                  <div className="space-y-3">
                    {homeworkExercises.map((exercise, index) => (
                      <ExerciseEditor key={exercise.id} exercise={exercise} index={index} onUpdate={updateExercise} onRemove={removeExercise} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between py-4">
          <Link href="/admin/lessons" className="btn btn-secondary">
            <i className="fa-solid fa-times"></i> Hủy bỏ
          </Link>
          <button onClick={handleSave} disabled={saving} className="btn btn-success btn-lg">
            {saving ? (
              <><i className="fa-solid fa-spinner fa-spin"></i> Đang lưu...</>
            ) : (
              <><i className="fa-solid fa-save"></i> Lưu bài giảng</>
            )}
          </button>
        </div>
      </main>

      {/* Template Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  <i className="fa-solid fa-wand-magic-sparkles mr-2 text-indigo-600"></i>
                  Chọn Template
                </h2>
                <p className="text-sm text-gray-500 mt-1">Chọn mẫu để chèn vào nội dung bài giảng</p>
              </div>
              <button
                onClick={() => setShowTemplateModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <i className="fa-solid fa-times text-xl"></i>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-100px)]">
              <div className="grid md:grid-cols-2 gap-4">
                {CONTENT_TEMPLATES.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => insertTemplate(template)}
                    className="text-left p-4 border border-gray-200 rounded-xl hover:border-indigo-500 hover:shadow-md transition-all group"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                        <i className={`fa-solid ${template.icon}`}></i>
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{template.name}</h3>
                        <p className="text-sm text-gray-500">{template.description}</p>
                      </div>
                    </div>
                    <div className="mt-3 p-2 bg-gray-50 rounded-lg text-xs font-mono text-gray-600 max-h-20 overflow-hidden">
                      {template.code.substring(0, 150)}...
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Exercise Editor Component
function ExerciseEditor({
  exercise,
  index,
  onUpdate,
  onRemove,
}: {
  exercise: Exercise;
  index: number;
  onUpdate: (id: string, field: string, value: string | number) => void;
  onRemove: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const isHomework = exercise.type === "homework";

  return (
    <div className={`rounded-lg border overflow-hidden ${isHomework ? "border-purple-200 bg-purple-50" : "border-orange-200 bg-orange-50"}`}>
      <div className="flex items-center justify-between p-3 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-3">
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${isHomework ? "bg-purple-200 text-purple-700" : "bg-orange-200 text-orange-700"}`}>
            {isHomework ? "BTVN" : "LT"} {index + 1}
          </span>
          <input
            type="text"
            value={exercise.title}
            onChange={(e) => { e.stopPropagation(); onUpdate(exercise.id, "title", e.target.value); }}
            onClick={(e) => e.stopPropagation()}
            className="font-medium bg-transparent border-none focus:outline-none"
            placeholder="Tên bài tập"
          />
        </div>
        <div className="flex items-center gap-3">
          <select
            value={exercise.difficulty}
            onChange={(e) => { e.stopPropagation(); onUpdate(exercise.id, "difficulty", e.target.value); }}
            onClick={(e) => e.stopPropagation()}
            className="text-xs py-1 px-2 rounded border border-gray-200 bg-white"
          >
            <option value="easy">🟢 Dễ</option>
            <option value="medium">🟡 TB</option>
            <option value="hard">🔴 Khó</option>
          </select>
          <div className="flex items-center gap-1">
            <input
              type="number"
              value={exercise.points}
              onChange={(e) => { e.stopPropagation(); onUpdate(exercise.id, "points", Number(e.target.value)); }}
              onClick={(e) => e.stopPropagation()}
              className="w-12 text-center text-sm py-1 px-1 rounded border border-gray-200 bg-white"
              min={1}
            />
            <span className="text-xs text-gray-500">đ</span>
          </div>
          <button onClick={(e) => { e.stopPropagation(); onRemove(exercise.id); }} className="text-red-400 hover:text-red-600">
            <i className="fa-solid fa-trash"></i>
          </button>
          <i className={`fa-solid fa-chevron-${expanded ? "up" : "down"} text-gray-400`}></i>
        </div>
      </div>

      {expanded && (
        <div className="p-4 border-t border-gray-200 bg-white space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Đề bài (HTML)</label>
            <textarea
              value={exercise.question}
              onChange={(e) => onUpdate(exercise.id, "question", e.target.value)}
              placeholder="<p>Viết đề bài ở đây...</p>"
              className="input min-h-[100px] font-mono text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Đáp án mẫu (giữ nguyên format xuống dòng)</label>
            <textarea
              value={exercise.answer}
              onChange={(e) => onUpdate(exercise.id, "answer", e.target.value)}
              placeholder={`# Code đáp án
my_list = [1, 2, 3]
print(my_list)`}
              className="input min-h-[100px] font-mono text-sm"
              style={{ whiteSpace: "pre" }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// Wrapper component với Suspense cho useSearchParams
export default function NewLessonPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <NewLessonContent />
    </Suspense>
  );
}
