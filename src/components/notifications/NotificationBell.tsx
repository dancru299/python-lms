"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  link?: string | null;
  isRead: boolean;
  createdAt: string;
}

function getIcon(type: string) {
  if (type === "classroom_assignment_created") return "fa-file-circle-plus";
  if (type === "classroom_test_created") return "fa-clipboard-question";
  if (type === "classroom_submission_created" || type === "new_submission") return "fa-inbox";
  if (type === "classroom_submission_graded" || type === "submission_graded") return "fa-square-check";
  return "fa-bell";
}

interface NotificationBellProps {
  initialCount?: number;
  theme?: "dark" | "light";
  onCountChange?: (count: number) => void;
}

export default function NotificationBell({
  initialCount = 0,
  theme = "dark",
  onCountChange,
}: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(initialCount);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    setCount(initialCount);
  }, [initialCount]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        const unreadCount = data.unreadCount ?? 0;
        setItems(data.notifications ?? []);
        setCount(unreadCount);
        onCountChange?.(unreadCount);
      }
    } finally {
      setLoading(false);
    }
  }

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next) load();
  }

  async function handleClick(item: NotificationItem) {
    if (!item.link) return;
    if (!item.isRead) {
      fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId: item.id }),
        keepalive: true,
      });
      setItems((prev) => prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n)));
      const next = Math.max(0, count - 1);
      setCount(next);
      onCountChange?.(next);
    }
    setOpen(false);
    router.push(item.link);
  }

  async function markAll() {
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAllRead: true }),
    });
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setCount(0);
    onCountChange?.(0);
  }

  const isDark = theme === "dark";

  const btnCls = isDark
    ? "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
    : "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-800";

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={toggle} className={btnCls}>
        <i className="fa-solid fa-bell w-4 shrink-0 text-center text-[13px]"></i>
        <span className="flex-1">Thông báo</span>
        {count > 0 && (
          <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-amber-500 px-1.5 text-[10px] font-bold text-white">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute bottom-0 left-full z-50 ml-3 w-80 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/10">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <h3 className="font-semibold text-slate-900">Thông báo</h3>
            {count > 0 && (
              <button
                onClick={markAll}
                className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
              >
                Đánh dấu đã đọc
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[22rem] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-400">
                <i className="fa-solid fa-spinner fa-spin"></i>
                Đang tải…
              </div>
            ) : items.length === 0 ? (
              <div className="py-10 text-center text-sm text-slate-400">
                <i className="fa-solid fa-bell-slash mb-3 block text-2xl text-slate-200"></i>
                Không có thông báo nào
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleClick(item)}
                    disabled={!item.link}
                    className={`w-full p-4 text-left transition ${
                      item.isRead ? "hover:bg-slate-50" : "bg-indigo-50/50 hover:bg-indigo-50"
                    } ${!item.link ? "cursor-default" : ""}`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-[11px] ${
                          item.isRead
                            ? "bg-slate-100 text-slate-400"
                            : "bg-indigo-100 text-indigo-600"
                        }`}
                      >
                        <i className={`fa-solid ${getIcon(item.type)}`}></i>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`truncate text-sm font-medium ${
                              item.isRead ? "text-slate-700" : "text-slate-900"
                            }`}
                          >
                            {item.title}
                          </span>
                          {!item.isRead && (
                            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" />
                          )}
                        </div>
                        <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">
                          {item.message}
                        </p>
                        <p className="mt-1.5 text-[10px] text-slate-400">
                          {new Date(item.createdAt).toLocaleString("vi-VN")}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
