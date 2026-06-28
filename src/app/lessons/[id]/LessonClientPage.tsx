"use client";

import { startTransition, useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import TeachingCanvasRenderer from "@/components/lessons/TeachingCanvasRenderer";
import { buildTeachingCanvases } from "@/lib/lessons/teaching-canvas";
import type {
  LessonContentBlock,
  LessonMediaView,
} from "@/lib/lessons/lesson-media";
import { sanitizeLessonHtml } from "@/lib/sanitize-html";

const PythonCodeEditor = dynamic(() => import("@/components/PythonCodeEditor"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[340px] items-center justify-center rounded-xl border border-gray-700 bg-[#1e1e1e] text-sm text-gray-400">
      <i className="fa-solid fa-spinner fa-spin mr-2"></i>
      Đang tải trình soạn thảo…
    </div>
  ),
});

export interface Section {
  id: string;
  title: string;
  content: string;
  sortOrder: number;
  renderedContent?: string;
  contentBlocks?: LessonContentBlock[] | null;
}

interface Submission {
  id: string;
  status: string;
  score: number | null;
  feedback: string | null;
  content: string;
  createdAt: string;
}

export interface Exercise {
  id: string;
  type: string;
  title: string;
  question: string;
  answer: string;
  difficulty: string;
  points: number;
  answerVisible: boolean;
  mySubmission?: Submission | null;
  questionHtml?: string;
}

export interface Lesson {
  id: string;
  title: string;
  content: string;
  duration: number;
  difficulty: string;
  theme: string | null;
  objectiveKnowledge: string | null;
  objectiveSkills: string | null;
  objectiveAttitude: string | null;
  chapter: { id: string; title: string; icon: string; color: string };
  sections: Section[];
  exercises: Exercise[];
  media: LessonMediaView[];
  tabs: LessonTab[];
  progress: LessonProgressSummary | null;
}

export interface UserSession {
  id: string;
  role: string;
  name: string;
}

export interface LessonTab {
  id: string;
  label: string;
}

interface LessonProgressTab extends LessonTab {
  completed: boolean;
  timeSpent: number;
  remainingSeconds: number;
}

export interface LessonProgressSummary {
  completed: boolean;
  completedTabs: number;
  totalTabs: number;
  percent: number;
  timeSpent: number;
  tabs: LessonProgressTab[];
}

export interface SiblingLesson {
  id: string;
  title: string;
}

const TAB_COMPLETION_SECONDS = 60;
const PROGRESS_BATCH_SECONDS = 10;

function getTabCompletionPercent(timeSpent: number) {
  return Math.round((Math.min(timeSpent, TAB_COMPLETION_SECONDS) / TAB_COMPLETION_SECONDS) * 100);
}

function getLessonVisualPercent(progress: LessonProgressSummary | null) {
  if (!progress || progress.totalTabs === 0) {
    return 0;
  }

  const totalProgress = progress.tabs.reduce(
    (sum, tab) => sum + Math.min(tab.timeSpent, TAB_COMPLETION_SECONDS) / TAB_COMPLETION_SECONDS,
    0
  );

  return Math.round((totalProgress / progress.totalTabs) * 100);
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

function getDifficultyMeta(difficulty: string) {
  switch (difficulty) {
    case "hard":
      return {
        label: "Nâng cao",
        className: "border-red-200 bg-red-50 text-red-700",
      };
    case "medium":
      return {
        label: "Trung bình",
        className: "border-amber-200 bg-amber-50 text-amber-700",
      };
    default:
      return {
        label: "Cơ bản",
        className: "border-emerald-200 bg-emerald-50 text-emerald-700",
      };
  }
}

function AuthModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Đóng"
      />
      <div className="relative w-full max-w-sm rounded-2xl bg-white p-8 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100"
        >
          <i className="fa-solid fa-xmark text-sm"></i>
        </button>
        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-50">
          <i className="fa-solid fa-paper-plane text-2xl text-purple-500"></i>
        </div>
        <h3 className="text-xl font-bold text-slate-900">Đăng nhập để nộp bài</h3>
        <p className="mt-2 text-sm text-slate-500">
          Tạo tài khoản miễn phí hoặc đăng nhập để nộp bài và nhận phản hồi chấm điểm từ giáo viên.
        </p>
        <div className="mt-6 space-y-2.5">
          <Link href="/login" className="btn btn-primary w-full justify-center">
            <i className="fa-solid fa-right-to-bracket"></i>
            Đăng nhập
          </Link>
          <Link href="/register" className="btn btn-secondary w-full justify-center">
            <i className="fa-solid fa-user-plus"></i>
            Tạo tài khoản miễn phí
          </Link>
        </div>
      </div>
    </div>
  );
}

interface LessonClientPageProps {
  initialLesson: Lesson;
  initialUser: UserSession | null;
  prevLesson?: SiblingLesson | null;
  nextLesson?: SiblingLesson | null;
}

