"use client";

import { useState } from "react";

interface Setting {
  key: string;
  value: string;
  label: string;
  description: string;
  type: "text" | "boolean" | "textarea";
}

const SETTING_DEFINITIONS: Omit<Setting, "value">[] = [
  {
    key: "site_name",
    label: "Tên hệ thống",
    description: "Tên hiển thị của LMS trong email và giao diện.",
    type: "text",
  },
  {
    key: "site_description",
    label: "Mô tả ngắn",
    description: "Mô tả ngắn hiển thị trên trang chủ.",
    type: "textarea",
  },
  {
    key: "allow_registration",
    label: "Cho phép đăng ký tài khoản",
    description: "Bật/tắt tính năng tự đăng ký tài khoản học sinh mới.",
    type: "boolean",
  },
  {
    key: "allow_library_access",
    label: "Cho phép truy cập thư viện (không cần đăng nhập)",
    description: "Học sinh và khách có thể đọc bài giảng mà không cần tài khoản.",
    type: "boolean",
  },
  {
    key: "maintenance_mode",
    label: "Chế độ bảo trì",
    description: "Khi bật, người dùng sẽ thấy thông báo bảo trì thay vì nội dung.",
    type: "boolean",
  },
  {
    key: "contact_email",
    label: "Email liên hệ",
    description: "Địa chỉ email hỗ trợ hiển thị trong footer.",
    type: "text",
  },
];

interface SettingsClientPageProps {
  initialSettings: Record<string, string>;
}

export default function SettingsClientPage({ initialSettings }: SettingsClientPageProps) {
  const [values, setValues] = useState<Record<string, string>>(() => {
    const defaults: Record<string, string> = {
      site_name: "Python LMS",
      site_description: "Nền tảng học lập trình Python trực tuyến.",
      allow_registration: "true",
      allow_library_access: "true",
      maintenance_mode: "false",
      contact_email: "",
    };
    return { ...defaults, ...initialSettings };
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleChange = (key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const payload = Object.entries(values).map(([key, value]) => ({ key, value }));
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        alert("Lỗi khi lưu cài đặt!");
      }
    } catch {
      alert("Đã xảy ra lỗi!");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {SETTING_DEFINITIONS.map((def) => (
        <div key={def.key} className="card p-5">
          <div className="mb-3">
            <label className="block font-semibold text-gray-900">{def.label}</label>
            <p className="mt-0.5 text-sm text-gray-500">{def.description}</p>
          </div>

          {def.type === "boolean" ? (
            <button
              type="button"
              onClick={() => handleChange(def.key, values[def.key] === "true" ? "false" : "true")}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                values[def.key] === "true" ? "bg-indigo-600" : "bg-gray-200"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  values[def.key] === "true" ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          ) : def.type === "textarea" ? (
            <textarea
              value={values[def.key] ?? ""}
              onChange={(e) => handleChange(def.key, e.target.value)}
              rows={3}
              className="input min-h-[80px]"
            />
          ) : (
            <input
              type="text"
              value={values[def.key] ?? ""}
              onChange={(e) => handleChange(def.key, e.target.value)}
              className="input"
            />
          )}
        </div>
      ))}

      <div className="flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn btn-primary disabled:opacity-50"
        >
          {saving ? (
            <><i className="fa-solid fa-spinner fa-spin"></i> Đang lưu…</>
          ) : (
            <><i className="fa-solid fa-floppy-disk"></i> Lưu cài đặt</>
          )}
        </button>
        {saved && (
          <span className="flex items-center gap-1.5 text-sm font-medium text-emerald-600">
            <i className="fa-solid fa-circle-check"></i>
            Đã lưu thành công
          </span>
        )}
      </div>
    </div>
  );
}
