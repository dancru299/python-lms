"use client";

import Link from "next/link";
import { useState } from "react";

export default function LoginPage() {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Đăng nhập thất bại");
        return;
      }

      if (data.user.role === "teacher" || data.user.role === "admin") {
        window.location.replace("/admin");
      } else {
        window.location.replace("/dashboard");
      }
    } catch {
      setError("Đã xảy ra lỗi, vui lòng thử lại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-[46%] lg:flex-col lg:justify-between bg-[linear-gradient(135deg,_#312e81_0%,_#4f46e5_45%,_#7c3aed_100%)] px-12 py-10 text-white">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15">
              <i className="fa-solid fa-graduation-cap text-white"></i>
            </div>
            <span className="text-lg font-bold">Python LMS</span>
          </div>
        </div>

        <div>
          <blockquote className="text-2xl font-semibold leading-snug text-white/95">
            "Học Python theo lộ trình rõ ràng, theo dõi tiến độ và nhận phản hồi nhanh."
          </blockquote>
          <div className="mt-8 space-y-4">
            {[
              { icon: "fa-route", text: "Lộ trình học theo chương, theo bài" },
              { icon: "fa-pen-ruler", text: "Chấm bài và phản hồi trực tuyến" },
              { icon: "fa-users-rectangle", text: "Quản lý lớp học tập trung" },
            ].map((item) => (
              <div key={item.text} className="flex items-center gap-3 text-sm text-indigo-100">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/10">
                  <i className={`fa-solid ${item.icon} text-[11px]`}></i>
                </div>
                {item.text}
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-indigo-300">
          © {new Date().getFullYear()} Python LMS. Hệ thống học tập trực tuyến.
        </p>
      </div>

      {/* Right form panel */}
      <div className="flex flex-1 flex-col items-center justify-center bg-slate-50 px-5 py-10 sm:px-10">
        {/* Mobile logo */}
        <div className="mb-8 flex items-center gap-3 lg:hidden">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600">
            <i className="fa-solid fa-graduation-cap text-white"></i>
          </div>
          <span className="text-xl font-bold text-slate-900">Python LMS</span>
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-slate-900">Đăng nhập</h1>
            <p className="mt-1.5 text-sm text-slate-500">
              Chưa có tài khoản?{" "}
              <Link href="/register" className="font-medium text-indigo-600 hover:text-indigo-700">
                Đăng ký ngay
              </Link>
            </p>
          </div>

          {error && (
            <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <i className="fa-solid fa-circle-exclamation mt-0.5 shrink-0"></i>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Email</label>
              <input
                type="email"
                className="input"
                placeholder="your@email.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="block text-sm font-medium text-slate-700">Mật khẩu</label>
                <Link
                  href="/forgot-password"
                  className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
                >
                  Quên mật khẩu?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  className="input !pr-11"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-400 transition-colors hover:text-slate-600"
                  aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  tabIndex={-1}
                >
                  <i className={`fa-solid ${showPassword ? "fa-eye" : "fa-eye-slash"}`}></i>
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full py-2.5 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin"></i>
                  Đang xử lý...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-right-to-bracket"></i>
                  Đăng nhập
                </>
              )}
            </button>
          </form>

          <div className="mt-8">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600"
            >
              <i className="fa-solid fa-arrow-left"></i>
              Quay lại trang chủ
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