export default function LessonClientPage({
  initialLesson,
  initialUser,
  prevLesson,
  nextLesson,
}: LessonClientPageProps) {
  const [lesson, setLesson] = useState(initialLesson);
  const [lessonProgress, setLessonProgress] = useState(initialLesson.progress);
  const [activeTab, setActiveTab] = useState(initialLesson.tabs[0]?.id ?? "trang-chu");
  const [showAnswers, setShowAnswers] = useState<Record<string, boolean>>({});
  const [submissions, setSubmissions] = useState<Record<string, string>>({});
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const user = initialUser;
  const dashboardHref = user
    ? user.role === "admin" || user.role === "teacher"
      ? "/admin"
      : "/dashboard"
    : "/library";
  const [showAuthModal, setShowAuthModal] = useState(false);
  const segmentStartedAtRef = useRef<number | null>(null);
  const progressQueueRef = useRef(Promise.resolve());

  useEffect(() => {
    setLesson(initialLesson);
    setLessonProgress(initialLesson.progress);
    setActiveTab(initialLesson.tabs[0]?.id ?? "trang-chu");
    setShowAnswers({});
    setSubmissions({});
    setSubmittingId(null);
    segmentStartedAtRef.current = null;
    progressQueueRef.current = Promise.resolve();
  }, [initialLesson, initialUser]);

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

  const applyProgressUpdate = useEffectEvent((nextProgress: LessonProgressSummary) => {
    startTransition(() => {
      setLessonProgress(nextProgress);
    });
  });

  const flushTabProgress = useEffectEvent(async (lessonId: string, tabId: string, force = false) => {
    if (lesson.id !== lessonId || user?.role !== "student" || !lessonProgress) {
      return;
    }

    const currentTabState = lessonProgress.tabs.find((tab) => tab.id === tabId);
    if (currentTabState?.completed) {
      segmentStartedAtRef.current = Date.now();
      return;
    }

    const startedAt = segmentStartedAtRef.current;
    if (!startedAt) {
      segmentStartedAtRef.current = Date.now();
      return;
    }

    const deltaSeconds = Math.floor((Date.now() - startedAt) / 1000);
    if (deltaSeconds < (force ? 1 : PROGRESS_BATCH_SECONDS)) {
      return;
    }

    segmentStartedAtRef.current = Date.now();

    progressQueueRef.current = progressQueueRef.current
      .then(async () => {
        const res = await fetch(`/api/lessons/${lessonId}/progress`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tabId,
            secondsSpent: deltaSeconds,
          }),
          keepalive: true,
        });

        if (!res.ok) {
          return;
        }

        const data = await res.json();
        if (data.progress) {
          applyProgressUpdate(data.progress);
        }
      })
      .catch((error) => {
        console.error("Failed to update lesson progress:", error);
      });
  });

  useEffect(() => {
    if (user?.role !== "student" || !lessonProgress) {
      return;
    }

    const trackedLessonId = lesson.id;
    const trackedTabId = activeTab;
    segmentStartedAtRef.current = Date.now();

    const interval = window.setInterval(() => {
      void flushTabProgress(trackedLessonId, trackedTabId);
    }, PROGRESS_BATCH_SECONDS * 1000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        void flushTabProgress(trackedLessonId, trackedTabId, true);
        segmentStartedAtRef.current = null;
        return;
      }

      segmentStartedAtRef.current = Date.now();
    };

    const handlePageHide = () => {
      void flushTabProgress(trackedLessonId, trackedTabId, true);
      segmentStartedAtRef.current = null;
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", handlePageHide);

    return () => {
      void flushTabProgress(trackedLessonId, trackedTabId, true);
      segmentStartedAtRef.current = null;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, [activeTab, lesson.id, user?.role]);

  const isTeacher = user?.role === "teacher" || user?.role === "admin";

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

  const lessonTabs = lessonProgress?.tabs ?? lesson.tabs ?? tabs;
  const activeTabState = lessonProgress?.tabs.find((tab) => tab.id === activeTab) || null;
  const isStudent = user?.role === "student";
  const visualProgressPercent = getLessonVisualPercent(lessonProgress);
  const lessonTabIdsKey = lessonTabs.map((tab) => tab.id).join("|");
  const perTabPercent =
    lessonProgress && lessonProgress.totalTabs > 0
      ? Math.round(100 / lessonProgress.totalTabs)
      : 0;
  const teachingCanvasesBySection = useMemo(() => {
    return new Map(
      lesson.sections.map((section) => [
        section.id,
        buildTeachingCanvases(section),
      ])
    );
  }, [lesson.sections]);

  useEffect(() => {
    if (lessonTabs.some((tab) => tab.id === activeTab)) {
      return;
    }

    setActiveTab(lessonTabs[0]?.id ?? "trang-chu");
  }, [activeTab, lessonTabIdsKey, lessonTabs]);

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
          <div className="mb-3 flex flex-wrap items-center gap-2 text-sm text-slate-500">
            <Link
              href={dashboardHref}
              className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700 transition hover:bg-slate-200"
            >
              <i className="fa-solid fa-arrow-left text-xs"></i>
              {user ? "Dashboard" : "Thư viện"}
            </Link>
            <i className="fa-solid fa-chevron-right text-[10px] text-slate-400"></i>
            <Link href={dashboardHref} className="font-medium text-slate-600 transition hover:text-indigo-600">
              {lesson.chapter.title}
            </Link>
            <i className="fa-solid fa-chevron-right text-[10px] text-slate-400"></i>
            <span className="font-semibold text-slate-900">{lesson.title}</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            🐍 Bài Giảng: {lesson.title}
          </h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:px-8">
          <aside className="lesson-tab-rail">
            <div className="lesson-tab-rail-header">
              <span>Chủ đề</span>
              <strong>{lessonTabs.length}</strong>
            </div>
            <div className="lesson-tab-list">
            {lessonTabs.map((tab) => {
              const tabState = lessonProgress?.tabs.find((item) => item.id === tab.id);

              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    startTransition(() => setActiveTab(tab.id));
                  }}
                  className={`lesson-tab-button ${
                    activeTab === tab.id
                      ? "lesson-tab-button-active"
                      : ""
                  }`}
                >
                  <span>{tab.label}</span>
                  {tabState?.completed ? (
                    <span className="lesson-tab-status lesson-tab-status-done">
                      <i className="fa-solid fa-check"></i>
                    </span>
                  ) : isStudent && tabState ? (
                    <span className="lesson-tab-status">
                      {Math.min(tabState.timeSpent, TAB_COMPLETION_SECONDS)}s/60s
                    </span>
                  ) : null}
                </button>
              );
            })}
            </div>
          </aside>

          <div className="lesson-workspace min-w-0">
          {isStudent && lessonProgress && (
            <section className="mx-4 mb-6 rounded-[1.75rem] border border-emerald-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
                    <i className="fa-solid fa-chart-line"></i>
                    Tiến độ bài giảng
                  </div>
                  <h2 className="mt-3 text-xl font-bold text-slate-900">
                    {lessonProgress.completed
                      ? "Bạn đã hoàn thành bài giảng này."
                      : `Đã hoàn thành ${lessonProgress.completedTabs}/${lessonProgress.totalTabs} tab.`}
                  </h2>
                  <p className="mt-2 text-sm text-slate-600">
                    {lessonProgress.completed
                      ? "Tiến độ bài giảng đã được ghi nhận vào dashboard chương học."
                      : activeTabState?.completed
                        ? "Tab hiện tại đã đủ 1 phút. Bạn có thể chuyển sang tab tiếp theo."
                        : `Ở lại tab hiện tại thêm ${activeTabState?.remainingSeconds ?? TAB_COMPLETION_SECONDS} giây để tab này được tính hoàn thành.`}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
                    <span className="rounded-full bg-slate-100 px-3 py-1">
                      {"M\u1ed7i tab ho\u00e0n th\u00e0nh = +"}
                      {perTabPercent}%
                    </span>
                    {activeTabState && (
                      <span className="rounded-full bg-indigo-50 px-3 py-1 text-indigo-700">
                        {"Tab hi\u1ec7n t\u1ea1i: "}
                        {getTabCompletionPercent(activeTabState.timeSpent)}%
                      </span>
                    )}
                  </div>
                </div>

                <div className="min-w-[220px] lg:max-w-xs lg:flex-1">
                  <div className="flex items-center justify-between text-sm text-slate-500">
                    <span>Tiến độ bài giảng</span>
                    <span className="font-semibold text-slate-900">{visualProgressPercent}%</span>
                  </div>
                  <div className="mt-2 h-3 rounded-full bg-slate-200">
                    <div
                      className="h-3 rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all"
                      style={{ width: `${visualProgressPercent}%` }}
                    />
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {lessonProgress.tabs.map((tab) => {
                      const tabPercent = getTabCompletionPercent(tab.timeSpent);

                      return (
                        <div
                          key={tab.id}
                          className={`rounded-2xl border px-3 py-3 text-left ${
                            tab.completed
                              ? "border-emerald-200 bg-emerald-50"
                              : tab.id === activeTab
                                ? "border-indigo-200 bg-indigo-50"
                                : "border-slate-200 bg-slate-50"
                          }`}
                        >
                          <div className="truncate text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                            {tab.label}
                          </div>
                          <div className="mt-2 text-lg font-bold text-slate-900">{tabPercent}%</div>
                          <div className="mt-2 h-2 rounded-full bg-white/80">
                            <div
                              className={`h-2 rounded-full transition-all ${
                                tab.completed ? "bg-emerald-500" : "bg-indigo-500"
                              }`}
                              style={{ width: `${tabPercent}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </section>
          )}

          
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
                        <p
                          className="text-gray-700 ml-7"
                          dangerouslySetInnerHTML={{
                            __html: sanitizeLessonHtml(lesson.objectiveKnowledge),
                          }}
                        />
                      </div>
                    )}
                    {lesson.objectiveSkills && (
                      <div>
                        <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                          <i className="fa-solid fa-hands text-green-500"></i> Kỹ năng
                        </h3>
                        <p
                          className="text-gray-700 ml-7"
                          dangerouslySetInnerHTML={{
                            __html: sanitizeLessonHtml(lesson.objectiveSkills),
                          }}
                        />
                      </div>
                    )}
                    {lesson.objectiveAttitude && (
                      <div>
                        <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                          <i className="fa-solid fa-heart text-red-500"></i> Thái độ
                        </h3>
                        <p
                          className="text-gray-700 ml-7"
                          dangerouslySetInnerHTML={{
                            __html: sanitizeLessonHtml(lesson.objectiveAttitude),
                          }}
                        />
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
                  {lesson.sections.map((section, i) => {
                    const sectionProgress = lessonProgress?.tabs.find(
                      (tab) => tab.id === `section-${section.id}`
                    );

                    return (
                      <li key={section.id} className="flex items-center justify-between gap-3 text-gray-700">
                        <div className="flex items-center gap-3">
                          <span className="w-7 h-7 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold text-sm">{i + 1}</span>
                          <button
                            onClick={() => {
                              startTransition(() => setActiveTab(`section-${section.id}`));
                            }}
                            className="hover:text-indigo-600 hover:underline text-left"
                          >
                            {section.title}
                          </button>
                        </div>
                        {isStudent && sectionProgress ? (
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            sectionProgress.completed
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-slate-100 text-slate-600"
                          }`}>
                            {getTabCompletionPercent(sectionProgress.timeSpent)}%
                          </span>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          )}

          {/* Section Tabs */}
          {lesson.sections.map((section) => (
            activeTab === `section-${section.id}` && (
              <div key={section.id} className="animate-fade-in">
                {section.renderedContent || section.contentBlocks?.length ? (
                  <TeachingCanvasRenderer
                    sectionId={section.id}
                    sectionTitle={section.title}
                    canvases={teachingCanvasesBySection.get(section.id) || []}
                    media={lesson.media}
                    theme={lesson.theme}
                  />
                ) : (
                  <div className="rounded-2xl bg-white py-12 text-center text-gray-500 shadow-lg">
                    <i className="fa-solid fa-file-lines text-4xl mb-4"></i>
                    <p>Nội dung đang được cập nhật...</p>
                  </div>
                )}
              </div>
            )
          ))}

          {/* Luyện Tập Tab */}
          {activeTab === "luyen-tap" && (
            <div className="px-4 py-6 bg-white rounded-lg shadow-lg animate-fade-in">
              <div className="mb-6 overflow-hidden rounded-[28px] border border-sky-200 bg-gradient-to-r from-sky-50 via-white to-blue-50">
                <div className="px-6 py-6 md:px-8">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <span className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">
                        <i className="fa-solid fa-dumbbell"></i>
                        Luyện tập
                      </span>
                      <h2 className="mt-4 text-2xl font-bold text-slate-900">Củng cố kiến thức ngay sau khi học</h2>
                      <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">
                        Mỗi bài luyện tập được trình bày lại theo dạng nhiệm vụ nhỏ, rõ đầu việc và có đáp án mẫu để bạn tự đối chiếu sau khi hoàn thành.
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm text-slate-600">
                      <div className="rounded-2xl border border-sky-100 bg-white/80 px-4 py-3">
                        <div className="text-xs uppercase tracking-[0.2em] text-sky-600">Số bài</div>
                        <div className="mt-1 text-xl font-bold text-slate-900">{practiceExercises.length}</div>
                      </div>
                      <div className="rounded-2xl border border-sky-100 bg-white/80 px-4 py-3">
                        <div className="text-xs uppercase tracking-[0.2em] text-sky-600">Chế độ</div>
                        <div className="mt-1 text-sm font-semibold text-slate-900">Tự làm và đối chiếu</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                {practiceExercises.map((exercise, index) => {
                  const difficultyMeta = getDifficultyMeta(exercise.difficulty);
                  const questionHtml = exercise.questionHtml ?? "";

                  return (
                  <div key={exercise.id} className="practice-shell">
                    <h2 className="text-xl font-semibold text-blue-700 mb-3">
                      Bài tập {index + 1}: {exercise.title}
                    </h2>
                    <div className="mb-4 flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center ml-2 gap-1.5 whitespace-nowrap rounded-full border px-3 py-1 text-sm font-medium ${difficultyMeta.className}`}>
                        <i className="fa-solid fa-signal text-[11px]"></i>
                        {difficultyMeta.label}
                      </span>
                      <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-sm font-semibold text-sky-700">
                        <i className="fa-solid fa-star text-[11px] text-amber-400"></i>
                        {exercise.points} điểm
                      </span>
                      <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1 text-sm font-medium ${
                        exercise.answerVisible
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-slate-200 bg-slate-100 text-slate-600"
                      }`}>
                        <i className={`fa-solid ${exercise.answerVisible ? "fa-lock-open" : "fa-lock"} text-[11px]`}></i>
                        {exercise.answerVisible ? "Có đáp án mẫu" : "Đáp án đang khóa"}
                      </span>
                    </div>
                    
                    {questionHtml && (
                      <div className="text-gray-700 mb-4 lesson-content exercise-content" dangerouslySetInnerHTML={{ __html: sanitizeLessonHtml(questionHtml) }} />
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
                  );
                })}
              </div>
            </div>
          )}

          {/* Bài Tập Về Nhà Tab */}
          {activeTab === "bai-tap" && (
            <div className="px-4 py-6 bg-white rounded-lg shadow-lg animate-fade-in">
              <div className="mb-6 overflow-hidden rounded-[28px] border border-purple-200 bg-gradient-to-r from-purple-50 via-white to-fuchsia-50">
                <div className="px-6 py-6 md:px-8">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <span className="inline-flex items-center gap-2 rounded-full border border-purple-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-purple-700">
                        <i className="fa-solid fa-house-laptop"></i>
                        Bài tập về nhà
                      </span>
                      <h2 className="mt-4 text-2xl font-bold text-slate-900">Vận dụng kiến thức vào bài làm hoàn chỉnh</h2>
                      <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">
                        Mỗi BTVN có khu vực đề bài, nộp bài và phản hồi riêng để người học theo dõi trọn vẹn trong cùng một mạch.
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm text-slate-600">
                      <div className="rounded-2xl border border-purple-100 bg-white/80 px-4 py-3">
                        <div className="text-xs uppercase tracking-[0.2em] text-purple-600">Số bài</div>
                        <div className="mt-1 text-xl font-bold text-slate-900">{homeworkExercises.length}</div>
                      </div>
                      <div className="rounded-2xl border border-purple-100 bg-white/80 px-4 py-3">
                        <div className="text-xs uppercase tracking-[0.2em] text-purple-600">Mục đích</div>
                        <div className="mt-1 text-sm font-semibold text-slate-900">Luyện nộp bài và nhận phản hồi</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                {homeworkExercises.map((exercise, index) => {
                  const hasSubmitted = !!exercise.mySubmission;
                  const isGraded = exercise.mySubmission?.status === "graded";
                  const difficultyMeta = getDifficultyMeta(exercise.difficulty);
                  const questionHtml = exercise.questionHtml ?? "";
                  
                  return (
                    <div key={exercise.id} className="homework-shell">
                      <div className="flex items-center justify-between mb-3">
                        <h2 className="text-xl font-semibold text-purple-700">
                          BTVN {index + 1}: {exercise.title}
                        </h2>
                        <div className="flex shrink-0 items-center gap-2">
                          {hasSubmitted && (
                            <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${
                              isGraded ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                            }`}>
                              {isGraded ? `✓ Đã chấm: ${exercise.mySubmission?.score}/${exercise.points}` : "⏳ Chờ chấm"}
                            </span>
                          )}
                          <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1 text-sm font-medium ${difficultyMeta.className}`}>
                            <i className="fa-solid fa-signal text-[11px]"></i>
                            {difficultyMeta.label}
                          </span>
                          <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-purple-200 bg-purple-50 px-3 py-1 text-sm font-semibold text-purple-700">
                            <i className="fa-solid fa-star text-[11px] text-amber-400"></i>
                            {exercise.points} điểm
                          </span>
                        </div>
                      </div>
                      
                      {questionHtml && (
                        <div className="text-gray-700 mb-4 lesson-content exercise-content" dangerouslySetInnerHTML={{ __html: sanitizeLessonHtml(questionHtml) }} />
                      )}

                      {/* Show graded result */}
                      {isGraded && exercise.mySubmission && (
                        <div className="mt-4 space-y-4">
                          <div>
                            <p className="mb-2 text-sm font-semibold text-gray-600">
                              <i className="fa-solid fa-code mr-1.5 text-purple-500"></i>
                              Bài làm của bạn:
                            </p>
                            <PythonCodeEditor
                              defaultValue={exercise.mySubmission.content}
                              onChange={() => {}}
                              readOnly
                            />
                          </div>

                          {exercise.mySubmission.feedback && (
                            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                              <h4 className="mb-2 font-bold text-blue-700">
                                <i className="fa-solid fa-comment-dots mr-2"></i>
                                Nhận xét của giáo viên:
                              </h4>
                              <p className="text-gray-700">{exercise.mySubmission.feedback}</p>
                            </div>
                          )}

                          {exercise.answer && (
                            <div>
                              <p className="mb-2 text-sm font-semibold text-green-700">
                                <i className="fa-solid fa-lightbulb mr-1.5"></i>
                                Đáp án mẫu:
                              </p>
                              <PythonCodeEditor
                                defaultValue={exercise.answer}
                                onChange={() => {}}
                                readOnly
                              />
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
                        user ? (
                          <div className="mt-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <h4 className="font-bold text-gray-700">
                                <i className="fa-solid fa-code mr-2 text-purple-600"></i>
                                Bài làm của bạn
                              </h4>
                              <span className="text-xs text-gray-400">
                                Nhấn <kbd className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs text-gray-600">▶ Chạy</kbd> để kiểm tra trước khi nộp
                              </span>
                            </div>
                            <PythonCodeEditor
                              defaultValue={submissions[exercise.id] || ""}
                              onChange={(code) => setSubmissions(prev => ({ ...prev, [exercise.id]: code }))}
                            />
                            <div className="flex items-center justify-between">
                              <p className="text-xs text-gray-400">
                                <i className="fa-solid fa-circle-info mr-1"></i>
                                Code sẽ được gửi đến giảng viên để chấm điểm
                              </p>
                              <button
                                onClick={() => handleSubmit(exercise.id, exercise.points)}
                                disabled={submittingId === exercise.id}
                                className="btn btn-success disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {submittingId === exercise.id ? (
                                  <><i className="fa-solid fa-spinner fa-spin"></i> Đang nộp…</>
                                ) : (
                                  <><i className="fa-solid fa-paper-plane"></i> Nộp bài</>
                                )}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => setShowAuthModal(true)}
                            className="mt-4 flex w-full items-center justify-between rounded-2xl border-2 border-dashed border-purple-200 bg-purple-50/50 px-5 py-4 text-left transition hover:border-purple-300 hover:bg-purple-50"
                          >
                            <div>
                              <div className="font-medium text-slate-700">Nộp bài làm</div>
                              <div className="mt-0.5 text-sm text-slate-400">
                                Đăng nhập để nộp bài và nhận phản hồi từ giáo viên
                              </div>
                            </div>
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-purple-100">
                              <i className="fa-solid fa-right-to-bracket text-sm text-purple-500"></i>
                            </div>
                          </button>
                        )
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
        </div>
      </main>

      {/* Footer — lesson navigation */}
      <footer className="border-t border-gray-200 bg-white py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between gap-4">
            {/* Prev */}
            {prevLesson ? (
              <Link
                href={`/lessons/${prevLesson.id}`}
                className="group flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm transition hover:border-indigo-300 hover:bg-indigo-50 max-w-[45%]"
              >
                <i className="fa-solid fa-arrow-left shrink-0 text-gray-400 transition group-hover:text-indigo-500"></i>
                <div className="min-w-0">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 group-hover:text-indigo-400">Bài trước</div>
                  <div className="truncate font-medium text-gray-700 group-hover:text-indigo-700">{prevLesson.title}</div>
                </div>
              </Link>
            ) : (
              <Link
                href={dashboardHref}
                className="flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-700"
              >
                <i className="fa-solid fa-arrow-left"></i>
                {user ? "Dashboard" : "Thư viện"}
              </Link>
            )}

            {/* Next */}
            {nextLesson ? (
              <Link
                href={`/lessons/${nextLesson.id}`}
                className="group flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm transition hover:border-indigo-300 hover:bg-indigo-50 max-w-[45%] text-right"
              >
                <div className="min-w-0">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 group-hover:text-indigo-400">Bài tiếp theo</div>
                  <div className="truncate font-medium text-gray-700 group-hover:text-indigo-700">{nextLesson.title}</div>
                </div>
                <i className="fa-solid fa-arrow-right shrink-0 text-gray-400 transition group-hover:text-indigo-500"></i>
              </Link>
            ) : (
              <Link
                href={user ? "/" : "/library"}
                className="flex items-center gap-2 text-sm font-medium text-emerald-600 hover:text-emerald-700"
              >
                <i className="fa-solid fa-circle-check"></i>
                Hoàn thành chương
              </Link>
            )}
          </div>
        </div>
      </footer>

      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}

      <style jsx global>{`
        .lesson-tab-rail {
          position: sticky;
          top: 1rem;
          align-self: start;
          max-height: calc(100vh - 2rem);
          overflow: hidden;
          border: 1px solid #e2e8f0;
          border-radius: 1rem;
          background: rgba(255, 255, 255, 0.94);
          box-shadow: 0 18px 42px rgba(15, 23, 42, 0.08);
        }

        .lesson-tab-rail-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
          border-bottom: 1px solid #e2e8f0;
          padding: 0.95rem 1rem;
          color: #475569;
          font-size: 0.76rem;
          font-weight: 800;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }

        .lesson-tab-rail-header strong {
          display: inline-flex;
          min-width: 2rem;
          justify-content: center;
          border-radius: 999px;
          background: #eef2ff;
          padding: 0.2rem 0.55rem;
          color: #4338ca;
          letter-spacing: 0;
        }

        .lesson-tab-list {
          display: flex;
          max-height: calc(100vh - 6rem);
          flex-direction: column;
          gap: 0.45rem;
          overflow-y: auto;
          padding: 0.75rem;
        }

        .lesson-tab-button {
          display: flex;
          min-height: 3.2rem;
          width: 100%;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
          border-radius: 0.75rem;
          border: 1px solid transparent;
          padding: 0.75rem 0.85rem;
          color: #334155;
          text-align: left;
          font-size: 0.92rem;
          font-weight: 700;
          line-height: 1.35;
          transition:
            background 160ms ease,
            border-color 160ms ease,
            color 160ms ease,
            box-shadow 160ms ease;
        }

        .lesson-tab-button:hover {
          border-color: #c7d2fe;
          background: #f8fafc;
          color: #3730a3;
        }

        .lesson-tab-button-active {
          border-color: #4f46e5;
          background: #4f46e5;
          color: white;
          box-shadow: 0 12px 30px rgba(79, 70, 229, 0.25);
        }

        .lesson-tab-status {
          flex: 0 0 auto;
          border-radius: 999px;
          background: #f1f5f9;
          padding: 0.25rem 0.5rem;
          color: #64748b;
          font-size: 0.68rem;
          font-weight: 800;
          line-height: 1;
        }

        .lesson-tab-button-active .lesson-tab-status {
          background: rgba(255, 255, 255, 0.18);
          color: white;
        }

        .lesson-tab-status-done {
          display: inline-flex;
          height: 1.55rem;
          min-width: 1.55rem;
          align-items: center;
          justify-content: center;
          background: #dcfce7;
          color: #15803d;
        }

        .teaching-canvas-stack {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .teaching-canvas-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          border: 1px solid #dbeafe;
          border-radius: 1rem;
          background: white;
          padding: 1rem 1.15rem;
          box-shadow: 0 16px 36px rgba(15, 23, 42, 0.07);
        }

        .teaching-canvas-kicker {
          color: #2563eb;
          font-size: 0.78rem;
          font-weight: 800;
          letter-spacing: 0.16em;
          text-transform: uppercase;
        }

        .teaching-canvas-toolbar h2 {
          margin-top: 0.25rem;
          color: #0f172a;
          font-size: clamp(1.25rem, 2vw, 1.85rem);
          font-weight: 850;
          line-height: 1.2;
        }

        .teaching-canvas-controls {
          display: flex;
          align-items: center;
          gap: 0.45rem;
        }

        .teaching-canvas-controls button {
          display: inline-flex;
          height: 2.65rem;
          width: 2.65rem;
          align-items: center;
          justify-content: center;
          border-radius: 0.75rem;
          border: 1px solid #cbd5e1;
          background: white;
          color: #334155;
          transition:
            background 160ms ease,
            border-color 160ms ease,
            color 160ms ease,
            transform 160ms ease;
        }

        .teaching-canvas-controls button:hover:not(:disabled) {
          border-color: #4f46e5;
          background: #eef2ff;
          color: #3730a3;
          transform: translateY(-1px);
        }

        .teaching-canvas-controls button:disabled {
          cursor: not-allowed;
          opacity: 0.35;
        }

        .teaching-canvas {
          display: grid;
          min-height: 560px;
          grid-template-columns: minmax(0, 1fr) 280px;
          gap: 1rem;
          border: 1px solid #dbeafe;
          border-radius: 1.1rem;
          background: #f8fbff;
          padding: 1rem;
          box-shadow: 0 22px 55px rgba(15, 23, 42, 0.09);
        }

        .teaching-canvas-main {
          min-width: 0;
          border-radius: 0.9rem;
          border: 1px solid #e2e8f0;
          background: white;
          padding: clamp(1.2rem, 3vw, 2.4rem);
        }

        .teaching-canvas-count {
          display: inline-flex;
          margin-bottom: 1rem;
          border-radius: 999px;
          background: #e0f2fe;
          padding: 0.35rem 0.75rem;
          color: #0369a1;
          font-size: 0.74rem;
          font-weight: 850;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }

        .teaching-canvas-main > h3 {
          margin-bottom: 1.15rem;
          color: #0f172a;
          font-size: clamp(1.9rem, 4vw, 3.35rem);
          font-weight: 850;
          line-height: 1.08;
        }

        .teaching-canvas .lesson-content {
          color: #334155;
        }

        .teaching-canvas .lesson-content h2,
        .teaching-canvas .lesson-content h3 {
          margin-top: 0.5rem;
        }

        .teaching-canvas .lesson-content p,
        .teaching-canvas .lesson-content li {
          font-size: 1.02rem;
        }

        .teaching-canvas .lesson-content .code-block,
        .teaching-canvas .lesson-content pre,
        .teaching-canvas .code-block {
          font-size: 0.95rem;
          line-height: 1.7;
        }

        .teaching-reveal-list {
          display: grid;
          gap: 0.9rem;
          margin-top: 1.25rem;
        }

        .teaching-reveal-step {
          display: grid;
          grid-template-columns: 2.1rem minmax(0, 1fr);
          align-items: start;
          gap: 0.85rem;
          border-radius: 0.9rem;
          border: 1px solid #dbeafe;
          background: #f8fafc;
          padding: 0.9rem 1rem;
        }

        .teaching-reveal-index {
          display: inline-flex;
          height: 2.1rem;
          width: 2.1rem;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          background: #2563eb;
          color: white;
          font-size: 0.9rem;
          font-weight: 900;
        }

        .teaching-reveal-text {
          margin: 0;
          color: #0f172a;
          font-size: clamp(1.1rem, 2vw, 1.5rem);
          font-weight: 700;
          line-height: 1.55;
        }

        .teaching-reveal-text .word {
          display: inline-block;
        }

        .teaching-reveal-text .word-animate {
          animation: teaching-word-in 420ms both cubic-bezier(0.2, 0.8, 0.2, 1);
        }

        .teaching-reveal-empty {
          display: flex;
          min-height: 5rem;
          align-items: center;
          justify-content: center;
          gap: 0.65rem;
          border-radius: 0.9rem;
          border: 1px dashed #bfdbfe;
          background: #eff6ff;
          color: #2563eb;
          font-size: 0.95rem;
          font-weight: 800;
        }

        .teaching-canvas-strip {
          display: flex;
          flex-wrap: wrap;
          gap: 0.45rem;
          justify-content: center;
        }

        .teaching-canvas-strip button {
          display: inline-flex;
          height: 2rem;
          min-width: 2rem;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          border: 1px solid #cbd5e1;
          background: white;
          color: #475569;
          font-size: 0.78rem;
          font-weight: 850;
        }

        .teaching-canvas-strip button.active {
          border-color: #4f46e5;
          background: #4f46e5;
          color: white;
        }

        @keyframes teaching-word-in {
          from {
            opacity: 0;
            transform: translateY(0.45rem);
            filter: blur(3px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
            filter: blur(0);
          }
        }

        @media (max-width: 1023px) {
          .lesson-tab-rail {
            position: static;
            max-height: none;
          }

          .lesson-tab-list {
            max-height: none;
            overflow-y: visible;
          }

          .teaching-canvas {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 640px) {
          .teaching-canvas-toolbar {
            align-items: flex-start;
            flex-direction: column;
          }

          .teaching-canvas-controls {
            width: 100%;
            justify-content: flex-end;
          }

          .teaching-canvas {
            min-height: auto;
            padding: 0.65rem;
          }
        }

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
          margin-bottom: 0.5rem;
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
          padding: 0.5rem 1.5rem;
          border-radius: 0.5rem;
          overflow-x: auto;
          font-family: 'Inter', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
          font-size: 0.875rem;
          line-height: 1.75;
          margin: 1rem 0;
          white-space: pre-wrap;
          word-wrap: break-word;
          letter-spacing: 0.01em;
        }
        .code-block *, .code-block code,
        .lesson-content pre *, .lesson-content pre code {
          background: transparent !important;
          padding: 0 !important;
          border-radius: 0 !important;
          border: none !important;
          color: inherit !important;
          font-weight: inherit !important;
          font-size: inherit;
        }
        /* Comment color blue (applied by highlightComments JS function) */
        .code-comment {
          color: #60a5fa;
          font-style: italic;
        }

        .practice-shell,
        .homework-shell {
          position: relative;
          overflow: hidden;
          border-radius: 1.5rem;
          border: 1px solid #dbeafe;
          padding: 1.5rem;
          background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
          box-shadow: 0 18px 45px rgba(148, 163, 184, 0.12);
        }

        .homework-shell {
          border-color: #ddd6fe;
          background: linear-gradient(180deg, #ffffff 0%, #fcfaff 100%);
        }

        .practice-shell::before,
        .homework-shell::before {
          content: "";
          position: absolute;
          inset: 0 0 auto 0;
          height: 6px;
          background: linear-gradient(90deg, #38bdf8 0%, #2563eb 100%);
        }

        .homework-shell::before {
          background: linear-gradient(90deg, #8b5cf6 0%, #d946ef 100%);
        }

        .practice-shell > h2,
        .homework-shell > div:first-child h2 {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          margin-bottom: 1rem;
          padding-top: 0.6rem;
          color: #0f172a !important;
          font-size: 1.45rem !important;
          line-height: 1.35;
        }

        .practice-shell > h2::after,
        .homework-shell > div:first-child h2::after {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          border: 1px solid currentColor;
          padding: 0.35rem 0.85rem;
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          white-space: nowrap;
          opacity: 0.9;
        }

        .practice-shell > h2::after {
          content: "Practice";
          color: #0369a1;
          background: #f0f9ff;
        }

        .homework-shell > div:first-child h2::after {
          content: "Homework";
          color: #7c3aed;
          background: #faf5ff;
        }

        .practice-shell > .lesson-content,
        .homework-shell > .lesson-content {
          margin-top: 1rem;
          border: 1px solid #e2e8f0;
          border-radius: 1.25rem;
          background: rgba(255, 255, 255, 0.92);
          padding: 1.35rem 1.4rem;
        }

        .homework-shell > .lesson-content {
          border-color: #ddd6fe;
        }

        .practice-shell > .lesson-content::before,
        .homework-shell > .lesson-content::before {
          content: "Đề bài và yêu cầu";
          display: inline-flex;
          align-items: center;
          margin-bottom: 1rem;
          border-radius: 999px;
          background: #eff6ff;
          color: #1d4ed8;
          padding: 0.35rem 0.85rem;
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .homework-shell > .lesson-content::before {
          content: "Nhiệm vụ và tiêu chí";
          background: #f5f3ff;
          color: #7c3aed;
        }

        .exercise-content > :first-child {
          margin-top: 0 !important;
        }

        .practice-shell > button {
          margin-top: 1rem;
          border-radius: 1rem;
          padding: 0.8rem 1.1rem;
          font-size: 0.95rem;
          box-shadow: 0 10px 24px rgba(15, 23, 42, 0.06);
        }

        .practice-shell > div.mt-4,
        .homework-shell > div.mt-4,
        .homework-shell > div.mt-4.space-y-4 {
          border-radius: 1.25rem;
        }

        .homework-shell > div:first-child {
          margin-bottom: 1.1rem;
          border: 1px solid #e9d5ff;
          border-radius: 1.25rem;
          background: linear-gradient(135deg, #faf5ff 0%, #ffffff 100%);
          padding: 1rem 1.1rem;
        }

        .homework-shell textarea {
          border-radius: 1rem;
        }

        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fadeIn 0.3s ease forwards; }
      `}</style>
    </div>
  );
}
