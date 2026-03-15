"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

interface Section {
  id: string;
  title: string;
  content: string;
  sortOrder: number;
}

interface Submission {
  id: string;
  status: string;
  score: number | null;
  feedback: string | null;
  content: string;
  createdAt: string;
}

interface Exercise {
  id: string;
  type: string;
  title: string;
  question: string;
  answer: string;
  difficulty: string;
  points: number;
  answerVisible: boolean;
  mySubmission?: Submission | null;
}

interface Lesson {
  id: string;
  title: string;
  content: string;
  duration: number;
  difficulty: string;
  objectiveKnowledge: string | null;
  objectiveSkills: string | null;
  objectiveAttitude: string | null;
  chapter: { id: string; title: string; icon: string; color: string };
  sections: Section[];
  exercises: Exercise[];
}

interface UserSession {
  id: string;
  role: string;
  name: string;
}

// Simple Donut Chart Component
function DonutChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  let cumulativePercent = 0;
  
  const getCoordinatesForPercent = (percent: number) => {
    const x = Math.cos(2 * Math.PI * percent);
    const y = Math.sin(2 * Math.PI * percent);
    return [x, y];
  };

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="-1.5 -1.5 3 3" className="w-48 h-48 transform -rotate-90">
        {data.map((item, index) => {
          const percent = item.value / total;
          const [startX, startY] = getCoordinatesForPercent(cumulativePercent);
          cumulativePercent += percent;
          const [endX, endY] = getCoordinatesForPercent(cumulativePercent);
          const largeArcFlag = percent > 0.5 ? 1 : 0;
          
          const pathData = [
            `M ${startX} ${startY}`,
            `A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY}`,
            `L 0 0`,
          ].join(' ');

          return (
            <path
              key={index}
              d={pathData}
              fill={item.color}
              stroke="white"
              strokeWidth="0.03"
            />
          );
        })}
        <circle cx="0" cy="0" r="0.6" fill="white" />
      </svg>
      
      <div className="mt-4 grid grid-cols-1 gap-2">
        {data.map((item, index) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
            <span className="text-gray-700">{item.label}: {item.value} phút</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Highlight Python (#) and block (/* */) comments inside code-blocks
function highlightComments(code: string): string {
  // Escape HTML entities in raw text to prevent XSS
  const lines = code.split('\n');
  return lines.map(line => {
    // Check for Python-style comment: # ...
    const hashIdx = line.indexOf('#');
    if (hashIdx !== -1) {
      // Make sure # isn't inside a string (basic check)
      const before = line.substring(0, hashIdx);
      const comment = line.substring(hashIdx);
      return `${before}<span class="code-comment">${comment}</span>`;
    }
    return line;
  }).join('\n')
    // Block comments /* ... */ (single-line for simplicity)
    .replace(/\/\*[\s\S]*?\*\//g, (m) => `<span class="code-comment">${m}</span>`);
}

// Helper function to trim whitespace inside code-blocks and apply syntax highlighting
function processCodeBlocks(html: string): string {
  if (!html) return html;
  return html.replace(
    /<div\s+class="code-block">([\s\S]*?)<\/div>/gi,
    (match, content) => {
      const trimmed = content
        .replace(/^[\s\n]+/, '')
        .replace(/[\s\n]+$/, '');
      const highlighted = highlightComments(trimmed);
      return `<div class="code-block">${highlighted}</div>`;
    }
  );
}

export default function LessonPage() {
  const params = useParams();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("trang-chu");
  const [showAnswers, setShowAnswers] = useState<Record<string, boolean>>({});
  const [submissions, setSubmissions] = useState<Record<string, string>>({});
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [user, setUser] = useState<UserSession | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        // Get user session
        const sessionRes = await fetch("/api/auth/session");
        if (sessionRes.ok) {
          const sessionData = await sessionRes.json();
          setUser(sessionData.user);
        }

        // Get lesson with submissions
        const res = await fetch(`/api/lessons/${params.id}`);
        if (res.ok) {
          const data = await res.json();
          setLesson(data);
        }
      } catch (error) {
        console.error("Failed to fetch:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [params.id]);

  const toggleAnswer = (id: string, visible: boolean) => {
    if (!visible) {
      alert("🔒 Đáp án này đã bị khóa bởi giảng viên.");
      return;
    }
    setShowAnswers((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSubmit = async (exerciseId: string, points: number) => {
    const content = submissions[exerciseId];
    if (!content?.trim()) {
      alert("Vui lòng nhập bài làm!");
      return;
    }
    
    setSubmittingId(exerciseId);
    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exerciseId,
          content,
          maxScore: points,
        }),
      });
      
      if (res.ok) {
        const newSubmission = await res.json();
        // Update lesson state to mark this exercise as submitted
        setLesson(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            exercises: prev.exercises.map(ex => 
              ex.id === exerciseId 
                ? { ...ex, mySubmission: newSubmission }
                : ex
            ),
          };
        });
        setSubmissions(prev => ({ ...prev, [exerciseId]: "" }));
      } else {
        const data = await res.json();
        alert(data.error || "Lỗi khi nộp bài!");
      }
    } catch (error) {
      alert("Lỗi khi nộp bài!");
    } finally {
      setSubmittingId(null);
    }
  };

  const isTeacher = user?.role === "teacher" || user?.role === "admin";

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Đang tải bài giảng...</p>
        </div>
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="text-center bg-white p-8 rounded-2xl shadow-xl">
          <i className="fa-solid fa-exclamation-triangle text-5xl text-red-500 mb-4"></i>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Không tìm thấy bài giảng</h2>
          <p className="text-gray-500 mb-6">Bài giảng này không tồn tại hoặc đã bị xóa</p>
          <Link href="/" className="btn btn-primary">
            <i className="fa-solid fa-arrow-left mr-2"></i>
            Quay lại Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const practiceExercises = lesson.exercises.filter((e) => e.type === "practice");
  const homeworkExercises = lesson.exercises.filter((e) => e.type === "homework");
  const romanNumerals = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

  const tabs = [
    { id: "trang-chu", label: "Trang Chủ" },
    ...lesson.sections.map((s, i) => ({
      id: `section-${s.id}`,
      label: `${romanNumerals[i] || i + 1}. ${s.title}`,
    })),
    ...(practiceExercises.length > 0
      ? [{ id: "luyen-tap", label: `${romanNumerals[lesson.sections.length] || ""}. Luyện Tập` }]
      : []),
    ...(homeworkExercises.length > 0
      ? [{ id: "bai-tap", label: `${romanNumerals[lesson.sections.length + (practiceExercises.length > 0 ? 1 : 0)] || ""}. Bài Tập Về Nhà` }]
      : []),
  ];

  const chartData = [
    { label: "Lý thuyết", value: Math.round(lesson.duration * 0.4), color: "rgba(59, 130, 246, 0.8)" },
    { label: "Ví dụ & Thực hành", value: Math.round(lesson.duration * 0.35), color: "rgba(16, 185, 129, 0.8)" },
    { label: "Bài tập", value: Math.round(lesson.duration * 0.25), color: "rgba(239, 68, 68, 0.8)" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            🐍 Bài Giảng: {lesson.title}
          </h1>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap justify-center sm:justify-start gap-2 py-3">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`text-sm sm:text-base font-medium py-2 px-4 rounded-lg transition-all duration-200 ${
                  activeTab === tab.id
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200"
                    : "bg-gray-100 text-gray-700 hover:bg-indigo-100 hover:text-indigo-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-grow">
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          
          {/* Trang Chủ Tab */}
          {activeTab === "trang-chu" && (
            <div className="px-4 py-6 bg-white rounded-lg shadow-lg animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-200">
                  <h2 className="text-2xl font-semibold text-blue-700 mb-4">🎯 Mục Tiêu Bài Giảng</h2>
                  <div className="space-y-4">
                    {lesson.objectiveKnowledge && (
                      <div>
                        <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                          <i className="fa-solid fa-brain text-blue-500"></i> Kiến thức
                        </h3>
                        <p className="text-gray-700 ml-7">{lesson.objectiveKnowledge}</p>
                      </div>
                    )}
                    {lesson.objectiveSkills && (
                      <div>
                        <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                          <i className="fa-solid fa-hands text-green-500"></i> Kỹ năng
                        </h3>
                        <p className="text-gray-700 ml-7">{lesson.objectiveSkills}</p>
                      </div>
                    )}
                    {lesson.objectiveAttitude && (
                      <div>
                        <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                          <i className="fa-solid fa-heart text-red-500"></i> Thái độ
                        </h3>
                        <p className="text-gray-700 ml-7">{lesson.objectiveAttitude}</p>
                      </div>
                    )}
                    {!lesson.objectiveKnowledge && !lesson.objectiveSkills && !lesson.objectiveAttitude && (
                      <p className="text-gray-500 italic">Chưa có mục tiêu bài giảng được định nghĩa.</p>
                    )}
                  </div>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-xl border border-green-200">
                  <h2 className="text-2xl font-semibold text-green-700 mb-4">⏱️ Phân Bổ Thời Gian ({lesson.duration} phút)</h2>
                  <DonutChart data={chartData} />
                </div>
              </div>

              <div className="mt-6 bg-gray-50 p-6 rounded-xl border border-gray-200">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">📚 Nội Dung Bài Học</h2>
                <ul className="space-y-2">
                  {lesson.sections.map((section, i) => (
                    <li key={section.id} className="flex items-center gap-3 text-gray-700">
                      <span className="w-7 h-7 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold text-sm">{i + 1}</span>
                      <button onClick={() => setActiveTab(`section-${section.id}`)} className="hover:text-indigo-600 hover:underline text-left">{section.title}</button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Section Tabs */}
          {lesson.sections.map((section) => (
            activeTab === `section-${section.id}` && (
              <div key={section.id} className="px-4 py-6 bg-white rounded-lg shadow-lg animate-fade-in">
                <div className="lesson-content">
                  {section.content ? (
                    <div dangerouslySetInnerHTML={{ __html: processCodeBlocks(section.content) }} />
                  ) : (
                    <div className="text-center py-12 text-gray-500">
                      <i className="fa-solid fa-file-lines text-4xl mb-4"></i>
                      <p>Nội dung đang được cập nhật...</p>
                    </div>
                  )}
                </div>
              </div>
            )
          ))}

          {/* Luyện Tập Tab */}
          {activeTab === "luyen-tap" && (
            <div className="px-4 py-6 bg-white rounded-lg shadow-lg animate-fade-in">
              <div className="space-y-6">
                {practiceExercises.map((exercise, index) => (
                  <div key={exercise.id} className="bg-gray-50 p-5 rounded-lg border border-gray-200">
                    <h2 className="text-xl font-semibold text-blue-700 mb-3">
                      Bài tập {index + 1}: {exercise.title}
                    </h2>
                    
                    {exercise.question && (
                      <div className="text-gray-700 mb-4 lesson-content" dangerouslySetInnerHTML={{ __html: processCodeBlocks(exercise.question) }} />
                    )}

                    <button
                      onClick={() => toggleAnswer(exercise.id, exercise.answerVisible)}
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                        !exercise.answerVisible ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                        : showAnswers[exercise.id] ? "bg-red-100 text-red-700 hover:bg-red-200"
                        : "bg-green-100 text-green-700 hover:bg-green-200"
                      }`}
                    >
                      {!exercise.answerVisible ? "🔒 Đáp án bị khóa"
                        : showAnswers[exercise.id] ? <><i className="fa-solid fa-eye-slash"></i> Ẩn Đáp Án</>
                        : <><i className="fa-solid fa-eye"></i> Hiện Đáp Án</>
                      }
                    </button>

                    {showAnswers[exercise.id] && exercise.answerVisible && exercise.answer && (
                      <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
                        <h4 className="font-bold text-green-700 mb-2">💡 Đáp án mẫu:</h4>
                        <pre className="code-block">{exercise.answer}</pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bài Tập Về Nhà Tab */}
          {activeTab === "bai-tap" && (
            <div className="px-4 py-6 bg-white rounded-lg shadow-lg animate-fade-in">
              <div className="space-y-6">
                {homeworkExercises.map((exercise, index) => {
                  const hasSubmitted = !!exercise.mySubmission;
                  const isGraded = exercise.mySubmission?.status === "graded";
                  
                  return (
                    <div key={exercise.id} className="bg-purple-50 p-5 rounded-lg border border-purple-200">
                      <div className="flex items-center justify-between mb-3">
                        <h2 className="text-xl font-semibold text-purple-700">
                          BTVN {index + 1}: {exercise.title}
                        </h2>
                        <div className="flex items-center gap-2">
                          {hasSubmitted && (
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                              isGraded ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                            }`}>
                              {isGraded ? `✓ Đã chấm: ${exercise.mySubmission?.score}/${exercise.points}` : "⏳ Chờ chấm"}
                            </span>
                          )}
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                            exercise.difficulty === "hard" ? "bg-red-100 text-red-700" 
                            : exercise.difficulty === "medium" ? "bg-yellow-100 text-yellow-700"
                            : "bg-green-100 text-green-700"
                          }`}>
                            {exercise.points} điểm
                          </span>
                        </div>
                      </div>
                      
                      {exercise.question && (
                        <div className="text-gray-700 mb-4 lesson-content" dangerouslySetInnerHTML={{ __html: processCodeBlocks(exercise.question) }} />
                      )}

                      {/* Show graded result */}
                      {isGraded && exercise.mySubmission && (
                        <div className="mt-4 space-y-4">
                          <div className="p-4 bg-white rounded-lg border border-purple-200">
                            <h4 className="font-bold text-gray-700 mb-2">📝 Bài làm của bạn:</h4>
                            <pre className="code-block">{exercise.mySubmission.content}</pre>
                          </div>
                          
                          {exercise.mySubmission.feedback && (
                            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                              <h4 className="font-bold text-blue-700 mb-2">💬 Nhận xét của giáo viên:</h4>
                              <p className="text-gray-700">{exercise.mySubmission.feedback}</p>
                            </div>
                          )}

                          {exercise.answer && (
                            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                              <h4 className="font-bold text-green-700 mb-2">💡 Đáp án mẫu:</h4>
                              <pre className="code-block">{exercise.answer}</pre>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Show pending submission */}
                      {hasSubmitted && !isGraded && (
                        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <div className="flex items-center gap-2 text-yellow-700">
                            <i className="fa-solid fa-clock"></i>
                            <span className="font-medium">Bài làm đang chờ giáo viên chấm điểm</span>
                          </div>
                          <p className="text-sm text-gray-600 mt-2">
                            Nộp lúc: {new Date(exercise.mySubmission?.createdAt || "").toLocaleString("vi-VN")}
                          </p>
                        </div>
                      )}

                      {/* Submission Form - Only for students who haven't submitted */}
                      {!hasSubmitted && !isTeacher && (
                        <div className="mt-4 p-4 bg-white rounded-lg border border-purple-200">
                          <h4 className="font-bold text-gray-700 mb-3">
                            <i className="fa-solid fa-paper-plane mr-2 text-purple-600"></i>
                            Nộp bài làm
                          </h4>
                          <textarea
                            value={submissions[exercise.id] || ""}
                            onChange={(e) => setSubmissions(prev => ({ ...prev, [exercise.id]: e.target.value }))}
                            placeholder="Viết code hoặc câu trả lời của bạn ở đây..."
                            className="w-full p-3 border border-gray-300 rounded-lg font-mono text-sm min-h-[150px] focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                          <button
                            onClick={() => handleSubmit(exercise.id, exercise.points)}
                            disabled={submittingId === exercise.id}
                            className="mt-3 btn btn-success"
                          >
                            {submittingId === exercise.id ? (
                              <><i className="fa-solid fa-spinner fa-spin mr-2"></i> Đang nộp...</>
                            ) : (
                              <><i className="fa-solid fa-paper-plane mr-2"></i> Nộp bài</>
                            )}
                          </button>
                        </div>
                      )}

                      {/* Teacher notice */}
                      {isTeacher && (
                        <div className="mt-4 p-3 bg-gray-100 rounded-lg text-gray-600 text-sm">
                          <i className="fa-solid fa-info-circle mr-2"></i>
                          Bạn đang xem với vai trò giáo viên. Giáo viên không thể nộp bài tập.
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <Link href="/" className="text-indigo-600 hover:text-indigo-700 font-medium">
            <i className="fa-solid fa-arrow-left mr-2"></i>Quay lại Dashboard
          </Link>
          <p className="text-gray-500 text-sm">🐍 Python LMS - Made with ❤️ by AnhDuc Team</p>
        </div>
      </footer>

      <style jsx global>{`
        /* ===== LESSON CONTENT TYPOGRAPHY ===== */

        /* Headings: H2 - section title (blue accent bar) */
        .lesson-content h2 {
          font-size: 1.5rem;
          font-weight: 700;
          color: #1e3a8a;
          margin-top: 2rem;
          margin-bottom: 0.75rem;
          padding-bottom: 0.5rem;
          border-bottom: 3px solid #3b82f6;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        /* Headings: H3 - sub-section (left accent bar) */
        .lesson-content h3 {
          font-size: 1.2rem;
          font-weight: 700;
          color: #1f2937;
          margin-top: 1.5rem;
          margin-bottom: 0.5rem;
          padding-left: 0.75rem;
          border-left: 4px solid #6366f1;
        }

        /* H4 - minor heading */
        .lesson-content h4 {
          font-size: 1rem;
          font-weight: 700;
          color: #374151;
          margin-top: 1.25rem;
          margin-bottom: 0.375rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          font-size: 0.875rem;
        }

        /* Paragraphs */
        .lesson-content p {
          color: #374151;
          margin-bottom: 0.9rem;
          line-height: 1.8;
          font-size: 0.975rem;
        }

        /* Unordered list */
        .lesson-content ul {
          padding-left: 0;
          margin-bottom: 1.1rem;
          list-style: none;
        }

        /* Ordered list */
        .lesson-content ol {
          padding-left: 1.75rem;
          margin-bottom: 1.1rem;
          list-style-type: decimal;
        }

        .lesson-content ul > li {
          color: #374151;
          margin-bottom: 0.6rem;
          line-height: 1.75;
          padding-left: 1.6rem;
          position: relative;
        }
        .lesson-content ul > li::before {
          content: '';
          position: absolute;
          left: 0;
          top: 0.6rem;
          width: 7px;
          height: 7px;
          background: #3b82f6;
          border-radius: 50%;
        }
        .lesson-content ol > li {
          color: #374151;
          margin-bottom: 0.6rem;
          line-height: 1.75;
          padding-left: 0.4rem;
        }
        .lesson-content ol > li::marker {
          color: #3b82f6;
          font-weight: 700;
        }
        .lesson-content ul ul {
          margin-top: 0.4rem;
          margin-left: 0.5rem;
        }
        .lesson-content ul ul > li::before {
          background: transparent;
          border: 2px solid #60a5fa;
          width: 5px;
          height: 5px;
        }
        .lesson-content ul ul ul > li::before {
          background: #94a3b8;
          border: none;
          width: 4px;
          height: 4px;
          border-radius: 1px;
        }
        .lesson-content ol ol {
          list-style-type: lower-alpha;
          margin-top: 0.4rem;
        }

        /* Bold/Strong text */
        .lesson-content strong, .lesson-content b {
          color: #1e3a8a;
          font-weight: 700;
        }
        .lesson-content li strong {
          color: #1e40af;
        }

        /* Inline code highlighting */
        .lesson-content code {
          background: #eff6ff;
          color: #1d4ed8;
          padding: 0.15rem 0.45rem;
          border-radius: 0.3rem;
          font-family: 'Inter', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
          font-size: 0.875em;
          border: 1px solid #bfdbfe;
          font-weight: 500;
        }

        /* Blockquote / Note */
        .lesson-content blockquote {
          border-left: 4px solid #6366f1;
          background: #f5f3ff;
          padding: 0.75rem 1.25rem;
          border-radius: 0 0.5rem 0.5rem 0;
          color: #4c1d95;
          margin: 1.25rem 0;
          font-style: italic;
        }

        /* Table */
        .lesson-content table {
          width: 100%;
          border-collapse: collapse;
          margin: 1.25rem 0;
          border-radius: 0.5rem;
          overflow: hidden;
          box-shadow: 0 1px 4px rgba(0,0,0,0.08);
        }
        .lesson-content th {
          background: #1e3a8a;
          color: #fff;
          padding: 0.75rem 1rem;
          text-align: left;
          font-weight: 600;
          font-size: 0.9rem;
          letter-spacing: 0.03em;
        }
        .lesson-content td {
          padding: 0.7rem 1rem;
          border-bottom: 1px solid #e5e7eb;
          font-size: 0.9rem;
        }
        .lesson-content tr:nth-child(even) td {
          background: #f8fafc;
        }

        /* Code block */
        .lesson-content .code-block, .lesson-content pre, .code-block {
          background: #1f1f1f;
          color: #f8fafc;
          padding: 1.25rem 1.5rem;
          border-radius: 0.5rem;
          overflow-x: auto;
          font-family: 'Inter', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
          font-size: 0.875rem;
          line-height: 1.75;
          margin: 1.25rem 0;
          white-space: pre-wrap;
          word-wrap: break-word;
          letter-spacing: 0.01em;
        }
        .code-block *, .code-block code {
          background: transparent !important;
          padding: 0 !important;
          border-radius: 0 !important;
          border: none !important;
          color: inherit;
          font-size: inherit;
        }
        /* Comment color blue (applied by highlightComments JS function) */
        .code-comment {
          color: #60a5fa;
          font-style: italic;
        }

        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fadeIn 0.3s ease forwards; }
      `}</style>
    </div>
  );
}
