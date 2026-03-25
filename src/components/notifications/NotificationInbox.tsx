"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  link?: string | null;
  isRead: boolean;
  createdAt: string | Date;
}

interface NotificationInboxProps {
  title?: string;
  emptyMessage: string;
  notifications: NotificationItem[];
}

function getIcon(type: string) {
  if (type === "classroom_assignment_created") return "fa-file-circle-plus";
  if (type === "classroom_test_created") return "fa-clipboard-question";
  if (type === "classroom_submission_created" || type === "new_submission") return "fa-inbox";
  if (type === "classroom_submission_graded" || type === "submission_graded") return "fa-square-check";
  return "fa-bell";
}

export default function NotificationInbox({
  title = "Thông báo điều hướng",
  emptyMessage,
  notifications,
}: NotificationInboxProps) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);

  async function markAsRead(notificationId: string) {
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notificationId }),
      keepalive: true,
    });
  }

  async function handleClick(item: NotificationItem) {
    if (!item.link) {
      return;
    }

    setBusyId(item.id);
    try {
      if (!item.isRead) {
        void markAsRead(item.id);
      }
      router.push(item.link);
    } finally {
      setBusyId(null);
    }
  }

  async function handleMarkAll() {
    setMarkingAll(true);
    try {
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllRead: true }),
      });
      router.refresh();
    } finally {
      setMarkingAll(false);
    }
  }

  return (
    <section className="card rounded-[1.5rem] p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">
            Ưu tiên đi theo thông báo thay vì tìm thủ công trong nhiều màn hình.
          </p>
        </div>
        {notifications.length > 0 ? (
          <button
            type="button"
            onClick={handleMarkAll}
            disabled={markingAll}
            className="text-sm font-medium text-indigo-600 hover:text-indigo-700 disabled:opacity-60"
          >
            {markingAll ? "Đang cập nhật..." : "Đánh dấu đã đọc"}
          </button>
        ) : null}
      </div>

      <div className="mt-4 space-y-3">
        {notifications.length > 0 ? (
          notifications.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleClick(item)}
              disabled={!item.link || busyId === item.id}
              className={`w-full rounded-2xl border p-4 text-left transition ${
                item.isRead
                  ? "border-slate-200 bg-white hover:border-indigo-200 hover:bg-slate-50"
                  : "border-indigo-200 bg-indigo-50 hover:border-indigo-300 hover:bg-indigo-100"
              } ${!item.link ? "cursor-default" : ""}`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
                    item.isRead ? "bg-slate-100 text-slate-500" : "bg-white text-indigo-600"
                  }`}
                >
                  <i className={`fa-solid ${getIcon(item.type)}`}></i>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="font-semibold text-slate-900">{item.title}</div>
                    {!item.isRead ? <span className="badge badge-primary">Mới</span> : null}
                  </div>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{item.message}</p>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <span className="text-xs text-slate-400">
                      {new Date(item.createdAt).toLocaleString("vi-VN")}
                    </span>
                    {item.link ? (
                      <span className="text-sm font-medium text-indigo-600">
                        {busyId === item.id ? "Đang mở..." : "Mở chi tiết"}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            </button>
          ))
        ) : (
          <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
            {emptyMessage}
          </div>
        )}
      </div>
    </section>
  );
}
